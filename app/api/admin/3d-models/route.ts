/**
 * app/api/admin/3d-models/route.ts
 * GET  /api/admin/3d-models  — 3D モデル一覧（管理者専用・公開非公開含む）
 * POST /api/admin/3d-models  — 3D モデル新規作成（管理者専用）
 *
 * 既存 /api/admin/articles と同パターン:
 *   - requireAdmin（ADMIN_EMAIL 一致）
 *   - verifyCsrf（POST のみ Origin チェック）
 *   - enforceAdminRateLimit（10 req/min・侵害アカウント保護）
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin }              from '@/lib/admin-auth';
import { verifyCsrf }                from '@/lib/csrf';
import { enforceAdminRateLimit }     from '@/lib/ratelimit';
import { listAllModelsForAdmin, upsertModel } from '@/lib/repositories/3d-models';
import { adminTutor3dQuerySchema, createTutor3dModelSchema } from '@/lib/schemas/3d-models';

// ─── GET: 全モデル一覧 ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const check = await requireAdmin();
  if (!check.ok) return check.response;

  const { searchParams } = req.nextUrl;
  const parsedQuery = adminTutor3dQuerySchema.safeParse({
    search:    searchParams.get('search')    ?? undefined,
    subject:   searchParams.get('subject')   ?? undefined,
    grade:     searchParams.get('grade')     ?? undefined,
    published: searchParams.get('published') ?? undefined,
    sort:      searchParams.get('sort')      ?? undefined,
    page:      searchParams.get('page')      ?? undefined,
    pageSize:  searchParams.get('pageSize')  ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_PARAMS', message: 'クエリパラメータが不正です', details: parsedQuery.error.flatten() } },
      { status: 400 },
    );
  }

  // Rev38 #H6: repository から catch を剥がしたので route 側で 500 を返す責務を持つ
  try {
    const result = await listAllModelsForAdmin(parsedQuery.data);
    return NextResponse.json({
      ok:   true,
      data: {
        items: result.items,
        meta:  {
          page:       result.page,
          perPage:    result.pageSize,
          total:      result.total,
          totalPages: result.totalPages,
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/admin/3d-models]',
      err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'サーバーエラーが発生しました' } },
      { status: 500 },
    );
  }
}

// ─── POST: モデル新規作成 ───────────────────────────────────
export async function POST(req: NextRequest) {
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

  const parsed = createTutor3dModelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: 'バリデーション失敗', details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  try {
    const id = await upsertModel(parsed.data);
    return NextResponse.json(
      { ok: true, data: { id, slug: parsed.data.slug } },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { ok: false, error: { code: 'SLUG_TAKEN', message: 'このスラッグは既に使用されています' } },
        { status: 409 },
      );
    }
    console.error('[POST /api/admin/3d-models]', msg);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'サーバーエラーが発生しました' } },
      { status: 500 },
    );
  }
}
