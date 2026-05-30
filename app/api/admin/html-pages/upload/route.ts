/**
 * app/api/admin/html-pages/upload/route.ts
 * POST /api/admin/html-pages/upload
 *
 * multipart/form-data で HTML ファイルを受け取り、
 * サーバー側で Vercel Blob に put() してから DB に登録する。
 *
 * FormData フィールド:
 *   file     File   .html ファイル（必須）
 *   slug     string URL スラッグ（必須）
 *   title    string ページタイトル（必須）
 *   password string パスワード（任意・4文字以上）
 */

import { NextRequest, NextResponse } from 'next/server';
import { put }                        from '@vercel/blob';
import bcrypt                         from 'bcryptjs';
import { z }                          from 'zod';
import { eq }                         from 'drizzle-orm';
import { protectAdminRoute }          from '@/lib/api/admin-guard';
import { db, htmlPages }              from '@/lib/db';
import { withRequest }                from '@/lib/log';

export const runtime = 'nodejs';

const MAX_BYTES = 4 * 1024 * 1024; // 4MB（Vercel 上限内）

const fieldSchema = z.object({
  slug:     z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug は英小文字・数字・ハイフンのみ'),
  title:    z.string().min(1).max(500),
  password: z.string().min(4).max(100).optional(),
});

export const POST = protectAdminRoute(async (req: NextRequest) => {
  const log = withRequest(req, '/api/admin/html-pages/upload');

  // multipart/form-data をパース
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'FormData のパースに失敗しました' }, { status: 400 });
  }

  // ファイル取得・検証
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'file フィールドが必要です' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.html')) {
    return NextResponse.json({ ok: false, error: '.html ファイルのみアップロードできます' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'ファイルサイズは 4MB 以下にしてください' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: 'ファイルが空です' }, { status: 400 });
  }

  // テキストフィールド検証
  const parsed = fieldSchema.safeParse({
    slug:     formData.get('slug'),
    title:    formData.get('title'),
    password: formData.get('password') || undefined,
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg  = flat.fieldErrors.slug?.[0] ?? flat.fieldErrors.title?.[0] ?? 'Validation failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
  const { slug, title, password } = parsed.data;

  // slug 重複チェック
  const existing = await db
    .select({ id: htmlPages.id })
    .from(htmlPages)
    .where(eq(htmlPages.slug, slug))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `スラッグ "${slug}" は既に使用されています` },
      { status: 409 },
    );
  }

  // Vercel Blob にサーバー側でアップロード
  const pathname = `html-pages/${slug}.html`;
  let blobUrl: string;
  try {
    const blob = await put(pathname, file, {
      access:          'private',
      contentType:     'text/html; charset=utf-8',
      addRandomSuffix: false,
    });
    blobUrl = blob.url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Blob アップロードに失敗しました';
    log.error('html-pages.upload.blob', { slug, error: msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // パスワードハッシュ化
  const passwordHash = password ? await bcrypt.hash(password, 12) : null;

  // DB 登録（TOCTOU 競合: UNIQUE 制約違反を 409 として返す）
  let rows: (typeof htmlPages.$inferSelect)[];
  try {
    rows = await db
      .insert(htmlPages)
      .values({ slug, title, blobUrl, passwordHash: passwordHash ?? undefined })
      .returning();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    // UNIQUE 制約違反（slug 競合）
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { ok: false, error: `スラッグ "${slug}" は既に使用されています` },
        { status: 409 },
      );
    }
    log.error('html-pages.upload.db', { slug, error: msg });
    return NextResponse.json({ ok: false, error: 'DB 登録に失敗しました' }, { status: 500 });
  }

  const inserted = rows[0];
  if (!inserted) {
    log.error('html-pages.upload.no-row', { slug });
    return NextResponse.json({ ok: false, error: 'DB 登録に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({
    ok:   true,
    data: {
      id:          inserted.id,
      slug:        inserted.slug,
      title:       inserted.title,
      blobUrl:     inserted.blobUrl,
      hasPassword: !!passwordHash,
      createdAt:   inserted.createdAt.toISOString(),
    },
  }, { status: 201 });
});
