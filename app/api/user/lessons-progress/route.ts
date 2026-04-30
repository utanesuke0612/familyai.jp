/**
 * app/api/user/lessons-progress/route.ts
 * familyai.jp — AIctation/VOA レッスン進捗の API（R3-機能3 Phase 3）
 *
 * GET  /api/user/lessons-progress             — ユーザーの全進捗一覧（200 件まで）
 * POST /api/user/lessons-progress             — 進捗を記録（attempt or complete）
 *
 * Body (POST):
 *   { lessonKey: "anna/lesson-01", action: "attempt" | "complete" }
 *   - action="attempt"  : 😓💪 押下時。attempts +1
 *   - action="complete" : 🌟 押下時。status='completed', completed_at=now, attempts +1
 *
 * 認証: NextAuth セッション必須（未ログインは 401）
 * CSRF: POST で verifyCsrf チェック
 *
 * クライアント側（非ログイン時）:
 *   localStorage に進捗を保存し、ログイン誘導を表示する設計
 *   （Phase 6 の SelfReport コンポーネントで実装）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import {
  listUserProgress,
  recordAttempt,
  markCompleted,
} from '@/lib/repositories/lessons-progress';
import type { LessonProgress } from '@/shared/types';
import type { LessonProgressRow } from '@/lib/db/schema';

export const runtime = 'nodejs';

// ── DB 行 → API レスポンス型に変換 ────────────────────────────
function toLessonProgress(row: LessonProgressRow): LessonProgress {
  return {
    lessonKey:   row.lessonKey,
    status:      row.status as LessonProgress['status'],
    attempts:    row.attempts,
    ...(row.completedAt
      ? { completedAt: row.completedAt instanceof Date
            ? row.completedAt.toISOString()
            : String(row.completedAt) }
      : {}),
  };
}

// ── GET: ユーザーの全進捗一覧 ─────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: 'ログインが必要です。' },
      { status: 401 },
    );
  }

  try {
    const rows = await listUserProgress(session.user.id);
    return NextResponse.json({
      ok:   true,
      data: rows.map(toLessonProgress),
    });
  } catch (err) {
    console.error('[GET /api/user/lessons-progress] DB エラー:', err);
    return NextResponse.json(
      { ok: false, error: 'サーバーエラーが発生しました。' },
      { status: 500 },
    );
  }
}

// ── POST: 進捗を記録 ──────────────────────────────────────────
const postSchema = z.object({
  // "<course>/<slug>" 形式（Q2=A）。空白・コロン等を含まない最低限の検証
  lessonKey: z.string().min(3).max(100).regex(
    /^[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+$/,
    { message: 'lessonKey は "<course>/<slug>" 形式で指定してください' },
  ),
  action:    z.enum(['attempt', 'complete']),
});

export async function POST(req: NextRequest) {
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

  const parsed = postSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: '入力値が不正です。', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { lessonKey, action } = parsed.data;
  const userId = session.user.id;

  try {
    const row = action === 'complete'
      ? await markCompleted(userId, lessonKey)
      : await recordAttempt(userId, lessonKey);
    return NextResponse.json({
      ok:   true,
      data: toLessonProgress(row),
    });
  } catch (err) {
    console.error('[POST /api/user/lessons-progress] DB エラー:', err);
    return NextResponse.json(
      { ok: false, error: 'サーバーエラーが発生しました。' },
      { status: 500 },
    );
  }
}
