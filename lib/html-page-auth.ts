/**
 * lib/html-page-auth.ts
 * familyai.jp — HTML ページ パスワード認証ユーティリティ（サーバー側専用）
 */

import { createHmac } from 'crypto';

/** Cookie 名（slug 内の記号を _ に変換） */
export function pageCookieName(slug: string): string {
  return `page_auth_${slug.replace(/[^a-z0-9]/g, '_')}`;
}

/** Cookie 値の生成: HMAC-SHA256(slug|passwordHash, NEXTAUTH_SECRET) */
export function makePageToken(slug: string, passwordHash: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET が設定されていません');
  return createHmac('sha256', secret)
    .update(`${slug}|${passwordHash}`)
    .digest('hex');
}

/** Cookie が正しいか検証 */
export function verifyPageCookie(
  slug:          string,
  passwordHash:  string,
  cookieValue:   string | undefined,
): boolean {
  if (!cookieValue) return false;
  return cookieValue === makePageToken(slug, passwordHash);
}
