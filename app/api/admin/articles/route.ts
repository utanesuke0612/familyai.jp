/**
 * app/api/admin/articles/route.ts
 * GET  /api/admin/articles  — 全記事一覧（管理者専用）
 * POST /api/admin/articles  — 記事新規作成（管理者専用）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z }                         from 'zod';
import { requireAdmin }              from '@/lib/admin-auth';
import { verifyCsrf }                from '@/lib/csrf';
import { enforceAdminRateLimit }     from '@/lib/ratelimit';
import { listAllArticles, createArticle } from '@/lib/repositories/articles';

// ─── zod スキーマ ─────────────────────────────────────────────
const FAMILY_ROLES = ['papa', 'mama', 'kids', 'senior', 'common'] as const;
const CATEGORIES   = ['image-gen', 'voice', 'education', 'housework'] as const;
const LEVELS       = ['beginner', 'intermediate', 'advanced'] as const;

/** 日付文字列 → Date（空文字/undefined は null） */
const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  });

const createArticleSchema = z.object({
  slug:             z.string().min(1).max(255),
  title:            z.string().min(1).max(255),
  description:      z.string().nullable().optional().transform((v) => v ?? null),
  body:             z.string().min(1),
  roles:            z.array(z.enum(FAMILY_ROLES)).default([]),
  categories:       z.array(z.enum(CATEGORIES)).default([]),
  level:            z.enum(LEVELS).default('beginner'),
  published:        z.boolean().optional().default(false),
  publishedAt:      optionalDate,
  audioUrl:         z.string().nullable().optional().transform((v) => v ?? null),
  audioTranscript:  z.string().nullable().optional().transform((v) => v ?? null),
  audioDurationSec: z.number().int().nonnegative().nullable().optional().transform((v) => v ?? null),
  audioLanguage:    z.string().nullable().optional().transform((v) => v ?? null),
  thumbnailUrl:     z.string().nullable().optional().transform((v) => v ?? null),
  isFeatured:       z.boolean().optional().default(false),
});

// ─── GET: 全記事一覧 ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const check = await requireAdmin();
  if (!check.ok) return check.response;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') ?? undefined;
  const sort   = (searchParams.get('sort') ?? 'latest') as 'latest' | 'oldest' | 'popular' | 'title';

  const items = await listAllArticles({ search, sort });
  return NextResponse.json({ ok: true, data: items });
}

// ─── POST: 記事新規作成 ───────────────────────────────────────
export async function POST(req: NextRequest) {
  // CSRF 防御（Origin チェック）
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 });
  }

  const check = await requireAdmin();
  if (!check.ok) return check.response;

  // レート制限（Rev23 #5・10req/min・侵害アカウントの Blob コスト爆発対策）
  const rl = await enforceAdminRateLimit(req, 'admin');
  if (rl) return rl;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const article = await createArticle({
      slug:             data.slug,
      title:            data.title,
      description:      data.description,
      body:             data.body,
      roles:            data.roles,
      categories:       data.categories,
      level:            data.level,
      published:        data.published,
      publishedAt:      data.publishedAt ?? null,
      audioUrl:         data.audioUrl,
      audioTranscript:  data.audioTranscript,
      audioDurationSec: data.audioDurationSec,
      audioLanguage:    data.audioLanguage,
      audioPlayCount:   0,
      thumbnailUrl:     data.thumbnailUrl,
      viewCount:        0,
      isFeatured:       data.isFeatured,
    });
    return NextResponse.json({ ok: true, data: article }, { status: 201 });
  } catch (err: unknown) {
    // slug 重複（PostgreSQL unique 制約違反）
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { error: 'このスラッグはすでに使用されています' },
        { status: 409 },
      );
    }
    console.error('[POST /api/admin/articles]', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
