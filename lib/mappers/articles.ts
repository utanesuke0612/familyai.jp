/**
 * lib/mappers/articles.ts
 * familyai.jp — DB 行 → API DTO（shared/types 契約）変換マッパー（Rev26 #1）
 *
 * 目的:
 * - DB モデル（lib/db/schema.ts）・API DTO（shared/types）・UI の 3 層を明確に分離する。
 * - 公開 API（/api/articles, /api/articles/:slug）で同じ変換を必ず経由させることで、
 *   iOS/Android 側の shared/api クライアントが安定した契約で記事データを受け取れる。
 *
 * 変換責務:
 *   - timestamp 列 → ISO 8601 文字列
 *   - roles / categories → shared/types の union 型に narrow
 *   - body（DB）→ Markdown 文字列（Article のみ）
 *   - readingMin は本文から計算（Article のみ）
 */

import type {
  Article,
  ArticleSummary,
  ContentCategory,
  DifficultyLevel,
  FamilyRole,
} from '@/shared/types';

// ── 型ガード兼フィルタ ────────────────────────────────────────
const FAMILY_ROLES: readonly FamilyRole[] = ['papa', 'mama', 'kids', 'senior', 'common'];
const CATEGORIES:   readonly ContentCategory[] = ['image-gen', 'voice', 'education', 'housework'];
const LEVELS:       readonly DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

function filterRoles(values: string[] | null | undefined): FamilyRole[] {
  if (!values) return [];
  return values.filter((v): v is FamilyRole => (FAMILY_ROLES as readonly string[]).includes(v));
}

function filterCategories(values: string[] | null | undefined): ContentCategory[] {
  if (!values) return [];
  return values.filter((v): v is ContentCategory => (CATEGORIES as readonly string[]).includes(v));
}

function coerceLevel(value: string | null | undefined): DifficultyLevel {
  return (LEVELS as readonly string[]).includes(value ?? '')
    ? (value as DifficultyLevel)
    : 'beginner';
}

function toIso(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return new Date(v).toISOString();
}

/**
 * 読了目安分を計算する（日本語 400 字/分 を基準）。
 * Markdown 記法（# ` * 等）は概算に影響しない程度の簡易計算。
 */
export function estimateReadingMin(body: string): number {
  const chars = body.replace(/\s+/g, '').length;
  return Math.max(1, Math.ceil(chars / 400));
}

// ── DB 行の最小型（他層から独立させるため局所定義）─────────
export interface ArticleRowSummary {
  id:               string;
  slug:             string;
  title:            string;
  description:      string | null;
  roles:            string[] | null;
  categories:       string[] | null;
  level:            string;
  audioUrl:         string | null;
  audioDurationSec: number | null;
  audioLanguage:    string | null;
  thumbnailUrl:     string | null;
  viewCount:        number;
  audioPlayCount:   number;
  isFeatured:       boolean;
  publishedAt:      Date | string | null;
  updatedAt?:       Date | string | null;
}

export interface ArticleRow extends ArticleRowSummary {
  body:            string;
  audioTranscript: string | null;
}

// ── 変換関数 ──────────────────────────────────────────────────
export function toArticleSummary(row: ArticleRowSummary): ArticleSummary {
  return {
    id:               row.id,
    slug:             row.slug,
    title:            row.title,
    description:      row.description,
    roles:            filterRoles(row.roles),
    categories:       filterCategories(row.categories),
    level:            coerceLevel(row.level),
    audioUrl:         row.audioUrl,
    audioDurationSec: row.audioDurationSec,
    audioLanguage:    row.audioLanguage,
    thumbnailUrl:     row.thumbnailUrl,
    viewCount:        row.viewCount,
    audioPlayCount:   row.audioPlayCount,
    isFeatured:       row.isFeatured,
    publishedAt:      toIso(row.publishedAt),
    updatedAt:        toIso(row.updatedAt) ?? undefined,
  };
}

export function toArticleDetail(row: ArticleRow): Article {
  return {
    ...toArticleSummary(row),
    body:            row.body,
    audioTranscript: row.audioTranscript,
    readingMin:      estimateReadingMin(row.body),
  };
}
