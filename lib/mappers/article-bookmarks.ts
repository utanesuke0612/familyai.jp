/**
 * lib/mappers/article-bookmarks.ts
 * familyai.jp — user_article_bookmarks DB 行 → API DTO（shared/types 契約）変換
 */

import type { ArticleBookmarkItem } from '@/shared/types';

/** DB 行の最小型（lib/db/schema.ts:userArticleBookmarks の select 結果） */
export interface ArticleBookmarkRow {
  articleSlug:  string;
  articleTitle: string;
  createdAt:    Date;
}

export function toArticleBookmarkItem(row: ArticleBookmarkRow): ArticleBookmarkItem {
  return {
    slug:      row.articleSlug,
    title:     row.articleTitle,
    createdAt: row.createdAt.toISOString(),
  };
}
