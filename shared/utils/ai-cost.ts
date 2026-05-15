/**
 * shared/utils/ai-cost.ts
 * familyai.jp — AIチャット 1 回あたりのコスト試算
 *
 * /admin/ai-config の「コスト試算」表示用。
 * 想定トークン数 × モデル単価で 1 リクエストあたりの円コストを算出する。
 */

import type { AiChatConfig } from '../types';
import { findAiModel } from '../constants/ai-models';

/** AIチャット 1 リクエストの想定トークン数（経験則） */
export const TOKEN_ESTIMATE = {
  /**
   * 入力トークン（システムプロンプト + 記事/レッスンコンテキスト + 質問）。
   * buildArticleSystemPrompt の固定文 + 記事概要 + ユーザー質問でおおよそ 500 token。
   */
  chatInput: 500,
  /**
   * 出力トークンは chatMaxTokens を上限として使うが、
   * 実際は平均で 70% 程度しか使わない経験則。
   */
  chatOutputUsageRate: 0.7,
} as const;

/** AIチャット 1 回のリクエストにかかる推定コスト（円） */
export interface AiCostBreakdown {
  inputJpy:  number;
  outputJpy: number;
  totalJpy:  number;
  /** モデルが料金テーブルに無かった場合は true（試算は推定値） */
  hasUnknownModel: boolean;
}

/**
 * AIチャット設定から 1 リクエストの推定コストを計算する。
 * モデルが価格テーブルに無い場合は 0 円扱いで totalJpy に加算しない。
 */
export function estimateAiCost(cfg: AiChatConfig): AiCostBreakdown {
  const model = findAiModel(cfg.chatModel);
  const hasUnknownModel = !model;

  const inputJpy = model
    ? (TOKEN_ESTIMATE.chatInput / 1_000_000) * model.inputPriceJpy
    : 0;
  const outputJpy = model
    ? (cfg.chatMaxTokens * TOKEN_ESTIMATE.chatOutputUsageRate / 1_000_000) * model.outputPriceJpy
    : 0;

  return {
    inputJpy,
    outputJpy,
    totalJpy: inputJpy + outputJpy,
    hasUnknownModel,
  };
}

/** 月間コスト試算（リクエスト数を掛けるだけ） */
export function estimateMonthlyCost(cfg: AiChatConfig, requestsPerMonth: number): number {
  return estimateAiCost(cfg).totalJpy * requestsPerMonth;
}
