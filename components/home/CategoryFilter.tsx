'use client';

/**
 * components/home/CategoryFilter.tsx
 * familyai.jp — カテゴリフィルターUI
 *
 * - チップ形式（pill shape）・複数選択対応
 * - 選択状態で URL クエリパラメータ `cat` を更新
 * - 現在の絞り込み条件を保ったまま `cat` を更新
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { CATEGORY_LABEL, CATEGORY_EMOJI } from '@/shared';
import type { ContentCategory } from '@/shared';

// ── カテゴリ定義（表示順） ─────────────────────────────────────
const CATEGORIES: ContentCategory[] = [
  'image-gen',
  'voice',
  'education',
  'housework',
];

interface CategoryFilterProps {
  /** 表示するカテゴリを絞り込む（未指定で全件） */
  visibleCategories?: ContentCategory[];
  className?: string;
}

export function CategoryFilter({
  visibleCategories,
  className = '',
}: CategoryFilterProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // カンマ区切りで複数指定対応
  const selectedRaw = searchParams.get('cat') ?? '';
  const selected    = selectedRaw ? selectedRaw.split(',') as ContentCategory[] : [];

  const categories = visibleCategories ?? CATEGORIES;

  function toggle(cat: ContentCategory) {
    const params = new URLSearchParams(searchParams.toString());
    let next: ContentCategory[];

    if (selected.includes(cat)) {
      next = selected.filter((c) => c !== cat);
    } else {
      next = [...selected, cat];
    }

    if (next.length === 0) {
      params.delete('cat');
    } else {
      params.set('cat', next.join(','));
    }
    params.delete('page'); // フィルター変更時はページをリセット
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('cat');
    params.delete('page');
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* ラベル + クリアボタン */}
      <div className="flex items-center justify-between gap-4">
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--color-brown)' }}
        >
          カテゴリで絞り込む
        </p>
        {selected.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs underline underline-offset-2 hover:opacity-70 transition-opacity min-h-[44px] px-2"
            style={{ color: 'var(--color-brown-light)' }}
          >
            クリア ({selected.length})
          </button>
        )}
      </div>

      {/* チップ一覧 */}
      <div
        className="flex gap-2 overflow-x-auto whitespace-nowrap pb-2 -mx-1 px-1"
        role="group"
        aria-label="カテゴリフィルター"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}
      >
        {categories.map((cat) => {
          const isActive = selected.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              className="inline-flex shrink-0 items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-[transform,box-shadow,border-color,background-color,color] duration-150 min-h-[44px]"
              style={{
                background:   isActive ? 'var(--color-orange)' : 'white',
                borderColor:  isActive ? 'var(--color-orange)' : 'var(--color-beige-dark)',
                color:        isActive ? 'white' : 'var(--color-brown-light)',
                transform:    isActive ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow:    isActive ? 'var(--shadow-orange)' : 'none',
              }}
              aria-pressed={isActive}
              aria-label={`${CATEGORY_LABEL[cat]}フィルター`}
            >
              <span aria-hidden="true">{CATEGORY_EMOJI[cat]}</span>
              <span>{CATEGORY_LABEL[cat]}</span>
            </button>
          );
        })}
      </div>

      {/* 選択中のサマリー */}
      {selected.length > 0 && (
        <p
          className="text-xs animate-fade-in-up"
          style={{ color: 'var(--color-brown-light)' }}
        >
          選択中：{selected.map((c) => CATEGORY_LABEL[c]).join('・')}
        </p>
      )}
    </div>
  );
}
