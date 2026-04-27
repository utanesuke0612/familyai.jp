/**
 * shared/utils/ai-cost.ts
 * familyai.jp — AI教室パイプラインのコスト試算
 *
 * 管理画面の「コスト試算」表示用。
 * 想定トークン数 × モデル単価で1リクエストあたりの円コストを算出する。
 */

import type { AiKyoshitsuConfig } from '../types';
import { findAiModel } from '../constants/ai-models';

/** 1リクエストの想定トークン数（経験則） */
export const TOKEN_ESTIMATE = {
  /** Stage 1 入力（system prompt + user message） */
  stage1Input:  6_500,
  /** Stage 1 出力（JSON spec） */
  stage1Output: 3_000,
  /** Stage 2 入力（system prompt + Stage1 JSON） */
  stage2Input:  4_000,
  /**
   * Stage 2 出力は maxTokens を上限値として使うが、
   * 実際は平均で 70% 程度しか使わない経験則
   */
  stage2OutputUsageRate: 0.7,
} as const;

/** 1回のリクエストにかかる推定コスト（円） */
export interface AiCostBreakdown {
  stage1InputJpy:  number;
  stage1OutputJpy: number;
  stage2InputJpy:  number;
  stage2OutputJpy: number;
  totalJpy:        number;
  /** モデルが見つからなかった場合は true（試算は推定値） */
  hasUnknownModel: boolean;
}

/**
 * 設定から1リクエストの推定コストを計算する。
 * モデルが価格テーブルに無い場合は 0 円扱いで totalJpy に加算しない。
 */
export function estimateAiCost(cfg: AiKyoshitsuConfig): AiCostBreakdown {
  const stage1Model = findAiModel(cfg.stage1Model);
  const stage2Model = findAiModel(cfg.stage2Model);
  const hasUnknownModel = !stage1Model || !stage2Model;

  const stage1InputJpy  = stage1Model
    ? (TOKEN_ESTIMATE.stage1Input  / 1_000_000) * stage1Model.inputPriceJpy
    : 0;
  const stage1OutputJpy = stage1Model
    ? (TOKEN_ESTIMATE.stage1Output / 1_000_000) * stage1Model.outputPriceJpy
    : 0;
  const stage2InputJpy  = stage2Model
    ? (TOKEN_ESTIMATE.stage2Input  / 1_000_000) * stage2Model.inputPriceJpy
    : 0;
  const stage2OutputJpy = stage2Model
    ? (cfg.stage2MaxTokens * TOKEN_ESTIMATE.stage2OutputUsageRate / 1_000_000) * stage2Model.outputPriceJpy
    : 0;

  return {
    stage1InputJpy,
    stage1OutputJpy,
    stage2InputJpy,
    stage2OutputJpy,
    totalJpy: stage1InputJpy + stage1OutputJpy + stage2InputJpy + stage2OutputJpy,
    hasUnknownModel,
  };
}

/** 月間コスト試算（リクエスト数を掛けるだけ） */
export function estimateMonthlyCost(cfg: AiKyoshitsuConfig, requestsPerMonth: number): number {
  return estimateAiCost(cfg).totalJpy * requestsPerMonth;
}
