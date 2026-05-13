/**
 * components/article/ArticleCard.tsx
 * familyai.jp — 記事カードコンポーネント（Rev40 Phase B: Mingei リファクタ）
 *
 * - サムネイル：washi-light 背景 + 線画アイコン（カテゴリ別 stroke-1）
 * - ボディ ：通し番号「№ XXX」+ 日付（ドット区切り）+ 明朝タイトル
 * - メタ  ：カテゴリ / レベル / 読了時間 を縦罫線で区切る
 * - ホバー：紙が右下に 2px ずれる（box-mingei::after）+ タイトル朱色
 */

import Link from 'next/link';
import { BookOpen, Home, Briefcase, Palette } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
    level:       string;
    thumbnailUrl?: string | null;
    publishedAt: Date | string | null;
    viewCount?:  number;
    body?:       string; // 読了時間計算用（任意）
  };
  /** カード表示の優先度（featured のときは少し大きめ） */
  featured?: boolean;
}

// ── カテゴリ別 線画アイコン ─────────────────────────────────
const CATEGORY_ICON: Record<string, LucideIcon> = {
  education: BookOpen,
  lifestyle: Home,
  work:      Briefcase,
  creative:  Palette,
};

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
  const Icon            = CATEGORY_ICON[primaryCategory] ?? BookOpen;

  const serial = article.viewCount !== undefined
    ? `№ ${String(article.viewCount).padStart(3, '0')}`
    : '№ ---';

  const readingMin   = article.body ? estimateReadingMin(article.body) : null;
  const dateStr      = formatDateDot(article.publishedAt);
  const dateTimeAttr = toIsoString(article.publishedAt) ?? undefined;

  return (
    <Link
      href={`/learn/${article.slug}`}
      className="group block"
      aria-label={`${article.title} — 記事を読む`}
    >
      <article className="box-ehon p-0 transition-transform duration-200">
        {/* ── サムネイル（線画アイコン中央配置）── */}
        <div
          className="flex items-center justify-center border-b"
          style={{
            height:       featured ? '180px' : '140px',
            background:   'var(--washi-light)',
            borderColor:  'var(--line-soft)',
          }}
        >
          <Icon
            strokeWidth={1}
            size={featured ? 56 : 44}
            style={{ color: 'var(--sumi-soft)' }}
            aria-hidden="true"
          />
        </div>

        {/* ── ボディ ── */}
        <div className="p-5 flex flex-col gap-3">

          {/* 通し番号 + 短罫線 + 日付 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="serial">{serial}</span>
              <span className="rule-mingei" aria-hidden="true" />
            </div>
            {dateStr && (
              <time className="serial" dateTime={dateTimeAttr}>
                {dateStr}
              </time>
            )}
          </div>

          {/* タイトル — Shippori Mincho */}
          <h3
            className="font-mincho leading-snug line-clamp-2 group-hover:text-[var(--shu)] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-2 transition-colors"
            style={{
              fontSize:   featured ? '20px' : '17px',
              fontWeight: 500,
              color:      'var(--sumi)',
            }}
          >
            {article.title}
          </h3>

          {/* 説明 */}
          {article.description && (
            <p
              className="text-xs leading-relaxed line-clamp-2"
              style={{ color: 'var(--sumi-light)' }}
            >
              {article.description}
            </p>
          )}

          {/* メタ情報（横区切り罫線で表現） */}
          <div
            className="flex items-center gap-3 pt-3 mt-1 font-mincho text-xs"
            style={{
              borderTop: '1px solid var(--line-soft)',
              color:     'var(--sumi-light)',
            }}
          >
            <span>{CATEGORY_LABEL[primaryCategory] ?? primaryCategory}</span>
            <span className="text-[var(--line)]" aria-hidden="true">│</span>
            <span>{DIFFICULTY_LABEL[level] ?? level}</span>
            {readingMin && (
              <>
                <span className="text-[var(--line)]" aria-hidden="true">│</span>
                <span>{readingMin}分で読める</span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
