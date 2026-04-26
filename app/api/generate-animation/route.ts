/**
 * app/api/generate-animation/route.ts
 * うごくAI教室 — アニメーションHTML生成API
 *
 * POST /api/generate-animation
 *
 * Body:
 * {
 *   prompt:  string   // ユーザーが入力したテーマ
 *   grade:   string   // "elem-low" | "elem-high" | "middle"
 *   subject: string   // "science" | "math" | "social"
 *   theme:   string   // テーマ名（表示用。promptと同じかカード名）
 * }
 *
 * Response:
 * {
 *   ok:   true
 *   id:   string   // 生成されたアニメーションのDB ID
 * }
 *
 * レート制限（1日あたり）:
 *   未ログイン  : 3回/日（IP単位）
 *   Free        : 5回/日（userId単位）
 *   Premium     : 100回/日（userId単位）
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync }               from 'fs';
import { join }                       from 'path';
import { z }                          from 'zod';
import { Ratelimit }                  from '@upstash/ratelimit';
import { Redis }                      from '@upstash/redis';
import { auth }                       from '@/lib/auth';
import { verifyCsrf }                 from '@/lib/csrf';
import { completeOpenRouter }         from '@/lib/ai/providers/openrouter';
import { MODEL_ROUTER }               from '@/shared';
import { createAnimation }            from '@/lib/repositories/animations';

export const runtime  = 'nodejs';
export const maxDuration = 60; // HTML生成は時間がかかるため60秒まで許可

// ── 入力バリデーション ─────────────────────────────────────────
const bodySchema = z.object({
  prompt:  z.string().min(2).max(500),
  grade:   z.enum(['elem-low', 'elem-high', 'middle']),
  subject: z.enum(['science', 'math', 'social']),
  theme:   z.string().min(1).max(200),
});

// ── 学年の日本語ラベル ─────────────────────────────────────────
const GRADE_LABEL: Record<string, string> = {
  'elem-low':  '小3・4年生',
  'elem-high': '小5・6年生',
  'middle':    '中学生',
};

// ── Redis / Ratelimit lazy init ────────────────────────────────
let _redis:   Redis | null = null;
let _rlAnon:  Ratelimit | null = null;
let _rlFree:  Ratelimit | null = null;
let _rlPro:   Ratelimit | null = null;

function getRatelimiters() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!_redis) _redis = Redis.fromEnv();
  if (!_rlAnon) {
    _rlAnon = new Ratelimit({ redis: _redis, limiter: Ratelimit.slidingWindow(100, '1 d'), prefix: 'ratelimit:anim:anon' }); // TODO: テスト用 → 本番は 3
    _rlFree = new Ratelimit({ redis: _redis, limiter: Ratelimit.slidingWindow(100, '1 d'), prefix: 'ratelimit:anim:free' }); // TODO: テスト用 → 本番は 5
    _rlPro  = new Ratelimit({ redis: _redis, limiter: Ratelimit.slidingWindow(100, '1 d'), prefix: 'ratelimit:anim:pro'  });
  }
  return { anon: _rlAnon!, free: _rlFree!, pro: _rlPro! };
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

// ── プロンプトテンプレート読み込み（教科別） ──────────────────
const SUBJECT_TEMPLATE: Record<string, string> = {
  science: 'ai-kyoshitsu-prompt-science.md',
  math:    'ai-kyoshitsu-prompt-math.md',
  social:  'ai-kyoshitsu-prompt-social.md',
};

function buildPrompt(theme: string, grade: string, subject: string): string {
  const fileName     = SUBJECT_TEMPLATE[subject] ?? 'ai-kyoshitsu-prompt-science.md';
  const templatePath = join(process.cwd(), 'content', fileName);
  const template     = readFileSync(templatePath, 'utf-8');
  const gradeLabel   = GRADE_LABEL[grade] ?? grade;
  return template
    .replace(/\{THEME\}/g, theme)
    .replace(/\{GRADE\}/g,  gradeLabel);
}

// ── HTML 抽出（モデルが ```html ... ``` で囲む場合に対応） ────
function extractHtml(raw: string): string {
  // コードブロックがあれば中身だけ取り出す
  const m = raw.match(/```(?:html)?\s*([\s\S]+?)```/i);
  if (m?.[1]) return m[1].trim();
  // コードブロックなしの場合はそのまま（<!DOCTYPE から始まる想定）
  const docStart = raw.indexOf('<!DOCTYPE');
  if (docStart !== -1) return raw.slice(docStart).trim();
  return raw.trim();
}

// ── POST /api/generate-animation ─────────────────────────────
export async function POST(req: NextRequest) {
  // 1. CSRF チェック
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { ok: false, error: { code: 'FORBIDDEN', message: '不正なリクエストです。' } },
      { status: 403 },
    );
  }

  // 2. ボディパース
  let rawBody: unknown;
  try { rawBody = await req.json(); }
  catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_BODY', message: 'リクエストが不正です。' } },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_PARAMS', message: '入力内容を確認してください。' } },
      { status: 400 },
    );
  }

  const { prompt, grade, subject, theme } = parsed.data;

  // 3. 認証チェック（未ログインでも生成可能だがレート制限が厳しくなる）
  const session = await auth();

  // 4. レート制限
  const ratelimiters = getRatelimiters();
  if (ratelimiters) {
    const ip = getClientIp(req);
    let limiter  = ratelimiters.anon;
    let limitKey = ip;

    if (session?.user?.id) {
      const plan = session.user.plan ?? 'free';
      limiter  = plan === 'premium' ? ratelimiters.pro : ratelimiters.free;
      limitKey = session.user.id;
    }

    const { success } = await limiter.limit(limitKey);
    if (!success) {
      const message = session?.user?.id
        ? '本日の生成回数の上限に達しました。明日またお試しください。'
        : '1日の生成回数の上限（3回）に達しました。ログインするとより多く使えます。';
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message } },
        { status: 429 },
      );
    }
  }

  // 5. ログイン必須チェック（DBに保存するためログインが必要）
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'ログインすると生成結果を保存できます。ログインしてください。' } },
      { status: 401 },
    );
  }

  // 6. プロンプト組み立て（教科別テンプレートを使用）
  let systemPrompt: string;
  try {
    systemPrompt = buildPrompt(prompt, grade, subject);
  } catch (err) {
    console.error('[generate-animation] プロンプト読み込みエラー:', err);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました。' } },
      { status: 500 },
    );
  }

  // 7. OpenRouter でHTML生成（html-gen = Gemini 2.0 Flash: 高速・高品質・低コスト）
  let rawHtml: string;
  try {
    rawHtml = await completeOpenRouter(
      MODEL_ROUTER['html-gen'],
      [{ role: 'user', content: systemPrompt }],
      { maxTokens: 8000, temperature: 0.7 },
    );
  } catch (err) {
    console.error('[generate-animation] OpenRouter エラー:', err);
    return NextResponse.json(
      { ok: false, error: { code: 'AI_ERROR', message: 'AIが一時的に利用できません。しばらくしてからお試しください。' } },
      { status: 502 },
    );
  }

  // 8. HTMLを抽出
  const htmlContent = extractHtml(rawHtml);
  if (!htmlContent.toLowerCase().includes('<html') && !htmlContent.toLowerCase().includes('<!doctype')) {
    // 追加質問（テーマが曖昧な場合）として返ってきた可能性
    return NextResponse.json(
      { ok: false, error: { code: 'CLARIFICATION_NEEDED', message: htmlContent } },
      { status: 422 },
    );
  }

  // 9. DB保存
  let animationId: string;
  try {
    animationId = await createAnimation({
      userId:      session.user.id,
      theme,
      grade,
      subject,
      prompt,
      htmlContent,
    });
  } catch (err) {
    console.error('[generate-animation] DB保存エラー:', err);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました。' } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: animationId });
}
