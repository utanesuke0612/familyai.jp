/**
 * lib/ratelimit.ts
 * familyai.jp — Upstash Ratelimit 共通ヘルパー（Rev23 #5）
 *
 * 複数 API で共通利用するためのレート制限ユーティリティ。
 * Upstash 環境変数が未設定の場合は null を返し、呼び出し側はスキップする。
 *
 * 用途:
 *   - admin API（POST/PUT/DELETE/PATCH）: 10req/min per userId
 *   - 将来の他 API でも流用可能
 *
 * ※ /api/ai の /d 制限は専用ロジック（プラン別）があるため本ヘルパーとは独立。
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit }                 from '@upstash/ratelimit';
import { Redis }                     from '@upstash/redis';

// ── Redis シングルトン ─────────────────────────────────────────
let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  _redis = Redis.fromEnv();
  return _redis;
}

// ── Ratelimit キャッシュ（prefix ごとに1つ） ─────────────────
const _limiters = new Map<string, Ratelimit>();

/**
 * 指定 prefix ・window ・tokens でレートリミッターを取得する。
 * Redis が未設定なら null を返す（開発環境や環境変数欠落時のフォールバック）。
 */
export function getRateLimiter(
  prefix:  string,
  tokens:  number,
  window:  `${number} ${'s' | 'm' | 'h' | 'd'}`,
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${prefix}:${tokens}:${window}`;
  if (_limiters.has(cacheKey)) return _limiters.get(cacheKey)!;

  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
  });
  _limiters.set(cacheKey, rl);
  return rl;
}

// ── IP 取得 ────────────────────────────────────────────────────
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

// ── 429 レスポンス ────────────────────────────────────────────
export function rateLimitedResponse(message = '一時的にリクエストが集中しています。しばらくしてからお試しください。'): NextResponse {
  return NextResponse.json(
    {
      ok:    false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message },
    },
    { status: 429 },
  );
}

/**
 * admin API 用の共通ガード：ADMIN_EMAIL 認証済み管理者でも 10 req/min に抑える。
 * 侵害アカウントからの Blob コスト爆発などの二次被害を防ぐ。
 *
 * @returns 制限超過時は 429 NextResponse / OK なら null
 */
export async function enforceAdminRateLimit(
  req:      NextRequest,
  identity: string,
): Promise<NextResponse | null> {
  const rl = getRateLimiter('ratelimit:admin', 10, '1 m');
  if (!rl) return null;  // Redis 未設定時はスキップ

  const ip  = getClientIp(req);
  const key = `${identity}:${ip}`;
  const { success } = await rl.limit(key);
  if (!success) return rateLimitedResponse();
  return null;
}
