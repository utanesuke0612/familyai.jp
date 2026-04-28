/**
 * app/admin/ai-config/StageFields.tsx
 * familyai.jp — AI設定 Stage1/Stage2/Chat 入力フィールド（Client Component）
 *
 * H4（Rev30）: AiConfigForm.tsx 分割。フォーム入力欄をまとめて持つ。
 * 値の更新は親（AiConfigForm）に伝搬する controlled component。
 */

'use client';

import { AI_CONFIG_RANGES, AI_KYOSHITSU_DEFAULTS } from '@/shared';
import type { AiKyoshitsuConfig } from '@/shared/types';
import { Section, Field, Hint, ModelSelect, NumberInput } from './parts';

interface StageFieldsProps {
  form:     AiKyoshitsuConfig;
  onChange: (next: AiKyoshitsuConfig) => void;
  disabled?: boolean;
}

export function StageFields({ form, onChange, disabled }: StageFieldsProps) {
  return (
    <>
      {/* Stage 1 設定 */}
      <Section title="🧠 Stage 1（テーマ詳細化・JSON設計）">
        <Field label="モデル">
          <ModelSelect
            value={form.stage1Model}
            onChange={(v) => onChange({ ...form, stage1Model: v })}
            disabled={disabled}
          />
          <Hint>
            デフォルト: <code>{AI_KYOSHITSU_DEFAULTS.stage1Model}</code>
          </Hint>
        </Field>
        <Field
          label={`タイムアウト（${AI_CONFIG_RANGES.stage1TimeoutMs.min}〜${AI_CONFIG_RANGES.stage1TimeoutMs.max} ms）`}
        >
          <NumberInput
            value={form.stage1TimeoutMs}
            onChange={(v) => onChange({ ...form, stage1TimeoutMs: v })}
            min={AI_CONFIG_RANGES.stage1TimeoutMs.min}
            max={AI_CONFIG_RANGES.stage1TimeoutMs.max}
            step={500}
            disabled={disabled}
          />
          <Hint>デフォルト: {AI_KYOSHITSU_DEFAULTS.stage1TimeoutMs} ms</Hint>
        </Field>
      </Section>

      {/* Stage 2 設定 */}
      <Section title="🎬 Stage 2（HTML生成）">
        <Field label="モデル">
          <ModelSelect
            value={form.stage2Model}
            onChange={(v) => onChange({ ...form, stage2Model: v })}
            disabled={disabled}
          />
          <Hint>
            デフォルト: <code>{AI_KYOSHITSU_DEFAULTS.stage2Model}</code>
          </Hint>
        </Field>
        <Field
          label={`タイムアウト（${AI_CONFIG_RANGES.stage2TimeoutMs.min}〜${AI_CONFIG_RANGES.stage2TimeoutMs.max} ms）`}
        >
          <NumberInput
            value={form.stage2TimeoutMs}
            onChange={(v) => onChange({ ...form, stage2TimeoutMs: v })}
            min={AI_CONFIG_RANGES.stage2TimeoutMs.min}
            max={AI_CONFIG_RANGES.stage2TimeoutMs.max}
            step={1000}
            disabled={disabled}
          />
          <Hint>
            Vercel 60秒制限を考慮し最大 58000 まで。デフォルト: {AI_KYOSHITSU_DEFAULTS.stage2TimeoutMs} ms
          </Hint>
        </Field>
        <Field
          label={`最大トークン（${AI_CONFIG_RANGES.stage2MaxTokens.min}〜${AI_CONFIG_RANGES.stage2MaxTokens.max}）`}
        >
          <NumberInput
            value={form.stage2MaxTokens}
            onChange={(v) => onChange({ ...form, stage2MaxTokens: v })}
            min={AI_CONFIG_RANGES.stage2MaxTokens.min}
            max={AI_CONFIG_RANGES.stage2MaxTokens.max}
            step={500}
            disabled={disabled}
          />
          <Hint>
            大きいほど詳細だが時間とコストがかかる。デフォルト: {AI_KYOSHITSU_DEFAULTS.stage2MaxTokens}
          </Hint>
        </Field>
        <Field
          label={`Temperature（${AI_CONFIG_RANGES.stage2Temperature.min}〜${AI_CONFIG_RANGES.stage2Temperature.max}）`}
        >
          <NumberInput
            value={form.stage2Temperature}
            onChange={(v) => onChange({ ...form, stage2Temperature: v })}
            min={AI_CONFIG_RANGES.stage2Temperature.min}
            max={AI_CONFIG_RANGES.stage2Temperature.max}
            step={0.1}
            disabled={disabled}
          />
          <Hint>低いほど確定的。デフォルト: {AI_KYOSHITSU_DEFAULTS.stage2Temperature}</Hint>
        </Field>
      </Section>

      {/* チャットモデル */}
      <Section title="💬 AIチャット（既定モデル）">
        <Field label="モデル">
          <ModelSelect
            value={form.chatModel}
            onChange={(v) => onChange({ ...form, chatModel: v })}
            disabled={disabled}
          />
          <Hint>
            デフォルト: <code>{AI_KYOSHITSU_DEFAULTS.chatModel}</code>
          </Hint>
        </Field>
      </Section>
    </>
  );
}
