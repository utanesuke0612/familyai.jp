/**
 * app/admin/ai-config/PresetSwitcher.tsx
 * familyai.jp — AI設定 プリセット比較カード（Client Component）
 *
 * 旧版（横並びの pill ボタン）を比較カードに刷新。
 * 各プリセットの主要パラメータ（Stage1/Stage2 モデル略称・合計タイムアウト・1回コスト）
 * をインラインで一覧でき、現在のフォームに最も近いプリセットを active 表示する。
 *
 * UX 設計:
 *   - クリックで一括適用（旧挙動を維持）
 *   - active 判定: stage1Model + stage2Model + stage2MaxTokens が完全一致
 *   - 危険警告（💸 高コスト・⚠ Gemini 共有プール混雑リスク）はカード内で色付け
 */

'use client';

import { AI_CONFIG_PRESETS, findAiModel, estimateAiCost, AI_KYOSHITSU_DEFAULTS } from '@/shared';
import type { AiKyoshitsuConfig } from '@/shared/types';

interface PresetSwitcherProps {
  /** 現在のフォーム状態（active 判定用） */
  current:   AiKyoshitsuConfig;
  /** プリセット適用ハンドラ。preset.id を受け取る */
  onApply:   (presetId: string) => void;
  disabled?: boolean;
}

export function PresetSwitcher({ current, onApply, disabled }: PresetSwitcherProps) {
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
          🎁 プリセット切替
        </h2>
        <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>
          クリックで一括適用。各カードに主要パラメータと 1 回コスト目安を表示。
        </p>
      </header>

      <div
        style={{
          padding:             '1rem 1.25rem',
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap:                 '0.75rem',
        }}
      >
        {AI_CONFIG_PRESETS.map((p) => {
          // ── プリセット適用後のフォーム状態を仮想的に計算してコスト試算
          const applied: AiKyoshitsuConfig = {
            ...AI_KYOSHITSU_DEFAULTS,
            ...current,
            ...(p.values as Partial<AiKyoshitsuConfig>),
          };
          const cost = estimateAiCost(applied);
          const stage1Model = findAiModel(applied.stage1Model);
          const stage2Model = findAiModel(applied.stage2Model);

          // ── active 判定（主要 3 値の一致）
          const isActive =
            current.stage1Model === applied.stage1Model &&
            current.stage2Model === applied.stage2Model &&
            current.stage2MaxTokens === applied.stage2MaxTokens &&
            current.stage1TimeoutMs === applied.stage1TimeoutMs &&
            current.stage2TimeoutMs === applied.stage2TimeoutMs;

          // ── コスト警告（10円/回超で警告色）
          const costWarn = cost.totalJpy >= 10;
          // ── Gemini 共有プール混雑リスク（label 内の ⚠ で識別）
          const reliability =
            p.id === 'stable' ? 'high'
            : p.id === 'premium' ? 'mid'
            : 'risk';   // gemini-base は共有プール 429 リスクあり

          const reliabilityBadge =
            reliability === 'high' ? { label: '🛡️ 安定', color: '#065F46', bg: '#D1FAE5' }
            : reliability === 'mid'  ? { label: '🧪 実験的', color: '#92400E', bg: '#FEF3C7' }
            :                          { label: '⚠ 共有プール', color: '#92400E', bg: '#FEF3C7' };

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onApply(p.id)}
              disabled={disabled}
              aria-pressed={isActive}
              aria-label={`プリセット「${p.label}」を適用 ${isActive ? '（適用中）' : ''}`}
              style={{
                background:    isActive ? '#FFF7ED' : 'white',
                border:        `2px solid ${isActive ? '#FB923C' : '#E5E7EB'}`,
                borderRadius:  10,
                padding:       '12px 14px',
                textAlign:     'left',
                cursor:        disabled ? 'not-allowed' : 'pointer',
                opacity:       disabled ? 0.6 : 1,
                fontFamily:    'inherit',
                position:      'relative',
                transition:    'border-color 120ms, background 120ms, transform 120ms',
              }}
              onMouseEnter={(e) => { if (!disabled && !isActive) e.currentTarget.style.borderColor = '#FDBA74'; }}
              onMouseLeave={(e) => { if (!disabled && !isActive) e.currentTarget.style.borderColor = '#E5E7EB'; }}
            >
              {/* ── ヘッダ行：ラベル + 信頼性バッジ */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#1F2937', lineHeight: 1.3 }}>
                  {p.label}
                </span>
                <span
                  style={{
                    fontSize:     10,
                    fontWeight:   700,
                    padding:      '2px 6px',
                    borderRadius: 999,
                    background:   reliabilityBadge.bg,
                    color:        reliabilityBadge.color,
                    whiteSpace:   'nowrap',
                  }}
                >
                  {reliabilityBadge.label}
                </span>
              </div>

              {/* ── 主要パラメータ（grid 2 列） */}
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 4, fontSize: 11 }}>
                <span style={paramKey()}>Stage1</span>
                <span style={paramVal()}>{stage1Model?.label ?? applied.stage1Model}</span>

                <span style={paramKey()}>Stage2</span>
                <span style={paramVal()}>{stage2Model?.label ?? applied.stage2Model}</span>

                <span style={paramKey()}>合計時間</span>
                <span style={paramVal()}>
                  {Math.round((applied.stage1TimeoutMs + applied.stage2TimeoutMs) / 1000)} 秒
                  <span style={{ color: '#9CA3AF' }}>
                    {' '}（buffer {Math.max(0, 60 - Math.round((applied.stage1TimeoutMs + applied.stage2TimeoutMs) / 1000))}秒）
                  </span>
                </span>

                <span style={paramKey()}>最大tok</span>
                <span style={paramVal()}>{applied.stage2MaxTokens.toLocaleString()}</span>
              </div>

              {/* ── 1回コスト */}
              <div
                style={{
                  marginTop:    10,
                  padding:      '6px 10px',
                  borderRadius: 6,
                  background:   costWarn ? '#FEF2F2' : '#F0FDF4',
                  color:        costWarn ? '#991B1B' : '#14532D',
                  fontSize:     12,
                  fontWeight:   700,
                  display:      'flex',
                  justifyContent: 'space-between',
                  alignItems:   'center',
                }}
              >
                <span>1回コスト</span>
                <span style={{ fontSize: 13 }}>¥{cost.totalJpy.toFixed(2)}</span>
              </div>

              {/* ── 説明（キャプション） */}
              <p style={{ marginTop: 8, fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
                {p.description}
              </p>

              {/* ── active バッジ */}
              {isActive && (
                <span
                  style={{
                    position:   'absolute',
                    top:        8,
                    right:      8,
                    fontSize:   10,
                    fontWeight: 800,
                    padding:    '2px 6px',
                    borderRadius: 999,
                    background: '#FB923C',
                    color:      'white',
                    letterSpacing: 0.5,
                  }}
                >
                  ✓ 適用中
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function paramKey(): React.CSSProperties {
  return { color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' };
}
function paramVal(): React.CSSProperties {
  return { color: '#1F2937', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' };
}
