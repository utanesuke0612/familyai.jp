/**
 * app/api/user/vocab-bookmarks/route.ts
 * familyai.jp — ログイン会員の VOA 単語ブックマーク クラウド同期 API
 *
 * GET    /api/user/vocab-bookmarks          — 全ブックマーク取得
 * POST   /api/user/vocab-bookmarks          — ブックマーク保存（bulk 対応）
 * DELETE /api/user/vocab-bookmarks?id=xxx   — ブックマーク削除
 *
 * 認証: NextAuth セッション必須（未認証は 401）
 * CSRF:  POST / DELETE で verifyCsrf チェック
 */

import { NextRequest, NextResponse }  from 'next/server';
import { z }                           from 'zod';
import { eq, and, sql }                from 'drizzle-orm';
import { auth }                        from '@/lib/auth';
import { db, userVocabBookmarks }      from '@/lib/db';
import { verifyCsrf }                  from '@/lib/csrf';
import { toVocabItem }                 from '@/lib/mappers/vocab-bookmarks';
import { withRequest }                  from '@/lib/log';

// ── バリデーション ──────────────────────────────────────────────
const vocabItemSchema = z.object({
  id:          z.string().min(1).max(200),
  word:        z.string().min(1).max(255),
  meaning:     z.string().min(1),
  pron:        z.string().max(255).optional(),
  example:     z.string().optional(),
  course:      z.string().max(100).optional(),
  lesson:      z.string().max(100).optional(),
  lessonTitle: z.string().max(255).optional(),
  addedAt:     z.number().int().positive(),
});

// ── GET: ブックマーク一覧取得（ページネーション対応・Rev31 / CX-4） ──
//   - `page` (1-based, default 1)
//   - `pageSize` (default 50, max 200)
//   - レスポンス: `{ ok, data: items, meta: { total, page, perPage } }`
//   - 後方互換: `data` 配列形は維持
export async function GET(req: NextRequest) {
  const log = withRequest(req, '/api/user/vocab-bookmarks');
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
      .from(userVocabBookmarks)
      .where(eq(userVocabBookmarks.userId, userId));
    const total = totalResult[0]?.count ?? 0;

    const rows = await db
      .select()
      .from(userVocabBookmarks)
      .where(eq(userVocabBookmarks.userId, userId))
      .orderBy(userVocabBookmarks.addedAt)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items = rows.map(toVocabItem);

    return NextResponse.json({
      ok:   true,
      data: items,
      meta: { total, page, perPage: pageSize },
    });
  } catch (err) {
    log.error('vocab-bookmarks.get', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ── POST: ブックマーク保存（bulk 対応・upsert） ─────────────────
export async function POST(req: NextRequest) {
  const log = withRequest(req, '/api/user/vocab-bookmarks');
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

  // CX-5: 上限を 2000 → 300 に縮小（Neon row insert タイムアウト・DoS 対策）
  const parsed = z
    .object({
      items: z
        .array(vocabItemSchema)
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
      .insert(userVocabBookmarks)
      .values(
        parsed.data.items.map((item) => ({
          userId,
          vocabId:     item.id,
          word:        item.word,
          meaning:     item.meaning,
          pron:        item.pron ?? null,
          example:     item.example ?? null,
          course:      item.course ?? null,
          lesson:      item.lesson ?? null,
          lessonTitle: item.lessonTitle ?? null,
          addedAt:     item.addedAt,
        })),
      )
      .onConflictDoNothing(); // user_id + vocab_id が重複の場合はスキップ
  } catch (err) {
    log.error('vocab-bookmarks.post', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE: ブックマーク削除 ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const log = withRequest(req, '/api/user/vocab-bookmarks');
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
      .delete(userVocabBookmarks)
      .where(
        and(
          eq(userVocabBookmarks.userId, session.user.id),
          eq(userVocabBookmarks.vocabId, id),
        ),
      );
  } catch (err) {
    log.error('vocab-bookmarks.delete', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
