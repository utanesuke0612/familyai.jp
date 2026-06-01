/**
 * components/article/ArticleCard.tsx
 * familyai.jp — 記事カードコンポーネント（Rev40 Phase B: Mingei リファクタ）
 *
 * - ヘッダー行：公開日（左）| タグ最大2個（右）
 * - ボディ    ：明朝タイトル + 説明文
 * - メタ      ：カテゴリ / レベル / 読了時間 を縦罫線で区切る
 * - ホバー    ：紙が右下に 2px ずれる（box-mingei::after）+ タイトル朱色
 */

import Link from 'next/link';
import {
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
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
    tags?:       string[];
    level:       string;
    thumbnailUrl?: string | null;
    publishedAt: Date | string | null;
    viewCount?:  number;
    body?:       string; // 読了時間計算用（任意）
  };
  /** カード表示の優先度（featured のときは少し大きめ） */
  featured?: boolean;
}

// ── 内部ユーティリティ ──────────────────────────────────────
function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function formatDateDot(value: Date | string | null | undefined): string | null {
  const iso = toIsoString(value);
  if (!iso) return null;
  return new Date(iso)
    .toLocaleDateString('ja-JP', {
      year:  'numeric',
      month: '2-digit',
      day:   '2-digit',
    })
    .replace(/\//g, '.');
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const primaryCategory = (article.categories[0] ?? 'other') as ContentCategory;
  const level           = article.level as DifficultyLevel;
  const visibleTags     = (article.tags ?? []).slice(0, 2);

  const readingMin   = article.body ? estimateReadingMin(article.body) : null;
  const dateStr      = formatDateDot(article.publishedAt);
  const dateTimeAttr = toIsoString(article.publishedAt) ?? undefined;

  return (
    <Link
      href={`/learn/${article.slug}`}
      className="group block h-full"
      aria-label={`${article.title} — 記事を読む`}
    >
      <article className="box-ehon p-0 h-[240px] transition-transform duration-200 hover:-translate-y-1">
        <div className="p-5 h-full flex flex-col gap-3">

          {/* 公開日（左）+ タグ最大2個（右） */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            {dateStr ? (
              <time className="serial shrink-0" dateTime={dateTimeAttr}>
                {dateStr}
              </time>
            ) : (
              <span />
            )}
            {visibleTags.length > 0 && (
              <div className="flex gap-1 min-w-0">
                {visibleTags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mincho text-[11px] truncate"
                    style={{
                      color:        'var(--sumi-light)',
                      border:       '1px solid var(--line-soft)',
                      borderRadius: '4px',
                      padding:      '2px 6px',
                      maxWidth:     '90px',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* タイトル — Shippori Mincho */}
          <h3
            className="font-mincho leading-snug line-clamp-2 group-hover:text-[var(--shu)] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-2 transition-colors"
            style={{
              fontSize:   featured ? '20px' : '17px',
              fontWeight: 500,
              color:      'var(--sumi)',
              minHeight:  featured ? '52px' : '44px',
            }}
          >
            {article.title}
          </h3>

          {/* 説明 */}
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{
              color:     'var(--sumi-light)',
              minHeight: '40px',
              visibility: article.description ? 'visible' : 'hidden',
            }}
          >
            {article.description || '記事の説明文がここに入ります。'}
          </p>

          {/* メタ情報（横区切り罫線で表現） */}
          <div
            className="flex items-center gap-3 pt-3 mt-auto font-mincho text-xs min-w-0"
            style={{
              borderTop: '1px solid var(--line-soft)',
              color:     'var(--sumi-light)',
              minHeight: '28px',
            }}
          >
            <span className="truncate min-w-0">{CATEGORY_LABEL[primaryCategory] ?? primaryCategory}</span>
            <span className="text-[var(--line)] shrink-0" aria-hidden="true">│</span>
            <span className="truncate min-w-0">{DIFFICULTY_LABEL[level] ?? level}</span>
            {readingMin && (
              <>
                <span className="text-[var(--line)] shrink-0" aria-hidden="true">│</span>
                <span className="truncate min-w-0 text-right ml-auto">{readingMin}分で読める</span>
              </>
            )}
          </div>

        </div>
      </article>
    </Link>
  );
}
