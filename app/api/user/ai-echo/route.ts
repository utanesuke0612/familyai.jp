/**
 * app/api/user/ai-echo/route.ts
 * AI Echo — 履歴 API
 *
 * GET  /api/user/ai-echo  — ユーザーの履歴一覧（最大 100 件）
 * POST /api/user/ai-echo  — 1 件保存（評価結果を MyPage 履歴に追加）
 *
 * 認証: NextAuth セッション必須（未ログインは 401）
 * CSRF: POST で verifyCsrf チェック
 *
 * 保存フロー:
 *   AIEchoPanel が AI フィードバック受信完了後に
 *   バックグラウンドで本エンドポイントへ POST する想定。
 *   失敗時もユーザー体験は損なわない（フィードバック表示は残る）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import {
  createAiEchoEntry,
  listAiEchoEntries,
} from '@/lib/repositories/ai-echo';

export const runtime = 'nodejs';

// ── POST: 1 件保存 ─────────────────────────────────────
const postBodySchema = z.object({
  lessonKey:   z.string().min(1).max(200),
  lessonTitle: z.string().min(1).max(255),
  level:       z.union([z.literal(1), z.literal(2), z.literal(3)]),
  userInput:   z.string().min(1).max(2000),
  aiFeedback:  z.string().min(1).max(4000),
});

export async function POST(req: NextRequest) {
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
      { ok: false, error: { code: 'UNAUTHORIZED', message: '保存にはログインが必要です。' } },
      { status: 401 },
    );
  }

  // ボディ
  let raw: unknown;
  try { raw = await req.json(); }
  catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_BODY', message: 'リクエストが不正です。' } },
      { status: 400 },
    );
  }
  const parsed = postBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_PARAMS', message: '入力内容を確認してください。' } },
      { status: 400 },
    );
  }

  // 保存
  try {
    const id = await createAiEchoEntry({
      userId:      session.user.id,
      lessonKey:   parsed.data.lessonKey,
      lessonTitle: parsed.data.lessonTitle,
      level:       parsed.data.level,
      userInput:   parsed.data.userInput,
      aiFeedback:  parsed.data.aiFeedback,
    });
    // Rev38 #H1: apiFetch 契約準拠（{ ok, data }）— 旧 { ok, id } は破壊的に廃止
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err) {
    console.error('[POST /api/user/ai-echo] DB エラー:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました。' } },
      { status: 500 },
    );
  }
}

// ── GET: 履歴一覧（MyPage 用） ────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です。' } },
      { status: 401 },
    );
  }

  try {
    const entries = await listAiEchoEntries(session.user.id);
    // Rev38 #H1: apiFetch 契約準拠（{ ok, data }）— 旧 { ok, entries } は破壊的に廃止
    // フロント側で扱いやすい形に整形（DB 行をそのまま返さない）
    return NextResponse.json({
      ok: true,
      data: entries.map((e) => ({
        id:          e.id,
        lessonKey:   e.lessonKey,
        lessonTitle: e.lessonTitle,
        level:       e.level,
        userInput:   e.userInput,
        aiFeedback:  e.aiFeedback,
        createdAt:   e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[GET /api/user/ai-echo] DB エラー:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました。' } },
      { status: 500 },
    );
  }
}
