/**
 * app/admin/ai-config/CostEstimator.tsx
 * familyai.jp — AI設定 月間コスト試算（コンパクトバー版）
 *
 * 旧版（Stat カード3つ + 月間入力欄）を、設定 Table の真下に置く帯型 UI に
 * 刷新。1回コストは Table フッターで既に表示しているため、ここは
 * 「月間リクエスト数 → 月額」の試算と、警告表示に専念する。
 *
 * 主な変更:
 *   - スライダ + 数値入力で月間リクエスト数を素早く調整
 *   - 月額が高額（5,000 円超）になった瞬間に warning カラー
 *   - hasUnknownModel 警告は同帯内で右端に小さく表示
 */

'use client';

import { useMemo, useState } from 'react';
import { estimateAiCost, estimateMonthlyCost } from '@/shared';
import type { AiKyoshitsuConfig } from '@/shared/types';

interface CostEstimatorProps {
  form: AiKyoshitsuConfig;
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
        💰 月間コスト試算
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
                background: active ? '#FF8C42' : 'white',
                color:      active ? 'white' : '#374151',
                border:     `1px solid ${active ? '#FF8C42' : '#D1D5DB'}`,
                borderRadius: 999,
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
          {isHigh && '⚠️ 月額 5,000 円を超えています。プリセット見直しを検討してください。'}
          {cost.hasUnknownModel && (
            <span style={{ marginLeft: isHigh ? 12 : 0 }}>
              ℹ️ 一部モデルが料金テーブルに無いため部分的な試算です（実コストはこれ以上の可能性）
            </span>
          )}
        </div>
      )}
    </section>
  );
}
