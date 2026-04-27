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
  prompt:  z.string().min(1).max(500),
  grade:   z.enum(['elem-low', 'elem-high', 'middle']),
  subject: z.enum(['science', 'math', 'social']),
  theme:   z.string().min(1).max(200),
});

// ── 学年・教科の日本語ラベル ───────────────────────────────────
const GRADE_LABEL: Record<string, string> = {
  'elem-low':  '小3・4年生',
  'elem-high': '小5・6年生',
  'middle':    '中学生',
};

const SUBJECT_LABEL: Record<string, string> = {
  science: '理科',
  math:    '算数・数学',
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

// ── プロンプトテンプレート読み込み（統合・全教科共通） ──────────
// 旧: 教科別3ファイル（science/math/social）→ 新: 単一の統合プロンプト
// 統合プロンプト内で {SUBJECT} 値ごとに教科別セクションを参照する設計
const PROMPT_TEMPLATE_PATH = ['skills', 'ai-kyoushitsu-prompt', 'legacy_unified.md'];

function buildPrompt(theme: string, grade: string, subject: string): string {
  const templatePath = join(process.cwd(), ...PROMPT_TEMPLATE_PATH);
  const template     = readFileSync(templatePath, 'utf-8');
  const gradeLabel   = GRADE_LABEL[grade]   ?? grade;
  const subjectLabel = SUBJECT_LABEL[subject] ?? subject;
  return template
    .replace(/\{THEME\}/g,   theme)
    .replace(/\{GRADE\}/g,   gradeLabel)
    .replace(/\{SUBJECT\}/g, subjectLabel);
}

// ── Stage 1: テーマ詳細化プロンプト（インライン） ─────────────
function buildEnrichPrompt(theme: string, gradeLabel: string, subjectLabel: string, subject: string): string {
  const subjectGuidance: Record<string, string> = {
    science: `理科の観点で考える：力の向き・大きさ・物体の動き・現象の因果関係を具体的に。SVGで描くべき矢印・物体・軌跡を明示。`,
    math:    `算数・数学の観点で考える：座標軸・数値・図形の頂点座標を正確に計算。グリッドの必要性・縮尺・ラベルの位置を明示。`,
    social:  `社会科の観点で考える：時系列・地理的位置関係・統計の比率を正確に。年号・地名・数値の正確さを最優先に明示。`,
  };
  return `あなたは教育SVGアニメーションの設計専門家です。
以下のテーマを教えるためのSVGアニメーション仕様を設計してください。

テーマ: ${theme}
学年: ${gradeLabel}
教科: ${subjectLabel}

${subjectGuidance[subject] ?? ''}

【重要】テーマが多少抽象的・広めでも、ユーザーに質問せず、あなた自身で具体化してください。
- 学年と教科を踏まえ、その学年の学習指導要領で最も典型的な「1つの単元・1つの概念」に自動で絞る
- 例: "電気" + 小3・4年生 → 「豆電球と乾電池の電気の通り道」
- 例: "電気" + 中学生 → 「オームの法則（電圧・電流・抵抗）」
- 略語・タイプミスは最も可能性の高い意味で解釈する（例: "光合性" → "光合成"）
- 必ず仕様書を出力すること。質問文や「〇〇についてもう少し教えてください」のような返答は禁止。

以下の形式で簡潔に出力してください（合計200〜400文字）:
【核心概念】このアニメーションで示す1つの重要な概念（具体的に絞り込む）
【SVG要素】描くべき主要な図形・要素（3〜5個）
【アニメーション】CSSキーフレームで実現する動き（1〜2個）
【ラベル】SVG内に必ず表示する日本語テキスト
【ポイント】教育的に正確な要点（3つ）`;
}

async function enrichThemeWithAI(theme: string, grade: string, subject: string): Promise<string> {
  const gradeLabel   = GRADE_LABEL[grade]   ?? grade;
  const subjectLabel = SUBJECT_LABEL[subject] ?? subject;
  const enrichPrompt = buildEnrichPrompt(theme, gradeLabel, subjectLabel, subject);
  // Stage 1 は最大8秒でタイムアウト → 失敗してもフォールバックで継続
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // Stage 1: Gemini 2.0 Flash（高速・低コスト・JSON出力得意）
    const spec = await completeOpenRouter(
      MODEL_ROUTER['stage1-fast'],
      [{ role: 'user', content: enrichPrompt }],
      { maxTokens: 400, temperature: 0.3, signal: controller.signal },
    );
    return spec.trim();
  } catch (err) {
    console.warn('[generate-animation] Stage1 詳細化スキップ（フォールバック）:', err);
    // Stage 1 失敗・タイムアウト時はオリジナルのテーマをそのまま使用
    return theme;
  } finally {
    clearTimeout(timer);
  }
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

  // 6. Stage 1: テーマを詳細仕様に変換（安い・速いモデルで高速処理）
  const enrichedSpec = await enrichThemeWithAI(prompt, grade, subject);

  // 7. プロンプト組み立て（教科別テンプレート × 詳細仕様を使用）
  let systemPrompt: string;
  try {
    systemPrompt = buildPrompt(enrichedSpec, grade, subject);
  } catch (err) {
    console.error('[generate-animation] プロンプト読み込みエラー:', err);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました。' } },
      { status: 500 },
    );
  }

  // 8. Stage 2: OpenRouter でHTML生成（stage2-html = Claude Haiku 3.5: HTML品質高・指示追従性◎）
  let rawHtml: string;
  try {
    rawHtml = await completeOpenRouter(
      MODEL_ROUTER['stage2-html'],
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

  // 9. HTMLを抽出
  const htmlContent = extractHtml(rawHtml);
  if (!htmlContent.toLowerCase().includes('<html') && !htmlContent.toLowerCase().includes('<!doctype')) {
    // 追加質問（テーマが曖昧な場合）として返ってきた可能性
    return NextResponse.json(
      { ok: false, error: { code: 'CLARIFICATION_NEEDED', message: htmlContent } },
      { status: 422 },
    );
  }

  // 10. DB保存
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
