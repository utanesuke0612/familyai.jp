/**
 * app/api/admin/3d-models/[slug]/route.ts
 * GET    /api/admin/3d-models/:slug — 1 件取得（編集フォーム初期値用）
 * PUT    /api/admin/3d-models/:slug — 更新（メタ情報 + hotspots 一括）
 * DELETE /api/admin/3d-models/:slug — 削除
 *
 * 公開フラグの切替は /api/admin/3d-models/:slug/toggle 側を使う。
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin }              from '@/lib/admin-auth';
import { verifyCsrf }                from '@/lib/csrf';
import { enforceAdminRateLimit }     from '@/lib/ratelimit';
import {
  getModelBySlugForAdmin,
  updateModel,
  deleteModel,
} from '@/lib/repositories/3d-models';
import { updateTutor3dModelSchema } from '@/lib/schemas/3d-models';

interface Ctx { params: { slug: string }; }

// ─── GET: 1 件取得 ─────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Ctx) {
  const check = await requireAdmin();
  if (!check.ok) return check.response;

  const model = await getModelBySlugForAdmin(params.slug);
  if (!model) {
    return NextResponse.json(
      { ok: false, error: { code: 'NOT_FOUND', message: 'モデルが見つかりません' } },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, data: model });
}

// ─── PUT: 更新 ───────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Ctx) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON' } },
      { status: 400 },
    );
  }

  const parsed = updateTutor3dModelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'バリデーション失敗', details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  try {
    const updated = await updateModel(params.slug, parsed.data);
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'モデルが見つかりません' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, data: { slug: params.slug } });
  } catch (err) {
    console.error('[PUT /api/admin/3d-models/:slug]',
      err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'サーバーエラーが発生しました' } },
      { status: 500 },
    );
  }
}

// ─── DELETE: 削除 ────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Ctx) {
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
    // 注意: Vercel Blob 上の GLB / USDZ / Thumbnail ファイルは現状残置。
    // 段階 F で「DB 削除と同時に紐づく Blob ファイルを del() する」処理を追加予定。
    const deleted = await deleteModel(params.slug);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'モデルが見つかりません' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, data: { slug: params.slug } });
  } catch (err) {
    console.error('[DELETE /api/admin/3d-models/:slug]',
      err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'サーバーエラーが発生しました' } },
      { status: 500 },
    );
  }
}
