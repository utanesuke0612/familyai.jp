'use client';

/**
 * components/home/StatsRow.tsx
 * familyai.jp — トップページ統計バー
 */

import { useScrollReveal } from '@/hooks/useScrollReveal';

const STATS = [
  { value: '2',     label: 'AIツール' },
  { value: '無料',  label: '基本機能すべて' },
  { value: '毎週',  label: '新着コンテンツ更新' },
] as const;

export function StatsRow() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="py-5 border-y"
      style={{
        background:   'var(--washi-deep)',
        borderColor:  'var(--line)',
      }}
    >
      <div
        className="max-w-container mx-auto grid grid-cols-2 sm:grid-cols-3 gap-6 text-center"
        style={{ paddingInline: 'var(--container-px)' }}
      >
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={`reveal reveal-delay-${i + 1} flex flex-col items-center gap-1`}
          >
            <span
              className="font-mincho text-2xl tracking-wide"
              style={{ color: 'var(--sumi)' }}
            >
              {s.value}
            </span>
            <span className="rule-dashed" aria-hidden="true" />
            <span
              className="font-mincho text-xs tracking-wide"
              style={{ color: 'var(--sumi-light)' }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
