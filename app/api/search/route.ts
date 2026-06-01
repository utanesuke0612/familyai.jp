/**
 * app/api/search/route.ts
 * familyai.jp — 公開記事検索 API（Rev41）
 *
 * GET /api/search?q=keyword&limit=5
 *
 * 記事タイトル・説明を ILIKE 検索し、公開済み記事のみを返す。
 * ヘッダー検索・404 ページのサジェストに使用。
 * キャッシュ: 60 秒（短期・高頻度呼出し向け）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { and, eq, or, ilike, desc } from 'drizzle-orm';
import { db, articles } from '@/lib/db';
import { withRequest } from '@/lib/log';

export const runtime = 'nodejs';

const MAX_RESULTS = 10;

const searchPublishedArticles = unstable_cache(
  async (q: string, limit: number) => {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const rows = await db
      .select({
        slug:        articles.slug,
        title:       articles.title,
        description: articles.description,
        categories:  articles.categories,
        level:       articles.level,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(
        and(
          eq(articles.published, true),
          or(
            ilike(articles.title, pattern),
            ilike(articles.description, pattern),
          )!,
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit);

    return rows;
  },
  ['search'],
  { revalidate: 60 },
);

export async function GET(req: NextRequest) {
  const log = withRequest(req, '/api/search');

  const q     = req.nextUrl.searchParams.get('q')?.trim();
  const limit = Math.min(
    MAX_RESULTS,
    Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '5', 10) || 5),
  );

  if (!q || q.length < 1) {
    return NextResponse.json({ ok: true, data: [] });
  }

  try {
    const results = await searchPublishedArticles(q, limit);
    return NextResponse.json({ ok: true, data: results });
  } catch (err) {
    log.error('search.get', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
