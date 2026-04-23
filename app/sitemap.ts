/**
 * app/sitemap.ts
 * familyai.jp — XML サイトマップ自動生成
 *
 * Next.js の MetadataRoute.Sitemap を使用。
 * /api/sitemap.xml は不要（Next.js が /sitemap.xml として自動配信）。
 *
 * 含めるURL:
 * - 固定ページ: / /learn /tools /about /privacy /terms
 * - 記事詳細 : /learn/[slug]（公開済み記事）
 */

import type { MetadataRoute } from 'next';
import { eq }                 from 'drizzle-orm';
import { db, articles }       from '@/lib/db';
import { SITE }               from '@/shared';

// force-dynamic: no-store fetch（Neon）との競合を避けるためリクエスト時に毎回生成
// revalidate = 3600 はビルド時静的生成を試みるが、no-store fetch と競合してビルドが失敗する
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE.url;
  const now     = new Date().toISOString();

  // ── 固定ページ ────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url:              `${baseUrl}/`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         1.0,
    },
    {
      url:              `${baseUrl}/learn`,
      lastModified:     now,
      changeFrequency:  'daily',
      priority:         0.9,
    },
    {
      url:              `${baseUrl}/tools`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         0.8,
    },
    {
      url:              `${baseUrl}/about`,
      lastModified:     now,
      changeFrequency:  'monthly',
      priority:         0.5,
    },
    {
      url:              `${baseUrl}/privacy`,
      lastModified:     now,
      changeFrequency:  'yearly',
      priority:         0.3,
    },
    {
      url:              `${baseUrl}/terms`,
      lastModified:     now,
      changeFrequency:  'yearly',
      priority:         0.3,
    },
  ];

  // ── 記事ページ（DB から取得）────────────────────────────────
  let articlePages: MetadataRoute.Sitemap = [];

  try {
    const rows = await db
      .select({
        slug:        articles.slug,
        publishedAt: articles.publishedAt,
        updatedAt:   articles.updatedAt,
      })
      .from(articles)
      .where(eq(articles.published, true))
      .orderBy(articles.publishedAt);

    articlePages = rows.map((row) => ({
      url:             `${baseUrl}/learn/${row.slug}`,
      lastModified:    (row.updatedAt ?? row.publishedAt ?? new Date()).toISOString(),
      changeFrequency: 'weekly' as const,
      priority:        0.7,
    }));
  } catch (err) {
    // DB 未接続時（Vercel Preview 初回ビルド等）はスキップ
    console.warn('[sitemap] DB 取得スキップ:', err);
  }

  return [...staticPages, ...articlePages];
}
