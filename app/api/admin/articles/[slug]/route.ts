/**
 * app/api/admin/articles/[slug]/route.ts
 * PUT    /api/admin/articles/:slug — 記事更新（管理者専用）
 * DELETE /api/admin/articles/:slug — 記事削除（管理者専用）
 *
 * Architecture Deepening #1: ガード三和音を protectAdminRoute に集約。
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { protectAdminRoute, legacyErrorBuilder } from '@/lib/api/admin-guard';
import { updateArticle, deleteArticle } from '@/lib/repositories/articles';
import { updateArticleSchema }       from '@/lib/schemas/articles';

interface Ctx { params?: { slug: string }; }

// ─── PUT: 記事更新 ────────────────────────────────────────────
export const PUT = protectAdminRoute<{ slug: string }>(async (req: NextRequest, { params }: Ctx) => {
  const slug = params!.slug;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateArticle(slug, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
  }

  // キャッシュ破棄
  revalidatePath('/learn');
  revalidatePath(`/learn/${slug}`);
  revalidatePath('/', 'layout');
  revalidateTag('article-detail');
  revalidateTag('article-list');
  revalidateTag('article-latest');
  revalidateTag('article-related');
  revalidateTag('article-tags');
  revalidateTag('article-slugs');

  return NextResponse.json({ ok: true, data: updated });
}, { errorBuilder: legacyErrorBuilder });

// ─── DELETE: 記事削除 ─────────────────────────────────────────
export const DELETE = protectAdminRoute<{ slug: string }>(async (_req: NextRequest, { params }: Ctx) => {
  const slug = params!.slug;
  const ok = await deleteArticle(slug);
  if (!ok) {
    return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
  }

  // キャッシュ破棄
  revalidatePath('/learn');
  revalidatePath(`/learn/${slug}`);
  revalidatePath('/', 'layout');
  revalidateTag('article-detail');
  revalidateTag('article-list');
  revalidateTag('article-latest');
  revalidateTag('article-related');
  revalidateTag('article-tags');
  revalidateTag('article-slugs');

  return NextResponse.json({ ok: true });
}, { errorBuilder: legacyErrorBuilder });
