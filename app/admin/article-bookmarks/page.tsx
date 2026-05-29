/**
 * app/admin/article-bookmarks/page.tsx
 * familyai.jp — 管理画面 記事ブックマーク一覧
 */

import { desc, eq, count, countDistinct } from 'drizzle-orm';
import { db, userArticleBookmarks, users }   from '@/lib/db';
import { AdminArticleBookmarkTable }          from '@/components/admin/AdminArticleBookmarkTable';

export const dynamic = 'force-dynamic';

export default async function AdminArticleBookmarksPage() {
  // 初期表示: 最新50件 + サマリー集計
  const [rows, totalResult, articleCountResult] = await Promise.all([
    db
      .select({
        id:           userArticleBookmarks.id,
        articleSlug:  userArticleBookmarks.articleSlug,
        articleTitle: userArticleBookmarks.articleTitle,
        createdAt:    userArticleBookmarks.createdAt,
        userEmail:    users.email,
        userName:     users.name,
      })
      .from(userArticleBookmarks)
      .innerJoin(users, eq(userArticleBookmarks.userId, users.id))
      .orderBy(desc(userArticleBookmarks.createdAt))
      .limit(50),

    db.select({ n: count() }).from(userArticleBookmarks),
    db.select({ n: countDistinct(userArticleBookmarks.articleSlug) }).from(userArticleBookmarks),
  ]);

  const totalBookmarks = Number(totalResult[0]?.n  ?? 0);
  const totalArticles  = Number(articleCountResult[0]?.n ?? 0);

  const serialized = rows.map((r) => ({
    ...r,
    userName:  r.userName ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
          記事ブックマーク管理
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
          合計 {totalBookmarks.toLocaleString('ja-JP')} 件（{totalArticles} 記事にブックマークあり）
        </p>
      </div>

      <AdminArticleBookmarkTable
        initialBookmarks={serialized}
        initialTotal={totalBookmarks}
      />
    </>
  );
}
