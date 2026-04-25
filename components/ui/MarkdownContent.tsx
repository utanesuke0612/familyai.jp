'use client';

/**
 * components/ui/MarkdownContent.tsx
 * familyai.jp — AI 回答用 Markdown レンダラー
 *
 * - react-markdown + remark-gfm（太字・リスト・テーブル等）
 * - rehype-sanitize（XSS 防止）
 * - チャットバブル・メモ帳の両方で共用
 */

import ReactMarkdown  from 'react-markdown';
import remarkGfm      from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';

interface MarkdownContentProps {
  children: string;
  /** テキスト色（CSS 変数文字列 or hex）。デフォルト: inherit */
  color?: string;
  /** フォントサイズ。デフォルト: 'inherit' */
  fontSize?: string;
}

/** チャットバブル・メモ欄に最適化したカスタムコンポーネント */
function makeComponents(color: string, fontSize: string): Components {
  const base: React.CSSProperties = { color, fontSize, margin: 0 };

  return {
    // 段落
    p: ({ children }) => (
      <p style={{ ...base, lineHeight: 1.75, marginBottom: '0.6em' }}>{children}</p>
    ),
    // 箇条書き
    ul: ({ children }) => (
      <ul style={{ ...base, paddingLeft: '1.4em', marginBottom: '0.6em', listStyleType: 'disc' }}>
        {children}
      </ul>
    ),
    // 番号付きリスト
    ol: ({ children }) => (
      <ol style={{ ...base, paddingLeft: '1.4em', marginBottom: '0.6em', listStyleType: 'decimal' }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li style={{ ...base, lineHeight: 1.7, marginBottom: '0.2em' }}>{children}</li>
    ),
    // 見出し（AI 回答は h3〜h4 が主）
    h1: ({ children }) => (
      <p style={{ ...base, fontWeight: 700, fontSize: '1.1em', marginBottom: '0.4em' }}>{children}</p>
    ),
    h2: ({ children }) => (
      <p style={{ ...base, fontWeight: 700, fontSize: '1.05em', marginBottom: '0.4em' }}>{children}</p>
    ),
    h3: ({ children }) => (
      <p style={{ ...base, fontWeight: 700, marginBottom: '0.3em' }}>{children}</p>
    ),
    h4: ({ children }) => (
      <p style={{ ...base, fontWeight: 600, marginBottom: '0.3em' }}>{children}</p>
    ),
    // 太字・斜体
    strong: ({ children }) => (
      <strong style={{ fontWeight: 700, color }}>{children}</strong>
    ),
    em: ({ children }) => (
      <em style={{ fontStyle: 'italic', color }}>{children}</em>
    ),
    // インラインコード
    code: ({ children, className }) => {
      const isBlock = !!className; // ```lang... の場合は className がつく
      if (isBlock) {
        return (
          <code
            style={{
              display:         'block',
              background:      'rgba(0,0,0,0.07)',
              borderRadius:    '6px',
              padding:         '0.5em 0.75em',
              fontSize:        '0.85em',
              fontFamily:      'ui-monospace, monospace',
              whiteSpace:      'pre-wrap',
              overflowX:       'auto',
              marginBottom:    '0.6em',
              color,
            }}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          style={{
            background:   'rgba(0,0,0,0.07)',
            borderRadius: '4px',
            padding:      '0.1em 0.35em',
            fontSize:     '0.875em',
            fontFamily:   'ui-monospace, monospace',
            color,
          }}
        >
          {children}
        </code>
      );
    },
    // コードブロック
    pre: ({ children }) => (
      <pre
        style={{
          margin:       '0 0 0.6em',
          padding:      0,
          background:   'transparent',
          overflowX:    'auto',
        }}
      >
        {children}
      </pre>
    ),
    // 水平線
    hr: () => (
      <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.12)', margin: '0.75em 0' }} />
    ),
    // リンク（外部は新タブ）
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--color-orange)', textDecoration: 'underline' }}
      >
        {children}
      </a>
    ),
    // 引用
    blockquote: ({ children }) => (
      <blockquote
        style={{
          borderLeft:  '3px solid var(--color-orange)',
          paddingLeft: '0.75em',
          margin:      '0 0 0.6em',
          opacity:     0.85,
          color,
        }}
      >
        {children}
      </blockquote>
    ),
  };
}

export function MarkdownContent({ children, color = 'inherit', fontSize = 'inherit' }: MarkdownContentProps) {
  return (
    <div style={{ lineHeight: 1.75 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={makeComponents(color, fontSize)}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
