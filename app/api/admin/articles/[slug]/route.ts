/**
 * app/api/admin/articles/[slug]/route.ts
 * PUT    /api/admin/articles/:slug — 記事更新（管理者専用）
 * DELETE /api/admin/articles/:slug — 記事削除（管理者専用）
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin }              from '@/lib/admin-auth';
import { verifyCsrf }                from '@/lib/csrf';
import { enforceAdminRateLimit }     from '@/lib/ratelimit';
import { updateArticle, deleteArticle } from '@/lib/repositories/articles';
import { updateArticleSchema }       from '@/lib/schemas/articles';

// ─── PUT: 記事更新 ────────────────────────────────────────────
export async function PUT(
  req:     NextRequest,
  { params }: { params: { slug: string } },
) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 });
  }

  const check = await requireAdmin();
  if (!check.ok) return check.response;

  // レート制限（Rev23 #5）
  const rl = await enforceAdminRateLimit(req, 'admin');
  if (rl) return rl;

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

  const updated = await updateArticle(params.slug, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: updated });
}

// ─── DELETE: 記事削除 ─────────────────────────────────────────
export async function DELETE(
  req:    NextRequest,
  { params }: { params: { slug: string } },
) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 });
  }

  const check = await requireAdmin();
  if (!check.ok) return check.response;

  // レート制限（Rev23 #5）
  const rl = await enforceAdminRateLimit(req, 'admin');
  if (rl) return rl;

  const ok = await deleteArticle(params.slug);
  if (!ok) {
    return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
