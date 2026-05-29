/**
 * app/api/articles/[slug]/comments/route.ts
 * familyai.jp — 記事コメント API
 *
 * GET  /api/articles/:slug/comments  — コメント一覧（認証不要・no-store）
 * POST /api/articles/:slug/comments  — コメント投稿（認証必須・CSRF・Rate limit）
 *
 * レスポンス:
 *   GET  200 { ok: true, data: { items: CommentItem[], total: number } }
 *   POST 201 { ok: true, data: CommentItem }
 */

import { NextRequest, NextResponse }           from 'next/server';
import { z }                                    from 'zod';
import { auth }                                 from '@/lib/auth';
import { getComments, createComment }           from '@/lib/repositories/comments';
import { verifyCsrf }                           from '@/lib/csrf';
import {
  getRateLimiter,
  isRateLimitFailClosed,
  rateLimitedResponse,
}                                               from '@/lib/ratelimit';
import { withRequest }                          from '@/lib/log';

export const runtime = 'nodejs';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'コメントを入力してください')
    .max(2000, 'コメントは2000文字以内にしてください'),
});

// ── GET: コメント一覧 ─────────────────────────────────────────
export async function GET(
  req:    NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug?.trim();
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_SLUG', message: 'slug が不正です。' } },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const page     = Math.max(1, parseInt(url.searchParams.get('page')     ?? '1',  10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10) || 20));

  const result = await getComments(slug, { page, pageSize });

  return NextResponse.json(
    { ok: true, data: result },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

// ── POST: コメント投稿 ────────────────────────────────────────
export async function POST(
  req:    NextRequest,
  { params }: { params: { slug: string } },
) {
  const log = withRequest(req, '/api/articles/:slug/comments');

  // CSRF
  if (!verifyCsrf(req)) {
    return NextResponse.json({ ok: false, error: 'CSRF check failed' }, { status: 403 });
  }

  // 認証
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: 'ログインが必要です' },
      { status: 401 },
    );
  }

  // slug バリデーション
  const slug = params.slug?.trim();
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_SLUG', message: 'slug が不正です。' } },
      { status: 400 },
    );
  }

  // レートリミット（ユーザー単位: 5回/分）
  const rl = getRateLimiter('ratelimit:comment', 5, '1 m');
  if (rl) {
    const { success } = await rl.limit(session.user.id);
    if (!success) {
      return rateLimitedResponse(
        'コメントの送信が多すぎます。しばらく待ってから再試行してください。',
      );
    }
  } else if (isRateLimitFailClosed()) {
    return rateLimitedResponse();
  }

  // ボディのパース & バリデーション
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createCommentSchema.safeParse(raw);
  if (!parsed.success) {
    const flatErrors = parsed.error.flatten();
    const firstError = flatErrors.fieldErrors.body?.[0] ?? flatErrors.formErrors?.[0] ?? 'Validation failed';
    return NextResponse.json(
      { ok: false, error: firstError },
      { status: 400 },
    );
  }

  const comment = await createComment(slug, session.user.id, parsed.data.body);
  if (!comment) {
    log.error('comments.post', { slug });
    return NextResponse.json(
      { ok: false, error: 'コメントの投稿に失敗しました' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: comment }, { status: 201 });
}
