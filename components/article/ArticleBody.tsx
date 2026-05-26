'use client';

/**
 * components/article/ArticleBody.tsx
 * familyai.jp — Markdown 記事本文レンダラー
 *
 * - react-markdown + remark-gfm（テーブル・チェックボックス等）
 * - rehype-highlight（シンタックスハイライト）
 * - prose-warm CSS クラスでタイポグラフィを統一
 * - リンクは外部リンクを新タブで開く
 */

import { useState, useRef, useEffect, Fragment, isValidElement, type ReactNode } from 'react';
import ReactMarkdown     from 'react-markdown';
import remarkGfm         from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeRaw         from 'rehype-raw';
import rehypeHighlight   from 'rehype-highlight';
import { AnnotatedWord } from '@/components/article/AnnotatedWord';
import { LinkPreviewCard } from '@/components/article/LinkPreviewCard';
import { MermaidDiagram } from '@/components/article/MermaidDiagram';
import { collectArticleHeadings } from '@/lib/articles/toc';
import bash              from 'highlight.js/lib/languages/bash';
import css               from 'highlight.js/lib/languages/css';
import javascript        from 'highlight.js/lib/languages/javascript';
import json              from 'highlight.js/lib/languages/json';
import python            from 'highlight.js/lib/languages/python';
import shell             from 'highlight.js/lib/languages/shell';
import sql               from 'highlight.js/lib/languages/sql';
import typescript        from 'highlight.js/lib/languages/typescript';
import xml               from 'highlight.js/lib/languages/xml';
import yaml              from 'highlight.js/lib/languages/yaml';
import type { Components } from 'react-markdown';

// rehype-sanitize: デフォルトスキーマに <iframe> を追加
// 管理者のみが記事を書くため、XSS リスクは許容範囲内。
// P2 #3: `srcdoc` は使っていないので許可属性から外す（CMS 入力ミス・侵害時の被害縮小）。
//        iframe src 自体は parseArticleSegments() で allowlist チェック済み。
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'iframe'],
  attributes: {
    ...defaultSchema.attributes,
    iframe: ['src', 'width', 'height', 'style', 'title', 'sandbox', 'loading', 'allowfullscreen', 'referrerpolicy'],
  },
};

// rehype-highlight の `languages` オプションで使用言語を限定し、
// highlight.js の全言語（200+）を bundle に取り込むのを防ぐ
const highlightLanguages = {
  bash,
  shell,
  css,
  html:       xml,   // highlight.js では HTML は xml として登録
  javascript,
  js:         javascript,
  json,
  python,
  py:         python,
  sql,
  typescript,
  ts:         typescript,
  tsx:        typescript,
  jsx:        javascript,
  xml,
  yaml,
  yml:        yaml,
};

type ArticleSegment =
  | { type: 'markdown'; content: string }
  | { type: 'trusted-embed'; src: string; width: string; height: string; title: string }
  | { type: 'audio'; src: string }
  | { type: 'message'; variant: 'message' | 'alert'; content: string };

const VOA_EMBED_HOSTS = new Set(['learningenglish.voanews.com', 'www.voanews.com', 'voanews.com']);
const YOUTUBE_EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'youtu.be',
]);

/**
 * P2 #3: 任意 HTTPS を信頼するのを止め、明示 allowlist で iframe 許可ホストを管理する。
 *
 * 追加方針: 自社管理ドメイン（Vercel Blob / CDN）+ 必要な学習ソース。
 * ここに含まれないホストは markdown コードブロックとしてフォールバック表示される。
 */
const EMBED_HOST_ALLOWLIST = new Set<string>([
  // Vercel Blob（自社）
  'blob.vercel-storage.com',
  // 学習・教材ソース
  'learningenglish.voanews.com',
  'www.voanews.com',
  'voanews.com',
  // Spotify / Vimeo（記事埋め込みで実利用がある教材ホスト）
  'open.spotify.com',
  'player.vimeo.com',
]);

/** 末尾ホスト一致（サブドメインも OK にしたいホスト用）— *.public.blob.vercel-storage.com 等 */
const EMBED_HOST_SUFFIX_ALLOWLIST: readonly string[] = [
  '.public.blob.vercel-storage.com',
];

function isAllowedEmbedHost(hostname: string): boolean {
  if (EMBED_HOST_ALLOWLIST.has(hostname)) return true;
  return EMBED_HOST_SUFFIX_ALLOWLIST.some((s) => hostname.endsWith(s));
}

// 単語ツールチップ構文 `{word|meaning|pron?|example?}` を検出
const ANNOTATE_REGEX = /\{([^|{}\n]+)\|([^|{}\n]+)(?:\|([^|{}\n]*))?(?:\|([^{}\n]*))?\}/g;

/** 文字列内の `{word|meaning|...}` を AnnotatedWord に分割展開 */
function splitAnnotated(text: string): ReactNode[] {
  ANNOTATE_REGEX.lastIndex = 0;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = ANNOTATE_REGEX.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const [, word, meaning, pron, example] = m;
    parts.push(
      <AnnotatedWord
        key={`aw-${key++}`}
        word={word.trim()}
        meaning={meaning.trim()}
        pron={pron?.trim() || undefined}
        example={example?.trim() || undefined}
      />,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** 子要素をたどって文字列だけ AnnotatedWord 展開する */
function annotateChildren(children: ReactNode): ReactNode {
  if (typeof children === 'string') {
    if (!children.includes('{')) return children;
    return <>{splitAnnotated(children)}</>;
  }
  if (Array.isArray(children)) {
    return children.map((c, i) => {
      if (typeof c === 'string' && c.includes('{')) {
        return <Fragment key={`as-${i}`}>{splitAnnotated(c)}</Fragment>;
      }
      return c;
    });
  }
  return children;
}

function getIframeAttr(tag: string, attr: string): string | null {
  const escapedAttr = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`${escapedAttr}=(["'])(.*?)\\1`, 'i'));
  return match?.[2]?.trim() ?? null;
}

function isAllowedVoaEmbed(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && VOA_EMBED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function normalizeYouTubeEmbed(src: string): string | null {
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:' || !YOUTUBE_EMBED_HOSTS.has(url.hostname)) {
      return null;
    }

    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.pathname.startsWith('/watch')) {
      const videoId = url.searchParams.get('v');
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.pathname.startsWith('/embed/')) {
      return url.toString();
    }

    return null;
  } catch {
    return null;
  }
}

// HTTPS URL かどうか検証
function isHttpsUrl(src: string): boolean {
  try { return new URL(src).protocol === 'https:'; } catch { return false; }
}

// <audio> タグから src を取り出す（src 属性 or 子 <source src> に対応）
function extractAudioSrc(tag: string): string | null {
  const directMatch = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
  if (directMatch?.[2] && isHttpsUrl(directMatch[2].trim())) return directMatch[2].trim();
  const sourceMatch = tag.match(/<source\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i);
  if (sourceMatch?.[2] && isHttpsUrl(sourceMatch[2].trim())) return sourceMatch[2].trim();
  return null;
}

function parseEmbeddedSegments(content: string): ArticleSegment[] {
  // <iframe> と <audio> を同時にスキャン
  const tokenRegex = /(<iframe\b[^>]*><\/iframe>|<audio\b[^>]*>(?:[\s\S]*?<\/audio>)?)/gi;
  const segments: ArticleSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(content)) !== null) {
    const fullTag = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      segments.push({ type: 'markdown', content: content.slice(lastIndex, start) });
    }

    if (fullTag.toLowerCase().startsWith('<audio')) {
      // ── <audio> タグ ──────────────────────────────────────────
      const src = extractAudioSrc(fullTag);
      if (src) {
        segments.push({ type: 'audio', src });
      } else {
        segments.push({ type: 'markdown', content: fullTag });
      }
    } else {
      // ── <iframe> タグ ─────────────────────────────────────────
      const src = getIframeAttr(fullTag, 'src');
      if (src && isAllowedVoaEmbed(src)) {
        segments.push({
          type: 'trusted-embed',
          src,
          width: getIframeAttr(fullTag, 'width') ?? '100%',
          height: getIframeAttr(fullTag, 'height') ?? '360',
          title: 'VOA embed',
        });
      } else if (src) {
        const youtubeSrc = normalizeYouTubeEmbed(src);
        if (youtubeSrc) {
          segments.push({
            type: 'trusted-embed',
            src: youtubeSrc,
            width: getIframeAttr(fullTag, 'width') ?? '100%',
            height: getIframeAttr(fullTag, 'height') ?? '360',
            title: 'YouTube embed',
          });
        } else if (isHttpsUrl(src) && (() => {
          try { return isAllowedEmbedHost(new URL(src).hostname); } catch { return false; }
        })()) {
          // P2 #3: allowlist 経由のみ trusted-embed として通す。
          // 任意 HTTPS を許可しない（CMS 入力ミス・管理画面侵害時の被害縮小）。
          segments.push({
            type: 'trusted-embed',
            src,
            width:  getIframeAttr(fullTag, 'width')  ?? '100%',
            height: getIframeAttr(fullTag, 'height') ?? '500',
            title:  getIframeAttr(fullTag, 'title')  ?? 'embed',
          });
        } else {
          // allowlist 外は埋め込みせず、元のタグを markdown として出す（フォールバック）
          segments.push({ type: 'markdown', content: fullTag });
        }
      } else {
        segments.push({ type: 'markdown', content: fullTag });
      }
    }

    lastIndex = start + fullTag.length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: 'markdown',
      content: content.slice(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: 'markdown', content }];
}

function parseArticleSegments(content: string): ArticleSegment[] {
  const segments: ArticleSegment[] = [];
  const markdownLines: string[] = [];
  const messageLines: string[] = [];
  let inFence = false;
  let fenceMarker: '```' | '~~~' | null = null;
  let messageVariant: 'message' | 'alert' | null = null;

  const flushMarkdown = () => {
    if (markdownLines.length === 0) return;
    const markdown = markdownLines.join('\n');
    if (markdown.trim()) segments.push(...parseEmbeddedSegments(markdown));
    markdownLines.length = 0;
  };

  const flushUnclosedMessageAsMarkdown = () => {
    if (!messageVariant) return;
    markdownLines.push(`:::message${messageVariant === 'alert' ? ' alert' : ''}`);
    markdownLines.push(...messageLines);
    messageLines.length = 0;
    messageVariant = null;
  };

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    const fence = trimmed.match(/^(```|~~~)/)?.[1] as '```' | '~~~' | undefined;

    if (!messageVariant && fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence;
      } else if (fenceMarker === fence) {
        inFence = false;
        fenceMarker = null;
      }
      markdownLines.push(line);
      continue;
    }

    if (!inFence && !messageVariant) {
      const messageStart = trimmed.match(/^:::message(?:\s+(alert))?\s*$/);
      if (messageStart) {
        flushMarkdown();
        messageVariant = messageStart[1] === 'alert' ? 'alert' : 'message';
        continue;
      }
    }

    if (messageVariant) {
      if (trimmed === ':::') {
        segments.push({
          type: 'message',
          variant: messageVariant,
          content: messageLines.join('\n').trim(),
        });
        messageLines.length = 0;
        messageVariant = null;
      } else {
        messageLines.push(line);
      }
      continue;
    }

    markdownLines.push(line);
  }

  flushUnclosedMessageAsMarkdown();
  flushMarkdown();
  return segments.length > 0 ? segments : [{ type: 'markdown', content }];
}

function ArticleMessage({
  variant,
  children,
}: {
  variant: 'message' | 'alert';
  children: ReactNode;
}) {
  const isAlert = variant === 'alert';
  return (
    <aside
      style={{
        display:       'grid',
        gridTemplateColumns: '24px minmax(0,1fr)',
        gap:           '0.75rem',
        alignItems:    'start',
        margin:        '1.25rem 0',
        padding:       '1rem',
        borderRadius:  '6px',
        background:    isAlert ? '#FEF2F2' : '#FFF7E6',
        border:        `1px solid ${isAlert ? '#FECACA' : '#FDE3B0'}`,
        color:         'var(--sumi)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          justifyContent: 'center',
          width:          '22px',
          height:         '22px',
          borderRadius:   '999px',
          background:     isAlert ? '#FF6B6B' : '#FFA500',
          color:          'white',
          fontSize:       '14px',
          fontWeight:     700,
          lineHeight:     1,
        }}
      >
        !
      </span>
      <div className="article-message-body">{children}</div>
    </aside>
  );
}

// ── フルスクリーン付き埋め込みコンポーネント ──────────────────────
function EmbedWithFullscreen({
  src, width, height, title, index,
}: { src: string; width: string; height: string; title: string; index: number }) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFs, setIsFs]         = useState(false);
  const [autoHeight, setAutoHeight] = useState<number | null>(null);

  // Fullscreen API のイベントで状態同期（ESC キー対応）
  useEffect(() => {
    const onFsChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // iframe からの postMessage で高さを自動調整
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // 送信元が同じ src の iframe かを確認
      if (iframeRef.current?.contentWindow !== e.source) return;
      if (typeof e.data?.iframeHeight === 'number' && e.data.iframeHeight > 0) {
        setAutoHeight(e.data.iframeHeight);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const el = wrapRef.current ?? iframeRef.current;
        await el?.requestFullscreen({ navigationUI: 'hide' });
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('[EmbedWithFullscreen] fullscreen error:', err);
    }
  };

  const numericWidth  = Number.parseInt(width, 10);
  const numericHeight = Number.parseInt(height, 10);
  const aspectRatio =
    Number.isFinite(numericWidth) && Number.isFinite(numericHeight) && numericHeight > 0
      ? `${numericWidth} / ${numericHeight}`
      : '16 / 9';

  // autoHeight があれば固定px、なければ aspect-ratio でフォールバック
  const containerStyle: React.CSSProperties = isFs
    ? { position: 'relative', width: '100%', height: '100%', background: 'var(--washi, #F5EDDE)' }
    : autoHeight !== null
      ? { position: 'relative', margin: '1.5rem 0', width: '100%', height: `${autoHeight}px`, background: 'var(--washi, #F5EDDE)', border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }
      : { position: 'relative', margin: '1.5rem 0', width: '100%', aspectRatio, background: 'var(--washi, #F5EDDE)', border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' };

  return (
    <div ref={wrapRef} style={containerStyle}>
      <iframe
        ref={iframeRef}
        src={src}
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        style={{
          display: 'block',
          width:   '100%',
          height:  '100%',
          border:  '0',
        }}
        title={`${title} ${index + 1}`}
      />

      {/* フルスクリーン切替ボタン */}
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFs ? '全画面を終了' : '全画面で表示'}
        title={isFs ? '全画面を終了 (Esc)' : '全画面で表示'}
        style={{
          position:       'absolute',
          bottom:         '10px',
          right:          '10px',
          width:          '34px',
          height:         '34px',
          borderRadius:   '4px',
          border:         '1px solid rgba(245,237,222,0.3)',
          background:     'rgba(42,26,18,0.7)',
          color:          'var(--washi, #F5EDDE)',
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          zIndex:         10,
          padding:        0,
          minHeight:      'auto',
          transition:     'background 0.2s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(42,26,18,0.9)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(42,26,18,0.7)'; }}
      >
        {isFs ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="4 14 10 14 10 20"/>
            <polyline points="20 10 14 10 14 4"/>
            <line x1="10" y1="14" x2="3" y2="21"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        )}
      </button>
    </div>
  );
}


function extractCodeBlock(children: ReactNode): { language: string; code: string } | null {
  if (!isValidElement(children)) return null;
  const props = children.props as { className?: string; children?: ReactNode };
  const className = props.className ?? '';
  const language = className.match(/language-([\w-]+)/)?.[1] ?? '';
  const code = typeof props.children === 'string'
    ? props.children
    : Array.isArray(props.children)
      ? props.children.join('')
      : '';
  return { language, code };
}

function textFromNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join('');
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return textFromNode(props.children);
  }
  return '';
}

function getSingleExternalLinkUrl(children: ReactNode): string | null {
  const text = textFromNode(children).trim();
  if (!/^https?:\/\/\S+$/.test(text)) return null;

  const nodes = Array.isArray(children)
    ? children.filter((node) => textFromNode(node).trim().length > 0)
    : [children];

  if (nodes.length === 1 && isValidElement(nodes[0]) && nodes[0].type === 'a') {
    const props = nodes[0].props as { href?: string };
    const href = props.href?.trim();
    return href && href === text ? href : null;
  }

  return text;
}

function CodeBlockWithCopy({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = preRef.current?.innerText ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback silently
    }
  };

  return (
    <div className="code-block-wrapper" style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="コードをコピー"
        className="absolute top-2 right-2 text-xs px-2 py-1 transition-opacity hover:opacity-80 font-mincho"
        style={{
          background:   copied ? 'var(--shu)' : 'var(--washi-light, rgba(251,245,232,0.9))',
          color:        copied ? 'var(--washi)' : 'var(--sumi)',
          border:       '1px solid var(--line)',
          borderRadius: '4px',
          minHeight:    'auto',
          zIndex:       1,
        }}
      >
        {copied ? '✓ コピー済' : 'コピー'}
      </button>
      <pre ref={preRef} {...props}>{children}</pre>
    </div>
  );
}

// ── カスタムコンポーネント ─────────────────────────────────────
const components: Components = {
  // 段落・見出し・リスト・リンクなどテキストを含むノードは `annotateChildren` で
  // `{word|meaning|pron|example}` 構文を AnnotatedWord へ展開する
  p({ children, ...props }) {
    const previewUrl = getSingleExternalLinkUrl(children);
    if (previewUrl) return <LinkPreviewCard url={previewUrl} />;
    return <p {...props}>{annotateChildren(children)}</p>;
  },
  li({ children, ...props }) {
    return <li {...props}>{annotateChildren(children)}</li>;
  },
  strong({ children, ...props }) {
    return <strong {...props}>{annotateChildren(children)}</strong>;
  },
  em({ children, ...props }) {
    return <em {...props}>{annotateChildren(children)}</em>;
  },

  // 外部リンク → 新タブ + rel=noopener
  a({ href, children, ...props }) {
    const isExternal = href?.startsWith('http');
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {annotateChildren(children)}
      </a>
    );
  },

  // 画像 → max-width 100% + rounded
  img({ src, alt, ...props }) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        style={{ maxWidth: '100%', borderRadius: '4px', border: '1px solid var(--line)', margin: '1.5rem 0' }}
        {...props}
      />
    );
  },

  // コードブロック（インライン以外）は wrapper div + コピーボタン付き。Mermaid は図として描画する。
  pre({ children, ...props }) {
    const codeBlock = extractCodeBlock(children);
    if (codeBlock?.language === 'mermaid') {
      return <MermaidDiagram chart={codeBlock.code.trim()} />;
    }
    return <CodeBlockWithCopy {...props}>{children}</CodeBlockWithCopy>;
  },

  // 引用ブロック
  blockquote({ children, ...props }) {
    return (
      <blockquote
        style={{
          borderLeft:  '3px solid var(--shu)',
          paddingLeft: '1.25rem',
          margin:      '1.5rem 0',
          color:       'var(--sumi-light)',
          fontStyle:   'italic',
        }}
        {...props}
      >
        {children}
      </blockquote>
    );
  },

  // 区切り線
  hr() {
    return (
      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--line)',
          margin: '2rem 0',
        }}
      />
    );
  },

  // テーブル
  table({ children, ...props }) {
    return (
      <div style={{ overflowX: 'auto', margin: '1.5rem 0' }}>
        <table
          style={{
            width:           '100%',
            borderCollapse:  'collapse',
            fontSize:        '14px',
            color:           'var(--sumi)',
          }}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  },
  th({ children, ...props }) {
    return (
      <th
        style={{
          background:    'var(--washi-deep)',
          padding:       '8px 12px',
          textAlign:     'left',
          fontWeight:    600,
          border:        '1px solid var(--line)',
          whiteSpace:    'nowrap',
        }}
        {...props}
      >
        {children}
      </th>
    );
  },
  td({ children, ...props }) {
    return (
      <td
        style={{
          padding: '8px 12px',
          border:  '1px solid var(--line)',
          verticalAlign: 'top',
        }}
        {...props}
      >
        {children}
      </td>
    );
  },
};

function createComponentsWithHeadingIds(headingIds: string[]): Components {
  let headingIndex = 0;

  return {
    ...components,
    h1({ children, ...props }) {
      const id = headingIds[headingIndex++];
      return <h1 id={id} {...props}>{annotateChildren(children)}</h1>;
    },
    h2({ children, ...props }) {
      const id = headingIds[headingIndex++];
      return <h2 id={id} {...props}>{annotateChildren(children)}</h2>;
    },
  };
}

// ── メインコンポーネント ───────────────────────────────────────
interface ArticleBodyProps {
  content: string;
  className?: string;
}

export function ArticleBody({ content, className = '' }: ArticleBodyProps) {
  const segments = parseArticleSegments(content);
  const markdownComponents = createComponentsWithHeadingIds(
    collectArticleHeadings(content).map((heading) => heading.id),
  );

  return (
    <>
      {/* highlight.js テーマ（atom-one-light 系カスタム） */}
      <style>{`
        .hljs { background: transparent; color: #e6edf3; overflow-x: auto; font-size: inherit; line-height: inherit; }
        .hljs-comment,.hljs-quote { color: #8b949e; font-style: italic; }
        .hljs-keyword,.hljs-selector-tag,.hljs-deletion { color: #ff7b72; }
        .hljs-number,.hljs-literal { color: #79c0ff; }
        .hljs-string,.hljs-meta .hljs-string,.hljs-doctag,.hljs-regexp { color: #a5d6ff; }
        .hljs-title,.hljs-section,.hljs-name,.hljs-selector-id,.hljs-selector-class { color: #d2a8ff; font-weight: 600; }
        .hljs-attribute,.hljs-attr,.hljs-variable,.hljs-template-variable,.hljs-class .hljs-title,.hljs-type { color: #ffa657; }
        .hljs-symbol,.hljs-bullet,.hljs-subst,.hljs-meta,.hljs-meta .hljs-keyword,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-link { color: #7ee787; }
        .hljs-built_in,.hljs-addition { color: #7ee787; }
        .hljs-emphasis { font-style: italic; }
        .hljs-strong { font-weight: 700; }
        .code-block-wrapper pre { margin: 1.25rem 0; }
        .code-block-wrapper pre code { background: transparent; color: inherit; padding: 0; }
        .article-message-body > :first-child { margin-top: 0; }
        .article-message-body > :last-child { margin-bottom: 0; }
        .article-message-body p { margin-bottom: 0.5em; }
      `}</style>

      <article className={`prose-warm ${className}`}>
        {segments.map((segment, index) => {
          if (segment.type === 'audio') {
            return (
              <div
                key={`audio-${index}`}
                style={{ margin: '1.5rem 0' }}
              >
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio
                  controls
                  src={segment.src}
                  style={{
                    width:        '100%',
                    borderRadius: '4px',
                    display:      'block',
                  }}
                />
              </div>
            );
          }

          if (segment.type === 'trusted-embed') {
            return (
              <EmbedWithFullscreen
                key={`trusted-embed-${index}`}
                src={segment.src}
                width={segment.width}
                height={segment.height}
                title={segment.title}
                index={index}
              />
            );
          }

          if (segment.type === 'message') {
            return (
              <ArticleMessage key={`message-${index}`} variant={segment.variant}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[
                    rehypeRaw,
                    [rehypeSanitize, sanitizeSchema],
                    [rehypeHighlight, { languages: highlightLanguages, detect: true }],
                  ]}
                  components={components}
                >
                  {segment.content}
                </ReactMarkdown>
              </ArticleMessage>
            );
          }

          if (!segment.content.trim()) {
            return null;
          }

          return (
            <ReactMarkdown
              key={`markdown-${index}`}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[
                rehypeRaw,
                [rehypeSanitize, sanitizeSchema],
                [rehypeHighlight, { languages: highlightLanguages, detect: true }],
              ]}
              components={markdownComponents}
            >
              {segment.content}
            </ReactMarkdown>
          );
        })}
      </article>
    </>
  );
}
