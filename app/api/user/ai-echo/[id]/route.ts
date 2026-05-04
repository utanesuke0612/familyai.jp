/**
 * app/api/user/ai-echo/[id]/route.ts
 * AI Echo — 1 件削除 API
 *
 * DELETE /api/user/ai-echo/:id
 *   MyPage の履歴ページから「🗑 削除」ボタン用。
 *   本人のエントリのみ削除可（他人 ID では何もしない・404）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { deleteAiEchoEntry } from '@/lib/repositories/ai-echo';

export const runtime = 'nodejs';

export async function DELETE(
  req:        NextRequest,
  { params }: { params: { id: string } },
) {
  // CSRF
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { ok: false, error: { code: 'FORBIDDEN', message: '不正なリクエストです。' } },
      { status: 403 },
    );
  }

  // 認証
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です。' } },
      { status: 401 },
    );
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_PARAMS', message: 'ID が必要です。' } },
      { status: 400 },
    );
  }

  try {
    const ok = await deleteAiEchoEntry(id, session.user.id);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: '見つかりませんでした。' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/user/ai-echo/:id] DB エラー:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました。' } },
      { status: 500 },
    );
  }
}
