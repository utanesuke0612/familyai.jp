/**
 * app/api/admin/articles/[slug]/toggle/route.ts
 * PATCH /api/admin/articles/:slug/toggle — 公開/非公開を切り替え（管理者専用）
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin }              from '@/lib/admin-auth';
import { verifyCsrf }                from '@/lib/csrf';
import { enforceAdminRateLimit }     from '@/lib/ratelimit';
import { togglePublished }           from '@/lib/repositories/articles';

export async function PATCH(
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

  const result = await togglePublished(params.slug);
  if (!result) {
    return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: result });
}
