/**
 * lib/ratelimit.ts
 * familyai.jp — Upstash Ratelimit 共通ヘルパー（Rev23 #5 / Rev35 #security）
 *
 * 複数 API で共通利用するためのレート制限ユーティリティ。
 *
 * 環境別ポリシー（Rev35 #security）:
 *   - production: Redis 未設定は fail closed（429 を返す）。
 *     これにより env 漏れで AI/TTS/管理 API が無制限になる事故を防ぐ。
 *     env 検証も lib/env.ts の superRefine で production 必須に格上げ済み。
 *   - development / test: Redis 未設定なら null を返し呼び出し側はスキップ。
 *     ローカル開発で Upstash 設定不要にしておく利便性を維持。
 *
 * 用途:
 *   - admin API（POST/PUT/DELETE/PATCH）: 10req/min per (userId + IP)
 *     identity（= userId / admin email など）と IP を組み合わせてキー化し、
 *     侵害アカウントからの大量操作と、同一 IP 経由のなりすましの両方を抑制する。
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

/**
 * Rev35 #security: production で Redis 未設定なら true を返す（fail closed 判定用）。
 * 呼び出し側はこれを見て 429 を返す or 別フォールバックに切替える。
 */
export function isRateLimitFailClosed(): boolean {
  return process.env.NODE_ENV === 'production' && getRedis() === null;
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
  if (!redis) {
    // Rev35 #security: production で Redis 未設定は fail closed の合図。
    // ここでは null を返し、呼び出し側が isRateLimitFailClosed() を見て 429 を返す。
    return null;
  }

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
  if (!rl) {
    // Rev35 #security: production で Redis 未設定なら fail closed（管理 API を 429 で守る）。
    // development / test では従来通り null を返してスキップ。
    if (isRateLimitFailClosed()) {
      return rateLimitedResponse(
        '一時的にレート制限が機能していません。管理者に連絡してください。',
      );
    }
    return null;
  }

  const ip  = getClientIp(req);
  const key = `${identity}:${ip}`;
  const { success } = await rl.limit(key);
  if (!success) return rateLimitedResponse();
  return null;
}
