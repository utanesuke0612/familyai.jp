/**
 * app/api/admin/articles/[slug]/route.ts
 * PUT    /api/admin/articles/:slug — 記事更新（管理者専用）
 * DELETE /api/admin/articles/:slug — 記事削除（管理者専用）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z }                         from 'zod';
import { requireAdmin }              from '@/lib/admin-auth';
import { verifyCsrf }                from '@/lib/csrf';
import { enforceAdminRateLimit }     from '@/lib/ratelimit';
import { updateArticle, deleteArticle } from '@/lib/repositories/articles';

// ─── zod スキーマ（update は全フィールド optional） ───────────
const FAMILY_ROLES = ['papa', 'mama', 'kids', 'senior', 'common'] as const;
const CATEGORIES   = ['image-gen', 'voice', 'education', 'housework'] as const;
const LEVELS       = ['beginner', 'intermediate', 'advanced'] as const;

const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  });

const updateArticleSchema = z.object({
  title:            z.string().min(1).max(255).optional(),
  description:      z.string().nullable().optional(),
  body:             z.string().min(1).optional(),
  roles:            z.array(z.enum(FAMILY_ROLES)).optional(),
  categories:       z.array(z.enum(CATEGORIES)).optional(),
  level:            z.enum(LEVELS).optional(),
  published:        z.boolean().optional(),
  publishedAt:      optionalDate,
  audioUrl:         z.string().nullable().optional(),
  audioTranscript:  z.string().nullable().optional(),
  audioDurationSec: z.number().int().nonnegative().nullable().optional(),
  audioLanguage:    z.string().nullable().optional(),
  thumbnailUrl:     z.string().nullable().optional(),
  isFeatured:       z.boolean().optional(),
});

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
