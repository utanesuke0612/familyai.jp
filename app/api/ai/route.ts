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
 *   未ログイン  : 30回/日（IP 単位）
 *   Free ユーザー: 100回/日（userId 単位）
 *   Pro ユーザー : 200回/日（userId 単位）
 */

import { NextRequest }    from 'next/server';
import { z }              from 'zod';
import { streamArticleChat, streamAiEcho } from '@/lib/ai/router';
import { verifyCsrf }     from '@/lib/csrf';
import { auth }           from '@/lib/auth';
import { enforceAiRateLimit } from '@/lib/ratelimit';
import { withRequest }    from '@/lib/log';

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
  // R3-機能3 / AIctation: VOA レッスンの全文スクリプトを system prompt に含めるための context
  // 例: sentences.json を平文化したもの（タイムスタンプ抜きの対話文）
  // 8000 字 ≒ 約 6,000 input token（Anthropic 換算）で OpenRouter のコストは ¥0.5/回程度
  lessonContext:  z.string().max(8000).optional().nullable(),
  // /pages/[slug] の HTML ページ全文テキスト（HtmlPageViewer → AIChatWidget 経由）
  // 8000 字 ≒ 約 6,000 input token（Anthropic 換算）
  pageContent:    z.string().max(8000).optional().nullable(),
  /**
   * AI Echo: 機能識別子。'ai-echo' のとき AI Echo 専用の system prompt を使う。
   * 省略 or 他の値なら従来の buildArticleSystemPrompt を使う（後方互換）。
   */
  feature:        z.enum(['ai-echo']).optional().nullable(),
  /**
   * AI Echo: 評価レベル（feature='ai-echo' のときのみ必須）。
   * 1 = 🌱 内容のみ / 2 = 🌿 内容+文法+語彙 / 3 = 🌳 内容+意見+論理性
   */
  level:          z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().nullable(),
}).refine(
  (data) => !(data.pageContent && data.lessonContext),
  { message: 'pageContent と lessonContext は同時に指定できません。' },
);

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
  const log = withRequest(req, '/api/ai');
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

  const { type, messages, articleTitle, articleExcerpt, lessonContext, pageContent, feature, level } = parsed.data;

  // 3. レート制限チェック（セッション対応: ログイン済みはプラン別制限）
  // Rev40 (Deepening #6): lib/ratelimit.ts の enforceAiRateLimit に集約。
  // 旧実装は本 route 内に Redis singleton と 3 つの Ratelimit を直書きしていた。
  const session = await auth();
  const userId  = session?.user?.id ?? null;
  const plan    = !userId ? 'anon'
                : session?.user?.plan === 'premium' ? 'premium'
                : 'free';
  const rl = await enforceAiRateLimit(req, plan, userId);
  if (rl) return rl;

  // 4. AI ルーティング & ストリーム生成
  // Rev40 (Deepening #4): system prompt 構築・messages 組み立ては lib/ai/router.ts に集約。
  // route は feature をディスパッチするだけ。
  const ac = new AbortController();
  req.signal.addEventListener('abort', () => ac.abort());

  // 8秒サーバータイムアウト（Vercel Hobby の maxDuration=10s を超えないよう保護）
  const timeoutId = setTimeout(() => ac.abort(), 8_000);

  try {
    // text-simple / text-quality / math-reasoning のみストリーミング対応
    // transcribe / image-gen / tts-japanese は将来実装
    if (type !== 'text-simple' && type !== 'text-quality' && type !== 'math-reasoning') {
      clearTimeout(timeoutId);
      return errorResponse('UNSUPPORTED_TYPE', 'このAI機能は現在準備中です。', 400);
    }

    const userMessages = messages.map((m) => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const stream = feature === 'ai-echo' && level
      ? await streamAiEcho(
          type,
          { level, lessonScript: lessonContext, messages: userMessages },
          { signal: ac.signal },
        )
      : await streamArticleChat(
          type,
          { articleTitle, articleExcerpt, lessonContext, pageContent, messages: userMessages },
          { signal: ac.signal },
        );

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

    log.error('ai.post', { error: msg });

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
