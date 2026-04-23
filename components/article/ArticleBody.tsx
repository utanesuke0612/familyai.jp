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

import { useState, useRef } from 'react';
import ReactMarkdown     from 'react-markdown';
import remarkGfm         from 'remark-gfm';
import rehypeSanitize    from 'rehype-sanitize';
import rehypeHighlight   from 'rehype-highlight';
import type { Components } from 'react-markdown';

type ArticleSegment =
  | { type: 'markdown'; content: string }
  | { type: 'trusted-embed'; src: string; width: string; height: string; title: string };

const VOA_EMBED_HOSTS = new Set(['learningenglish.voanews.com', 'www.voanews.com', 'voanews.com']);
const YOUTUBE_EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'youtu.be',
]);

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

function parseArticleSegments(content: string): ArticleSegment[] {
  const iframeRegex = /<iframe\b[^>]*><\/iframe>/gi;
  const segments: ArticleSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = iframeRegex.exec(content)) !== null) {
    const fullTag = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      segments.push({
        type: 'markdown',
        content: content.slice(lastIndex, start),
      });
    }

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
      } else {
        segments.push({ type: 'markdown', content: fullTag });
      }
    } else {
      segments.push({ type: 'markdown', content: fullTag });
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
        className="absolute top-2 right-2 text-xs px-2 py-1 rounded-md transition-opacity hover:opacity-80"
        style={{
          background: copied ? 'var(--color-orange)' : 'rgba(255,255,255,0.85)',
          color:      copied ? 'white' : 'var(--color-brown)',
          border:     '1px solid var(--color-beige-dark)',
          minHeight:  'auto',
          zIndex:     1,
        }}
      >
        {copied ? '✓ コピー済' : '📋 コピー'}
      </button>
      <pre ref={preRef} {...props}>{children}</pre>
    </div>
  );
}

// ── カスタムコンポーネント ─────────────────────────────────────
const components: Components = {
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
        {children}
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
        style={{ maxWidth: '100%', borderRadius: '12px', margin: '1.5rem 0' }}
        {...props}
      />
    );
  },

  // コードブロック（インライン以外）は wrapper div + コピーボタン付き
  pre({ children, ...props }) {
    return <CodeBlockWithCopy {...props}>{children}</CodeBlockWithCopy>;
  },

  // 引用ブロック
  blockquote({ children, ...props }) {
    return (
      <blockquote
        style={{
          borderLeft:  '4px solid var(--color-peach)',
          paddingLeft: '1.25rem',
          margin:      '1.5rem 0',
          color:       'var(--color-brown-light)',
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
          borderTop: '2px solid var(--color-beige)',
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
            color:           'var(--color-brown)',
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
          background:    'var(--color-beige)',
          padding:       '8px 12px',
          textAlign:     'left',
          fontWeight:    600,
          border:        '1px solid var(--color-beige-dark)',
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
          border:  '1px solid var(--color-beige-dark)',
          verticalAlign: 'top',
        }}
        {...props}
      >
        {children}
      </td>
    );
  },
};

// ── メインコンポーネント ───────────────────────────────────────
interface ArticleBodyProps {
  content: string;
  className?: string;
}

export function ArticleBody({ content, className = '' }: ArticleBodyProps) {
  const segments = parseArticleSegments(content);

  return (
    <>
      {/* highlight.js テーマ（atom-one-light 系カスタム） */}
      <style>{`
        .hljs { background: #f6f8fa; color: #24292e; border-radius: 8px; padding: 1rem 1.25rem; overflow-x: auto; font-size: 13px; line-height: 1.6; }
        .hljs-comment,.hljs-quote { color: #6a737d; font-style: italic; }
        .hljs-keyword,.hljs-selector-tag,.hljs-addition { color: #d73a49; }
        .hljs-number,.hljs-string,.hljs-meta .hljs-string,.hljs-literal,.hljs-doctag,.hljs-regexp { color: #032f62; }
        .hljs-title,.hljs-section,.hljs-name,.hljs-selector-id,.hljs-selector-class { color: #6f42c1; font-weight: 600; }
        .hljs-attribute,.hljs-attr,.hljs-variable,.hljs-template-variable,.hljs-class .hljs-title,.hljs-type { color: #e36209; }
        .hljs-symbol,.hljs-bullet,.hljs-subst,.hljs-meta,.hljs-meta .hljs-keyword,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-link { color: #005cc5; }
        .hljs-built_in,.hljs-deletion { color: #005cc5; }
        .hljs-emphasis { font-style: italic; }
        .hljs-strong { font-weight: 700; }
        .code-block-wrapper pre { margin: 1.25rem 0; }
      `}</style>

      <article className={`prose-warm ${className}`}>
        {segments.map((segment, index) => {
          if (segment.type === 'trusted-embed') {
            const numericWidth  = Number.parseInt(segment.width, 10);
            const numericHeight = Number.parseInt(segment.height, 10);
            const aspectRatio =
              Number.isFinite(numericWidth) && Number.isFinite(numericHeight) && numericHeight > 0
                ? `${numericWidth} / ${numericHeight}`
                : '16 / 9';

            return (
              <div
                key={`trusted-embed-${index}`}
                style={{ margin: '1.5rem 0', width: '100%', aspectRatio }}
              >
                <iframe
                  src={segment.src}
                  allowFullScreen
                  loading="lazy"
                  scrolling="no"
                  referrerPolicy="strict-origin-when-cross-origin"
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    border: '0',
                    borderRadius: '12px',
                  }}
                  title={`${segment.title} ${index + 1}`}
                />
              </div>
            );
          }

          if (!segment.content.trim()) {
            return null;
          }

          return (
            <ReactMarkdown
              key={`markdown-${index}`}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize, rehypeHighlight]}
              components={components}
            >
              {segment.content}
            </ReactMarkdown>
          );
        })}
      </article>
    </>
  );
}
