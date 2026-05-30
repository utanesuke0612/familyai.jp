/**
 * app/api/admin/html-pages/route.ts
 * familyai.jp — HTML ページ管理 API（管理者専用）
 *
 * GET    /api/admin/html-pages          — 一覧取得
 * POST   /api/admin/html-pages          — 新規登録 { slug, title, blobUrl }
 * DELETE /api/admin/html-pages?id=uuid  — 削除
 */

import { NextRequest, NextResponse }  from 'next/server';
import { z }                           from 'zod';
import { eq, desc, sql }               from 'drizzle-orm';
import bcrypt                          from 'bcryptjs';
import { protectAdminRoute }           from '@/lib/api/admin-guard';
import { db, htmlPages }               from '@/lib/db';
import { del }                         from '@vercel/blob';

export const runtime = 'nodejs';

const createSchema = z.object({
  slug:     z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug は英小文字・数字・ハイフンのみ'),
  title:    z.string().min(1).max(500),
  blobUrl:  z.string().url(),
  password: z.string().min(4).max(100).optional(), // 任意パスワード
});

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set-password'),    id: z.string().uuid(), password: z.string().min(4).max(100) }),
  z.object({ action: z.literal('remove-password'), id: z.string().uuid() }),
]);

// ── GET: 一覧 ─────────────────────────────────────────────────
export const GET = protectAdminRoute(async () => {
  const rows = await db
    .select()
    .from(htmlPages)
    .orderBy(desc(htmlPages.createdAt));

  const total = await db.select({ n: sql<number>`count(*)::int` }).from(htmlPages);

  return NextResponse.json({
    ok:   true,
    data: {
      items: rows.map((r) => ({
        id:          r.id,
        slug:        r.slug,
        title:       r.title,
        blobUrl:     r.blobUrl,
        hasPassword: !!r.passwordHash,   // 平文・ハッシュは返さない
        createdAt:   r.createdAt.toISOString(),
        updatedAt:   r.updatedAt.toISOString(),
      })),
      total: Number(total[0]?.n ?? 0),
    },
  });
});

// ── POST: 新規登録 ────────────────────────────────────────────
export const POST = protectAdminRoute(async (req: NextRequest) => {
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg  = flat.fieldErrors.slug?.[0] ?? flat.fieldErrors.title?.[0] ?? flat.formErrors?.[0] ?? 'Validation failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  // slug 重複チェック
  const existing = await db
    .select({ id: htmlPages.id })
    .from(htmlPages)
    .where(eq(htmlPages.slug, parsed.data.slug))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `スラッグ "${parsed.data.slug}" は既に使用されています` },
      { status: 409 },
    );
  }

  // パスワードが指定された場合はハッシュ化
  const passwordHash = parsed.data.password
    ? await bcrypt.hash(parsed.data.password, 12)
    : null;

  const [inserted] = await db
    .insert(htmlPages)
    .values({
      slug:         parsed.data.slug,
      title:        parsed.data.title,
      blobUrl:      parsed.data.blobUrl,
      passwordHash: passwordHash ?? undefined,
    })
    .returning();

  return NextResponse.json({
    ok:   true,
    data: { ...inserted, createdAt: inserted!.createdAt.toISOString(), updatedAt: inserted!.updatedAt.toISOString() },
  }, { status: 201 });
});

// ── PATCH: パスワード設定・変更・削除 ─────────────────────────
export const PATCH = protectAdminRoute(async (req: NextRequest) => {
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg  = flat.formErrors?.[0] ?? 'Validation failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  if (parsed.data.action === 'set-password') {
    const hash = await bcrypt.hash(parsed.data.password, 12);
    await db
      .update(htmlPages)
      .set({ passwordHash: hash, updatedAt: new Date() })
      .where(eq(htmlPages.id, parsed.data.id));
    return NextResponse.json({ ok: true, hasPassword: true });
  }

  // remove-password
  await db
    .update(htmlPages)
    .set({ passwordHash: null, updatedAt: new Date() })
    .where(eq(htmlPages.id, parsed.data.id));
  return NextResponse.json({ ok: true, hasPassword: false });
});

// ── DELETE: 削除 ──────────────────────────────────────────────
export const DELETE = protectAdminRoute(async (req: NextRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id パラメータが必要です' }, { status: 400 });
  }

  // DB からレコードを取得して Blob URL も一緒に取得
  const [row] = await db
    .select({ blobUrl: htmlPages.blobUrl })
    .from(htmlPages)
    .where(eq(htmlPages.id, id))
    .limit(1);

  if (row) {
    // Vercel Blob からも削除
    try { await del(row.blobUrl); } catch { /* 既に削除済みの場合はスキップ */ }
  }

  await db.delete(htmlPages).where(eq(htmlPages.id, id));

  return NextResponse.json({ ok: true });
});
