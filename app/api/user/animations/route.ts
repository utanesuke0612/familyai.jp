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
  updateAnimation,
} from '@/lib/repositories/animations';
import { toAnimationSummary }         from '@/lib/mappers/animations';

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

    // mapper 経由で shared/types の AnimationSummary に変換（htmlContent は除外される）
    const data = list.map(toAnimationSummary);

    return NextResponse.json({ ok: true, data });
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

    // 戻り値（boolean）を検証: race condition で 0 件削除になっていないかを確認
    const deleted = await deleteAnimation(id, session.user.id);
    if (!deleted) {
      // 所有者チェック後の race condition: 同時刻に他経路で削除済み
      return NextResponse.json(
        { ok: false, error: '削除に失敗しました。' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/user/animations] DB エラー:', err);
    return NextResponse.json(
      { ok: false, error: 'サーバーエラーが発生しました。' },
      { status: 500 },
    );
  }
}

// ── PATCH /api/user/animations ────────────────────────────────
// R3-U1: お気に入り（isFavorite）/ カスタムタイトル（customTitle）を更新する。
//
// Body 例:
//   { id: "uuid", isFavorite: true }
//   { id: "uuid", customTitle: "わたしの磁石まとめ" }
//   { id: "uuid", customTitle: null }   ← クリアして元の theme に戻す
//   { id: "uuid", isFavorite: true, customTitle: "..." } ← 同時更新可
const patchSchema = z.object({
  id:           z.string().uuid(),
  isFavorite:   z.boolean().optional(),
  // null を明示で「カスタムタイトル削除」を表現できるよう nullable
  customTitle:  z.string().trim().max(120).nullable().optional(),
  /** R3-K3: 公開フラグ（false=非公開・所有者しか閲覧不可） */
  isPublic:     z.boolean().optional(),
}).refine(
  (v) => v.isFavorite !== undefined || v.customTitle !== undefined || v.isPublic !== undefined,
  { message: 'isFavorite / customTitle / isPublic のいずれか1つ以上が必要です。' },
);

export async function PATCH(req: NextRequest) {
  // CSRF
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { ok: false, error: '不正なリクエストです。' },
      { status: 403 },
    );
  }

  // 認証
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: 'ログインが必要です。' },
      { status: 401 },
    );
  }

  // パース
  let rawBody: unknown;
  try { rawBody = await req.json(); }
  catch {
    return NextResponse.json(
      { ok: false, error: 'リクエストが不正です。' },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: '入力値が不正です。', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, isFavorite, customTitle, isPublic } = parsed.data;

  try {
    const updated = await updateAnimation(id, session.user.id, {
      ...(isFavorite  !== undefined ? { isFavorite }  : {}),
      ...(customTitle !== undefined ? { customTitle } : {}),
      ...(isPublic    !== undefined ? { isPublic }    : {}),
    });
    if (!updated) {
      // 対象なし or 他人のもの（権限）→ 404 で統一（情報漏洩防止）
      return NextResponse.json(
        { ok: false, error: '見つかりませんでした。' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/user/animations] DB エラー:', err);
    return NextResponse.json(
      { ok: false, error: 'サーバーエラーが発生しました。' },
      { status: 500 },
    );
  }
}
