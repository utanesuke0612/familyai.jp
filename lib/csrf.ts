/**
 * lib/csrf.ts
 * familyai.jp — CSRF 防御ユーティリティ
 *
 * Next.js App Router では same-origin の fetch に Origin ヘッダーが付くため、
 * Origin チェックによるシンプルな CSRF 防御を実装する。
 *
 * ・Origin のホストが Host ヘッダーと一致: OK
 * ・一致しない / Origin 不在: 既定では CSRF の可能性あり → 拒否
 * ・Origin 不在でも `allowMobile:true` + `verifyMobileClient()` 成立なら通す
 *   （= iOS/Android ネイティブクライアントの専用経路）
 *
 * Rev24 #⑤ モバイル API 許可（2026-04-20）で mobile 経路を追加。
 * Rev28 #HIGH-5（2026-04-22）で Origin 不在時の暗黙通過を廃止し、
 * 非ブラウザ経路は必ず `allowMobile: true` + mobile 認証ヘッダの明示オプトインを要求する。
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
 *
 * Rev28 #HIGH-5: Origin 不在は既定で拒否。非ブラウザ経路を通したい API は
 * 明示的に `allowMobile: true` を渡し、モバイル認証ヘッダを検証させる。
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

  // Origin 不在は CSRF 可能性ありとして拒否（mobile 経路は上で処理済み）
  if (!origin) return false;

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
