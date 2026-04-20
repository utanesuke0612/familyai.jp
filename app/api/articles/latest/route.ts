/**
 * app/api/articles/latest/route.ts
 * GET /api/articles/latest — 最新公開記事を取得（Rev24 #①）
 *
 * 目的:
 * - iOS / Android（Phase 4）および外部クライアント向けの「新着記事」エンドポイント。
 * - Web トップページは Server Component が `getLatestArticles()` を直呼びするため、
 *   このルートはモバイル・外部クライアント・`shared/api/fetchLatest` の受け皿として存在する。
 *
 * クエリ:
 *   limit?: 1〜20（デフォルト 6）
 *
 * レスポンス:
 *   200 { ok: true,  data: ArticleSummary[] }
 *   400 { ok: false, error: { code: 'INVALID_PARAMS', message: string } }
 *   500 { ok: false, error: { code: 'DB_ERROR',       message: string } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z }                         from 'zod';
import { getLatestArticles }         from '@/lib/repositories/articles';
import { toArticleSummary }          from '@/lib/mappers/articles';

export const runtime = 'nodejs';
// ISR/CDN キャッシュ（`/api/articles/[slug]` と揃える）
export const revalidate = 60;

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(6),
});

export async function GET(req: NextRequest) {
  try {
    const parsed = querySchema.safeParse({
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
    });

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

    const rows = await getLatestArticles(parsed.data.limit);
    const data = rows.map(toArticleSummary);

    const res = NextResponse.json({ ok: true, data });
    // CDN 60秒キャッシュ + 10分 stale-while-revalidate
    res.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=600',
    );
    return res;
  } catch (err) {
    console.error('[GET /api/articles/latest] DB エラー:', err);
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
