/**
 * app/api/articles/route.ts
 * familyai.jp — 記事一覧 API
 *
 * GET /api/articles
 *
 * クエリパラメータ:
 *   cat    : ContentCategory（任意・複数可）
 *   level  : 'beginner' | 'intermediate' | 'advanced'（任意）
 *   page   : number（デフォルト: 1）
 *   limit  : number（デフォルト: 12・最大: 50）
 *   sort   : 'latest' | 'popular'（デフォルト: 'latest'）
 *   search : string（タイトル/description 部分一致・ILIKE）
 *   tag    : string（任意・複数可・自由タグ）
 *
 * レスポンス（200）:
 * {
 *   ok: true,
 *   data: {
 *     items: ArticleSummary[];
 *     meta:  { page, perPage, total, totalPages, hasNext, hasPrev }
 *   }
 * }
 * ※ shared/api/index.ts の PaginatedResult<T> と同一形式（iOS 共通）
 *
 * Rev40 (Deepening #2): 旧実装は WHERE/ORDER BY/Promise.all を route 内に直書きしていたが、
 * lib/repositories/articles.ts の getArticleList() に完全同型の実装が既にあったため統合。
 * route の責務は HTTP 入出力 (バリデーション・キャッシュヘッダ・DTO 変換) のみに絞った。
 */

import { NextRequest, NextResponse } from 'next/server';
import { z }                         from 'zod';
import { getArticleList }            from '@/lib/repositories/articles';
import { toArticleSummary }          from '@/lib/mappers/articles';
import { withRequest }               from '@/lib/log';

export const runtime = 'nodejs';

// ── 入力バリデーションスキーマ ──────────────────────────────────
const CAT_VALUES = ['education', 'lifestyle', 'work', 'creative'] as const;
const catEnum    = z.enum(CAT_VALUES);

/** cat は複数指定を許可：
 *  - 単一値:     ?cat=work
 *  - 繰り返し:   ?cat=work&cat=education （配列で入る）
 *  - カンマ区切: ?cat=work,education
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

const tagSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v): string[] | undefined => {
    if (v === undefined) return undefined;
    const arr = Array.isArray(v) ? v : v.split(',');
    const tags = Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)))
      .filter((s) => s.length <= 32)
      .slice(0, 20);
    return tags.length > 0 ? tags : undefined;
  });

const querySchema = z.object({
  cat:    catSchema,
  level:  z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(50).default(12),
  sort:   z.enum(['latest', 'popular']).default('latest'),
  tag:    tagSchema,
  // Rev26 #2: 公開 search（タイトル/description 部分一致・ILIKE）
  search: z.string().trim().min(1).max(100).optional(),
});

// ── GET /api/articles ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const log = withRequest(req, '/api/articles');
  // 1. クエリパラメータのバリデーション
  const { searchParams } = new URL(req.url);
  const catParams = searchParams.getAll('cat');
  const tagParams = searchParams.getAll('tag');
  const raw = {
    cat:    catParams.length > 1 ? catParams
         : catParams.length === 1 ? catParams[0]
         : undefined,
    level:  searchParams.get('level')  ?? undefined,
    page:   searchParams.get('page')   ?? undefined,
    limit:  searchParams.get('limit')  ?? undefined,
    sort:   searchParams.get('sort')   ?? undefined,
    tag:    tagParams.length > 1 ? tagParams
         : tagParams.length === 1 ? tagParams[0]
         : undefined,
    search: searchParams.get('search') ?? undefined,
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

  const { cat, level, page, limit, sort, tag, search } = parsed.data;

  // 2. Repository 経由でフィルタ + ページネーション取得
  try {
    const { items: rows, total, totalPages } = await getArticleList(
      { categories: cat, tags: tag, level, sort, search },
      { page, pageSize: limit },
    );

    const res = NextResponse.json({
      ok:   true,
      data: {
        items: rows.map(toArticleSummary),
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
    log.error('articles.list', { error: err instanceof Error ? err.message : String(err) });
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
