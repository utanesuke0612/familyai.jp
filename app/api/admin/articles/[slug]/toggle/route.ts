/**
 * app/api/admin/articles/[slug]/toggle/route.ts
 * PATCH /api/admin/articles/:slug/toggle — 公開/非公開を切り替え（管理者専用）
 *
 * Architecture Deepening #1: ガード三和音を protectAdminRoute に集約。
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { protectAdminRoute, legacyErrorBuilder } from '@/lib/api/admin-guard';
import { togglePublished }           from '@/lib/repositories/articles';

interface Ctx { params?: { slug: string }; }

export const PATCH = protectAdminRoute<{ slug: string }>(async (_req: NextRequest, { params }: Ctx) => {
  const slug = params!.slug;
  const result = await togglePublished(slug);
  if (!result) {
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

  return NextResponse.json({ ok: true, data: result });
}, { errorBuilder: legacyErrorBuilder });
