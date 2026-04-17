'use client';

/**
 * components/article/ArticleGrid.tsx
 * familyai.jp — 記事グリッドコンポーネント
 *
 * - レスポンシブグリッド（1 → 2 → 3カラム）
 * - スケルトンローディング対応
 * - 空状態のメッセージ表示
 */

import { ArticleCard } from './ArticleCard';
import type { ArticleCardProps } from './ArticleCard';
import { useScrollReveal } from '@/hooks/useScrollReveal';

type ArticleItem = ArticleCardProps['article'];

interface ArticleGridProps {
  articles:   ArticleItem[];
  loading?:   boolean;
  skeletonCount?: number;
  /** 最初の1枚を featured（大きめ）表示にするか */
  firstFeatured?: boolean;
  className?: string;
}

// ── スケルトンカード ───────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'white', boxShadow: 'var(--shadow-warm-sm)' }}
    >
      <div className="skeleton" style={{ height: '140px' }} />
      <div className="p-5 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
        <div className="skeleton h-5 w-full rounded" />
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="flex justify-between pt-1">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── 空状態 ────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div
      className="col-span-full flex flex-col items-center justify-center gap-4 py-20 rounded-2xl"
      style={{ background: 'var(--color-beige)' }}
    >
      <span className="text-5xl">🔍</span>
      <p
        className="font-display font-bold text-lg"
        style={{ color: 'var(--color-brown)' }}
      >
        記事が見つかりませんでした
      </p>
      <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
        フィルターを変更してもう一度お試しください
      </p>
    </div>
  );
}

// ── メインコンポーネント ───────────────────────────────────────
export function ArticleGrid({
  articles,
  loading        = false,
  skeletonCount  = 6,
  firstFeatured  = false,
  className      = '',
}: ArticleGridProps) {
  const ref = useScrollReveal<HTMLDivElement>();

  if (loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className={`grid grid-cols-1 ${className}`}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${className}`}
    >
      {articles.map((article, i) => (
        <div
          key={article.slug}
          className="reveal"
          style={{ animationDelay: `${Math.min(i * 80, 400)}ms` }}
        >
          <ArticleCard
            article={article}
            featured={firstFeatured && i === 0}
          />
        </div>
      ))}
    </div>
  );
}
