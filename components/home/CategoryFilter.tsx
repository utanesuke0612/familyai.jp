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
import { CATEGORY_LABEL } from '@/shared';
import type { ContentCategory } from '@/shared';
// NOTE: CATEGORY_EMOJI を撤廃（民藝化のため絵文字を削除）

// ── カテゴリ定義（表示順） ─────────────────────────────────────
const CATEGORIES: ContentCategory[] = [
  'education',
  'lifestyle',
  'work',
  'creative',
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
          className="font-mincho text-sm tracking-wide"
          style={{ color: 'var(--sumi)' }}
        >
          <span className="ornament" aria-hidden="true">⁂</span>
          <span className="mx-2">分類で絞り込む</span>
          <span className="ornament" aria-hidden="true">⁂</span>
        </p>
        {selected.length > 0 && (
          <button
            onClick={clearAll}
            className="font-mincho text-xs underline underline-offset-2 hover:opacity-70 transition-opacity min-h-[44px] px-2"
            style={{ color: 'var(--sumi-light)' }}
          >
            解除（{selected.length}）
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
              className="inline-flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm font-mincho border transition-[border-color,background-color,color] duration-200 min-h-[44px]"
              style={{
                background:   isActive ? 'var(--shu)'   : 'var(--washi)',
                borderColor:  isActive ? 'var(--shu)'   : 'var(--line)',
                color:        isActive ? 'var(--washi)' : 'var(--sumi-light)',
                borderRadius: '4px',
              }}
              aria-pressed={isActive}
              aria-label={`${CATEGORY_LABEL[cat]}フィルター`}
            >
              <span>{CATEGORY_LABEL[cat]}</span>
            </button>
          );
        })}
      </div>

      {/* 選択中のサマリー */}
      {selected.length > 0 && (
        <p
          className="font-mincho text-xs animate-fade-in-up"
          style={{ color: 'var(--sumi-light)' }}
        >
          <span className="rule-dashed mr-2" aria-hidden="true" />
          選択中：{selected.map((c) => CATEGORY_LABEL[c]).join('・')}
        </p>
      )}
    </div>
  );
}
