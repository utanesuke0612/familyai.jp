/**
 * app/api/articles/[slug]/like/route.ts
 * familyai.jp — 記事いいね API
 *
 * GET  /api/articles/[slug]/like  → いいね数・自分がいいね済みか取得
 * POST /api/articles/[slug]/like  → いいねトグル（ログイン不要・IP ハッシュで重複防止）
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createHash }                     from 'crypto';
import { eq, and }                        from 'drizzle-orm';
import { auth }                           from '@/lib/auth';
import { db, articles, articleLikes }     from '@/lib/db';

type Params = { params: Promise<{ slug: string }> };

// IP → SHA-256 ハッシュ（プライバシー保護）
function hashIp(ip: string): string {
  return createHash('sha256').update(ip + process.env.AUTH_SECRET).digest('hex').slice(0, 64);
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ── GET: いいね数・いいね済み状態を返す ───────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const article = await db.query.articles.findFirst({
    where: eq(articles.slug, slug),
    columns: { id: true, likeCount: true },
  });
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const session = await auth();
  const userId  = session?.user?.id ?? null;
  const ipHash  = hashIp(getIp(req));

  const existing = await db.query.articleLikes.findFirst({
    where: userId
      ? and(eq(articleLikes.articleId, article.id), eq(articleLikes.userId, userId))
      : and(eq(articleLikes.articleId, article.id), eq(articleLikes.ipHash, ipHash)),
  });

  return NextResponse.json({
    likeCount: article.likeCount,
    liked:     !!existing,
  });
}

// ── POST: いいねトグル ────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const article = await db.query.articles.findFirst({
    where: eq(articles.slug, slug),
    columns: { id: true, likeCount: true },
  });
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const session = await auth();
  const userId  = session?.user?.id ?? null;
  const ipHash  = hashIp(getIp(req));

  const whereClause = userId
    ? and(eq(articleLikes.articleId, article.id), eq(articleLikes.userId, userId))
    : and(eq(articleLikes.articleId, article.id), eq(articleLikes.ipHash, ipHash));

  const existing = await db.query.articleLikes.findFirst({ where: whereClause });

  let newCount: number;
  let liked: boolean;

  if (existing) {
    // いいね解除
    await db.delete(articleLikes).where(eq(articleLikes.id, existing.id));
    newCount = Math.max(0, article.likeCount - 1);
    liked    = false;
  } else {
    // いいね追加
    await db.insert(articleLikes).values({
      articleId: article.id,
      userId:    userId ?? undefined,
      ipHash:    userId ? undefined : ipHash,
    });
    newCount = article.likeCount + 1;
    liked    = true;
  }

  await db.update(articles)
    .set({ likeCount: newCount })
    .where(eq(articles.id, article.id));

  return NextResponse.json({ likeCount: newCount, liked });
}
