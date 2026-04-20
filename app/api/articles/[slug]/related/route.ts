/**
 * app/api/articles/[slug]/related/route.ts
 * GET /api/articles/:slug/related — 指定記事に関連する公開記事を取得（Rev24 #①）
 *
 * 目的:
 * - iOS / Android（Phase 4）および外部クライアント向けの「関連記事」エンドポイント。
 * - Web 記事詳細は Server Component が `getRelatedArticles()` を直呼びするため、
 *   このルートはモバイル・外部クライアント・`shared/api/fetchRelated` の受け皿として存在する。
 *
 * 動作:
 * - 1. 指定 slug の記事を取得して roles / categories を得る
 * - 2. 同じ roles または categories を持つ公開記事を random 順で返す（現 slug 自身は除外）
 *
 * クエリ:
 *   limit?: 1〜10（デフォルト 3）
 *
 * レスポンス:
 *   200 { ok: true,  data: ArticleSummary[] }
 *   400 { ok: false, error: { code: 'INVALID_PARAMS', message: string } }
 *   404 { ok: false, error: { code: 'NOT_FOUND',      message: string } }
 *   500 { ok: false, error: { code: 'DB_ERROR',       message: string } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z }                         from 'zod';
import { getArticle, getRelatedArticles } from '@/lib/repositories/articles';
import { toArticleSummary }          from '@/lib/mappers/articles';

export const runtime = 'nodejs';
export const revalidate = 300;

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3),
});

export async function GET(
  req:        NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const parsed = querySchema.safeParse({
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok:    false,
          error: { code: 'INVALID_PARAMS', message: 'クエリパラメータが不正です。' },
        },
        { status: 400 },
      );
    }

    // 現在の記事情報が必要（roles / categories の取得）
    const article = await getArticle(params.slug);
    if (!article) {
      return NextResponse.json(
        {
          ok:    false,
          error: { code: 'NOT_FOUND', message: '記事が見つかりません。' },
        },
        { status: 404 },
      );
    }

    const rows = await getRelatedArticles(
      params.slug,
      article.roles      ?? [],
      article.categories ?? [],
      parsed.data.limit,
    );
    const data = rows.map(toArticleSummary);

    const res = NextResponse.json({ ok: true, data });
    // CDN 60秒キャッシュ + 10分 stale-while-revalidate
    res.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=600',
    );
    return res;
  } catch (err) {
    console.error('[GET /api/articles/:slug/related] DB エラー:', err);
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
