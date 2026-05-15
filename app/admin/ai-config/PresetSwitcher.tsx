/**
 * app/admin/ai-config/PresetSwitcher.tsx
 * familyai.jp — AIチャット設定 プリセット比較カード（Client Component）
 *
 * Rev40: 旧 5 プリセット（stable / cheapest / balanced / quality / premium）→
 *        AI チャット用 3 プリセット（economy / balanced / quality）に再設計。
 *
 * UX 設計:
 *   - クリックで chatModel + chatMaxTokens + chatTemperature を一括適用
 *   - active 判定: 主要 3 値（model / maxTokens / temperature）が完全一致
 *   - 各カードに 1 回コスト目安と簡単な説明を表示
 */

'use client';

import { AI_CONFIG_PRESETS, findAiModel, estimateAiCost, AI_CHAT_DEFAULTS } from '@/shared';
import type { AiChatConfig } from '@/shared/types';

interface PresetSwitcherProps {
  /** 現在のフォーム状態（active 判定用） */
  current:   AiChatConfig;
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
          プリセット切替
        </h2>
        <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>
          クリックで一括適用。各カードに主要パラメータと 1 回コスト目安を表示。
        </p>
      </header>

      <div
        style={{
          padding:             '1rem 1.25rem',
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap:                 '0.75rem',
        }}
      >
        {AI_CONFIG_PRESETS.map((p) => {
          // ── プリセット適用後のフォーム状態を仮想的に計算してコスト試算
          const applied: AiChatConfig = {
            ...AI_CHAT_DEFAULTS,
            ...current,
            ...(p.config as Partial<AiChatConfig>),
          };
          const cost = estimateAiCost(applied);
          const model = findAiModel(applied.chatModel);

          // ── active 判定（主要 3 値の一致）
          const isActive =
            current.chatModel       === applied.chatModel &&
            current.chatMaxTokens   === applied.chatMaxTokens &&
            current.chatTemperature === applied.chatTemperature;

          // ── コスト警告（0.5 円/回超で警告色・チャットは Stage 生成より安い想定）
          const costWarn = cost.totalJpy >= 0.5;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onApply(p.id)}
              disabled={disabled}
              aria-pressed={isActive}
              aria-label={`プリセット「${p.label}」を適用 ${isActive ? '（適用中）' : ''}`}
              style={{
                background:    isActive ? 'var(--washi-deep)' : 'white',
                border:        `2px solid ${isActive ? 'var(--shu)' : '#E5E7EB'}`,
                borderRadius:  4,
                padding:       '12px 14px',
                textAlign:     'left',
                cursor:        disabled ? 'not-allowed' : 'pointer',
                opacity:       disabled ? 0.6 : 1,
                fontFamily:    'inherit',
                position:      'relative',
                transition:    'border-color 120ms, background 120ms, transform 120ms',
              }}
              onMouseEnter={(e) => { if (!disabled && !isActive) e.currentTarget.style.borderColor = 'var(--shu-soft)'; }}
              onMouseLeave={(e) => { if (!disabled && !isActive) e.currentTarget.style.borderColor = '#E5E7EB'; }}
            >
              {/* ── ヘッダ行：ラベル */}
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1F2937', lineHeight: 1.3 }}>
                  {p.label}
                </span>
              </div>

              {/* ── 主要パラメータ（grid 2 列） */}
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 4, fontSize: 11 }}>
                <span style={paramKey()}>モデル</span>
                <span style={paramVal()}>{model?.label ?? applied.chatModel}</span>

                <span style={paramKey()}>最大tok</span>
                <span style={paramVal()}>{applied.chatMaxTokens.toLocaleString()}</span>

                <span style={paramKey()}>temp</span>
                <span style={paramVal()}>{applied.chatTemperature.toFixed(1)}</span>
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
                <span style={{ fontSize: 13 }}>¥{cost.totalJpy.toFixed(3)}</span>
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
                    borderRadius: 4,
                    background: 'var(--shu)',
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
