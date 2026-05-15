/**
 * app/api/admin/ai-config/history/route.ts
 * familyai.jp — AIチャット設定の変更履歴 API（管理者専用）
 *
 * GET /api/admin/ai-config/history — 直近10件の変更履歴
 */

import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { getAiConfigHistory } from '@/lib/repositories/ai-config';
import { logger } from '@/lib/log';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { ok: false, error: '管理者権限が必要です。' },
      { status: 403 },
    );
  }

  try {
    const rows = await getAiConfigHistory(10);
    const data = rows.map((r) => ({
      id:         r.id,
      config:     r.config,
      changedAt:  r.changedAt instanceof Date ? r.changedAt.toISOString() : r.changedAt,
      changedBy:  r.changedBy,
      changeNote: r.changeNote,
    }));
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    logger.error('admin.ai-config.history.get', { route: '/api/admin/ai-config/history', error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { ok: false, error: 'サーバーエラーが発生しました。' },
      { status: 500 },
    );
  }
}
