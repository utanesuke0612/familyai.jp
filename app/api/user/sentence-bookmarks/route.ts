/**
 * app/api/user/sentence-bookmarks/route.ts
 * familyai.jp — VOA ディクテーション「📜 スクリプト」センテンスブックマーク
 *
 * GET    /api/user/sentence-bookmarks                  — 一覧取得（pagination）
 * POST   /api/user/sentence-bookmarks                  — 保存（bulk・upsert）
 * DELETE /api/user/sentence-bookmarks?id=xxx           — 削除
 *
 * 認証: NextAuth セッション必須（未認証は 401）
 * CSRF:  POST / DELETE で verifyCsrf チェック
 *
 * Rev34 で新設。同パターンのコメント・構造で /api/user/vocab-bookmarks に揃える。
 * 単語帳とは別エンドポイント（データモデルが異なるため）。
 */

import { NextRequest, NextResponse }      from 'next/server';
import { z }                              from 'zod';
import { eq, and, sql }                   from 'drizzle-orm';
import { auth }                           from '@/lib/auth';
import { db, userSentenceBookmarks }      from '@/lib/db';
import { verifyCsrf }                     from '@/lib/csrf';
import { toSentenceBookmarkItem }         from '@/lib/mappers/sentence-bookmarks';

// ── バリデーション ──────────────────────────────────────────────
const sentenceItemSchema = z.object({
  /** course/lesson/sentenceIndex の複合キー（一意） */
  id:          z.string().min(1).max(200),
  /** 注釈付き本文（`{word|読み}` / `**Speaker:**` 等そのまま） */
  text:        z.string().min(1).max(2000),
  /** 検索用平文（注釈を剥がしたもの） */
  textPlain:   z.string().min(1).max(2000),
  startSec:    z.number().nonnegative(),
  endSec:      z.number().nonnegative(),
  speaker:     z.string().max(60).optional(),
  course:      z.string().min(1).max(100),
  lesson:      z.string().min(1).max(100),
  lessonTitle: z.string().max(255).optional(),
  audioUrl:    z.string().url().max(500).optional(),
  note:        z.string().max(500).optional(),
  addedAt:     z.number().int().positive(),
});

// ── GET: 一覧取得（ページネーション対応・CX-4 と同形式） ──────
//   - `page` (1-based, default 1)
//   - `pageSize` (default 50, max 200)
//   - レスポンス: `{ ok, data: items, meta: { total, page, perPage } }`
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
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userSentenceBookmarks)
      .where(eq(userSentenceBookmarks.userId, userId));
    const total = totalResult[0]?.count ?? 0;

    const rows = await db
      .select()
      .from(userSentenceBookmarks)
      .where(eq(userSentenceBookmarks.userId, userId))
      .orderBy(userSentenceBookmarks.addedAt)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items = rows.map(toSentenceBookmarkItem);

    return NextResponse.json({
      ok:   true,
      data: items,
      meta: { total, page, perPage: pageSize },
    });
  } catch (err) {
    console.error('[GET /api/user/sentence-bookmarks]', err);
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ── POST: 保存（bulk・upsert・最大 300 件） ────────────────────
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

  const parsed = z
    .object({
      items: z
        .array(sentenceItemSchema)
        .min(1)
        .max(300, { message: '最大 300 件まで一度に保存できます' }),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  try {
    await db
      .insert(userSentenceBookmarks)
      .values(
        parsed.data.items.map((item) => ({
          userId,
          sentenceId:  item.id,
          text:        item.text,
          textPlain:   item.textPlain,
          startSec:    item.startSec,
          endSec:      item.endSec,
          speaker:     item.speaker     ?? null,
          course:      item.course,
          lesson:      item.lesson,
          lessonTitle: item.lessonTitle ?? null,
          audioUrl:    item.audioUrl    ?? null,
          note:        item.note        ?? null,
          addedAt:     item.addedAt,
        })),
      )
      .onConflictDoNothing(); // user_id + sentence_id 重複はスキップ
  } catch (err) {
    console.error('[POST /api/user/sentence-bookmarks]', err);
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE: 削除 ─────────────────────────────────────────────────
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
      .delete(userSentenceBookmarks)
      .where(
        and(
          eq(userSentenceBookmarks.userId, session.user.id),
          eq(userSentenceBookmarks.sentenceId, id),
        ),
      );
  } catch (err) {
    console.error('[DELETE /api/user/sentence-bookmarks]', err);
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
