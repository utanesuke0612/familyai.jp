/**
 * lib/repositories/article-bookmarks.ts
 * familyai.jp — 記事ブックマーク Repository（サーバー側専用）
 */

import { eq, count } from 'drizzle-orm';
import { db, userArticleBookmarks } from '@/lib/db';
import { logger } from '@/lib/log';

/**
 * 指定記事のブックマーク総数を返す。
 * エラー時は 0 を返す（表示に影響を与えない）。
 */
export async function getArticleBookmarkCount(slug: string): Promise<number> {
  try {
    const result = await db
      .select({ total: count() })
      .from(userArticleBookmarks)
      .where(eq(userArticleBookmarks.articleSlug, slug));
    return Number(result[0]?.total ?? 0);
  } catch (err) {
    logger.warn('article-bookmarks.getCount', {
      slug,
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}
