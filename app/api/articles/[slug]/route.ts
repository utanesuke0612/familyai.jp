/**
 * app/api/articles/[slug]/route.ts
 * GET /api/articles/:slug — 公開記事を1件取得（Rev23 #3）
 *
 * 目的:
 * - iOS / Android（Phase 4）クライアントの記事詳細取得用エンドポイント。
 * - Web は Server Component が `getArticle()` を直呼びするため、このルートは
 *   モバイル・外部クライアント・`shared/api/fetchArticle` の受け皿として存在する。
 *
 * レスポンス:
 *   200 { ok: true,  data: Article }
 *   404 { ok: false, error: { code: 'NOT_FOUND', message: string } }
 *   500 { ok: false, error: { code: 'DB_ERROR',  message: string } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getArticle }                from '@/lib/repositories/articles';
import { toArticleDetail }           from '@/lib/mappers/articles';

export const runtime = 'nodejs';
// ISR/CDN キャッシュ（記事更新は Rev21 の admin API 経由・revalidate しない運用で OK）
export const revalidate = 300;

export async function GET(
  _req:    NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
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

    const res = NextResponse.json({ ok: true, data: toArticleDetail(article) });
    // CDN 60秒キャッシュ + 10分 stale-while-revalidate
    res.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=600',
    );
    return res;
  } catch (err) {
    console.error('[GET /api/articles/:slug] DB エラー:', err);
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
