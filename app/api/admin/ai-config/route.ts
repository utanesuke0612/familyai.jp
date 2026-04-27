/**
 * app/api/admin/ai-config/route.ts
 * familyai.jp — AI教室パイプライン設定の管理 API（管理者専用）
 *
 * GET    /api/admin/ai-config  — 現在の有効値（DB+env+DEFAULTS マージ後）
 * PUT    /api/admin/ai-config  — 設定を保存（partial 値）
 * DELETE /api/admin/ai-config  — 設定をリセット（DEFAULTS に戻す）
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-auth';
import { verifyCsrf } from '@/lib/csrf';
import {
  getAiConfigFromDb,
  saveAiConfig,
  resetAiConfig,
} from '@/lib/repositories/ai-config';
import { invalidateAiConfigCache, getAiConfig } from '@/lib/config/ai-config';
import { AI_MODEL_OPTIONS, AI_CONFIG_RANGES } from '@/shared';

export const runtime = 'nodejs';

// ── 入力 Validation スキーマ ────────────────────────────────
const knownModelIds = AI_MODEL_OPTIONS.map((m) => m.id);

const aiConfigPartialSchema = z.object({
  stage1Model:       z.enum(knownModelIds as [string, ...string[]]).optional(),
  stage2Model:       z.enum(knownModelIds as [string, ...string[]]).optional(),
  stage1TimeoutMs:   z.number().int()
                       .min(AI_CONFIG_RANGES.stage1TimeoutMs.min)
                       .max(AI_CONFIG_RANGES.stage1TimeoutMs.max)
                       .optional(),
  stage2TimeoutMs:   z.number().int()
                       .min(AI_CONFIG_RANGES.stage2TimeoutMs.min)
                       .max(AI_CONFIG_RANGES.stage2TimeoutMs.max)
                       .optional(),
  stage2MaxTokens:   z.number().int()
                       .min(AI_CONFIG_RANGES.stage2MaxTokens.min)
                       .max(AI_CONFIG_RANGES.stage2MaxTokens.max)
                       .optional(),
  stage2Temperature: z.number()
                       .min(AI_CONFIG_RANGES.stage2Temperature.min)
                       .max(AI_CONFIG_RANGES.stage2Temperature.max)
                       .optional(),
  chatModel:         z.enum(knownModelIds as [string, ...string[]]).optional(),
  changeNote:        z.string().max(500).optional(),
});

// ── GET: 現在の有効値（マージ後）と DB 上の partial 値を返す ───
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { ok: false, error: '管理者権限が必要です。' },
      { status: 403 },
    );
  }

  try {
    const [effective, dbPartial] = await Promise.all([
      getAiConfig(),         // DEFAULTS + DB + env マージ後の有効値
      getAiConfigFromDb(),   // DB に保存されている partial 値（管理画面の入力欄初期値）
    ]);
    return NextResponse.json({ ok: true, data: { effective, dbPartial } });
  } catch (err) {
    console.error('[GET /api/admin/ai-config] エラー:', err);
    return NextResponse.json(
      { ok: false, error: 'サーバーエラーが発生しました。' },
      { status: 500 },
    );
  }
}

// ── PUT: 設定を保存 ───────────────────────────────────────────
export async function PUT(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ ok: false, error: '不正なリクエストです。' }, { status: 403 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: '管理者権限が必要です。' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'リクエストが不正です。' }, { status: 400 }); }

  const parsed = aiConfigPartialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: '入力値が不正です。', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const session   = await auth();
  const adminMail = session?.user?.email ?? 'unknown';
  const { changeNote, ...config } = parsed.data;

  try {
    await saveAiConfig(config, adminMail, changeNote);
    invalidateAiConfigCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PUT /api/admin/ai-config] エラー:', err);
    return NextResponse.json(
      { ok: false, error: 'サーバーエラーが発生しました。' },
      { status: 500 },
    );
  }
}

// ── DELETE: 設定をリセット ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ ok: false, error: '不正なリクエストです。' }, { status: 403 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: '管理者権限が必要です。' }, { status: 403 });
  }

  const session   = await auth();
  const adminMail = session?.user?.email ?? 'unknown';

  try {
    await resetAiConfig(adminMail);
    invalidateAiConfigCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/admin/ai-config] エラー:', err);
    return NextResponse.json(
      { ok: false, error: 'サーバーエラーが発生しました。' },
      { status: 500 },
    );
  }
}
