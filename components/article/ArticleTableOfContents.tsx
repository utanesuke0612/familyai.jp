import type { ArticleTocItem } from '@/lib/articles/toc';

interface ArticleTableOfContentsProps {
  items: ArticleTocItem[];
}

export function ArticleTableOfContents({ items }: ArticleTableOfContentsProps) {
  if (items.length === 0) return null;

  return (
    <details
      className="group"
      style={{
        background:   'rgba(255,255,255,0.86)',
        border:       '1px solid var(--line)',
        borderRadius: '4px',
        padding:      '0.75rem 0.875rem',
      }}
    >
      <summary
        className="flex cursor-pointer select-none items-center justify-between gap-3 font-mincho text-sm"
        style={{ color: 'var(--sumi)', fontWeight: 500 }}
      >
        <span>この記事の目次</span>
        <span
          aria-hidden="true"
          className="transition-transform group-open:rotate-180"
          style={{ color: 'var(--sumi-light)' }}
        >
          ˅
        </span>
      </summary>

      <nav aria-label="記事の目次" className="mt-3">
        <ol className="flex flex-col" style={{ gap: '0.15rem' }}>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${encodeURIComponent(item.id)}`}
                className="block text-sm leading-relaxed transition-opacity hover:opacity-70"
                style={{
                  color:       'var(--sumi-light)',
                  paddingLeft: item.level === 2 ? '0.875rem' : 0,
                  borderLeft:  item.level === 2 ? '1px solid var(--line-soft)' : 'none',
                }}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
