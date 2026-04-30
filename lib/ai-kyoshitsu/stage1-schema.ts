/**
 * lib/ai-kyoshitsu/stage1-schema.ts
 * うごくAI教室 — Stage 1 出力（教育設計 JSON）の型・スキーマ定義
 *
 * 用途:
 *   - app/api/generate-animation/route.ts : LLM 出力のバリデーション
 *   - app/(site)/tools/ai-kyoshitsu/page.tsx : 結果パネル「学習ポイント」「クイズ」タブの型
 *   - lib/db/schema.ts の userAnimations.stage1Json (JSONB) と整合
 *
 * 変更時の注意:
 *   - スキーマを変更する場合、後方互換性に注意（既存 DB レコードは古いスキーマで保存済み）
 *   - 厳密な検証は API 受信時のみで、UI 表示時は zod 通過済み or NULL として扱う
 */

import { z } from 'zod';

// ─── 成功ケース: 教育設計の完全な JSON ────────────────────
export const stage1SuccessSchema = z.object({
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
    /**
     * presentation_style: 表現スタイル
     * - animated:        動き・変化を見せるアニメーション中心
     * - static_diagram:  数値・関係・構造をじっくり見せる静的SVG図
     * - static_simple:   アイコン+テキスト中心の暗記カード形式
     * - mixed:           静的全体図 + 部分アニメーション
     * 旧バージョンとの互換性のため省略可（その場合は animated 扱い）
     */
    presentation_style: z.enum(['animated', 'static_diagram', 'static_simple', 'mixed']).optional().default('animated'),
    animation_style: z.enum(['step', 'loop', 'interactive']),
    color_theme:     z.string(),
    complexity:      z.enum(['simple', 'standard', 'detailed']),
  }),
});

// ─── 確認が必要ケース: 質問と選択肢 ───────────────────────
export const stage1ClarificationSchema = z.object({
  status:             z.literal('needs_clarification'),
  round:              z.number().optional(),
  issue:              z.string().optional(),
  message:            z.string(),
  options:            z.array(z.string()),
  options_available:  z.boolean(),
});

// ─── エラーケース: 学習内容として不適切 ───────────────────
export const stage1ErrorSchema = z.object({
  error:      z.literal(true),
  reason:     z.string(),
  suggestion: z.string(),
});

// ─── 推論型 ────────────────────────────────────────────────
export type Stage1Success       = z.infer<typeof stage1SuccessSchema>;
export type Stage1Clarification = z.infer<typeof stage1ClarificationSchema>;
export type Stage1Error         = z.infer<typeof stage1ErrorSchema>;

export type Stage1Result =
  | { kind: 'success';       data: Stage1Success }
  | { kind: 'clarification'; data: Stage1Clarification }
  | { kind: 'error';         data: Stage1Error }
  | { kind: 'parse_failed';  rawText: string };
