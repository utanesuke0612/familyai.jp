/**
 * app/admin/ai-config/CostEstimator.tsx
 * familyai.jp — AIチャット設定 月間コスト試算（コンパクトバー版）
 *
 * Rev40: 旧 Stage1+Stage2 のコスト計算 → AIチャット 1 回あたりのコストに刷新。
 * 想定入力 500 token + chatMaxTokens × 70% のコストを 1 回コストとして
 * 月間リクエスト数を掛けた月額を試算する。
 */

'use client';

import { useMemo, useState } from 'react';
import { estimateAiCost, estimateMonthlyCost } from '@/shared';
import type { AiChatConfig } from '@/shared/types';

interface CostEstimatorProps {
  form: AiChatConfig;
}

const PRESET_VOLUMES = [100, 1000, 5000, 10000];

export function CostEstimator({ form }: CostEstimatorProps) {
  const cost = useMemo(() => estimateAiCost(form), [form]);
  const [monthlyRequests, setMonthlyRequests] = useState(1000);
  const monthlyCost = useMemo(
    () => estimateMonthlyCost(form, monthlyRequests),
    [form, monthlyRequests],
  );
  const isHigh = monthlyCost >= 5_000;

  return (
    <section
      style={{
        background:    isHigh ? '#FEF2F2' : 'white',
        borderRadius:  12,
        border:        `1px solid ${isHigh ? '#FECACA' : '#E5E7EB'}`,
        padding:       '0.875rem 1.25rem',
        display:       'flex',
        flexWrap:      'wrap',
        alignItems:    'center',
        gap:           '0.75rem',
        transition:    'background 200ms, border-color 200ms',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>
        月間コスト試算
      </span>

      {/* リクエスト数調整 — preset chip 群 */}
      <div style={{ display: 'flex', gap: 4 }}>
        {PRESET_VOLUMES.map((v) => {
          const active = monthlyRequests === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setMonthlyRequests(v)}
              aria-pressed={active}
              aria-label={`月間 ${v.toLocaleString()} リクエスト`}
              style={{
                padding:    '4px 10px',
                fontSize:   12,
                fontWeight: 600,
                background: active ? 'var(--shu)' : 'white',
                color:      active ? 'white' : '#374151',
                border:     `1px solid ${active ? 'var(--shu)' : '#D1D5DB'}`,
                borderRadius: 4,
                cursor:     'pointer',
              }}
            >
              {v.toLocaleString()}
            </button>
          );
        })}
      </div>

      {/* 数値入力（任意の値） */}
      <input
        type="number"
        value={monthlyRequests}
        onChange={(e) => setMonthlyRequests(Math.max(1, Number(e.target.value) || 1))}
        min={1}
        max={1_000_000}
        step={100}
        aria-label="月間リクエスト数（任意指定）"
        style={{
          width:        110,
          padding:      '4px 8px',
          fontSize:     13,
          borderRadius: 6,
          border:       '1px solid #D1D5DB',
          background:   'white',
          color:        '#1F2937',
        }}
      />
      <span style={{ fontSize: 12, color: '#6B7280' }}>req/月</span>

      {/* arrow */}
      <span aria-hidden="true" style={{ color: '#9CA3AF', fontSize: 18 }}>→</span>

      {/* 月額 */}
      <span
        style={{
          fontSize:    18,
          fontWeight:  800,
          color:       isHigh ? '#991B1B' : '#0F172A',
          marginLeft:  'auto',
        }}
      >
        月額 ¥{monthlyCost.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}
      </span>

      {/* 警告 */}
      {(cost.hasUnknownModel || isHigh) && (
        <div
          role="status"
          style={{
            flexBasis:    '100%',
            fontSize:     11,
            color:        isHigh ? '#991B1B' : '#9A3412',
            paddingTop:   8,
            borderTop:    '1px dashed rgba(0,0,0,0.08)',
          }}
        >
          {isHigh && '月額 5,000 円を超えています。プリセット見直しを検討してください。'}
          {cost.hasUnknownModel && (
            <span style={{ marginLeft: isHigh ? 12 : 0 }}>
              一部モデルが料金テーブルに無いため部分的な試算です（実コストはこれ以上の可能性）
            </span>
          )}
        </div>
      )}
    </section>
  );
}
