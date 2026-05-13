/**
 * app/api/admin/3d-models/[slug]/route.ts
 * GET    /api/admin/3d-models/:slug — 1 件取得（編集フォーム初期値用）
 * PUT    /api/admin/3d-models/:slug — 更新（メタ情報 + hotspots 一括）
 * DELETE /api/admin/3d-models/:slug — 削除
 *
 * 公開フラグの切替は /api/admin/3d-models/:slug/toggle 側を使う。
 */

import { NextRequest, NextResponse } from 'next/server';
import { del }                       from '@vercel/blob';
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

function assetUrlToBlobPathname(url: string | null | undefined): string | null {
  if (!url) return null;

  const apiPrefix = '/api/3d-models/assets/';
  if (url.startsWith(apiPrefix)) {
    const pathname = url.slice(apiPrefix.length);
    return pathname.startsWith('3d-models/') ? pathname : null;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) return null;
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    return pathname.startsWith('3d-models/') ? pathname : null;
  } catch {
    return null;
  }
}

async function deleteModelBlobs(model: {
  glbUrl: string;
  usdzUrl: string | null;
  thumbnailUrl: string | null;
}): Promise<void> {
  const pathnames = Array.from(new Set([
    assetUrlToBlobPathname(model.glbUrl),
    assetUrlToBlobPathname(model.usdzUrl),
    assetUrlToBlobPathname(model.thumbnailUrl),
  ].filter((v): v is string => Boolean(v))));

  if (pathnames.length === 0) return;
  await del(pathnames);
}

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

  // Rev38 #H4: 旧実装は getModel → blob.del → deleteModel の 3 段階だったため、
  // 並行 DELETE で「両方が getModel 成功 → 片方は blob.del が 404 で fail」する race があった。
  // また Vercel Blob は外部 API のため DB transaction には含められない。
  // → DB 削除を先行・blob.del を best-effort（warn のみ）にすることで:
  //   1. 並行 DELETE は returning() の競合で確定的に処理される（後勝ち分は 404）
  //   2. blob.del の一時失敗で DB と CDN が不整合になる可能性は残るが、
  //      orphan blob のクリーンナップは別ジョブで対処可能（DB 行が無いと参照不能）。
  try {
    // 1. blob URL 取得のため、まずモデルを読む
    const model = await getModelBySlugForAdmin(params.slug);
    if (!model) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'モデルが見つかりません' } },
        { status: 404 },
      );
    }

    // 2. DB を先に削除（returning が空なら並行 DELETE に負けた = 既に削除済み）
    const deleted = await deleteModel(params.slug);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'モデルが見つかりません' } },
        { status: 404 },
      );
    }

    // 3. blob 削除は best-effort（失敗しても 200 を返す・orphan は手動 or 別ジョブで掃除）
    try {
      await deleteModelBlobs(model);
    } catch (err) {
      console.warn('[DELETE /api/admin/3d-models/:slug] blob.delete_failed',
        { slug: params.slug, error: err instanceof Error ? err.message : String(err) });
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
