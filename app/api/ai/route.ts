/**
 * app/api/ai/route.ts
 * familyai.jp — AI テキスト生成 API（SSE ストリーミング）
 *
 * POST /api/ai
 *
 * Body:
 * {
 *   type:           'text-simple' | 'text-quality' | 'math-reasoning'
 *   messages:       Array<{ role: 'user' | 'assistant', content: string }>
 *   articleTitle?:  string   // 記事コンテキスト（システムプロンプト用）
 *   articleExcerpt?: string
 * }
 *
 * レスポンス: text/event-stream（SSE）
 *   data: {"delta":"..."}\n\n
 *   data: [DONE]\n\n
 *   data: {"error":"..."}\n\n  ← エラー時
 *
 * レート制限（Upstash Redis / 1日あたり）:
 *   未ログイン  : 10回/日（IP 単位）
 *   Free ユーザー: 30回/日（userId 単位）
 *   Pro ユーザー : 200回/日（userId 単位）
 */

import { NextRequest }    from 'next/server';
import { Ratelimit }      from '@upstash/ratelimit';
import { Redis }          from '@upstash/redis';
import { eq }             from 'drizzle-orm';
import { z }              from 'zod';
import { routeAI, buildArticleSystemPrompt } from '@/lib/ai/router';
import { verifyCsrf }     from '@/lib/csrf';
import { auth }           from '@/lib/auth';
import { db, users }      from '@/lib/db';

export const runtime = 'nodejs';

// ── 入力バリデーション ───────────────────────────────────────────
const bodySchema = z.object({
  type: z.enum([
    'text-simple',
    'text-quality',
    'math-reasoning',
    'transcribe',
    'image-gen',
    'tts-japanese',
  ]).default('text-simple'),
  messages: z.array(
    z.object({
      role:    z.enum(['user', 'assistant']),
      content: z.string().min(1).max(2000),
    }),
  ).min(1).max(20),
  articleTitle:   z.string().max(255).optional().nullable(),
  articleExcerpt: z.string().max(500).optional().nullable(),
});

// ── Redis / Ratelimit lazy init ────────────────────────────────
let _redis:         Redis | null = null;
let _rlAnon:        Ratelimit | null = null;
let _rlFree:        Ratelimit | null = null;
let _rlPro:         Ratelimit | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  _redis = Redis.fromEnv();
  return _redis;
}

function getRatelimiters() {
  const redis = getRedis();
  if (!redis) return null;
  if (!_rlAnon) {
    _rlAnon = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10,  '1 d'), prefix: 'ratelimit:ai:anon' });
    _rlFree = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30,  '1 d'), prefix: 'ratelimit:ai:free' });
    _rlPro  = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(200, '1 d'), prefix: 'ratelimit:ai:pro'  });
  }
  return { anon: _rlAnon!, free: _rlFree!, pro: _rlPro! };
}

// ── IP 取得 ────────────────────────────────────────────────────
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

// ── SSE エラー送信ヘルパー ─────────────────────────────────────
function errorStream(code: string, message: string): Response {
  const encoder = new TextEncoder();
  const body    = `data: ${JSON.stringify({ error: message, code })}\n\ndata: [DONE]\n\n`;
  return new Response(encoder.encode(body), {
    status:  200, // クライアントはストリーム内の error フィールドで判定
    headers: sseHeaders(),
  });
}

function sseHeaders(): HeadersInit {
  return {
    'Content-Type':  'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  };
}

// ── POST /api/ai ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. CSRF チェック
  if (!verifyCsrf(req)) {
    return new Response(
      JSON.stringify({ ok: false, error: { code: 'FORBIDDEN', message: '不正なリクエストです。' } }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 2. リクエストボディのパース
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorStream('INVALID_BODY', 'リクエストボディが不正です。');
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorStream('INVALID_PARAMS', '入力内容を確認してもう一度お試しください。');
  }

  const { type, messages, articleTitle, articleExcerpt } = parsed.data;

  // 3. レート制限チェック（セッション対応: ログイン済みはプラン別制限）
  const ratelimiters = getRatelimiters();
  if (ratelimiters) {
    const ip      = getClientIp(req);
    const session = await auth();

    let limiter    = ratelimiters.anon;
    let limitKey   = ip;

    if (session?.user?.id) {
      // ログイン済み: DB からプランを取得してリミッターを選択
      try {
        const userRows = await db
          .select({ plan: users.plan })
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1);
        const plan = userRows[0]?.plan ?? 'free';
        limiter  = plan === 'pro' ? ratelimiters.pro : ratelimiters.free;
        limitKey = session.user.id;
      } catch {
        // DB 取得失敗時は anon フォールバック
        limiter  = ratelimiters.anon;
        limitKey = ip;
      }
    }

    const { success } = await limiter.limit(limitKey);
    if (!success) {
      return errorStream(
        'RATE_LIMIT_EXCEEDED',
        session?.user?.id
          ? '本日の利用上限に達しました。明日またお試しください。'
          : '1日の利用上限に達しました。ログインするとより多く使えます。',
      );
    }
  }

  // 4. システムプロンプト構築
  const systemContent = buildArticleSystemPrompt({
    articleTitle,
    articleExcerpt,
  });

  const fullMessages = [
    { role: 'system' as const, content: systemContent },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  // 5. AI ルーティング & ストリーム生成
  const ac = new AbortController();
  req.signal.addEventListener('abort', () => ac.abort());

  try {
    // text-simple / text-quality のみストリーミング対応
    // transcribe / image-gen / tts-japanese は将来実装
    if (type !== 'text-simple' && type !== 'text-quality' && type !== 'math-reasoning') {
      return errorStream('UNSUPPORTED_TYPE', 'このAI機能は現在準備中です。');
    }

    const stream = await routeAI(type, fullMessages, { signal: ac.signal });

    return new Response(stream, { headers: sseHeaders() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '不明なエラー';
    console.error('[POST /api/ai] AI エラー:', msg);

    if (msg.includes('OPENROUTER_API_KEY')) {
      return errorStream('AI_UNAVAILABLE', 'AIが一時的に利用できません。しばらくしてからお試しください。');
    }
    return errorStream('AI_ERROR', 'AIが一時的に利用できません。しばらくしてからお試しください。');
  }
}
