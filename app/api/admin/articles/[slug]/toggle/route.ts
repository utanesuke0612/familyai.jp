/**
 * app/api/admin/articles/[slug]/toggle/route.ts
 * PATCH /api/admin/articles/:slug/toggle — 公開/非公開を切り替え（管理者専用）
 *
 * Architecture Deepening #1: ガード三和音を protectAdminRoute に集約。
 */

import { NextRequest, NextResponse } from 'next/server';
import { protectAdminRoute, legacyErrorBuilder } from '@/lib/api/admin-guard';
import { togglePublished }           from '@/lib/repositories/articles';

interface Ctx { params?: { slug: string }; }

export const PATCH = protectAdminRoute<{ slug: string }>(async (_req: NextRequest, { params }: Ctx) => {
  const slug = params!.slug;
  const result = await togglePublished(slug);
  if (!result) {
    return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: result });
}, { errorBuilder: legacyErrorBuilder });
