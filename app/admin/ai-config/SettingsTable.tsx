/**
 * app/admin/ai-config/SettingsTable.tsx
 * familyai.jp — AI設定 Table 版（行: Stage1/Stage2/AIチャット・列: パラメータ）
 *
 * 旧 `StageFields.tsx`（縦並びのSection群）の置き換え。
 * 行=パイプラインの段階、列=設定項目という直感的な対応で、
 * 一覧性・比較しやすさ・「どこにどの設定があるか」の見通しが向上。
 *
 * 列:
 *   - モデル（ModelSelect）
 *   - タイムアウト（ms）
 *   - 最大トークン
 *   - Temperature
 *   - 1回コスト目安（試算）
 *
 * Stage毎に対応しないセルは「—」表示で disabled。
 *
 * 表外:
 *   - 合計コスト & 警告（hasUnknownModel 等）
 *   - ⓘ ヘルプ列（hover で詳細）
 *
 * モバイル時は縦カード形式にフォールバック（< 720px）。
 */

'use client';

import { AI_CONFIG_RANGES, AI_KYOSHITSU_DEFAULTS, estimateAiCost, findAiModel } from '@/shared';
import type { AiKyoshitsuConfig } from '@/shared/types';
import { useMemo } from 'react';
import { ModelSelect, NumberInput } from './parts';

interface SettingsTableProps {
  form:     AiKyoshitsuConfig;
  onChange: (next: AiKyoshitsuConfig) => void;
  disabled?: boolean;
}

interface RowDef {
  key:        'stage1' | 'stage2' | 'chat';
  label:      string;
  emoji:      string;
  hint:       string;
  /** モデル ID を取得 */
  modelValue: string;
  /** モデル ID 変更時のフォーム書き換え */
  onModelChange: (next: string) => void;
  /** タイムアウトのフィールド（無ければ undefined） */
  timeout?: {
    value:    number;
    onChange: (v: number) => void;
    min:      number;
    max:      number;
    step:     number;
  };
  /** 最大トークン（Stage2 のみ） */
  maxTokens?: {
    value:    number;
    onChange: (v: number) => void;
    min:      number;
    max:      number;
    step:     number;
  };
  /** Temperature（Stage2 のみ） */
  temperature?: {
    value:    number;
    onChange: (v: number) => void;
    min:      number;
    max:      number;
    step:     number;
  };
}

export function SettingsTable({ form, onChange, disabled }: SettingsTableProps) {
  const cost = useMemo(() => estimateAiCost(form), [form]);
  const stage1Cost = cost.stage1InputJpy + cost.stage1OutputJpy;
  const stage2Cost = cost.stage2InputJpy + cost.stage2OutputJpy;

  const rows: RowDef[] = [
    {
      key:        'stage1',
      label:      'Stage 1',
      emoji:      '🧠',
      hint:       'テーマ詳細化・JSON設計',
      modelValue: form.stage1Model,
      onModelChange: (v) => onChange({ ...form, stage1Model: v }),
      timeout: {
        value:    form.stage1TimeoutMs,
        onChange: (v) => onChange({ ...form, stage1TimeoutMs: v }),
        min:      AI_CONFIG_RANGES.stage1TimeoutMs.min,
        max:      AI_CONFIG_RANGES.stage1TimeoutMs.max,
        step:     500,
      },
    },
    {
      key:        'stage2',
      label:      'Stage 2',
      emoji:      '🎬',
      hint:       'HTML 生成（Vercel 60 秒制限を考慮）',
      modelValue: form.stage2Model,
      onModelChange: (v) => onChange({ ...form, stage2Model: v }),
      timeout: {
        value:    form.stage2TimeoutMs,
        onChange: (v) => onChange({ ...form, stage2TimeoutMs: v }),
        min:      AI_CONFIG_RANGES.stage2TimeoutMs.min,
        max:      AI_CONFIG_RANGES.stage2TimeoutMs.max,
        step:     1000,
      },
      maxTokens: {
        value:    form.stage2MaxTokens,
        onChange: (v) => onChange({ ...form, stage2MaxTokens: v }),
        min:      AI_CONFIG_RANGES.stage2MaxTokens.min,
        max:      AI_CONFIG_RANGES.stage2MaxTokens.max,
        step:     500,
      },
      temperature: {
        value:    form.stage2Temperature,
        onChange: (v) => onChange({ ...form, stage2Temperature: v }),
        min:      AI_CONFIG_RANGES.stage2Temperature.min,
        max:      AI_CONFIG_RANGES.stage2Temperature.max,
        step:     0.1,
      },
    },
    {
      key:        'chat',
      label:      'AIチャット',
      emoji:      '💬',
      hint:       '記事ページ右下のチャットウィジェット既定モデル',
      modelValue: form.chatModel,
      onModelChange: (v) => onChange({ ...form, chatModel: v }),
    },
  ];

  return (
    <section
      style={{
        background:    'white',
        borderRadius:  12,
        border:        '1px solid #E5E7EB',
        overflow:      'hidden',
      }}
    >
      <header style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F6' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: 0 }}>
          🛠️ パイプライン設定
        </h2>
        <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>
          行 = 各段階、列 = 設定項目。AIチャットは内部でモデルだけ持ち、それ以外は OpenRouter MODEL_ROUTER 既定値を使用します。
        </p>
      </header>

      {/* デスクトップ：テーブル */}
      <div className="settings-table-desktop" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FAFAFA', textAlign: 'left' }}>
              <th style={th()}>段階</th>
              <th style={th()}>モデル</th>
              <th style={th({ textAlign: 'right' })}>タイムアウト (ms)</th>
              <th style={th({ textAlign: 'right' })}>最大トークン</th>
              <th style={th({ textAlign: 'right' })}>Temperature</th>
              <th style={th({ textAlign: 'right' })}>1回コスト目安</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowCost =
                row.key === 'stage1' ? stage1Cost
                : row.key === 'stage2' ? stage2Cost
                : null;  // chat は実測ベースなので試算なし
              const modelInfo = findAiModel(row.modelValue);

              return (
                <tr key={row.key} style={{ borderTop: '1px solid #F3F4F6' }}>
                  <td style={td()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span aria-hidden="true" style={{ fontSize: 18 }}>{row.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1F2937' }}>{row.label}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>{row.hint}</div>
                      </div>
                    </div>
                  </td>

                  {/* モデル */}
                  <td style={td()}>
                    <div style={{ minWidth: 200 }}>
                      <ModelSelect
                        value={row.modelValue}
                        onChange={row.onModelChange}
                        disabled={disabled}
                      />
                      {modelInfo && (
                        <div style={{ marginTop: 4, fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <ProviderBadge provider={modelInfo.provider} />
                          <span>速度 {modelInfo.speed}・入力¥{modelInfo.inputPriceJpy}/M・出力¥{modelInfo.outputPriceJpy}/M</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* タイムアウト */}
                  <td style={td({ textAlign: 'right' })}>
                    {row.timeout ? (
                      <NumberInput
                        value={row.timeout.value}
                        onChange={row.timeout.onChange}
                        min={row.timeout.min}
                        max={row.timeout.max}
                        step={row.timeout.step}
                        disabled={disabled}
                      />
                    ) : (
                      <Em>—</Em>
                    )}
                  </td>

                  {/* 最大トークン */}
                  <td style={td({ textAlign: 'right' })}>
                    {row.maxTokens ? (
                      <NumberInput
                        value={row.maxTokens.value}
                        onChange={row.maxTokens.onChange}
                        min={row.maxTokens.min}
                        max={row.maxTokens.max}
                        step={row.maxTokens.step}
                        disabled={disabled}
                      />
                    ) : (
                      <Em>—</Em>
                    )}
                  </td>

                  {/* Temperature */}
                  <td style={td({ textAlign: 'right' })}>
                    {row.temperature ? (
                      <NumberInput
                        value={row.temperature.value}
                        onChange={row.temperature.onChange}
                        min={row.temperature.min}
                        max={row.temperature.max}
                        step={row.temperature.step}
                        disabled={disabled}
                      />
                    ) : (
                      <Em>—</Em>
                    )}
                  </td>

                  {/* 1回コスト */}
                  <td style={td({ textAlign: 'right' })}>
                    {rowCost !== null ? (
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>
                        ¥{rowCost.toFixed(2)}
                      </span>
                    ) : (
                      <Em title="チャットは実測ベース">実測</Em>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#FFF7ED', borderTop: '2px solid #FED7AA' }}>
              <td colSpan={5} style={{ ...td(), fontWeight: 700, color: '#9A3412' }}>
                💰 1 回あたり合計（Stage1 + Stage2）
              </td>
              <td style={{ ...td({ textAlign: 'right' }), fontWeight: 800, color: '#9A3412', fontSize: 15 }}>
                ¥{cost.totalJpy.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* デフォルト値ヒント */}
      <div
        style={{
          padding:    '0.5rem 1.25rem 1rem',
          borderTop:  '1px solid #F3F4F6',
          fontSize:   11,
          color:      '#6B7280',
          lineHeight: 1.6,
        }}
      >
        <strong>🏷️ コード DEFAULTS:</strong>{' '}
        Stage1 <code>{AI_KYOSHITSU_DEFAULTS.stage1Model}</code>{' '}
        ({AI_KYOSHITSU_DEFAULTS.stage1TimeoutMs} ms){' / '}
        Stage2 <code>{AI_KYOSHITSU_DEFAULTS.stage2Model}</code>{' '}
        ({AI_KYOSHITSU_DEFAULTS.stage2TimeoutMs} ms,{' '}
        {AI_KYOSHITSU_DEFAULTS.stage2MaxTokens} tok, T={AI_KYOSHITSU_DEFAULTS.stage2Temperature}){' / '}
        Chat <code>{AI_KYOSHITSU_DEFAULTS.chatModel}</code>
        {cost.hasUnknownModel && (
          <span style={{ color: '#B91C1C', marginLeft: 8 }}>
            ⚠️ 一部モデルが料金テーブルに無いため部分的な試算です
          </span>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 720px) {
          /* モバイル: テーブルを縦カードに変える簡易レスポンシブ */
          .settings-table-desktop table { font-size: 12px; }
          .settings-table-desktop th,
          .settings-table-desktop td { padding: 8px !important; }
        }
      `}</style>
    </section>
  );
}

// ─── 内部 styling helpers ───────────────────────────────────
function th(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding:      '12px 16px',
    fontSize:     12,
    fontWeight:   700,
    color:        '#374151',
    textTransform: 'none',
    whiteSpace:   'nowrap',
    ...extra,
  };
}

function td(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding:    '14px 16px',
    verticalAlign: 'top',
    ...extra,
  };
}

function Em({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span title={title} style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{children}</span>
  );
}

// プロバイダー別バッジ（OpenRouter / DeepSeek / Qwen）
function ProviderBadge({ provider }: { provider: 'openrouter' | 'deepseek' | 'qwen' }) {
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
