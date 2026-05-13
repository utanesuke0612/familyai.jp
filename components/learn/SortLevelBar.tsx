'use client';

/**
 * components/learn/SortLevelBar.tsx
 * familyai.jp — ソート順・難易度フィルター（URL クエリ更新）
 *
 * - sort: 'latest' | 'popular'
 * - level: 'beginner' | 'intermediate' | 'advanced' | ''（全て）
 * - 現在の cat パラメータを保持したまま更新
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { DIFFICULTY_LABEL } from '@/shared';
import type { DifficultyLevel } from '@/shared';

const LEVELS: Array<{ value: DifficultyLevel | ''; label: string }> = [
  { value: '',             label: 'すべて'   },
  { value: 'beginner',     label: DIFFICULTY_LABEL.beginner     },
  { value: 'intermediate', label: DIFFICULTY_LABEL.intermediate },
  { value: 'advanced',     label: DIFFICULTY_LABEL.advanced     },
];

export function SortLevelBar() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const sort  = searchParams.get('sort')  ?? 'latest';
  const level = searchParams.get('level') ?? '';

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-6">

      {/* ── ソート ── */}
      <div className="flex items-center gap-1.5">
        <span className="font-mincho text-xs tracking-wide" style={{ color: 'var(--sumi-light)' }}>
          並び順：
        </span>
        {(['latest', 'popular'] as const).map((s) => {
          const active = sort === s;
          return (
            <button
              key={s}
              onClick={() => update('sort', s)}
              className="px-3 py-1.5 text-xs font-mincho transition-[background-color,border-color,color] duration-200 min-h-[36px]"
              style={{
                background:   active ? 'var(--sumi)'  : 'var(--washi)',
                color:        active ? 'var(--washi)' : 'var(--sumi-light)',
                border:       `1px solid ${active ? 'var(--sumi)' : 'var(--line)'}`,
                borderRadius: '4px',
              }}
              aria-pressed={active}
            >
              {s === 'latest' ? '新着順' : '人気順'}
            </button>
          );
        })}
      </div>

      {/* ── 難易度 ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-mincho text-xs tracking-wide" style={{ color: 'var(--sumi-light)' }}>
          難易度：
        </span>
        {LEVELS.map(({ value, label }) => {
          const active = level === value;
          return (
            <button
              key={value || 'all'}
              onClick={() => update('level', value)}
              className="px-3 py-1.5 text-xs font-mincho transition-[background-color,border-color,color] duration-200 min-h-[36px]"
              style={{
                background:   active ? 'var(--shu)'   : 'var(--washi)',
                color:        active ? 'var(--washi)' : 'var(--sumi-light)',
                border:       `1px solid ${active ? 'var(--shu)' : 'var(--line)'}`,
                borderRadius: '4px',
              }}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>

    </div>
  );
}
