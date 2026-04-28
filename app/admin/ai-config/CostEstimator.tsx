/**
 * app/admin/ai-config/CostEstimator.tsx
 * familyai.jp — AI設定 コスト試算表示（Client Component）
 *
 * H4（Rev30）: AiConfigForm.tsx 分割。フォームの現在値から
 * 1回コスト・Stage1/Stage2 別・月間コストを表示する。
 */

'use client';

import { useMemo, useState } from 'react';
import { estimateAiCost, estimateMonthlyCost } from '@/shared';
import type { AiKyoshitsuConfig } from '@/shared/types';
import { Section, Hint, Stat, inputStyle } from './parts';

interface CostEstimatorProps {
  form: AiKyoshitsuConfig;
}

export function CostEstimator({ form }: CostEstimatorProps) {
  const cost = useMemo(() => estimateAiCost(form), [form]);
  const [monthlyRequests, setMonthlyRequests] = useState(1000);
  const monthlyCost = useMemo(
    () => estimateMonthlyCost(form, monthlyRequests),
    [form, monthlyRequests],
  );

  return (
    <Section title="💰 コスト試算（現在のフォーム値・推定）">
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap:                 '0.75rem',
        }}
      >
        <Stat label="1回コスト"  value={`${cost.totalJpy.toFixed(2)} 円`} />
        <Stat
          label="Stage1合計"
          value={`${(cost.stage1InputJpy + cost.stage1OutputJpy).toFixed(2)} 円`}
        />
        <Stat
          label="Stage2合計"
          value={`${(cost.stage2InputJpy + cost.stage2OutputJpy).toFixed(2)} 円`}
        />
      </div>

      {cost.hasUnknownModel && (
        <Hint>※ 一部モデルが料金テーブルに無いため部分的な試算です</Hint>
      )}

      <div
        style={{
          marginTop:   '1rem',
          display:     'flex',
          alignItems:  'center',
          gap:         '0.75rem',
          flexWrap:    'wrap',
        }}
      >
        <span style={{ fontSize: 13, color: '#374151' }}>月間リクエスト数:</span>
        <input
          type="number"
          value={monthlyRequests}
          onChange={(e) => setMonthlyRequests(Math.max(1, Number(e.target.value) || 1))}
          style={inputStyle}
        />
        <span style={{ fontSize: 13, color: '#374151' }}>
          → 月額{' '}
          <strong>
            {monthlyCost.toLocaleString('ja-JP', { maximumFractionDigits: 0 })} 円
          </strong>
        </span>
      </div>
    </Section>
  );
}
