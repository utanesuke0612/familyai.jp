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
import { eq, and }                     from 'drizzle-orm';
import { auth }                        from '@/lib/auth';
import { db, userVocabBookmarks }      from '@/lib/db';
import { verifyCsrf }                  from '@/lib/csrf';
import type { VocabItem }              from '@/lib/voaenglish/vocab-store';

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

// ── GET: 全ブックマーク取得 ─────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(userVocabBookmarks)
    .where(eq(userVocabBookmarks.userId, session.user.id))
    .orderBy(userVocabBookmarks.addedAt);

  const items: VocabItem[] = rows.map((r) => ({
    id:          r.vocabId,
    word:        r.word,
    meaning:     r.meaning,
    pron:        r.pron ?? undefined,
    example:     r.example ?? undefined,
    course:      r.course ?? undefined,
    lesson:      r.lesson ?? undefined,
    lessonTitle: r.lessonTitle ?? undefined,
    addedAt:     r.addedAt,
  }));

  return NextResponse.json({ ok: true, data: items });
}

// ── POST: ブックマーク保存（bulk 対応・upsert） ─────────────────
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

  const parsed = z.object({ items: z.array(vocabItemSchema).min(1).max(2000) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const userId = session.user.id;

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

  return NextResponse.json({ ok: true });
}

// ── DELETE: ブックマーク削除 ────────────────────────────────────
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

  await db
    .delete(userVocabBookmarks)
    .where(
      and(
        eq(userVocabBookmarks.userId, session.user.id),
        eq(userVocabBookmarks.vocabId, id),
      ),
    );

  return NextResponse.json({ ok: true });
}
