/**
 * lib/csrf.ts
 * familyai.jp — CSRF 防御ユーティリティ
 *
 * Next.js App Router では same-origin の fetch に Origin ヘッダーが付くため、
 * Origin チェックによるシンプルな CSRF 防御を実装する。
 *
 * ・Origin のホストが Host ヘッダーと一致: OK
 * ・一致しない / Origin 不在: CSRF の可能性あり → 拒否
 * ・localhost / 127.0.0.1 は開発用途として常に許可
 */

import type { NextRequest } from 'next/server';

/**
 * Origin ヘッダーが Host と一致するか検証する。
 * true: 問題なし / false: CSRF の可能性あり
 */
export function verifyCsrf(req: NextRequest): boolean {
  const origin = req.headers.get('origin');

  // Origin 不在は CSRF 可能性ありとして拒否
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
