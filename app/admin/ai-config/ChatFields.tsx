/**
 * app/admin/ai-config/ChatFields.tsx
 * familyai.jp — AIチャット設定の入力フィールド（Section 1 枚）
 *
 * Rev40: 旧 StageFields（AIチャット + Stage1 + Stage2 の 3 セクション）から
 *        AI チャット用 3 項目のみ表示する 1 セクションへ全面リプレイス。
 *
 * 表示項目:
 *   ① モデル選択       — chatModel（AI_MODEL_OPTIONS から選択）
 *   ② 最大出力トークン  — chatMaxTokens（range slider）
 *   ③ temperature      — chatTemperature（range slider）
 */

'use client';

import { AI_CONFIG_RANGES, AI_CHAT_DEFAULTS, findAiModel } from '@/shared';
import type { AiChatConfig, AiProvider } from '@/shared';
import { Section, Field, Hint, ModelSelect, RangeInput } from './parts';

interface ChatFieldsProps {
  form:     AiChatConfig;
  onChange: (next: AiChatConfig) => void;
  disabled?: boolean;
}

export function ChatFields({ form, onChange, disabled }: ChatFieldsProps) {
  return (
    <Section title="AIチャット設定">
      {/* ① モデル選択 ───────────────────────────────────── */}
      <Field label="モデル">
        <ModelSelect
          value={form.chatModel}
          onChange={(v) => onChange({ ...form, chatModel: v })}
          disabled={disabled}
        />
        <ModelMeta modelId={form.chatModel} />
        <Hint>
          デフォルト: <code>{AI_CHAT_DEFAULTS.chatModel}</code>。
          記事チャット・AI Echo・3D 図鑑ホットスポットなど全 AI チャットで共通。
        </Hint>
      </Field>

      {/* ② 最大出力トークン ─────────────────────────────── */}
      <Field
        label={`最大出力トークン（${AI_CONFIG_RANGES.chatMaxTokens.min}〜${AI_CONFIG_RANGES.chatMaxTokens.max}）`}
      >
        <RangeInput
          value={form.chatMaxTokens}
          onChange={(v) => onChange({ ...form, chatMaxTokens: v })}
          min={AI_CONFIG_RANGES.chatMaxTokens.min}
          max={AI_CONFIG_RANGES.chatMaxTokens.max}
          step={AI_CONFIG_RANGES.chatMaxTokens.step}
          disabled={disabled}
        />
        <Hint>
          応答の長さ上限。800 ≒ 約 300 文字。デフォルト: {AI_CHAT_DEFAULTS.chatMaxTokens}。
          長くするほど待ち時間とコストが増える。
        </Hint>
      </Field>

      {/* ③ temperature ─────────────────────────────────── */}
      <Field
        label={`Temperature（${AI_CONFIG_RANGES.chatTemperature.min}〜${AI_CONFIG_RANGES.chatTemperature.max}）`}
      >
        <RangeInput
          value={form.chatTemperature}
          onChange={(v) => onChange({ ...form, chatTemperature: v })}
          min={AI_CONFIG_RANGES.chatTemperature.min}
          max={AI_CONFIG_RANGES.chatTemperature.max}
          step={AI_CONFIG_RANGES.chatTemperature.step}
          disabled={disabled}
        />
        <Hint>
          0 に近いほど確定的・1 に近いほど創造的。デフォルト: {AI_CHAT_DEFAULTS.chatTemperature}。
        </Hint>
      </Field>
    </Section>
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
