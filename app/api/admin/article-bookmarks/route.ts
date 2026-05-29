/**
 * app/api/admin/article-bookmarks/route.ts
 * familyai.jp — 記事ブックマーク 管理 API
 *
 * GET    /api/admin/article-bookmarks          — 全ブックマーク一覧（paginated）
 * DELETE /api/admin/article-bookmarks?id=uuid  — ブックマーク削除
 */

import { NextRequest, NextResponse }      from 'next/server';
import { desc, eq, ilike, or, sql, and } from 'drizzle-orm';
import { protectAdminRoute }              from '@/lib/api/admin-guard';
import { db, userArticleBookmarks, users } from '@/lib/db';

export const runtime = 'nodejs';

// ── GET: ブックマーク一覧 ─────────────────────────────────────
export const GET = protectAdminRoute(async (req: NextRequest) => {
  const sp       = req.nextUrl.searchParams;
  const page     = Math.max(1, parseInt(sp.get('page')     ?? '1',  10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') ?? '50', 10) || 50));
  const slug     = sp.get('slug')?.trim()  || null;
  const email    = sp.get('email')?.trim() || null;

  // WHERE 句組み立て
  const conditions = [];
  if (slug)  conditions.push(ilike(userArticleBookmarks.articleSlug,  `%${slug}%`));
  if (email) conditions.push(ilike(users.email, `%${email}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userArticleBookmarks)
      .innerJoin(users, eq(userArticleBookmarks.userId, users.id))
      .where(where),
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
      .where(where)
      .orderBy(desc(userArticleBookmarks.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const items = rows.map((r) => ({
    id:           r.id,
    articleSlug:  r.articleSlug,
    articleTitle: r.articleTitle,
    createdAt:    r.createdAt.toISOString(),
    userEmail:    r.userEmail,
    userName:     r.userName ?? null,
  }));

  return NextResponse.json({
    ok:   true,
    data: { items, meta: { total, page, pageSize } },
  });
});

// ── DELETE: ブックマーク削除 ───────────────────────────────────
export const DELETE = protectAdminRoute(async (req: NextRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id パラメータが必要です' }, { status: 400 });
  }

  await db
    .delete(userArticleBookmarks)
    .where(eq(userArticleBookmarks.id, id));

  return NextResponse.json({ ok: true });
});
