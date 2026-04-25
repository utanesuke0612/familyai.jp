/**
 * app/api/articles/[slug]/bookmark/route.ts
 * familyai.jp — 記事ブックマーク API（ログイン必須）
 *
 * GET  /api/articles/[slug]/bookmark → ブックマーク済みか取得
 * POST /api/articles/[slug]/bookmark → ブックマークトグル
 */

import { type NextRequest, NextResponse } from 'next/server';
import { eq, and }                        from 'drizzle-orm';
import { auth }                           from '@/lib/auth';
import { db, articles, articleBookmarks } from '@/lib/db';

type Params = { params: Promise<{ slug: string }> };

// ── GET: ブックマーク済み状態を返す ──────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ bookmarked: false, requiresLogin: true });
  }

  const article = await db.query.articles.findFirst({
    where: eq(articles.slug, slug),
    columns: { id: true },
  });
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const existing = await db.query.articleBookmarks.findFirst({
    where: and(
      eq(articleBookmarks.articleId, article.id),
      eq(articleBookmarks.userId, session.user.id),
    ),
  });

  return NextResponse.json({ bookmarked: !!existing });
}

// ── POST: ブックマークトグル ──────────────────────────────────
export async function POST(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'ログインが必要です', requiresLogin: true }, { status: 401 });
  }

  const article = await db.query.articles.findFirst({
    where: eq(articles.slug, slug),
    columns: { id: true },
  });
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const existing = await db.query.articleBookmarks.findFirst({
    where: and(
      eq(articleBookmarks.articleId, article.id),
      eq(articleBookmarks.userId, session.user.id),
    ),
  });

  if (existing) {
    await db.delete(articleBookmarks).where(eq(articleBookmarks.id, existing.id));
    return NextResponse.json({ bookmarked: false });
  } else {
    await db.insert(articleBookmarks).values({
      articleId: article.id,
      userId:    session.user.id,
    });
    return NextResponse.json({ bookmarked: true });
  }
}
