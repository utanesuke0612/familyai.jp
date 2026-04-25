/**
 * components/article/ArticleCard.tsx
 * familyai.jp — 記事カードコンポーネント
 *
 * - サムネイル：カテゴリ背景色 + カテゴリ絵文字
 * - ボディ：カテゴリタグ / タイトル / 日付 / レベル / 音声マーク
 * - ホバー：浮き上がり + シャドウ + ボーダー強調
 */

import Link from 'next/link';
import {
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  DIFFICULTY_LABEL,
  formatDateJa,
  estimateReadingMin,
} from '@/shared';
import type { ContentCategory, DifficultyLevel } from '@/shared';

// ── Props ────────────────────────────────────────────────────
export interface ArticleCardProps {
  article: {
    slug:        string;
    title:       string;
    description: string;
    categories:  string[];
    level:       string;
    thumbnailUrl?: string | null;
    publishedAt: Date | string | null;
    viewCount?:  number;
    body?:       string; // 読了時間計算用（任意）
  };
  /** カード表示の優先度（featured のときは少し大きめ） */
  featured?: boolean;
}

// ── カテゴリ別サムネイル背景色 ────────────────────────────────
const CATEGORY_BG: Record<string, string> = {
  education: 'var(--color-mint)',
  lifestyle: 'var(--color-peach-light)',
  work: 'var(--color-sky)',
  creative: 'var(--color-yellow)',
};

// ── 難易度バッジ色 ────────────────────────────────────────────
const LEVEL_COLOR: Record<string, string> = {
  beginner:     'var(--color-mint)',
  intermediate: 'var(--color-yellow)',
  advanced:     'var(--color-peach)',
};

const LEVEL_TEXT_COLOR: Record<string, string> = {
  beginner:     '#145c38',
  intermediate: '#7a5000',
  advanced:     'var(--color-brown)',
};

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const primaryCategory = (article.categories[0] ?? 'other') as ContentCategory;
  const level           = article.level as DifficultyLevel;

  const thumbBg   = CATEGORY_BG[primaryCategory] ?? 'var(--color-common-bg)';
  const readingMin = article.body ? estimateReadingMin(article.body) : null;
  const dateStr   = article.publishedAt
    ? formatDateJa(
        article.publishedAt instanceof Date
          ? article.publishedAt.toISOString()
          : article.publishedAt,
      )
    : null;

  return (
    <Link
      href={`/learn/${article.slug}`}
      className="group block rounded-2xl overflow-hidden border-2 border-transparent shadow-warm-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1.5 hover:shadow-warm-lg hover:border-orange-200"
      style={{
        background:  'white',
      }}
      aria-label={`${article.title} — 記事を読む`}
    >
      {/* ── サムネイル ── */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          height:     featured ? '180px' : '140px',
          background: thumbBg,
        }}
      >
        {/* カテゴリ絵文字 */}
        <span
          className="text-6xl transition-transform duration-300 group-hover:scale-110"
          aria-hidden="true"
        >
          {CATEGORY_EMOJI[primaryCategory]}
        </span>

      </div>

      {/* ── ボディ ── */}
      <div className="p-5 flex flex-col gap-3">

        {/* カテゴリタグ */}
        <div className="flex flex-wrap gap-1.5">
          {article.categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: 'var(--color-beige)',
                color:      'var(--color-brown-light)',
              }}
            >
              {CATEGORY_EMOJI[cat as ContentCategory]}
              {CATEGORY_LABEL[cat as ContentCategory] ?? cat}
            </span>
          ))}
        </div>

        {/* タイトル */}
        <h3
          className="font-bold leading-snug line-clamp-2 group-hover:text-orange-500 transition-colors"
          style={{
            fontSize: featured ? '17px' : '15px',
            color:    'var(--color-brown)',
          }}
        >
          {article.title}
        </h3>

        {/* 説明文 */}
        {article.description && (
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{ color: 'var(--color-brown-light)' }}
          >
            {article.description}
          </p>
        )}

        {/* メタ情報 */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t"
          style={{ borderColor: 'var(--color-beige)' }}
        >
          {/* 左：日付 + 読了時間 */}
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-brown-light)' }}>
            {dateStr && <span>{dateStr}</span>}
            {readingMin && (
              <>
                <span aria-hidden="true">·</span>
                <span>{readingMin}分で読める</span>
              </>
            )}
          </div>

          {/* 右：難易度バッジ */}
          <span
            className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: LEVEL_COLOR[level]   ?? 'var(--color-beige)',
              color:      LEVEL_TEXT_COLOR[level] ?? 'var(--color-brown)',
            }}
          >
            {DIFFICULTY_LABEL[level] ?? level}
          </span>
        </div>

      </div>
    </Link>
  );
}
