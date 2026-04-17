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

import ReactMarkdown     from 'react-markdown';
import remarkGfm         from 'remark-gfm';
import rehypeSanitize    from 'rehype-sanitize';
import rehypeHighlight   from 'rehype-highlight';
import type { Components } from 'react-markdown';

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

  // コードブロック（インライン以外）は wrapper div 付き
  pre({ children, ...props }) {
    return (
      <div className="code-block-wrapper" style={{ position: 'relative' }}>
        <pre {...props}>{children}</pre>
      </div>
    );
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
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize, rehypeHighlight]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </article>
    </>
  );
}
