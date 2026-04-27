/**
 * app/api/generate-animation/route.ts
 * うごくAI教室 — アニメーションHTML生成API（2段階パイプライン）
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
 * Response (成功):
 * { ok: true, id: string }
 *
 * Response (確認が必要):
 * { ok: false, error: { code: 'CLARIFICATION_NEEDED', message: string },
 *   options: string[], optionsAvailable: boolean }
 *
 * パイプライン:
 *   Stage1: Gemini 2.0 Flash → 教育設計JSON or 確認質問JSON or エラーJSON
 *   Stage2: Claude Haiku 3.5 → 構造化JSONからHTMLを生成
 *
 * レート制限（1日あたり）:
 *   未ログイン  : 3回/日（IP単位）  ※現在テスト用に100/日
 *   Free        : 5回/日（userId単位）  ※現在テスト用に100/日
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
export const maxDuration = 60;

// ── 入力バリデーション ─────────────────────────────────────────
const bodySchema = z.object({
  prompt:  z.string().min(1).max(500),
  grade:   z.enum(['elem-low', 'elem-high', 'middle']),
  subject: z.enum(['science', 'math', 'social']),
  theme:   z.string().min(1).max(200),
});

// ── 学年・教科の日本語ラベル ───────────────────────────────────
const GRADE_LABEL: Record<string, string> = {
  'elem-low':  '小3〜4年生',
  'elem-high': '小5〜6年生',
  'middle':    '中学生',
};

const SUBJECT_LABEL: Record<string, string> = {
  science: '理科',
  math:    '数学',
  social:  '社会',
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

// ── プロンプトテンプレート ─────────────────────────────────────
const STAGE1_PROMPT_PATH = ['skills', 'ai-kyoushitsu-prompt', 'stage1_system_prompt.md'];
const STAGE2_PROMPT_PATH = ['skills', 'ai-kyoushitsu-prompt', 'stage2_SKILL.md'];
const LEGACY_PROMPT_PATH = ['skills', 'ai-kyoushitsu-prompt', 'legacy_unified.md'];

function readPromptFile(parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf-8');
}

// ── Stage 1 JSON スキーマ ──────────────────────────────────────
// 成功ケース: 教育設計の完全なJSON
const stage1SuccessSchema = z.object({
  meta: z.object({
    grade_input:        z.string(),
    stage:              z.enum(['stage_a', 'stage_b', 'stage_c']),
    subject:            z.string(),
    subject_note:       z.string().nullable().optional(),
    furigana_required:  z.boolean(),
  }),
  content: z.object({
    concept_name:        z.string(),
    concept_name_simple: z.string(),
    one_line_summary:    z.string(),
    keywords: z.array(z.object({
      term:       z.string(),
      reading:    z.string().optional(),
      definition: z.string(),
    })),
    teaching_flow: z.array(z.object({
      step:           z.number(),
      title:          z.string(),
      explanation:    z.string(),
      animation_hint: z.string(),
    })),
    key_points: z.array(z.string()),
  }),
  concept_check: z.object({
    misconceptions: z.array(z.object({
      wrong_idea: z.string(),
      correction: z.string(),
    })),
    quiz: z.array(z.object({
      question:            z.string(),
      choices:             z.array(z.string()),
      answer_index:        z.number(),
      difficulty:          z.enum(['easy', 'normal', 'hard']),
      is_trick_question:   z.boolean(),
      explanation_correct: z.string(),
      explanation_wrong:   z.string(),
    })),
  }),
  design: z.object({
    animation_style: z.enum(['step', 'loop', 'interactive']),
    color_theme:     z.string(),
    complexity:      z.enum(['simple', 'standard', 'detailed']),
  }),
});

// 確認が必要ケース: 質問と選択肢
const stage1ClarificationSchema = z.object({
  status:             z.literal('needs_clarification'),
  round:              z.number().optional(),
  issue:              z.string().optional(),
  message:            z.string(),
  options:            z.array(z.string()),
  options_available:  z.boolean(),
});

// エラーケース: 学習内容として不適切
const stage1ErrorSchema = z.object({
  error:      z.literal(true),
  reason:     z.string(),
  suggestion: z.string(),
});

type Stage1Success       = z.infer<typeof stage1SuccessSchema>;
type Stage1Clarification = z.infer<typeof stage1ClarificationSchema>;
type Stage1Error         = z.infer<typeof stage1ErrorSchema>;
type Stage1Result =
  | { kind: 'success';       data: Stage1Success }
  | { kind: 'clarification'; data: Stage1Clarification }
  | { kind: 'error';         data: Stage1Error }
  | { kind: 'parse_failed';  rawText: string };

// ── JSON 抽出（モデルが ```json ... ``` で囲む場合に対応） ────
function extractJson(raw: string): string {
  const m = raw.match(/```(?:json)?\s*([\s\S]+?)```/i);
  if (m?.[1]) return m[1].trim();
  // 先頭の { から最後の } まで抜き出す
  const first = raw.indexOf('{');
  const last  = raw.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return raw.slice(first, last + 1).trim();
  }
  return raw.trim();
}

// ── HTML 抽出（モデルが ```html ... ``` で囲む場合に対応） ────
function extractHtml(raw: string): string {
  const m = raw.match(/```(?:html)?\s*([\s\S]+?)```/i);
  if (m?.[1]) return m[1].trim();
  const docStart = raw.indexOf('<!DOCTYPE');
  if (docStart !== -1) return raw.slice(docStart).trim();
  return raw.trim();
}

// ── Stage 1 実行 ──────────────────────────────────────────────
async function runStage1(prompt: string, grade: string, subject: string): Promise<Stage1Result> {
  const gradeLabel   = GRADE_LABEL[grade]   ?? grade;
  const subjectLabel = SUBJECT_LABEL[subject] ?? subject;

  let systemPrompt: string;
  try {
    systemPrompt = readPromptFile(STAGE1_PROMPT_PATH);
  } catch (err) {
    console.error('[Stage1] テンプレート読み込みエラー:', err);
    return { kind: 'parse_failed', rawText: '' };
  }

  const userMessage = `学年: ${gradeLabel}
科目: ${subjectLabel}
ユーザー指示: ${prompt}`;

  // Stage 1 は最大25秒でタイムアウト（JSON生成は時間がかかる）
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  let rawText: string;
  try {
    rawText = await completeOpenRouter(
      MODEL_ROUTER['stage1-fast'],
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      { maxTokens: 4000, temperature: 0.3, signal: controller.signal },
    );
  } catch (err) {
    console.warn('[Stage1] API失敗:', err);
    return { kind: 'parse_failed', rawText: '' };
  } finally {
    clearTimeout(timer);
  }

  // JSON パース
  const jsonText = extractJson(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.warn('[Stage1] JSON パース失敗:', err);
    return { kind: 'parse_failed', rawText };
  }

  // スキーマ判定（順序: error → clarification → success）
  const errParse = stage1ErrorSchema.safeParse(parsed);
  if (errParse.success) return { kind: 'error', data: errParse.data };

  const clarParse = stage1ClarificationSchema.safeParse(parsed);
  if (clarParse.success) return { kind: 'clarification', data: clarParse.data };

  const okParse = stage1SuccessSchema.safeParse(parsed);
  if (okParse.success) return { kind: 'success', data: okParse.data };

  console.warn('[Stage1] スキーマ検証失敗:', okParse.error.issues.slice(0, 3));
  return { kind: 'parse_failed', rawText };
}

// ── Stage 2 実行（構造化JSON入力） ────────────────────────────
async function runStage2Structured(stage1Data: Stage1Success): Promise<string> {
  const systemPrompt = readPromptFile(STAGE2_PROMPT_PATH);
  const userMessage  = `以下のJSON仕様に従って、教育用HTMLファイルを1つ生成してください。

\`\`\`json
${JSON.stringify(stage1Data, null, 2)}
\`\`\``;

  return await completeOpenRouter(
    MODEL_ROUTER['stage2-html'],
    [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
    { maxTokens: 8000, temperature: 0.7 },
  );
}

// ── Stage 2 フォールバック（legacy_unified.md 使用） ──────────
async function runStage2Legacy(prompt: string, grade: string, subject: string): Promise<string> {
  const template     = readPromptFile(LEGACY_PROMPT_PATH);
  const gradeLabel   = GRADE_LABEL[grade]   ?? grade;
  const subjectLabel = SUBJECT_LABEL[subject] ?? subject;
  const systemPrompt = template
    .replace(/\{THEME\}/g,   prompt)
    .replace(/\{GRADE\}/g,   gradeLabel)
    .replace(/\{SUBJECT\}/g, subjectLabel);

  return await completeOpenRouter(
    MODEL_ROUTER['stage2-html'],
    [{ role: 'user', content: systemPrompt }],
    { maxTokens: 8000, temperature: 0.7 },
  );
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

  // 3. 認証チェック
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

  // 5. ログイン必須チェック
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'ログインすると生成結果を保存できます。ログインしてください。' } },
      { status: 401 },
    );
  }

  // 6. Stage 1 実行
  const stage1 = await runStage1(prompt, grade, subject);

  // 6a. エラー: 学習内容として不適切（科目に無関係・難易度不一致など）
  if (stage1.kind === 'error') {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code:    'CONCEPT_NOT_SUITABLE',
          message: stage1.data.reason,
        },
        suggestion: stage1.data.suggestion,
      },
      { status: 422 },
    );
  }

  // 6b. 確認が必要: 選択肢付き質問を返す
  if (stage1.kind === 'clarification') {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code:    'CLARIFICATION_NEEDED',
          message: stage1.data.message,
        },
        options:          stage1.data.options,
        optionsAvailable: stage1.data.options_available,
      },
      { status: 422 },
    );
  }

  // 7. Stage 2 実行
  let rawHtml: string;
  try {
    if (stage1.kind === 'success') {
      // 正常パス: 構造化JSONで生成
      rawHtml = await runStage2Structured(stage1.data);
    } else {
      // フォールバック: Stage1失敗時は legacy_unified.md でレガシー生成
      console.warn('[generate-animation] Stage1失敗 → legacyフォールバック');
      rawHtml = await runStage2Legacy(prompt, grade, subject);
    }
  } catch (err) {
    console.error('[generate-animation] Stage2 エラー:', err);
    return NextResponse.json(
      { ok: false, error: { code: 'AI_ERROR', message: 'AIが一時的に利用できません。しばらくしてからお試しください。' } },
      { status: 502 },
    );
  }

  // 8. HTMLを抽出
  const htmlContent = extractHtml(rawHtml);
  if (!htmlContent.toLowerCase().includes('<html') && !htmlContent.toLowerCase().includes('<!doctype')) {
    // HTMLが返らなかった場合は確認質問の可能性として扱う
    return NextResponse.json(
      {
        ok: false,
        error:            { code: 'CLARIFICATION_NEEDED', message: htmlContent },
        options:          [],
        optionsAvailable: false,
      },
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
