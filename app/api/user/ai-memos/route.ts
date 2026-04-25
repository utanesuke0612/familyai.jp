/**
 * app/api/user/ai-memos/route.ts
 * familyai.jp — ログイン会員の AI メモ クラウド同期 API
 *
 * GET    /api/user/ai-memos          — 全メモ取得
 * POST   /api/user/ai-memos          — メモ保存（bulk 対応）
 * DELETE /api/user/ai-memos?id=xxx   — メモ削除
 *
 * 認証: NextAuth セッション必須（未認証は 401）
 * CSRF:  POST / DELETE で verifyCsrf チェック
 */

import { NextRequest, NextResponse }  from 'next/server';
import { z }                           from 'zod';
import { eq, and }                     from 'drizzle-orm';
import { auth }                        from '@/lib/auth';
import { db, userAiMemos }             from '@/lib/db';
import { verifyCsrf }                  from '@/lib/csrf';
import type { AiMemoItem }             from '@/lib/ai-memo-store';

// ── バリデーション ──────────────────────────────────────────────
const memoItemSchema = z.object({
  id:           z.string().min(1).max(36),
  answer:       z.string().min(1),
  question:     z.string(),           // 直前の質問がない場合は空文字を許容
  articleTitle: z.string().min(1).max(255),
  articleSlug:  z.string().max(255).optional(),
  savedAt:      z.number().int().positive(),
});

// ── GET: 全メモ取得 ─────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await db
      .select()
      .from(userAiMemos)
      .where(eq(userAiMemos.userId, session.user.id))
      .orderBy(userAiMemos.savedAt);

    const items: AiMemoItem[] = rows.map((r) => ({
      id:           r.memoId,
      answer:       r.answer,
      question:     r.question,
      articleTitle: r.articleTitle,
      articleSlug:  r.articleSlug ?? undefined,
      savedAt:      r.savedAt,
    }));

    return NextResponse.json({ ok: true, data: items });
  } catch (err) {
    console.error('[GET /api/user/ai-memos]', err);
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ── POST: メモ保存（bulk 対応・upsert） ─────────────────────────
export async function POST(req: NextRequest) {
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

  const parsed = z.object({ items: z.array(memoItemSchema).min(1).max(500) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  try {
    await db
      .insert(userAiMemos)
      .values(
        parsed.data.items.map((item) => ({
          userId,
          memoId:       item.id,
          question:     item.question,
          answer:       item.answer,
          articleTitle: item.articleTitle,
          articleSlug:  item.articleSlug ?? null,
          savedAt:      item.savedAt,
        })),
      )
      .onConflictDoNothing(); // user_id + memo_id が重複の場合はスキップ
  } catch (err) {
    console.error('[POST /api/user/ai-memos]', err);
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE: メモ削除 ────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ ok: false, error: 'CSRF check failed' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id パラメータが必要です' }, { status: 400 });
  }

  try {
    await db
      .delete(userAiMemos)
      .where(
        and(
          eq(userAiMemos.userId, session.user.id),
          eq(userAiMemos.memoId, id),
        ),
      );
  } catch (err) {
    console.error('[DELETE /api/user/ai-memos]', err);
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
