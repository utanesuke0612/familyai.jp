/**
 * app/admin/ai-config/HistoryList.tsx
 * familyai.jp — AI設定 変更履歴表示（Client Component）
 *
 * H4（Rev30）: AiConfigForm.tsx 分割。直近10件の変更履歴を表示する。
 */

'use client';

import { Section } from './parts';

export interface HistoryItem {
  id:         number;
  config:     Record<string, unknown>;
  changedAt:  string;
  changedBy:  string;
  changeNote: string;
}

interface HistoryListProps {
  history: HistoryItem[];
}

export function HistoryList({ history }: HistoryListProps) {
  return (
    <Section title="📜 変更履歴（直近10件）">
      {history.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6B7280' }}>まだ変更履歴はありません</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {history.map((h) => (
            <div
              key={h.id}
              style={{
                padding:      '0.75rem',
                background:   '#F9FAFB',
                border:       '1px solid #E5E7EB',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  flexWrap:       'wrap',
                  gap:            '0.5rem',
                }}
              >
                <span style={{ fontSize: 13, color: '#6B7280' }}>
                  {new Date(h.changedAt).toLocaleString('ja-JP')}
                </span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {h.changedBy || '-'}
                </span>
              </div>
              {h.changeNote && (
                <div style={{ marginTop: 4, fontSize: 13, color: '#374151' }}>
                  📝 {h.changeNote}
                </div>
              )}
              <pre
                style={{
                  marginTop:    8,
                  fontSize:     11,
                  background:   'white',
                  padding:      '0.5rem',
                  borderRadius: 4,
                  border:       '1px solid #E5E7EB',
                  overflow:     'auto',
                  maxHeight:    120,
                }}
              >
                {JSON.stringify(h.config, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
