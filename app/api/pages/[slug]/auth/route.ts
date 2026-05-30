/**
 * app/api/pages/[slug]/auth/route.ts
 * POST /api/pages/[slug]/auth
 *
 * HTML ページのパスワード認証。
 * 正しいパスワードなら署名付き HttpOnly Cookie を発行する。
 */

import { NextRequest, NextResponse }                   from 'next/server';
import bcrypt                                           from 'bcryptjs';
import { eq }                                           from 'drizzle-orm';
import { db, htmlPages }                               from '@/lib/db';
import { pageCookieName, makePageToken }               from '@/lib/html-page-auth';

export const runtime = 'nodejs';

const COOKIE_TTL_SECS = 7 * 24 * 60 * 60; // 7日

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug;

  const [page] = await db
    .select({ passwordHash: htmlPages.passwordHash })
    .from(htmlPages)
    .where(eq(htmlPages.slug, slug))
    .limit(1);

  if (!page) {
    return NextResponse.json({ ok: false, error: 'ページが見つかりません' }, { status: 404 });
  }
  if (!page.passwordHash) {
    return NextResponse.json({ ok: false, error: 'パスワードは設定されていません' }, { status: 400 });
  }

  let body: { password?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // ブルートフォース対策: 1秒遅延
  await new Promise((r) => setTimeout(r, 1000));

  const isValid = await bcrypt.compare(body.password ?? '', page.passwordHash);
  if (!isValid) {
    return NextResponse.json({ ok: false, error: 'パスワードが違います' }, { status: 401 });
  }

  const token  = makePageToken(slug, page.passwordHash);
  const cookie = pageCookieName(slug);
  const res    = NextResponse.json({ ok: true });

  res.cookies.set(cookie, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   COOKIE_TTL_SECS,
    path:     `/pages/${slug}`,
  });

  return res;
}
