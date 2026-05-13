/**
 * app/api/admin/3d-models/[slug]/toggle/route.ts
 * PATCH /api/admin/3d-models/:slug/toggle — 公開/非公開 切替
 *
 * 既存 /api/admin/articles/[slug]/toggle と同パターン。
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin }              from '@/lib/admin-auth';
import { verifyCsrf }                from '@/lib/csrf';
import { enforceAdminRateLimit }     from '@/lib/ratelimit';
import { togglePublishedBySlug }     from '@/lib/repositories/3d-models';
import { withRequest }                from '@/lib/log';

interface Ctx { params: { slug: string }; }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const log = withRequest(req, '/api/admin/3d-models/:slug/toggle');
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { ok: false, error: { code: 'CSRF', message: 'CSRF check failed' } },
      { status: 403 },
    );
  }

  const check = await requireAdmin();
  if (!check.ok) return check.response;

  const rl = await enforceAdminRateLimit(req, 'admin');
  if (rl) return rl;

  try {
    const next = await togglePublishedBySlug(params.slug);
    if (next === null) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'モデルが見つかりません' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, data: { slug: params.slug, published: next } });
  } catch (err) {
    log.error('admin.3d-models.toggle', { slug: params.slug, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'サーバーエラーが発生しました' } },
      { status: 500 },
    );
  }
}
