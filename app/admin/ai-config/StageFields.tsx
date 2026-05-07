/**
 * app/admin/ai-config/StageFields.tsx
 * familyai.jp — AI設定 AIチャット / Stage1 / Stage2 入力フィールド（Section 縦並び版）
 *
 * Rev30 H4 で初出 → Rev31 で SettingsTable 化 → Rev32 で復活（テーブル形式は
 * 一覧性低下の声があったため）。順序を「AIチャット → Stage1 → Stage2」に変更し、
 * 利用頻度が高い AIチャットを先頭に配置。
 *
 * Section 構成:
 *   ① 💬 AIチャット   — 記事ページ右下のチャットウィジェット既定モデル
 *   ② 🧠 Stage 1     — テーマ詳細化・JSON 設計
 *   ③ 🎬 Stage 2     — HTML 生成（Vercel 60 秒制限を考慮）
 *
 * Rev32 で provider バッジを各モデル選択直下に表示し、
 * OpenRouter / DeepSeek 公式 / Qwen 公式 のどの経路で呼ばれるか一目でわかるように。
 */

'use client';

import { AI_CONFIG_RANGES, AI_KYOSHITSU_DEFAULTS, findAiModel } from '@/shared';
import type { AiKyoshitsuConfig, AiProvider } from '@/shared';
import { Section, Field, Hint, ModelSelect, NumberInput } from './parts';

interface StageFieldsProps {
  form:     AiKyoshitsuConfig;
  onChange: (next: AiKyoshitsuConfig) => void;
  disabled?: boolean;
}

export function StageFields({ form, onChange, disabled }: StageFieldsProps) {
  return (
    <>
      {/* ① 💬 AIチャット ───────────────────────────────────── */}
      <Section title="💬 AIチャット（記事ページ右下のチャット既定モデル）">
        <Field label="モデル">
          <ModelSelect
            value={form.chatModel}
            onChange={(v) => onChange({ ...form, chatModel: v })}
            disabled={disabled}
          />
          <ModelMeta modelId={form.chatModel} />
          <Hint>
            デフォルト: <code>{AI_KYOSHITSU_DEFAULTS.chatModel}</code>
          </Hint>
        </Field>
      </Section>

      {/* ② 🧠 Stage 1 ─────────────────────────────────────── */}
      <Section title="🧠 Stage 1（テーマ詳細化・JSON設計）">
        <Field label="モデル">
          <ModelSelect
            value={form.stage1Model}
            onChange={(v) => onChange({ ...form, stage1Model: v })}
            disabled={disabled}
          />
          <ModelMeta modelId={form.stage1Model} />
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

      {/* ③ 🎬 Stage 2 ─────────────────────────────────────── */}
      <Section title="🎬 Stage 2（HTML生成）">
        <Field label="モデル">
          <ModelSelect
            value={form.stage2Model}
            onChange={(v) => onChange({ ...form, stage2Model: v })}
            disabled={disabled}
          />
          <ModelMeta modelId={form.stage2Model} />
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
    </>
  );
}

// ─── 選択中モデルの provider バッジ + 単価情報 ─────────────────
function ModelMeta({ modelId }: { modelId: string }) {
  const m = findAiModel(modelId);
  if (!m) return null;
  return (
    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#6B7280' }}>
      <ProviderBadge provider={m.provider} />
      <span>速度 {m.speed}・入力 ¥{m.inputPriceJpy}/M tok・出力 ¥{m.outputPriceJpy}/M tok</span>
    </div>
  );
}

function ProviderBadge({ provider }: { provider: AiProvider }) {
  const styles = {
    openrouter: { bg: '#EEF2FF', fg: '#3730A3', label: 'OpenRouter' },
    deepseek:   { bg: '#ECFDF5', fg: '#065F46', label: 'DeepSeek 公式' },
    qwen:       { bg: '#FEF3C7', fg: '#92400E', label: 'Qwen 公式' },
  } as const;
  const s = styles[provider];
  return (
    <span
      style={{
        background:   s.bg,
        color:        s.fg,
        fontSize:     10,
        fontWeight:   700,
        padding:      '2px 6px',
        borderRadius: 999,
        whiteSpace:   'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}
