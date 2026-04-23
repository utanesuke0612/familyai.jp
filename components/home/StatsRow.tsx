'use client';

/**
 * components/home/StatsRow.tsx
 * familyai.jp — トップページ統計バー
 */

import { useScrollReveal } from '@/hooks/useScrollReveal';

const STATS = [
  { emoji: '📚', value: '100+',   label: 'AI活用事例' },
  { emoji: '🧰', value: '2',       label: 'AIツール' },
  { emoji: '🆓', value: '無料',   label: '基本機能すべて' },
  { emoji: '🔄', value: '毎週',   label: '新着コンテンツ更新' },
] as const;

export function StatsRow() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="py-4 border-y"
      style={{
        background:   'var(--color-beige)',
        borderColor:  'var(--color-beige-dark)',
      }}
    >
      <div
        className="max-w-container mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center"
        style={{ paddingInline: 'var(--container-px)' }}
      >
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={`reveal reveal-delay-${i + 1} flex flex-col items-center gap-1`}
          >
            <span className="text-3xl mb-1">{s.emoji}</span>
            <span
              className="font-display font-bold text-3xl"
              style={{ color: 'var(--color-orange)' }}
            >
              {s.value}
            </span>
            <span
              className="text-sm"
              style={{ color: 'var(--color-brown-light)' }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
