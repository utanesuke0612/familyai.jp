/**
 * app/admin/ai-config/parts.tsx
 * familyai.jp — AI設定フォーム共通 UI 部品（Client Component）
 *
 * H4（Rev30）: AiConfigForm.tsx 分割。再利用される小コンポーネントと
 * インラインスタイルを集約する。
 */

'use client';

import type { CSSProperties } from 'react';
import { AI_MODEL_OPTIONS } from '@/shared';

// ─── 小コンポーネント ───────────────────────────────────────────

export function Section({
  title,
  children,
}: {
  title:    string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background:    'white',
        borderRadius:  12,
        padding:       '1.25rem',
        border:        '1px solid #E5E7EB',
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: '0.75rem' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label:    string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: '0.75rem' }}>
      <label
        style={{
          display:      'block',
          fontSize:     13,
          fontWeight:   600,
          color:        '#374151',
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ marginTop: 4, fontSize: 11, color: '#6B7280' }}>{children}</p>;
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background:   '#F9FAFB',
        padding:      '0.5rem 0.75rem',
        borderRadius: 8,
        border:       '1px solid #E5E7EB',
      }}
    >
      <div style={{ fontSize: 11, color: '#6B7280' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>{value}</div>
    </div>
  );
}

export function ModelSelect({
  value,
  onChange,
  disabled,
}: {
  value:     string;
  onChange:  (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{ ...inputStyle, width: '100%' }}
    >
      {/* Rev32: provider 別に optgroup 化（OpenRouter / DeepSeek / Qwen） */}
      {(['openrouter', 'deepseek', 'qwen'] as const).map((prov) => {
        const items = AI_MODEL_OPTIONS.filter((m) => m.provider === prov);
        if (items.length === 0) return null;
        const groupLabel =
          prov === 'openrouter' ? 'OpenRouter（既存・統一エントリ）'
          : prov === 'deepseek' ? 'DeepSeek 公式 API（要 DEEPSEEK_API_KEY）'
          :                       'Qwen / Alibaba DashScope（要 DASHSCOPE_API_KEY）';
        return (
          <optgroup key={prov} label={groupLabel}>
            {items.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}（{m.note}・速度{m.speed}）
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  value:     number;
  onChange:  (v: number) => void;
  min:       number;
  max:       number;
  step:      number;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      style={{ ...inputStyle, width: 200 }}
    />
  );
}

// ─── 共通スタイル ───────────────────────────────────────────────

export const inputStyle: CSSProperties = {
  padding:      '0.5rem 0.75rem',
  fontSize:     14,
  borderRadius: 6,
  border:       '1px solid #D1D5DB',
  background:   'white',
  color:        '#1F2937',
};

export const btnPrimary: CSSProperties = {
  padding:      '0.625rem 1.25rem',
  fontSize:     14,
  fontWeight:   700,
  color:        'white',
  background:   '#FF8C42',
  border:       'none',
  borderRadius: 8,
  cursor:       'pointer',
};

export const btnSecondary: CSSProperties = {
  padding:      '0.625rem 1.25rem',
  fontSize:     14,
  fontWeight:   600,
  color:        '#374151',
  background:   'white',
  border:       '1px solid #D1D5DB',
  borderRadius: 8,
  cursor:       'pointer',
};
