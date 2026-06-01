/**
 * app/api/user/3d-bookmarks/route.ts
 * familyai.jp — 3D図鑑ブックマーク API（Rev41）
 *
 * GET    /api/user/3d-bookmarks             — ブックマーク済み modelId 一覧
 * POST   /api/user/3d-bookmarks             — ブックマーク追加
 * DELETE /api/user/3d-bookmarks?modelId=xxx — ブックマーク削除（idempotent）
 *
 * 【背景】DB テーブル (user_3d_bookmarks) と Repository (lib/repositories/3d-models.ts)
 *         の addBookmark/removeBookmark/isBookmarked/listBookmarkedModels は
 *         migration 0018 時点で実装済みだったが、API エンドポイントと UI が未接続だった。
 *         Codex Q1-5 / Q2-6 指摘事項。
 *
 * 認証: NextAuth セッション必須（未認証は 401）
 * CSRF: POST / DELETE で verifyCsrf チェック
 */

import { NextRequest, NextResponse } from 'next/server';
import { z }                          from 'zod';
import { auth }                       from '@/lib/auth';
import { verifyCsrf }                 from '@/lib/csrf';
import { withRequest }                from '@/lib/log';
import {
  addBookmark,
  removeBookmark,
  isBookmarked,
  listBookmarkedModels,
} from '@/lib/repositories/3d-models';

export const runtime = 'nodejs';

const addSchema = z.object({
  modelId: z.string().uuid(),
});

// ── GET: ブックマーク済みモデル一覧 ──────────────────────────────
export async function GET(req: NextRequest) {
  const log = withRequest(req, '/api/user/3d-bookmarks');

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const models = await listBookmarkedModels(session.user.id);
    const modelIds = models.map((m) => m.slug);
    return NextResponse.json({ ok: true, data: modelIds });
  } catch (err) {
    log.error('3d-bookmarks.get', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ── POST: ブックマーク追加 ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const log = withRequest(req, '/api/user/3d-bookmarks');

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
    return NextResponse.json({ ok: false, error: 'modelId (UUID) が必要です' }, { status: 400 });
  }

  try {
    // ユーザーの所有権チェック: modelId が実在するか確認（Repository に委譲）
    await addBookmark(session.user.id, parsed.data.modelId);
  } catch (err) {
    log.error('3d-bookmarks.post', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE: ブックマーク削除 ──────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const log = withRequest(req, '/api/user/3d-bookmarks');

  if (!verifyCsrf(req)) {
    return NextResponse.json({ ok: false, error: 'CSRF check failed' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const modelId = new URL(req.url).searchParams.get('modelId');
  if (!modelId) {
    return NextResponse.json({ ok: false, error: 'modelId パラメータが必要です' }, { status: 400 });
  }

  try {
    await removeBookmark(session.user.id, modelId);
  } catch (err) {
    log.error('3d-bookmarks.delete', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
