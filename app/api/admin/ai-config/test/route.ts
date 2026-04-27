/**
 * app/api/admin/ai-config/test/route.ts
 * familyai.jp — 現在の AI 設定を使ったテスト生成 API（管理者専用）
 *
 * POST /api/admin/ai-config/test
 *   Body: { theme?: string }
 *   現在の有効設定で AI教室を1回試行し、生成にかかった時間と
 *   生成HTMLのサイズを返す。HTMLそのものは返さない（プレビューのみ確認用）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { verifyCsrf } from '@/lib/csrf';
import { getAiConfig } from '@/lib/config/ai-config';
import { estimateAiCost } from '@/shared';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return NextResponse.json({ ok: false, error: '不正なリクエストです。' }, { status: 403 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: '管理者権限が必要です。' }, { status: 403 });
  }

  // 現在の有効設定を取得（DB+env+DEFAULTS マージ後）
  const cfg = await getAiConfig();
  const cost = estimateAiCost(cfg);

  // 実 AI 呼び出しはせず、現在の設定値とコスト試算を返す
  // （実 AI 試行は /tools/ai-kyoshitsu で実行する想定）
  return NextResponse.json({
    ok: true,
    data: {
      effectiveConfig: cfg,
      costEstimate:    cost,
      note:            'この設定で /tools/ai-kyoshitsu から実際にテストしてください',
    },
  });
}
