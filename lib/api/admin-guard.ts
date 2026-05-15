/**
 * lib/api/admin-guard.ts
 * familyai.jp — Admin API ガードの集約（Architecture Deepening #1）
 *
 * 役割:
 *   8 つの admin route が個別にコピペしていた
 *     verifyCsrf → requireAdmin → enforceAdminRateLimit
 *   の三和音を 1 つの higher-order handler に統合する。
 *
 * 設計方針 (todo/architecture-deepening-handoff.md §2):
 *   - GET 系は auth-only、書込み系は三和音をデフォルトとする
 *   - エラーレスポンスの形は呼び出し側に変えさせない:
 *     既存クライアント (ArticleForm / AiConfigForm) は `json.error` を文字列で読む。
 *     破壊変更を避けるため errorBuilder で形を切り替え可能にする。
 *
 * Skill 参照: /Users/junli/.agents/skills/improve-codebase-architecture/
 *
 * 使い方:
 *   // 構造化エラー（推奨・新ルート）
 *   export const POST = protectAdminRoute(async (req, ctx) => { ... });
 *   export const GET  = protectAdminRoute(async (req, ctx) => { ... });   // GET は自動で auth-only
 *
 *   // 旧形式互換 ({ error: 'message' })
 *   export const PUT = protectAdminRoute(async (req, ctx) => { ... }, {
 *     errorBuilder: legacyErrorBuilder,
 *   });
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin }              from '@/lib/admin-auth';
import { verifyCsrf }                from '@/lib/csrf';
import { enforceAdminRateLimit }     from '@/lib/ratelimit';

// ── エラーレスポンスビルダ ─────────────────────────────────────
/**
 * 構造化エラー形式（推奨）。
 *   { ok: false, error: { code, message } }
 * 3d-models / users / upload-token / ai (一部) が既に採用。
 */
export function structuredErrorBuilder(
  code:    string,
  message: string,
  status:  number,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status },
  );
}

/**
 * 旧形式エラー（後方互換）。
 *   { error: 'message' }
 * ArticleForm.tsx / AiConfigForm.tsx が依存しているため、これらを叩く
 * admin/articles・admin/ai-config 系 route でのみ使う。
 */
export function legacyErrorBuilder(
  _code:   string,
  message: string,
  status:  number,
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * ai-config が採用している中間形式: `{ ok: false, error: 'message' }`
 */
export function aiConfigErrorBuilder(
  _code:   string,
  message: string,
  status:  number,
): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export type ErrorBuilder = (code: string, message: string, status: number) => NextResponse;

// ── オプション ─────────────────────────────────────────────────
export interface ProtectAdminRouteOptions {
  /**
   * CSRF (Origin) チェックを行う。
   * デフォルト: HTTP method が POST/PUT/PATCH/DELETE のとき true、GET/HEAD のとき false。
   */
  csrf?: boolean;
  /**
   * Rate limit を適用する。
   * デフォルト: HTTP method が POST/PUT/PATCH/DELETE のとき true、GET/HEAD のとき false。
   */
  rateLimit?: boolean;
  /**
   * Rate limit のキー識別子（既存仕様で 'admin'）。Redis prefix と組み合わせて使われる。
   */
  rateLimitIdentity?: string;
  /**
   * エラーレスポンスのフォーマッタ。default = structuredErrorBuilder。
   */
  errorBuilder?: ErrorBuilder;
}

// ── ハンドラ型 ─────────────────────────────────────────────────
/**
 * Next.js 14 App Router の route handler が受け取る第二引数の形:
 *   GET(req, { params })
 * 動的でないルートでは第二引数は省略される。
 */
export type AdminRouteCtx<TParams = Record<string, string>> = {
  params?: TParams;
};

export type AdminHandler<TParams = Record<string, string>> = (
  req: NextRequest,
  ctx: AdminRouteCtx<TParams>,
) => Promise<Response> | Response;

/** Wrapper の出力型: Next.js 14 の Route Handler 互換（静的ルートで ctx 省略可） */
export type WrappedAdminHandler<TParams = Record<string, string>> = (
  req: NextRequest,
  ctx?: AdminRouteCtx<TParams>,
) => Promise<Response>;

// ── 本体 ───────────────────────────────────────────────────────
/**
 * Admin route handler を CSRF / Auth / Rate-limit ガードでラップする。
 *
 * 不変条件 (must preserve):
 *   - rate-limit identity デフォルト 'admin'、prefix 'ratelimit:admin'
 *   - CSRF localhost 例外（lib/csrf.ts 内）はそのまま維持
 *   - Fail-closed: production && Redis 未設定 → 429
 *   - GET 系は auth-only（既存 GET ルートは CSRF/RL を持たないため）
 */
export function protectAdminRoute<TParams = Record<string, string>>(
  handler: AdminHandler<TParams>,
  options: ProtectAdminRouteOptions = {},
): WrappedAdminHandler<TParams> {
  const errorBuilder = options.errorBuilder ?? structuredErrorBuilder;

  return async (req: NextRequest, ctx?: AdminRouteCtx<TParams>) => {
    // method ベースのデフォルト判定
    const isWrite = req.method !== 'GET' && req.method !== 'HEAD';
    const doCsrf      = options.csrf      ?? isWrite;
    const doRateLimit = options.rateLimit ?? isWrite;

    // 1. CSRF（Origin チェック）
    if (doCsrf && !verifyCsrf(req)) {
      return errorBuilder('CSRF', 'CSRF check failed', 403);
    }

    // 2. 管理者認証
    const auth = await requireAdmin();
    if (!auth.ok) {
      return errorBuilder('FORBIDDEN', '管理者権限が必要です。', 403);
    }

    // 3. Rate limit
    if (doRateLimit) {
      const rl = await enforceAdminRateLimit(req, options.rateLimitIdentity ?? 'admin');
      if (rl) return rl;   // enforceAdminRateLimit 自身が rateLimitedResponse() を返す
    }

    // 4. handler — ctx は常に定義された状態で渡す（静的ルートは空 params）
    return handler(req, ctx ?? ({} as AdminRouteCtx<TParams>));
  };
}
