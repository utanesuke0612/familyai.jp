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
import { eq, and, sql }                from 'drizzle-orm';
import { auth }                        from '@/lib/auth';
import { db, userAiMemos }             from '@/lib/db';
import { verifyCsrf }                  from '@/lib/csrf';
import { toAiMemoItem }                from '@/lib/mappers/ai-memos';

// ── バリデーション ──────────────────────────────────────────────
const memoItemSchema = z.object({
  id:           z.string().min(1).max(36),
  answer:       z.string().min(1),
  question:     z.string(),           // 直前の質問がない場合は空文字を許容
  articleTitle: z.string().min(1).max(255),
  articleSlug:  z.string().max(255).optional(),
  savedAt:      z.number().int().positive(),
});

// ── GET: メモ一覧取得（ページネーション対応・Rev31 / CX-4） ─────
//   - `page` (1-based, default 1)
//   - `pageSize` (default 50, max 200)
//   - レスポンス: `{ ok, data: items, meta: { total, page, perPage } }`
//   - 後方互換: `data` 配列形は維持（既存 Web クライアントは meta を無視可能）
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const queryParsed = z
    .object({
      page:     z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(200).default(50),
    })
    .safeParse({
      page:     url.searchParams.get('page')     ?? undefined,
      pageSize: url.searchParams.get('pageSize') ?? undefined,
    });
  if (!queryParsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: queryParsed.error.flatten() },
      { status: 400 },
    );
  }
  const { page, pageSize } = queryParsed.data;

  try {
    const userId = session.user.id;
    // 件数（pagination meta 用）
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userAiMemos)
      .where(eq(userAiMemos.userId, userId));
    const total = totalResult[0]?.count ?? 0;

    const rows = await db
      .select()
      .from(userAiMemos)
      .where(eq(userAiMemos.userId, userId))
      .orderBy(userAiMemos.savedAt)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items = rows.map(toAiMemoItem);

    return NextResponse.json({
      ok:   true,
      data: items,
      meta: { total, page, perPage: pageSize },
    });
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
