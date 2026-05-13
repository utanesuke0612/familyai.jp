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

type ArticleItem = ArticleCardProps['article'];

interface ArticleGridProps {
  articles:   ArticleItem[];
  loading?:   boolean;
  skeletonCount?: number;
  /** 最初の1枚を featured（大きめ）表示にするか */
  firstFeatured?: boolean;
  className?: string;
}

// ── スケルトンカード（Rev40 Phase B: Mingei 矩形）─────────────
function SkeletonCard() {
  return (
    <div className="box-ehon p-0">
      {/* サムネイル（washi-light） */}
      <div
        style={{
          height:       '140px',
          background:   'var(--washi-light)',
          borderBottom: '1px solid var(--line-soft)',
        }}
      />
      <div className="p-5 flex flex-col gap-3">
        <div className="flex justify-between">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-3 w-20" />
        </div>
        <div className="skeleton h-5 w-full" />
        <div className="skeleton h-4 w-4/5" />
        <div
          className="flex gap-3 pt-3 mt-1"
          style={{ borderTop: '1px solid var(--line-soft)' }}
        >
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-20" />
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
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${className}`}
    >
      {articles.map((article, i) => (
        <div
          key={article.slug}
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
