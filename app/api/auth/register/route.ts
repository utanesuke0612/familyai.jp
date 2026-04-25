/**
 * app/api/auth/register/route.ts
 * familyai.jp — ローカルアカウント新規登録 API
 *
 * POST /api/auth/register
 *
 * Body: { email, password, name? }
 *
 * レスポンス:
 *   200: { ok: true }
 *   400: { ok: false, error: { code, message } }
 *   409: { ok: false, error: { code, message } }  ← メール重複
 */

import { NextRequest }  from 'next/server';
import { z }            from 'zod';
import bcrypt           from 'bcryptjs';
import { eq }           from 'drizzle-orm';
import { db, users }    from '@/lib/db';
import { verifyCsrf }   from '@/lib/csrf';
import { getRateLimiter, getClientIp, rateLimitedResponse } from '@/lib/ratelimit';

// ── バリデーション ─────────────────────────────────────────────
const registerSchema = z.object({
  email: z
    .string()
    .email('正しいメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(/[a-zA-Z]/, 'パスワードに英字を含めてください')
    .regex(/[0-9]/,    'パスワードに数字を含めてください'),
  name: z.string().max(255).optional(),
});

// ── POST /api/auth/register ────────────────────────────────────
export async function POST(req: NextRequest) {
  // CSRF 防御（Origin チェック）
  if (!verifyCsrf(req)) {
    return Response.json(
      { ok: false, error: { code: 'FORBIDDEN', message: '不正なリクエストです。' } },
      { status: 403 },
    );
  }

  // レート制限（5req/10min per IP・ブルートフォース登録を防止）
  const rl = getRateLimiter('ratelimit:register', 5, '10 m');
  if (rl) {
    const ip = getClientIp(req);
    const { success } = await rl.limit(ip);
    if (!success) {
      return rateLimitedResponse('登録の試行が多すぎます。しばらくしてからお試しください。');
    }
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: { code: 'INVALID_BODY', message: 'リクエストが不正です。' } },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? '入力内容を確認してください。';
    return Response.json(
      { ok: false, error: { code: 'INVALID_PARAMS', message: firstError } },
      { status: 400 },
    );
  }

  const { email, password, name } = parsed.data;

  // メール重複チェック
  const existing = await db
    .select({ id: users.id, authProvider: users.authProvider })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    if (existing[0].authProvider === 'google') {
      return Response.json(
        {
          ok: false,
          error: {
            code:    'EMAIL_TAKEN_GOOGLE',
            message: 'このメールアドレスはGoogleログインで登録済みです。Googleでログインしてください。',
          },
        },
        { status: 409 },
      );
    }
    return Response.json(
      { ok: false, error: { code: 'EMAIL_TAKEN', message: 'このメールアドレスは既に登録されています。' } },
      { status: 409 },
    );
  }

  // パスワードハッシュ（bcrypt saltRounds: 12）
  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    email,
    name:         name ?? null,
    passwordHash,
    authProvider: 'local',
  });

  return Response.json({ ok: true });
}
