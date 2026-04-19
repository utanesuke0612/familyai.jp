/**
 * lib/admin-auth.ts
 * familyai.jp — 管理者認証ヘルパー
 *
 * Vercel 環境変数 ADMIN_EMAIL に設定したメールアドレスと
 * ログイン中ユーザーのメールアドレスを照合して管理者判定を行う。
 *
 * 使い方:
 *   // API Route / Server Component で:
 *   const result = await requireAdmin();
 *   if (result instanceof Response) return result;  // 403
 */

import { NextResponse } from 'next/server';
import { auth }         from '@/lib/auth';

/** ログイン中ユーザーが管理者かどうかを返す */
export async function isAdmin(): Promise<boolean> {
  const session    = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail &&
         !!session?.user?.email &&
         session.user.email === adminEmail;
}

/**
 * 管理者でなければ 403 Response を返す。
 * 管理者であれば { ok: true } を返す。
 * API Route で使用:
 *   const check = await requireAdmin();
 *   if (!check.ok) return check.response;
 */
export async function requireAdmin(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const ok = await isAdmin();
  if (!ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 },
      ),
    };
  }
  return { ok: true };
}
