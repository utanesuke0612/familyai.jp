/**
 * lib/csrf.ts
 * familyai.jp — CSRF 防御ユーティリティ
 *
 * Next.js App Router では same-origin の fetch に Origin ヘッダーが付くため、
 * Origin チェックによるシンプルな CSRF 防御を実装する。
 *
 * ・Origin が存在しない（サーバー間通信・古いブラウザ）: 通過させる
 * ・Origin のホストが Host ヘッダーと一致する: OK
 * ・一致しない: CSRF の可能性あり → 拒否
 *
 * Rev24 #⑤ モバイル API 許可（2026-04-20）:
 * - `X-Client-Platform: ios | android` ヘッダー＋許可 API キー
 *   （`MOBILE_API_KEYS` envの camel/semi-colon 区切り）で
 *   Cookie を持たないネイティブクライアントから admin 以外の非冪等 API を叩けるように拡張。
 * - admin API は依然として Origin チェックが通らなければ拒否される（= Web/CMS 専用）。
 */

import type { NextRequest } from 'next/server';

const ALLOWED_PLATFORMS = new Set(['ios', 'android']);

/**
 * 環境変数 `MOBILE_API_KEYS`（カンマまたはセミコロン区切り）を Set に展開。
 * 空文字・未設定なら空 Set（= モバイル経路は無効）。
 * 毎回パースせず、モジュールロード時に 1 回だけ算出する。
 */
const MOBILE_API_KEYS: ReadonlySet<string> = (() => {
  const raw = process.env.MOBILE_API_KEYS ?? '';
  return new Set(
    raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
})();

/**
 * `X-Client-Platform` + `X-Mobile-Api-Key` の組み合わせを検証する（Rev24 #⑤）。
 * true: モバイル許可 / false: 条件を満たさない
 */
export function verifyMobileClient(req: NextRequest): boolean {
  const platform = req.headers.get('x-client-platform')?.toLowerCase();
  if (!platform || !ALLOWED_PLATFORMS.has(platform)) return false;

  // モバイル許可リストが未設定ならモバイル経路自体を拒否
  if (MOBILE_API_KEYS.size === 0) return false;

  const apiKey = req.headers.get('x-mobile-api-key');
  if (!apiKey) return false;
  return MOBILE_API_KEYS.has(apiKey);
}

/**
 * Origin ヘッダーが Host と一致するか検証する。
 * true: 問題なし / false: CSRF の可能性あり
 *
 * 第2引数に `{ allowMobile: true }` を渡すと、
 * `X-Client-Platform` + `X-Mobile-Api-Key` 経由のモバイルリクエストも受け付ける。
 */
export function verifyCsrf(
  req: NextRequest,
  opts: { allowMobile?: boolean } = {},
): boolean {
  // モバイル許可（Rev24 #⑤）: admin 以外の API が明示的に許可した場合のみ
  if (opts.allowMobile && verifyMobileClient(req)) {
    return true;
  }

  const origin = req.headers.get('origin');

  // Origin がない場合はサーバー間通信等として通過
  if (!origin) return true;

  const host = req.headers.get('host');
  if (!host) return false;

  try {
    const originHost = new URL(origin).host;
    // localhost / 127.0.0.1 は開発環境として常に許可
    if (originHost.startsWith('localhost') || originHost.startsWith('127.0.0.1')) {
      return true;
    }
    return originHost === host;
  } catch {
    return false;
  }
}
