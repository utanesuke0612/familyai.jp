'use client';

/**
 * components/home/CategoryFilter.tsx
 * familyai.jp — カテゴリフィルターUI（Rev40 Phase H: /tools と同じカード式）
 *
 * - 2x2 / 1x4 のカード式（絵文字 + ラベル）
 * - 複数選択対応・URL クエリ `cat` をカンマ区切りで更新
 * - 選択中: 朱色枠 + 朱色テキスト
 * - 未選択（他が選択中）: opacity 0.55 で淡く
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Home, Briefcase, Palette } from 'lucide-react';
import { CATEGORY_LABEL } from '@/shared';
import type { ContentCategory } from '@/shared';

const CATEGORY_ICON: Record<ContentCategory, typeof BookOpen> = {
  education: BookOpen,
  lifestyle: Home,
  work:      Briefcase,
  creative:  Palette,
};

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

  const hasSelection = selected.length > 0;

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
        {hasSelection && (
          <button
            onClick={clearAll}
            className="font-mincho text-xs underline underline-offset-2 hover:opacity-70 transition-opacity min-h-[44px] px-2"
            style={{ color: 'var(--sumi-light)' }}
          >
            解除（{selected.length}）
          </button>
        )}
      </div>

      {/* カード一覧（2x2 固定・/tools ヘッダーの右カラムにも収まる） */}
      <div
        className="grid grid-cols-2 gap-3"
        role="group"
        aria-label="カテゴリフィルター"
      >
        {categories.map((cat) => {
          const isActive = selected.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              className="px-4 py-4 text-center transition-[transform,opacity,border-color,color] duration-200 hover:-translate-y-0.5 min-h-[44px]"
              style={{
                background:   'var(--washi-deep)',
                border:       `1px solid ${isActive ? 'var(--shu)' : 'var(--line)'}`,
                borderRadius: '4px',
                opacity:      hasSelection && !isActive ? 0.55 : 1,
              }}
              aria-pressed={isActive}
              aria-label={`${CATEGORY_LABEL[cat]}フィルター`}
            >
              {(() => { const Icon = CATEGORY_ICON[cat]; return <Icon size={28} strokeWidth={1.25} aria-hidden="true" />; })()}
              <div
                className="mt-2 font-mincho text-sm"
                style={{
                  color:      isActive ? 'var(--shu)' : 'var(--sumi)',
                  fontWeight: 500,
                }}
              >
                {CATEGORY_LABEL[cat]}
              </div>
            </button>
          );
        })}
      </div>

      {/* 選択中のサマリー */}
      {hasSelection && (
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
