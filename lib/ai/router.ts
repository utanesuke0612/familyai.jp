/**
 * lib/ai/router.ts
 * familyai.jp — AI モデルルーター（サーバー専用）
 *
 * `type` パラメータに応じてモデルを選択し OpenRouter 経由でストリーム生成。
 *
 * モデル選択の優先順位:
 *   1. 管理画面で chatModel が設定されていれば最優先（type を問わず使用）
 *   2. それ以外は MODEL_ROUTER[type] に従う
 *   3. fallback で MODEL_ROUTER.fallback
 *
 * コスト超過時の自動ダウングレードも担当:
 *   text-quality が要求されても月間コストが上限に近い場合 → text-simple に降格
 */

import { MODEL_ROUTER, type ModelRouterType, AI_CHAT_DEFAULTS, findAiModel } from '@/shared';
import { getAiChatConfig } from '@/lib/config/ai-config';
import {
  streamOpenRouter,
  completeOpenRouter,
  completeOpenRouterWithUsage,
  type OpenRouterMessage,
  type StreamOptions,
  type CompleteOptions,
  type UsageStats,
} from './providers/openrouter';
import { streamOpenAICompat, completeOpenAICompat } from './providers/openai-compatible';
import { buildAiEchoSystemPrompt, type AiEchoLevel } from './ai-echo-prompt';

export interface RouteAIOptions extends StreamOptions {
  /** 月額コスト上限（USD）を超えた場合に text-quality → text-simple にダウングレードする */
  allowDowngrade?: boolean;
}

/**
 * モデル ID から適切なプロバイダーへストリーム生成リクエストを発行する。
 * Rev32: provider フィールドで分岐（openrouter / deepseek / qwen）。
 */
export function streamByModelId(
  modelId:  string,
  messages: OpenRouterMessage[],
  options:  StreamOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const meta = findAiModel(modelId);

  // 未登録モデルは OpenRouter にフォールバック（後方互換）
  if (!meta || meta.provider === 'openrouter') {
    return streamOpenRouter(modelId, messages, options);
  }

  // 直 API: nativeId があればそれを、無ければ id をそのまま渡す
  return streamOpenAICompat(meta.provider, meta.nativeId ?? meta.id, messages, options);
}

/**
 * モデル ID から適切なプロバイダーへ非ストリーム完了リクエストを発行する。
 * ストリームせず全文応答を待つ用途で使う。
 */
export async function completeByModelId(
  modelId:  string,
  messages: OpenRouterMessage[],
  options:  CompleteOptions = {},
): Promise<string> {
  const meta = findAiModel(modelId);
  if (!meta || meta.provider === 'openrouter') {
    return completeOpenRouter(modelId, messages, options);
  }
  const { content } = await completeOpenAICompat(
    meta.provider,
    meta.nativeId ?? meta.id,
    messages,
    options,
  );
  return content;
}

/**
 * 非ストリーム + 使用統計（cache hit ratio 計測用）。
 * OpenRouter のキャッシュ統計（cache_read_input_tokens 等）を使うため、
 * Anthropic キャッシュを期待する用途では OpenRouter 経由を選ぶ運用が望ましい。
 * 直 API（DeepSeek / Qwen）でもこの関数は動くが、cache 統計は返らない。
 */
export async function completeByModelIdWithUsage(
  modelId:  string,
  messages: OpenRouterMessage[],
  options:  CompleteOptions = {},
): Promise<{ content: string; usage?: UsageStats }> {
  const meta = findAiModel(modelId);
  if (!meta || meta.provider === 'openrouter') {
    return completeOpenRouterWithUsage(modelId, messages, options);
  }
  return completeOpenAICompat(meta.provider, meta.nativeId ?? meta.id, messages, options);
}

/**
 * 用途別にモデルを選択し、ストリーム生成を開始する。
 * 返却する ReadableStream は `data: {"delta":"..."}` / `data: [DONE]` 形式。
 */
export async function routeAI(
  type:     ModelRouterType,
  messages: OpenRouterMessage[],
  options:  RouteAIOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  // コスト超過時のダウングレード（allowDowngrade=true の場合）
  const effectiveType =
    options.allowDowngrade && type === 'text-quality'
      ? 'text-simple'
      : type;

  // 管理画面で chatModel が DEFAULTS と異なる値に設定されていれば最優先
  const cfg = await getAiChatConfig();
  const adminOverride =
    cfg.chatModel && cfg.chatModel !== AI_CHAT_DEFAULTS.chatModel
      ? cfg.chatModel
      : null;

  const modelId =
    adminOverride
    ?? MODEL_ROUTER[effectiveType]
    ?? MODEL_ROUTER.fallback;

  // maxTokens / temperature が未指定なら、管理画面の AIチャット設定をデフォルトに使う
  return streamByModelId(modelId, messages, {
    maxTokens:   options.maxTokens   ?? cfg.chatMaxTokens,
    temperature: options.temperature ?? cfg.chatTemperature,
    signal:      options.signal,
  });
}

// ── システムプロンプトビルダー ──────────────────────────────────
/** 記事コンテキストからシステムプロンプトを生成する */
export function buildArticleSystemPrompt(opts: {
  articleTitle?:   string | null;
  articleExcerpt?: string | null;
  /**
   * R3-機能3 / AIctation: VOA レッスン全文スクリプト。
   * mode='aictation' の AIChatWidget から sentences.json 平文化文字列で渡される。
   * これがあると AI が「3文要約」「重要単語」「文法説明」等のカテゴリ質問に
   * 実コンテンツを踏まえて回答できる（v2 設計書の lesson.script 相当）。
   */
  lessonContext?:  string | null;
}): string {
  const lines = [
    'あなたは familyai.jp のAIアシスタントです。',
    '初心者から実務で使う人まで読むサイトなので、',
    'わかりやすく・やさしい日本語で・絵文字を適度に使って回答してください。',
    '回答は簡潔に（長くても300文字程度）まとめてください。',
  ];

  if (opts.articleTitle) {
    lines.push(`\n現在読んでいる記事のタイトル:「${opts.articleTitle}」`);
  }
  if (opts.articleExcerpt) {
    lines.push(`記事の概要: ${opts.articleExcerpt.slice(0, 300)}`);
  }

  // VOA レッスン本文（AIctation のカテゴリ質問が機能するための実コンテンツ）
  if (opts.lessonContext && opts.lessonContext.trim()) {
    lines.push('\n=== レッスン全文（参照用・上限8000字） ===');
    lines.push(opts.lessonContext.slice(0, 8000));
    lines.push('=== ここまで ===');
    lines.push(
      '上記スクリプトは VOA Learning English の対話本文です。',
      '要約・単語抽出・文法解説等は必ずこのスクリプトに基づいて回答してください。',
    );
  }

  lines.push('\nユーザーの質問に上記の記事内容を踏まえて回答してください。');

  return lines.join('\n');
}

// ── Feature-first API (Rev40 / Deepening #4) ─────────────────────
//
// 旧 app/api/ai/route.ts は feature 分岐 (article-chat / ai-echo) を
// route 内部で行い、prompt builder と routeAI を別々に呼んでいた。
// 「ある AI feature を呼ぶ」というドメイン操作を 1 つの interface に集約し、
// route は HTTP 入出力のみに専念できるようにする。

export interface ArticleChatInput {
  /** ユーザーが読んでいる記事のタイトル（system prompt 用・任意） */
  articleTitle?:   string | null;
  /** 記事の概要・上限300字（system prompt 用・任意） */
  articleExcerpt?: string | null;
  /** AIctation の VOA レッスン全文（上限 8000 字・任意） */
  lessonContext?:  string | null;
  /** user / assistant の会話履歴。system プロンプトは本関数内で組み立てる */
  messages:        OpenRouterMessage[];
}

export interface AiEchoInput {
  level:         AiEchoLevel;
  /** VOA レッスンの英文スクリプト（参照用・任意） */
  lessonScript?: string | null;
  /** user / assistant の会話履歴。system プロンプトは本関数内で組み立てる */
  messages:      OpenRouterMessage[];
}

/**
 * 記事 / AIctation チャットのストリーム生成。
 * system プロンプト構築・モデル選択・ストリーム化までを集約する。
 */
export async function streamArticleChat(
  type:    ModelRouterType,
  input:   ArticleChatInput,
  options: RouteAIOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const system = buildArticleSystemPrompt({
    articleTitle:   input.articleTitle,
    articleExcerpt: input.articleExcerpt,
    lessonContext:  input.lessonContext,
  });
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    ...input.messages,
  ];
  return routeAI(type, messages, options);
}

/**
 * AI Echo（VOA レッスン後の英文評価）のストリーム生成。
 * Level 別の system プロンプトを内部で組み立てる。
 */
export async function streamAiEcho(
  type:    ModelRouterType,
  input:   AiEchoInput,
  options: RouteAIOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const system = buildAiEchoSystemPrompt(input.level, input.lessonScript);
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: system },
    ...input.messages,
  ];
  return routeAI(type, messages, options);
}
