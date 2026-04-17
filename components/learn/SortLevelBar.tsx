'use client';

/**
 * components/learn/SortLevelBar.tsx
 * familyai.jp — ソート順・難易度フィルター（URL クエリ更新）
 *
 * - sort: 'latest' | 'popular'
 * - level: 'beginner' | 'intermediate' | 'advanced' | ''（全て）
 * - 現在の role / cat パラメータを保持したまま更新
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
        <span className="text-xs font-medium" style={{ color: 'var(--color-brown-light)' }}>
          並び順：
        </span>
        {(['latest', 'popular'] as const).map((s) => {
          const active = sort === s;
          return (
            <button
              key={s}
              onClick={() => update('sort', s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-150 min-h-[36px]"
              style={{
                background:  active ? 'var(--color-brown)' : 'white',
                color:       active ? 'white' : 'var(--color-brown-light)',
                border:      `1px solid ${active ? 'var(--color-brown)' : 'var(--color-beige-dark)'}`,
                transform:   active ? 'translateY(-1px)' : 'none',
                boxShadow:   active ? 'var(--shadow-warm-sm)' : 'none',
              }}
              aria-pressed={active}
            >
              {s === 'latest' ? '🕐 新着順' : '🔥 人気順'}
            </button>
          );
        })}
      </div>

      {/* ── 難易度 ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-medium" style={{ color: 'var(--color-brown-light)' }}>
          難易度：
        </span>
        {LEVELS.map(({ value, label }) => {
          const active = level === value;
          return (
            <button
              key={value || 'all'}
              onClick={() => update('level', value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-150 min-h-[36px]"
              style={{
                background:  active ? 'var(--color-orange)' : 'white',
                color:       active ? 'white' : 'var(--color-brown-light)',
                border:      `1px solid ${active ? 'var(--color-orange)' : 'var(--color-beige-dark)'}`,
                transform:   active ? 'translateY(-1px)' : 'none',
                boxShadow:   active ? 'var(--shadow-orange)' : 'none',
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
