/**
 * app/api/health/route.ts
 * familyai.jp — 死活監視エンドポイント（Rev31 / Phase 3 / CX-9）
 *
 * GET /api/health → 200 + JSON `{ ok, db, env, ai, ts }`
 *
 * - 認証不要・公開エンドポイント。Vercel Cron / UptimeRobot / 外形監視から叩く想定。
 * - DB は `SELECT 1` の最小往復で生存確認（Neon プール温存）。
 * - env 検証は `assertServerEnv()` で起動時 zod 検証を再走（不整合は 500）。
 * - 個別失敗でも HTTP は **200** を返し、JSON 内の `db`/`env` フラグで状態を表現。
 *   全停止時のみ 503 を返す（Vercel の Edge ネットワーク経由の偽陽性を抑制）。
 */

import { NextResponse }    from 'next/server';
import { db }              from '@/lib/db';
import { assertServerEnv } from '@/lib/env';
import { sql }             from 'drizzle-orm';
import { logger }          from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HealthResult {
  ok:      boolean;
  ts:      string;
  db:      'ok' | 'fail';
  env:     'ok' | 'fail';
  durationMs: number;
}

export async function GET(): Promise<NextResponse<HealthResult>> {
  const t0 = Date.now();
  let envOk = false;
  let dbOk  = false;

  try {
    assertServerEnv();
    envOk = true;
  } catch (err) {
    logger.error('health.env_invalid', err, { route: '/api/health' });
  }

  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch (err) {
    logger.error('health.db_fail', err, { route: '/api/health' });
  }

  const result: HealthResult = {
    ok:         envOk && dbOk,
    ts:         new Date().toISOString(),
    db:         dbOk  ? 'ok' : 'fail',
    env:        envOk ? 'ok' : 'fail',
    durationMs: Date.now() - t0,
  };

  return NextResponse.json(result, {
    status:  result.ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
