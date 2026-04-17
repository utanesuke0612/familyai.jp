/**
 * lib/ai/router.ts
 * familyai.jp — AI モデルルーター（サーバー専用）
 *
 * `type` パラメータに応じて MODEL_ROUTER から最適なモデルを選択し、
 * OpenRouter プロバイダー経由でストリーム生成を実行する。
 *
 * コスト超過時の自動ダウングレードも担当:
 *   text-quality が要求されても月間コストが上限に近い場合 → text-simple に降格
 */

import { MODEL_ROUTER, type ModelRouterType } from '@/shared';
import { streamOpenRouter, type OpenRouterMessage, type StreamOptions } from './providers/openrouter';

export interface RouteAIOptions extends StreamOptions {
  /** 月額コスト上限（USD）を超えた場合に text-quality → text-simple にダウングレードする */
  allowDowngrade?: boolean;
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

  const model = MODEL_ROUTER[effectiveType] ?? MODEL_ROUTER.fallback;

  return streamOpenRouter(model, messages, {
    maxTokens:   options.maxTokens,
    temperature: options.temperature,
    signal:      options.signal,
  });
}

// ── システムプロンプトビルダー ──────────────────────────────────
/** 記事コンテキストからシステムプロンプトを生成する */
export function buildArticleSystemPrompt(opts: {
  articleTitle?:   string | null;
  articleExcerpt?: string | null;
}): string {
  const lines = [
    'あなたは familyai.jp のAIアシスタントです。',
    '家族全員（パパ・ママ・子ども・シニア）が使うサイトなので、',
    'わかりやすく・やさしい日本語で・絵文字を適度に使って回答してください。',
    '回答は簡潔に（長くても300文字程度）まとめてください。',
  ];

  if (opts.articleTitle) {
    lines.push(`\n現在読んでいる記事のタイトル:「${opts.articleTitle}」`);
  }
  if (opts.articleExcerpt) {
    lines.push(`記事の概要: ${opts.articleExcerpt.slice(0, 300)}`);
  }

  lines.push('\nユーザーの質問に上記の記事内容を踏まえて回答してください。');

  return lines.join('\n');
}
