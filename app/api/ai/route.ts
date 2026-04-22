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
import { z }              from 'zod';
import { routeAI, buildArticleSystemPrompt } from '@/lib/ai/router';
import { verifyCsrf }     from '@/lib/csrf';
import { auth }           from '@/lib/auth';

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

// ── エラーレスポンスヘルパー ───────────────────────────────────
/**
 * ストリーム確立前のエラーは JSON + 適切な HTTP status で返す（Rev28 #HIGH-3）。
 * 理由: 従来は status:200 固定の SSE を返していたため、Vercel/DataDog 等の
 * 外部監視が失敗を検知できず、iOS/Android の URLSession も成功扱いしていた。
 * ストリーム確立後（routeAI 内）のエラーは別経路（SSE data 行内の error）で
 * 通知されるため本関数は使わない。
 */
function errorResponse(
  code:    string,
  message: string,
  status:  number,
): Response {
  return new Response(
    JSON.stringify({ ok: false, error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
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

  // 2. リクエストボディのパース（SSE 開始前なので 400 JSON を返す）
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: { code: 'INVALID_BODY', message: 'リクエストボディが不正です。' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ ok: false, error: { code: 'INVALID_PARAMS', message: '入力内容を確認してもう一度お試しください。' } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
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
      // ログイン済み：plan は JWT に埋め込み済み（Rev23 #4）のため DB 呼び出し不要
      const plan = session.user.plan ?? 'free';
      limiter  = plan === 'pro' ? ratelimiters.pro : ratelimiters.free;
      limitKey = session.user.id;
    }

    const { success } = await limiter.limit(limitKey);
    if (!success) {
      const message = session?.user?.id
        ? '本日の利用上限に達しました。明日またお試しください。'
        : '1日の利用上限に達しました。ログインするとより多く使えます。';
      return new Response(
        JSON.stringify({ ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message } }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
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

  // 8秒サーバータイムアウト（Vercel Hobby の maxDuration=10s を超えないよう保護）
  const timeoutId = setTimeout(() => ac.abort(), 8_000);

  try {
    // text-simple / text-quality のみストリーミング対応
    // transcribe / image-gen / tts-japanese は将来実装
    if (type !== 'text-simple' && type !== 'text-quality' && type !== 'math-reasoning') {
      clearTimeout(timeoutId);
      return errorResponse('UNSUPPORTED_TYPE', 'このAI機能は現在準備中です。', 400);
    }

    const stream = await routeAI(type, fullMessages, { signal: ac.signal });

    // ストリーム開始後はタイムアウトをクリア（クライアント切断シグナルに任せる）
    clearTimeout(timeoutId);
    return new Response(stream, { headers: sseHeaders() });
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : '不明なエラー';

    // AbortError（タイムアウト or クライアント切断）
    if (err instanceof Error && err.name === 'AbortError') {
      return errorResponse(
        'TIMEOUT',
        'AIの応答に時間がかかりすぎました。しばらくしてからお試しください。',
        504,
      );
    }

    console.error('[POST /api/ai] AI エラー:', msg);

    if (msg.includes('OPENROUTER_API_KEY')) {
      return errorResponse(
        'AI_UNAVAILABLE',
        'AIが一時的に利用できません。しばらくしてからお試しください。',
        503,
      );
    }
    return errorResponse(
      'AI_ERROR',
      'AIが一時的に利用できません。しばらくしてからお試しください。',
      502,
    );
  }
}
