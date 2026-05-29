/**
 * app/api/articles/[slug]/comments/[id]/route.ts
 * familyai.jp — 記事コメント 個別操作 API
 *
 * PATCH  /api/articles/:slug/comments/:id — コメント編集（本人のみ）
 * DELETE /api/articles/:slug/comments/:id — コメント削除（本人のみ）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z }                          from 'zod';
import { auth }                       from '@/lib/auth';
import { updateComment, deleteComment } from '@/lib/repositories/comments';
import { verifyCsrf }                 from '@/lib/csrf';
import { withRequest }                from '@/lib/log';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'コメントを入力してください')
    .max(2000, 'コメントは2000文字以内にしてください'),
});

// ── PATCH: コメント編集 ───────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } },
) {
  const log = withRequest(req, '/api/articles/:slug/comments/:id');

  if (!verifyCsrf(req)) {
    return NextResponse.json({ ok: false, error: 'CSRF check failed' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'ログインが必要です' }, { status: 401 });
  }

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    const flatErrors = parsed.error.flatten();
    const firstError = flatErrors.fieldErrors.body?.[0] ?? 'Validation failed';
    return NextResponse.json({ ok: false, error: firstError }, { status: 400 });
  }

  const updated = await updateComment(params.id, session.user.id, parsed.data.body);
  if (!updated) {
    log.error('comments.patch', { id: params.id });
    return NextResponse.json(
      { ok: false, error: 'コメントの更新に失敗しました（存在しないか権限がありません）' },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: updated });
}

// ── DELETE: コメント削除 ──────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } },
) {
  const log = withRequest(req, '/api/articles/:slug/comments/:id');

  if (!verifyCsrf(req)) {
    return NextResponse.json({ ok: false, error: 'CSRF check failed' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'ログインが必要です' }, { status: 401 });
  }

  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }

  const ok = await deleteComment(params.id, session.user.id);
  if (!ok) {
    log.error('comments.delete', { id: params.id });
    return NextResponse.json(
      { ok: false, error: 'コメントの削除に失敗しました（存在しないか権限がありません）' },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
