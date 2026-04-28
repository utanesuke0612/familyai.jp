/**
 * app/admin/ai-config/PresetSwitcher.tsx
 * familyai.jp — AI設定 プリセット切替（Client Component）
 *
 * H4（Rev30）: AiConfigForm.tsx 分割。プリセット切替ボタン群を独立化。
 * クリックすると親フォームの値を一括書き換えする。
 */

'use client';

import { AI_CONFIG_PRESETS } from '@/shared';
import { Section } from './parts';

interface PresetSwitcherProps {
  /** プリセット適用ハンドラ。preset.id を受け取る */
  onApply:   (presetId: string) => void;
  disabled?: boolean;
}

export function PresetSwitcher({ onApply, disabled }: PresetSwitcherProps) {
  return (
    <Section title="🎁 プリセット切替">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {AI_CONFIG_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onApply(p.id)}
            disabled={disabled}
            style={{
              padding:      '0.5rem 1rem',
              borderRadius: 8,
              fontSize:     13,
              background:   'white',
              border:       '1px solid #D1D5DB',
              cursor:       'pointer',
            }}
            title={p.description}
          >
            {p.label}
          </button>
        ))}
      </div>
    </Section>
  );
}
