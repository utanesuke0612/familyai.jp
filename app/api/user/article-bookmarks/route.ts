/**
 * app/api/user/article-bookmarks/route.ts
 * familyai.jp — 記事ブックマーク API
 *
 * GET    /api/user/article-bookmarks          — ブックマーク一覧（paginated）
 * POST   /api/user/article-bookmarks          — ブックマーク追加
 * DELETE /api/user/article-bookmarks?slug=xxx — ブックマーク削除（idempotent）
 *
 * 認証: NextAuth セッション必須（未認証は 401）
 * CSRF: POST / DELETE で verifyCsrf チェック
 */

import { NextRequest, NextResponse }  from 'next/server';
import { z }                           from 'zod';
import { eq, and, desc, sql }  from 'drizzle-orm';
import { auth }                        from '@/lib/auth';
import { db, userArticleBookmarks }    from '@/lib/db';
import { verifyCsrf }                  from '@/lib/csrf';
import { toArticleBookmarkItem }       from '@/lib/mappers/article-bookmarks';
import { withRequest }                  from '@/lib/log';

export const runtime = 'nodejs';

// ── バリデーション ──────────────────────────────────────────────
const addSchema = z.object({
  slug:  z.string().min(1).max(255),
  title: z.string().min(1).max(255),
});

// ── GET: ブックマーク一覧 ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const log = withRequest(req, '/api/user/article-bookmarks');

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url      = new URL(req.url);
  const page     = Math.max(1, parseInt(url.searchParams.get('page')     ?? '1',  10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10) || 20));
  const userId   = session.user.id;

  try {
    const [totalResult, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(userArticleBookmarks)
        .where(eq(userArticleBookmarks.userId, userId)),
      db.select()
        .from(userArticleBookmarks)
        .where(eq(userArticleBookmarks.userId, userId))
        .orderBy(desc(userArticleBookmarks.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const items = rows.map(toArticleBookmarkItem);

    return NextResponse.json({
      ok:   true,
      data: items,
      meta: { total, page, perPage: pageSize },
    });
  } catch (err) {
    log.error('article-bookmarks.get', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ── POST: ブックマーク追加 ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const log = withRequest(req, '/api/user/article-bookmarks');

  if (!verifyCsrf(req)) {
    return NextResponse.json({ ok: false, error: 'CSRF check failed' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg  = flat.fieldErrors.slug?.[0] ?? flat.fieldErrors.title?.[0] ?? flat.formErrors?.[0] ?? 'Validation failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  try {
    await db
      .insert(userArticleBookmarks)
      .values({
        userId:       session.user.id,
        articleSlug:  parsed.data.slug,
        articleTitle: parsed.data.title,
      })
      .onConflictDoNothing(); // 二重登録は無視（idempotent）
  } catch (err) {
    log.error('article-bookmarks.post', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE: ブックマーク削除 ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const log = withRequest(req, '/api/user/article-bookmarks');

  if (!verifyCsrf(req)) {
    return NextResponse.json({ ok: false, error: 'CSRF check failed' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const slug = new URL(req.url).searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'slug パラメータが必要です' }, { status: 400 });
  }

  try {
    await db
      .delete(userArticleBookmarks)
      .where(
        and(
          eq(userArticleBookmarks.userId,      session.user.id),
          eq(userArticleBookmarks.articleSlug, slug),
        ),
      );
  } catch (err) {
    log.error('article-bookmarks.delete', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
