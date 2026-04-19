/**
 * app/api/articles/route.ts
 * familyai.jp — 記事一覧 API
 *
 * GET /api/articles
 *
 * クエリパラメータ:
 *   role   : 'papa' | 'mama' | 'kids' | 'senior' | 'common'（任意）
 *   cat    : ContentCategory（任意）
 *   level  : 'beginner' | 'intermediate' | 'advanced'（任意）
 *   page   : number（デフォルト: 1）
 *   limit  : number（デフォルト: 12・最大: 50）
 *   sort   : 'latest' | 'popular'（デフォルト: 'latest'）
 *
 * レスポンス（200）:
 * {
 *   ok: true,
 *   data: {
 *     items: Article[];
 *     meta:  { page, perPage, total, totalPages, hasNext, hasPrev }
 *   }
 * }
 * ※ shared/api/index.ts の PaginatedResult<T> と同一形式（iOS 共通）
 *
 * 実装ルール:
 * - published: true の記事のみ返す
 * - sort='popular' → viewCount 降順
 * - sort='latest'  → publishedAt 降順
 * - ロール・カテゴリは PostgreSQL 配列の @> 演算子でフィルタ
 * - Cache-Control: public, s-maxage=60（CDN 1分キャッシュ）
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, or, desc, sql, count } from 'drizzle-orm';
import { z }                         from 'zod';
import { db, articles }              from '@/lib/db';

export const runtime = 'nodejs';

// ── 入力バリデーションスキーマ ──────────────────────────────────
const CAT_VALUES = ['image-gen', 'voice', 'education', 'housework'] as const;
const catEnum    = z.enum(CAT_VALUES);

/** cat は複数指定を許可：
 *  - 単一値:     ?cat=voice
 *  - 繰り返し:   ?cat=voice&cat=education （配列で入る）
 *  - カンマ区切: ?cat=voice,education
 */
const catSchema = z
  .union([catEnum, z.array(catEnum), z.string()])
  .optional()
  .transform((v): (typeof CAT_VALUES)[number][] | undefined => {
    if (v === undefined) return undefined;
    const arr = Array.isArray(v)
      ? v
      : typeof v === 'string'
        ? v.split(',').map((s) => s.trim()).filter(Boolean)
        : [v];
    // enum 再チェック
    const validated: (typeof CAT_VALUES)[number][] = [];
    for (const item of arr) {
      const parsed = catEnum.safeParse(item);
      if (!parsed.success) return undefined; // 無効値は全体を無効化
      validated.push(parsed.data);
    }
    return validated.length > 0 ? validated : undefined;
  });

const querySchema = z.object({
  role:  z.enum(['papa', 'mama', 'kids', 'senior', 'common']).optional(),
  cat:   catSchema,
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort:  z.enum(['latest', 'popular']).default('latest'),
});

// ── レスポンス用の記事フィールド ────────────────────────────────
const SELECT_FIELDS = {
  id:               articles.id,
  slug:             articles.slug,
  title:            articles.title,
  description:      articles.description,
  roles:            articles.roles,
  categories:       articles.categories,
  level:            articles.level,
  audioUrl:         articles.audioUrl,
  audioDurationSec: articles.audioDurationSec,
  audioLanguage:    articles.audioLanguage,
  thumbnailUrl:     articles.thumbnailUrl,
  viewCount:        articles.viewCount,
  audioPlayCount:   articles.audioPlayCount,
  isFeatured:       articles.isFeatured,
  publishedAt:      articles.publishedAt,
  updatedAt:        articles.updatedAt,
} as const;

// ── GET /api/articles ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  // 1. クエリパラメータのバリデーション
  const { searchParams } = new URL(req.url);
  const catParams = searchParams.getAll('cat');
  const raw = {
    role:  searchParams.get('role')  ?? undefined,
    cat:   catParams.length > 1 ? catParams
         : catParams.length === 1 ? catParams[0]
         : undefined,
    level: searchParams.get('level') ?? undefined,
    page:  searchParams.get('page')  ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    sort:  searchParams.get('sort')  ?? undefined,
  };

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok:    false,
        error: {
          code:    'INVALID_PARAMS',
          message: 'クエリパラメータが不正です。',
        },
      },
      { status: 400 },
    );
  }

  const { role, cat, level, page, limit, sort } = parsed.data;
  const offset = (page - 1) * limit;

  // 2. WHERE 句の構築
  const conditions = [eq(articles.published, true)];

  if (role) {
    // PostgreSQL 配列に role が含まれるか（@> 演算子）
    conditions.push(
      sql`${articles.roles} @> ARRAY[${role}]::text[]`,
    );
  }

  if (cat && cat.length > 0) {
    // 複数カテゴリは OR（いずれかを含む）で検索
    const catConditions = cat.map(
      (c) => sql`${articles.categories} @> ARRAY[${c}]::text[]`,
    );
    conditions.push(
      catConditions.length === 1 ? catConditions[0]! : or(...catConditions)!,
    );
  }

  if (level) {
    conditions.push(eq(articles.level, level));
  }

  const where = and(...conditions);

  // 3. ORDER BY
  const orderBy = sort === 'popular'
    ? desc(articles.viewCount)
    : desc(articles.publishedAt);

  // 4. DB クエリ（件数 + データを並列取得）
  try {
    const [countResult, rows] = await Promise.all([
      db
        .select({ total: count() })
        .from(articles)
        .where(where)
        .then((r) => r[0]?.total ?? 0),

      db
        .select(SELECT_FIELDS)
        .from(articles)
        .where(where)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
    ]);

    const total      = Number(countResult);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const res = NextResponse.json({
      ok:   true,
      data: {
        items: rows,
        meta: {
          page,
          perPage:    limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });

    // CDN キャッシュ 60秒（記事更新時は ISR でリフレッシュ）
    res.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=600',
    );

    return res;
  } catch (err) {
    console.error('[GET /api/articles] DB エラー:', err);
    return NextResponse.json(
      {
        ok:    false,
        error: {
          code:    'DB_ERROR',
          message: 'サーバーエラーが発生しました。しばらくしてからお試しください。',
        },
      },
      { status: 500 },
    );
  }
}
