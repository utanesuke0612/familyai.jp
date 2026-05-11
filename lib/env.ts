/**
 * lib/env.ts
 * familyai.jp — 環境変数バリデーション（Rev31 / Phase 3 / CX-8）
 *
 * zod で起動時に必須 env を検証する。失敗時は明確なエラーで起動拒否する。
 *
 * 設計方針:
 * - DB / NextAuth / OpenRouter のような **必須かつ runtime 必要** な値は
 *   `getServerEnv()` 経由で lazy に検証する（lib/db/index.ts と同様、
 *   Vercel build 時の dummy env でも `next build` を通すため）。
 * - OAuth 等の **optional** プロバイダ key はゆるく optional にし、
 *   未設定時は当該機能を無効化するロジックを呼び出し側で取る。
 * - 検証ミスは `EnvError` として throw。`server` runtime のみで使う想定で、
 *   client component から import しないこと（zod 全体がバンドルに乗る）。
 *
 * 利用例（route.ts）:
 *   import { getServerEnv } from '@/lib/env';
 *   const { DATABASE_URL } = getServerEnv();
 */

import { z } from 'zod';

// ────────────────────────────────────────────────────────────────
// schema
// ────────────────────────────────────────────────────────────────
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // ── DB（必須・lazy 検証）
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required (Neon / Postgres connection string)'),

  // ── NextAuth（必須・lazy 検証 — どちらか1つ必須・refine で検証）
  NEXTAUTH_SECRET: z
    .string()
    .min(16, 'NEXTAUTH_SECRET must be at least 16 chars (use `openssl rand -base64 32`)')
    .optional(),
  AUTH_SECRET: z.string().min(16).optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // ── AI ルーター（OpenRouter 経由 — 既定の経路）
  OPENROUTER_API_KEY: z
    .string()
    .min(1, 'OPENROUTER_API_KEY is required for AI features')
    .optional(),
  OPENROUTER_BASE_URL: z.string().url().optional(),
  OPENROUTER_APP_NAME: z.string().optional(),
  OPENROUTER_APP_URL:  z.string().url().optional(),
  CHAT_DEFAULT_MODEL:  z.string().optional(),

  // ── Rev32: 直 API（任意・モデル選択時のみ必要）
  /** DeepSeek 公式 API キー。`provider='deepseek'` のモデル選択時に必須。 */
  DEEPSEEK_API_KEY: z.string().optional(),
  /** DeepSeek baseUrl 上書き（既定 https://api.deepseek.com/v1） */
  DEEPSEEK_BASE_URL: z.string().url().optional(),
  /** Qwen (Alibaba DashScope) API キー。`provider='qwen'` のモデル選択時に必須。 */
  DASHSCOPE_API_KEY: z.string().optional(),
  /** DashScope baseUrl 上書き（既定 dashscope-intl.aliyuncs.com の OpenAI 互換 endpoint） */
  DASHSCOPE_BASE_URL: z.string().url().optional(),

  // ── Upstash Redis（レート制限・任意・未設定なら no-op rate limiter）
  UPSTASH_REDIS_REST_URL:   z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // ── 管理者ガード（運用必須・1名運用）
  ADMIN_EMAIL: z.string().email().optional(),

  // ── OAuth プロバイダ（optional — 未設定時は当該プロバイダ無効）
  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_ID:             z.string().optional(),
  APPLE_TEAM_ID:        z.string().optional(),
  APPLE_KEY_ID:         z.string().optional(),
  APPLE_PRIVATE_KEY:    z.string().optional(),

  // ── VOA assets（クライアント公開・ビルド時に解決）
  NEXT_PUBLIC_VOA_BLOB_BASE: z.string().url().optional(),
})
  // Rev35 #security: NEXTAUTH_SECRET か AUTH_SECRET のどちらかは必須。
  // どちらも欠けていると NextAuth が安全でないデフォルトで起動する。
  .superRefine((env, ctx) => {
    if (!env.NEXTAUTH_SECRET && !env.AUTH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['NEXTAUTH_SECRET'],
        message:
          'NEXTAUTH_SECRET or AUTH_SECRET is required (at least 16 chars). ' +
          'Generate with `openssl rand -base64 32` and set it in environment variables.',
      });
    }
  })
  // Google OAuth は ID と Secret を「両方 set or 両方 unset」のみ許可。
  // 片方だけセットされていると provider 登録時に runtime クラッシュする。
  .superRefine((env, ctx) => {
    const id     = env.GOOGLE_CLIENT_ID;
    const secret = env.GOOGLE_CLIENT_SECRET;
    if ((id && !secret) || (!id && secret)) {
      ctx.addIssue({
        code: 'custom',
        path: ['GOOGLE_CLIENT_ID'],
        message:
          'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set or both unset. ' +
          'Setting only one breaks the Google OAuth provider at runtime.',
      });
    }
  })
  // production では Upstash Redis を必須化（fail closed）。
  // Redis 未設定だと rate limiter が no-op になり、AI/TTS/管理API が無制限になる。
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      ctx.addIssue({
        code: 'custom',
        path: ['UPSTASH_REDIS_REST_URL'],
        message:
          'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production ' +
          '(rate limiter would otherwise become no-op and expose AI/TTS/admin APIs to abuse).',
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// ────────────────────────────────────────────────────────────────
// runtime helper（lazy・cached）
// ────────────────────────────────────────────────────────────────
export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

let _cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (_cached) return _cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new EnvError(
      `[lib/env] Invalid server environment:\n${issues}\n\n` +
        'Set the missing values in Vercel Project Settings → Environment Variables, ' +
        'or in your local `.env.local` for development.',
    );
  }

  _cached = parsed.data;
  return _cached;
}

/**
 * 起動時にまとめて検証したい場合に呼ぶ（任意）。
 * `app/api/health/route.ts` などで使うと、health endpoint で
 * env 不整合を 500 で表に出せる。
 */
export function assertServerEnv(): void {
  getServerEnv();
}

/**
 * Test / dev で env をリロードしたい時の cache 破棄。
 */
export function _resetServerEnvCacheForTesting(): void {
  _cached = null;
}
