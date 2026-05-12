/**
 * app/api/3d-models/[slug]/route.ts
 * familyai.jp / うごくAI教室 3D 図鑑（Rev34 Phase 1）
 *
 * GET /api/3d-models/:slug
 *   公開済み 3D モデルの詳細を返す（モバイル / 外部クライアント用）。
 *   Web 側のページは Server Component で直接 repository を叩く想定だが、
 *   モバイル App / Phase 4 React Native では本 API を経由する。
 *
 * セキュリティ:
 *   - Rev31-P1: production で Upstash 未設定なら 429 fail-closed。
 *   - 公開フラグ false のものは 404。
 *
 * レスポンス: { ok: true, data: Tutor3dModel } | { ok: false, error: ... }
 *
 * 【未実装メモ・Codex Q1-6 / Q1-8】
 * - 一覧 API `GET /api/3d-models?subject=&grade=` は未実装。
 *   モバイル App 着手前（Phase 2-4 想定）に追加する。
 *   現状は Web 側が Server Component で直 repository を叩くため不要。
 * - GLB ファイル名のバージョニング（cache-busting）は admin 機能着手時に対応。
 *   ファイル命名: 3d-models/{slug}-{contentHash}.glb の形式を採用予定。
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPublishedModelBySlug,
  incrementViewCount,
} from '@/lib/repositories/3d-models';
import {
  getRateLimiter,
  getClientIp,
  isRateLimitFailClosed,
  rateLimitedResponse,
} from '@/lib/ratelimit';

export const runtime  = 'nodejs';
export const revalidate = 60;  // CDN: 60s cache + stale-while-revalidate

const RATE_LIMIT_PREFIX = 'ratelimit:3d-models:get';
const RATE_LIMIT_TOKENS = 120;          // 1 IP あたり 1 分間に 120 req
const RATE_LIMIT_WINDOW = '1 m' as const;

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  // 1. 軽いレート制限（DoS 緩和）
  const limiter = getRateLimiter(RATE_LIMIT_PREFIX, RATE_LIMIT_TOKENS, RATE_LIMIT_WINDOW);
  if (limiter) {
    const ip = getClientIp(req);
    const { success } = await limiter.limit(ip);
    if (!success) return rateLimitedResponse();
  } else if (isRateLimitFailClosed()) {
    return rateLimitedResponse('一時的にご利用いただけません。Redis 設定を確認してください。');
  }

  // 2. slug バリデーション（DB に流す前の軽い防御）
  const slug = params.slug.trim();
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_SLUG', message: 'slug が不正です。' } },
      { status: 400 },
    );
  }

  // 3. DB 取得
  let model;
  try {
    model = await getPublishedModelBySlug(slug);
  } catch (err) {
    console.error('[GET /api/3d-models/:slug] DB エラー:',
      err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'サーバーエラーが発生しました。' } },
      { status: 500 },
    );
  }

  if (!model) {
    return NextResponse.json(
      { ok: false, error: { code: 'NOT_FOUND', message: 'モデルが見つかりませんでした。' } },
      { status: 404 },
    );
  }

  // 4. ビューカウント加算（fire-and-forget・レスポンスを遅らせない）
  void incrementViewCount(slug);

  return NextResponse.json(
    { ok: true, data: model },
    {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=600',
      },
    },
  );
}
