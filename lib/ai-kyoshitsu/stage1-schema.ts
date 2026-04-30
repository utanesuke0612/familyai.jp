/**
 * lib/ai-kyoshitsu/stage1-schema.ts
 * うごくAI教室 — Stage 1 出力スキーマ（v2: 簡素化版）
 *
 * Stage 1 の役割:
 *   - ユーザーが入力したテーマを **確認** して、Stage 2 に渡せる「確定テーマ」を作る
 *   - 重い教育設計（keywords / quiz / teaching_flow など）は生成しない
 *   - 安い・速い LLM（Gemini Flash 等）で動かす想定
 *
 * 出力 3 パターン（discriminated union）:
 *   1. ready              : テーマが具体的・明確 → そのまま Stage 2 へ
 *   2. needs_clarification : 曖昧 → ユーザーに反問（必ず選択肢 2〜4 個）
 *   3. unsuitable          : 学習対象として不適切 → エラー表示
 *
 * Phase 1c-rebuild（Stage 1 簡素化）で導入。
 */

import { z } from 'zod';

// ─── 1. ready: テーマが確定 ────────────────────────────────────────
/**
 * Stage 2 にそのまま渡せる「整理された学習テーマ」。
 * 例: "磁石の極（N極とS極）の性質と引きつけ合いの基本"
 * 30〜100文字程度を想定。
 */
export const stage1ReadySchema = z.object({
  status: z.literal('ready'),
  topic:  z.string().min(1).max(300),
});

// ─── 2. needs_clarification: 反問が必要 ───────────────────────────
/**
 * テーマが曖昧・複数解釈・短すぎる場合の反問。
 * options は必ず 2〜4 個の具体的な学習テーマ案。空配列禁止。
 */
export const stage1ClarificationSchema = z.object({
  status:  z.literal('needs_clarification'),
  message: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(120)).min(2).max(4),
});

// ─── 3. unsuitable: 学習対象として不適切 ──────────────────────────
/**
 * 例: 暴力的・科目に無関係・難易度不一致など。
 * suggestion は代替案（任意）。
 */
export const stage1UnsuitableSchema = z.object({
  status:     z.literal('unsuitable'),
  reason:     z.string().min(1).max(500),
  suggestion: z.string().max(500).optional(),
});

// ─── 統合 discriminated union ──────────────────────────────────
export const stage1ResponseSchema = z.discriminatedUnion('status', [
  stage1ReadySchema,
  stage1ClarificationSchema,
  stage1UnsuitableSchema,
]);

// ─── 推論型 ────────────────────────────────────────────────
export type Stage1Ready         = z.infer<typeof stage1ReadySchema>;
export type Stage1Clarification = z.infer<typeof stage1ClarificationSchema>;
export type Stage1Unsuitable    = z.infer<typeof stage1UnsuitableSchema>;
export type Stage1Response      = z.infer<typeof stage1ResponseSchema>;

/**
 * route.ts 内部で扱う Stage 1 結果（パース失敗ケース込み）。
 */
export type Stage1Result =
  | { kind: 'ready';         data: Stage1Ready }
  | { kind: 'clarification'; data: Stage1Clarification }
  | { kind: 'unsuitable';    data: Stage1Unsuitable }
  | { kind: 'parse_failed';  rawText: string };
