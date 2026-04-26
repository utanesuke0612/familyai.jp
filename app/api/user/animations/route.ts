/**
 * app/api/user/animations/route.ts
 * うごくAI教室 — ユーザーのアニメーション履歴API
 *
 * GET  /api/user/animations       → 生成履歴一覧（最大50件、新しい順）
 * DELETE /api/user/animations     → 指定IDのアニメーションを削除
 *
 * DELETE Body: { id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z }                          from 'zod';
import { auth }                       from '@/lib/auth';
import { verifyCsrf }                 from '@/lib/csrf';
import {
  listUserAnimations,
  deleteAnimation,
  getAnimationById,
} from '@/lib/repositories/animations';

export const runtime = 'nodejs';

// ── GET /api/user/animations ──────────────────────────────────
export async function GET() {
  // 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: 'ログインが必要です。' },
      { status: 401 },
    );
  }

  try {
    const list = await listUserAnimations(session.user.id);

    // htmlContentは一覧では不要（容量削減）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const items = list.map(({ htmlContent: _html, ...rest }) => rest);

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error('[GET /api/user/animations] DB エラー:', err);
    return NextResponse.json(
      { ok: false, error: 'サーバーエラーが発生しました。' },
      { status: 500 },
    );
  }
}

// ── DELETE /api/user/animations ───────────────────────────────
const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(req: NextRequest) {
  // CSRF チェック
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { ok: false, error: '不正なリクエストです。' },
      { status: 403 },
    );
  }

  // 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: 'ログインが必要です。' },
      { status: 401 },
    );
  }

  // ボディパース
  let rawBody: unknown;
  try { rawBody = await req.json(); }
  catch {
    return NextResponse.json(
      { ok: false, error: 'リクエストが不正です。' },
      { status: 400 },
    );
  }

  const parsed = deleteSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'IDが不正です。' },
      { status: 400 },
    );
  }

  const { id } = parsed.data;

  try {
    // 所有者チェック
    const animation = await getAnimationById(id);
    if (!animation) {
      return NextResponse.json(
        { ok: false, error: '見つかりませんでした。' },
        { status: 404 },
      );
    }
    if (animation.userId !== session.user.id) {
      return NextResponse.json(
        { ok: false, error: 'アクセス権限がありません。' },
        { status: 403 },
      );
    }

    await deleteAnimation(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/user/animations] DB エラー:', err);
    return NextResponse.json(
      { ok: false, error: 'サーバーエラーが発生しました。' },
      { status: 500 },
    );
  }
}
