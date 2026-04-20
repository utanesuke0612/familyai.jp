/**
 * app/api/admin/articles/route.ts
 * GET  /api/admin/articles  — 全記事一覧（管理者専用）
 * POST /api/admin/articles  — 記事新規作成（管理者専用）
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin }              from '@/lib/admin-auth';
import { verifyCsrf }                from '@/lib/csrf';
import { enforceAdminRateLimit }     from '@/lib/ratelimit';
import { listAllArticles, createArticle } from '@/lib/repositories/articles';
import { createArticleSchema, adminArticlesQuerySchema } from '@/lib/schemas/articles';

// ─── GET: 全記事一覧 ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const check = await requireAdmin();
  if (!check.ok) return check.response;

  const { searchParams } = req.nextUrl;
  const parsedQuery = adminArticlesQuerySchema.safeParse({
    search: searchParams.get('search') ?? undefined,
    sort:   searchParams.get('sort')   ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsedQuery.error.flatten() },
      { status: 400 },
    );
  }
  const { search, sort } = parsedQuery.data;

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
