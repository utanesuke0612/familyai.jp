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
 *   未ログイン  : 利用不可（401 UNAUTHORIZED）
 *   Free        : 3回/日（userId単位）
 *   Premium     : 100回/日（userId単位）
 *   Admin       : 無制限（ADMIN_EMAIL 環境変数で指定）
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync }               from 'fs';
import { join }                       from 'path';
import { z }                          from 'zod';
import { Ratelimit }                  from '@upstash/ratelimit';
import { Redis }                      from '@upstash/redis';
import { auth }                       from '@/lib/auth';
import { verifyCsrf }                 from '@/lib/csrf';
import { completeOpenRouter, completeOpenRouterWithUsage } from '@/lib/ai/providers/openrouter';
import { MAX_GENERATED_HTML_BYTES, MAX_ANIMATION_PROMPT } from '@/shared';
import { createAnimation }            from '@/lib/repositories/animations';
import { getAiConfig }                from '@/lib/config/ai-config';
import type { AiKyoshitsuConfig }     from '@/shared/types';
import {
  stage1SuccessSchema,
  stage1ClarificationSchema,
  stage1ErrorSchema,
  type Stage1Success,
  type Stage1Result,
} from '@/lib/ai-kyoshitsu/stage1-schema';
import {
  conversationHistorySchema,
  type ConversationTurn,
} from '@/lib/ai-kyoshitsu/conversation';

export const runtime  = 'nodejs';
export const maxDuration = 60;

// ── R2-K1: フォールバック設定（429 / AbortError 時の自動リトライ用） ──
/**
 * Gemini 2.0 Flash 共有プールの 429 / AbortError 多発に対する保険。
 * 設定モデルが失敗 → このモデルへ 1 回だけリトライする。
 * Anthropic は OpenRouter 共有プールの混雑から独立しており、最も安定。
 */
const FALLBACK_MODEL              = 'anthropic/claude-3.5-haiku';
/** Stage1 リトライ時のタイムアウト（Haiku は Gemini より遅いので余裕を取る） */
const FALLBACK_STAGE1_TIMEOUT_MS  = 12_000;
/**
 * Stage2 リトライ時のタイムアウト。
 * Vercel 60秒制限の中で Stage1 + Stage1リトライ + Stage2 の合計を抑えるため
 * 通常より短め（35秒）に設定。
 */
const FALLBACK_STAGE2_TIMEOUT_MS  = 35_000;
/** Stage2 リトライ時の maxTokens（Haiku 80tok/s × 30s ≒ 2400 tok 程度） */
const FALLBACK_STAGE2_MAX_TOKENS  = 3_500;

/** API エラーがリトライ価値のある一過性のものか判定する */
function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError') return true;
  // OpenRouter からのエラーメッセージ例: "OpenRouter API エラー: 429 ..."
  // 429（rate limit）/ 503（service unavailable）/ 502（bad gateway）をリトライ対象に
  return /\b(429|502|503|504)\b/.test(err.message);
}

// ── 入力バリデーション ─────────────────────────────────────────
const bodySchema = z.object({
  prompt:  z.string().min(1).max(MAX_ANIMATION_PROMPT),
  grade:   z.enum(['elem-low', 'elem-high', 'middle']),
  subject: z.enum(['science', 'math', 'social']),
  theme:   z.string().min(1).max(200),
  /**
   * Phase 1c+: チャット会話履歴（直近 N ターン）。
   * Stage 1 が文脈を踏まえて反問・解釈できるようにするため。
   * 省略可（後方互換）。送信されない場合は従来通り単発リクエストとして扱う。
   */
  conversationHistory: conversationHistorySchema.optional(),
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
// レート制限ポリシーは先頭のヘッダーコメントを参照。
let _redis:   Redis | null = null;
let _rlFree:  Ratelimit | null = null;
let _rlPro:   Ratelimit | null = null;

function getRatelimiters() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!_redis) _redis = Redis.fromEnv();
  if (!_rlFree) {
    _rlFree = new Ratelimit({ redis: _redis, limiter: Ratelimit.slidingWindow(3,   '1 d'), prefix: 'ratelimit:anim:free' });
    _rlPro  = new Ratelimit({ redis: _redis, limiter: Ratelimit.slidingWindow(100, '1 d'), prefix: 'ratelimit:anim:pro'  });
  }
  return { free: _rlFree!, pro: _rlPro! };
}

function isAdminEmail(email?: string | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail && !!email && email === adminEmail;
}

// ── プロンプトテンプレート ─────────────────────────────────────
const STAGE1_PROMPT_PATH = ['skills', 'ai-kyoushitsu-prompt', 'stage1_system_prompt.md'];
const STAGE2_PROMPT_PATH = ['skills', 'ai-kyoushitsu-prompt', 'stage2_SKILL.md'];
const LEGACY_PROMPT_PATH = ['skills', 'ai-kyoushitsu-prompt', 'legacy_unified.md'];

function readPromptFile(parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf-8');
}

// ── Stage 1 JSON スキーマ ──────────────────────────────────────
// スキーマ・型は lib/ai-kyoshitsu/stage1-schema.ts に集約（UI 側と共有）。
// 当ファイルでは parseStage1Response / runStage1 などで使うため import している。

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

// ── Stage 1 API 呼び出し（retry のために model/timeout を引数化） ───
/**
 * Stage1 の OpenRouter API 呼び出し本体。
 * - 成功時: 生レスポンス文字列を返す
 * - 失敗時: API エラー（タイムアウト・429 等）は throw する。呼び出し側でリトライ判定。
 */
async function callStage1Api(
  prompt:               string,
  grade:                string,
  subject:              string,
  model:                string,
  timeoutMs:            number,
  conversationHistory?: ConversationTurn[],
): Promise<string> {
  const gradeLabel   = GRADE_LABEL[grade]   ?? grade;
  const subjectLabel = SUBJECT_LABEL[subject] ?? subject;

  /**
   * Phase 1c+: 最優先ルール（システムプロンプト本文より優先）
   *
   * 既存 system prompt は単発リクエスト前提で、会話履歴の概念が無い。
   * user message に追加した補強ルールは LLM がデータと見なし無視するため、
   * system message の最上位にプライオリティルールを挿入する。
   */
  const PRIORITY_RULES = `=========================================
【最優先ルール — 以下の指示書のすべての例外より優先される】
=========================================

【A. 言語制約（厳守）】
- すべての応答テキストは日本語のみ
- 英文（"Would you like...", "Should I generate...", "Let me know...",
  "Great!", "Sure!" 等）の混入は完全禁止
- message / issue / options / reason / suggestion すべての文字列値で日本語のみ

【B. 不要な確認の禁止】
- ユーザー指示が学年・科目に対して具体的かつ明確で、教育コンテンツとして
  実装可能なら、確認質問せず直接 success JSON を返すこと
- 「生成してよろしいですか？」「Would you like me to generate?」
  「具体的に生成を開始してよろしいでしょうか？」のような事前確認は完全禁止
- 確認せず黙って success を返すのが正しい挙動

【C. 会話履歴の解釈（最重要）】
user message に「=== 過去の対話履歴 ===」セクションがある場合、
これは継続中の会話である。最新のユーザー発言は単独のテーマではなく、
履歴の続きとして解釈すること。

特に、最新のユーザー発言が以下のような短い了承・続行表現の場合：
  「はい」「うん」「OK」「了解」「いいよ」「うんいいよ」
  「これでお願い」「お願いします」「これで」「これでOK」「OKです」
  「開始して」「進めて」「やって」「やってください」「お願い」
  「はい、開始して」「はい、お願いします」 など
  （✅ や ✏️ 等の絵文字プレフィックスがあっても無視して中身を見る）

→ 絶対に新規テーマとして扱わず、履歴で AI が直前に確認していたテーマを採用する
→ そのテーマで success JSON を返す（needs_clarification にしない・error にもしない）

例：
  履歴に "User: 天気の変化\\nAI: 「天気の変化 - 雲の動き」のテーマで作成します..."
  最新ユーザー発言が "はい、開始して" の場合
  → 「天気の変化 - 雲の動き」のテーマで success JSON を返す（必須）

【D. options 必須化】
- needs_clarification を返す時、options 配列は必ず 2〜4 個の具体的選択肢を含めること
- options を空配列にしてはならない
- options_available は必ず true
- 同じテーマでユーザーの意向確認をする場合の options 例：
  ["✅ これでOK", "✏️ もう少し修正", "🆕 別のテーマにする"]

これらのルールは、以下のシステム指示書本文よりも優先される。
=========================================

`;

  const baseSystemPrompt = readPromptFile(STAGE1_PROMPT_PATH);
  const systemPrompt    = PRIORITY_RULES + baseSystemPrompt;

  // Phase 1c+: 過去の対話履歴セクション（あれば差し込む）
  // 直近 N ターンのみ送信。AI が文脈を踏まえて反問・解釈できるようにする。
  const historySection =
    conversationHistory && conversationHistory.length > 0
      ? `\n\n=== 過去の対話履歴（参考・直近 ${conversationHistory.length} ターン） ===\n${conversationHistory
          .map((t) => (t.role === 'user' ? `User: ${t.text}` : `AI: ${t.text}`))
          .join('\n')}\n=== ここまで ===\n`
      : '';

  const userMessage = `学年: ${gradeLabel}
科目: ${subjectLabel}${historySection}
ユーザー指示（今回のメッセージ）: ${prompt}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await completeOpenRouter(
      model,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      { maxTokens: 4000, temperature: 0.3, signal: controller.signal },
    );
  } finally {
    clearTimeout(timer);
  }
}

/** rawText を JSON / スキーマ検証して Stage1Result に変換する */
function parseStage1Response(rawText: string): Stage1Result {
  const jsonText = extractJson(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.warn('[Stage1] JSON パース失敗:', err instanceof Error ? err.message : String(err));
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

// ── Stage 1 実行（リトライ機構付き） ─────────────────────────────
/**
 * Stage1 を実行する。retryable な API エラー（429/AbortError/5xx）に
 * 当たった場合、FALLBACK_MODEL（Haiku 3.5）で 1 回だけリトライする。
 *
 * リトライしない条件:
 *   - そもそもエラーが retryable でない（テンプレ読み込み失敗等）
 *   - 設定モデルが既に FALLBACK_MODEL と同じ
 *   - リトライ後の失敗（無限ループ防止）
 */
async function runStage1(
  prompt:               string,
  grade:                string,
  subject:              string,
  cfg:                  AiKyoshitsuConfig,
  conversationHistory?: ConversationTurn[],
): Promise<Stage1Result> {
  let rawText: string;
  try {
    rawText = await callStage1Api(
      prompt, grade, subject, cfg.stage1Model, cfg.stage1TimeoutMs, conversationHistory,
    );
  } catch (err) {
    const isRetryable = isRetryableError(err);
    const errMsg      = err instanceof Error ? err.message : String(err);
    console.warn('[Stage1] API失敗:', errMsg);

    // リトライ判定
    if (!isRetryable || cfg.stage1Model === FALLBACK_MODEL) {
      return { kind: 'parse_failed', rawText: '' };
    }
    console.warn(`[Stage1] retrying with fallback model: ${FALLBACK_MODEL}`);
    try {
      rawText = await callStage1Api(
        prompt, grade, subject, FALLBACK_MODEL, FALLBACK_STAGE1_TIMEOUT_MS, conversationHistory,
      );
    } catch (retryErr) {
      console.warn(
        '[Stage1] fallback also failed:',
        retryErr instanceof Error ? retryErr.message : String(retryErr),
      );
      return { kind: 'parse_failed', rawText: '' };
    }
  }

  return parseStage1Response(rawText);
}

// ── Stage 2 実行（構造化JSON入力 + プロンプトキャッシュ） ──────
async function runStage2Structured(
  stage1Data: Stage1Success,
  cfg:        AiKyoshitsuConfig,
): Promise<string> {
  const systemPrompt = readPromptFile(STAGE2_PROMPT_PATH);
  const userMessage  = `以下のJSON仕様から教育用HTMLを生成してください。

⚠️ 出力形式（厳守）:
- あなたの応答は HTML コードのみ。1文字目から <!DOCTYPE html> で始める
- 「了解しました」「生成します」「よろしいですか？」等の確認文・前置きは禁止
- markdown のコードブロック記号（\`\`\`html）は不要
- keywordsの全項目、teaching_flowの全ステップ、quizの5問すべてを完全に展開
- コメントだけのスケルトンは絶対に出力しない

\`\`\`json
${JSON.stringify(stage1Data, null, 2)}
\`\`\``;

  // Stage 2 タイムアウト・モデル・パラメータは cfg 経由で運用中に調整可能
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.stage2TimeoutMs);
  const startedAt = Date.now();

  let result;
  try {
    // プロンプトキャッシュは Anthropic 用。Gemini では無視されるが互換性のため形式維持
    result = await completeOpenRouterWithUsage(
      cfg.stage2Model,
      [
        {
          role: 'system',
          content: [
            { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
          ],
        },
        { role: 'user', content: userMessage },
      ],
      { maxTokens: cfg.stage2MaxTokens, temperature: cfg.stage2Temperature, signal: controller.signal },
    );
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    const isAbort = (err as Error)?.name === 'AbortError';
    console.error('[Stage2] OpenRouter エラー詳細:', {
      elapsed_ms: elapsed,
      isAbort,
      errName:    (err as Error)?.name,
      errMessage: (err as Error)?.message?.slice(0, 500),
    });
    throw err;
  } finally {
    clearTimeout(timer);
  }

  // キャッシュ効果のログ出力（Vercelログで運用観測用）
  const elapsed = Date.now() - startedAt;
  if (result.usage) {
    const u = result.usage;
    const cacheRead   = u.cache_read_input_tokens ?? 0;
    const cacheWrite  = u.cache_creation_input_tokens ?? 0;
    const promptTokens = u.prompt_tokens ?? 0;
    const completionTokens = u.completion_tokens ?? 0;
    const cacheHit = cacheRead > 0 ? `✅ HIT(${cacheRead}t)` : cacheWrite > 0 ? `🆕 WRITE(${cacheWrite}t)` : '❌ MISS';
    console.log(`[Stage2] cache=${cacheHit} prompt=${promptTokens}t completion=${completionTokens}t elapsed=${elapsed}ms`);
  } else {
    console.log(`[Stage2] elapsed=${elapsed}ms (usage not available)`);
  }

  return result.content;
}

// ── Stage 2 フォールバック（legacy_unified.md 使用） ──────────
async function runStage2Legacy(
  prompt: string,
  grade: string,
  subject: string,
  cfg: AiKyoshitsuConfig,
): Promise<string> {
  const template     = readPromptFile(LEGACY_PROMPT_PATH);
  const gradeLabel   = GRADE_LABEL[grade]   ?? grade;
  const subjectLabel = SUBJECT_LABEL[subject] ?? subject;
  const systemPrompt = template
    .replace(/\{THEME\}/g,   prompt)
    .replace(/\{GRADE\}/g,   gradeLabel)
    .replace(/\{SUBJECT\}/g, subjectLabel);

  // タイムアウト・モデル・パラメータは cfg 経由
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.stage2TimeoutMs);
  try {
    return await completeOpenRouter(
      cfg.stage2Model,
      [{ role: 'user', content: systemPrompt }],
      { maxTokens: cfg.stage2MaxTokens, temperature: cfg.stage2Temperature, signal: controller.signal },
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── R2-K1: Stage 2 リトライラッパー ──────────────────────────
/**
 * Stage2（構造化 / legacy 共通）に retry 機構を被せる高階関数。
 * cfg.stage2Model が既に FALLBACK_MODEL と同じならリトライしない（無駄なため）。
 *
 * @param run         実行関数（cfg を受け取って string を返す）
 * @param cfg         元の AiKyoshitsuConfig
 * @param logContext  ログ用のラベル（"Stage2-structured" / "Stage2-legacy"）
 */
async function runStage2WithRetry(
  run:        (cfg: AiKyoshitsuConfig) => Promise<string>,
  cfg:        AiKyoshitsuConfig,
  logContext: string,
): Promise<string> {
  try {
    return await run(cfg);
  } catch (err) {
    const isRetryable = isRetryableError(err);
    const errMsg      = err instanceof Error ? err.message : String(err);
    if (!isRetryable || cfg.stage2Model === FALLBACK_MODEL) {
      throw err;
    }
    console.warn(`[${logContext}] retryable error: ${errMsg} → falling back to ${FALLBACK_MODEL}`);
    return await run({
      ...cfg,
      stage2Model:     FALLBACK_MODEL,
      stage2TimeoutMs: FALLBACK_STAGE2_TIMEOUT_MS,
      stage2MaxTokens: Math.min(cfg.stage2MaxTokens, FALLBACK_STAGE2_MAX_TOKENS),
    });
  }
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

  const { prompt, grade, subject, theme, conversationHistory } = parsed.data;

  // 3. 認証チェック（未ログインは即ブロック）
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code:    'UNAUTHORIZED',
          message: 'AI教室を利用するにはログインが必要です。ログインしてください。',
        },
      },
      { status: 401 },
    );
  }

  // 4. Admin判定（無制限利用）
  const isAdmin = isAdminEmail(session.user.email);

  // 5. レート制限（Admin以外）
  if (!isAdmin) {
    const ratelimiters = getRatelimiters();
    if (ratelimiters) {
      const plan    = session.user.plan ?? 'free';
      const limiter = plan === 'premium' ? ratelimiters.pro : ratelimiters.free;
      const { success } = await limiter.limit(session.user.id);
      if (!success) {
        const message = plan === 'premium'
          ? '本日の生成回数の上限（100回）に達しました。明日またお試しください。'
          : '本日の生成回数の上限（3回）に達しました。プレミアムプランで100回/日まで利用できます。';
        return NextResponse.json(
          { ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message } },
          { status: 429 },
        );
      }
    }
  }

  // 6. ランタイム設定取得（env / DB / DEFAULTS のレイヤー解決）
  const cfg = await getAiConfig();

  // 6. Stage 1 実行（Phase 1c+: 会話履歴を文脈として渡す）
  const stage1 = await runStage1(prompt, grade, subject, cfg, conversationHistory);

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
  // 注意: Stage2 構造化が失敗（タイムアウト等）した場合に legacy で再試行すると、
  // 同じモデル・同じ問題で時間が倍増し Vercel 60秒制限を超えるリスクがあるため、
  // Stage1 が success の場合は構造化のみで再試行なし。
  // Stage1 が parse_failed の場合のみ legacy にフォールバック。
  let rawHtml: string;
  try {
    if (stage1.kind === 'success') {
      // 正常パス: 構造化JSONで生成（429/Abort 時は FALLBACK_MODEL に1回リトライ）
      rawHtml = await runStage2WithRetry(
        (effectiveCfg) => runStage2Structured(stage1.data, effectiveCfg),
        cfg,
        'Stage2-structured',
      );
    } else {
      // Stage 1 が parse_failed の場合: legacy で生成（同じく 1 回リトライ可）
      console.warn('[generate-animation] Stage1失敗 → legacyフォールバック');
      rawHtml = await runStage2WithRetry(
        (effectiveCfg) => runStage2Legacy(prompt, grade, subject, effectiveCfg),
        cfg,
        'Stage2-legacy',
      );
    }
  } catch (err) {
    console.error('[generate-animation] Stage2 失敗:', {
      stage1Kind: stage1.kind,
      errMsg:     (err as Error)?.message?.slice(0, 200),
    });
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

  // 8.5. HTMLサイズ上限チェック（コスト・容量保護）
  const htmlBytes = Buffer.byteLength(htmlContent, 'utf-8');
  if (htmlBytes > MAX_GENERATED_HTML_BYTES) {
    console.warn('[generate-animation] HTML size limit exceeded:', {
      size:     htmlBytes,
      maxBytes: MAX_GENERATED_HTML_BYTES,
      userId:   session.user.id,
      theme,
    });
    return NextResponse.json(
      {
        ok: false,
        error: {
          code:    'HTML_TOO_LARGE',
          message: '生成されたアニメーションが大きすぎます。テーマを簡潔にしてもう一度お試しください。',
        },
      },
      { status: 413 },
    );
  }

  // 9. DB保存
  // Stage1 が success の場合のみ stage1_json を保存（parse_failed 時は NULL のまま）。
  // 結果パネルの「学習ポイント」「クイズ」タブで再利用するための原データ。
  const stage1JsonForDb: Stage1Success | null =
    stage1.kind === 'success' ? stage1.data : null;

  let animationId: string;
  try {
    animationId = await createAnimation({
      userId:      session.user.id,
      theme,
      grade,
      subject,
      prompt,
      htmlContent,
      stage1Json:  stage1JsonForDb,
    });
  } catch (err) {
    console.error('[generate-animation] DB保存エラー:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました。' } },
      { status: 500 },
    );
  }

  // Phase 1a: フロントが直後に「学習ポイント」「クイズ」タブを描画できるよう
  // stage1Json をレスポンスに同梱（DB 再取得を不要にする）。
  return NextResponse.json({
    ok: true,
    id: animationId,
    stage1Json: stage1JsonForDb,
  });
}
