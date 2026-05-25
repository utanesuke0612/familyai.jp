'use client';

/**
 * components/learn/TagFilter.tsx
 * familyai.jp — 公開記事一覧の自由タグフィルター
 *
 * - DB 上の公開記事に存在するタグを候補として表示
 * - 複数選択対応・URL クエリ `tag` をカンマ区切りで更新
 * - カテゴリ / 検索 / 難易度 / 並び順の条件は保持する
 */

import { useRouter, useSearchParams } from 'next/navigation';

interface TagFilterProps {
  tags: string[];
}

function parseTags(value: string | null): string[] {
  if (!value) return [];
  return Array.from(new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))).slice(0, 20);
}

export function TagFilter({ tags }: TagFilterProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const selected = parseTags(searchParams.get('tag'));
  const options  = Array.from(new Set([...selected, ...tags])).filter(Boolean);

  function commit(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) {
      params.set('tag', next.join(','));
    } else {
      params.delete('tag');
    }
    params.delete('page');
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function toggle(tag: string) {
    const next = selected.includes(tag)
      ? selected.filter((item) => item !== tag)
      : [...selected, tag].slice(0, 20);
    commit(next);
  }

  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <span
        className="font-mincho text-xs tracking-wide shrink-0"
        style={{ color: 'var(--sumi-light)' }}
      >
        タグ：
      </span>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="タグフィルター"
      >
        {options.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className="px-3 py-1.5 text-xs font-mincho border transition-[background-color,border-color,color,opacity] duration-200 min-h-[36px]"
              style={{
                background:   active ? 'var(--shu)' : 'var(--washi-light)',
                borderColor:  active ? 'var(--shu)' : 'var(--line)',
                color:        active ? 'var(--washi)' : 'var(--sumi-light)',
                borderRadius: '4px',
                opacity:      selected.length > 0 && !active ? 0.72 : 1,
              }}
              aria-pressed={active}
            >
              #{tag}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => commit([])}
          className="font-mincho text-xs underline underline-offset-2 hover:opacity-70 transition-opacity min-h-[36px] px-2"
          style={{ color: 'var(--sumi-light)' }}
        >
          タグ解除（{selected.length}）
        </button>
      )}
    </div>
  );
}
