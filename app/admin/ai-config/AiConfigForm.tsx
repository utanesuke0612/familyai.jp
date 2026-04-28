/**
 * app/admin/ai-config/AiConfigForm.tsx
 * familyai.jp — AI設定フォーム メイン Client Component
 *
 * 状態管理（form / message / 保存処理）と、サブコンポーネントの
 * コンポジションを担当する薄いコンテナ。
 *
 * 構成（H4・Rev30 でファイル分割）:
 *   - parts.tsx          : 共通 UI 部品（Section/Field/Hint/Stat/etc）+ styles
 *   - PresetSwitcher.tsx : 🎁 プリセット切替
 *   - StageFields.tsx    : 🧠 Stage1 / 🎬 Stage2 / 💬 Chat フィールド
 *   - CostEstimator.tsx  : 💰 コスト試算
 *   - HistoryList.tsx    : 📜 変更履歴
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AI_CONFIG_PRESETS, AI_KYOSHITSU_DEFAULTS } from '@/shared';
import type { AiKyoshitsuConfig } from '@/shared/types';

import { Section, Field, btnPrimary, btnSecondary, inputStyle } from './parts';
import { PresetSwitcher } from './PresetSwitcher';
import { StageFields }    from './StageFields';
import { CostEstimator }  from './CostEstimator';
import { HistoryList, type HistoryItem } from './HistoryList';

interface AiConfigFormProps {
  effective: AiKyoshitsuConfig;
  dbPartial: Partial<AiKyoshitsuConfig>;
  history:   HistoryItem[];
}

export function AiConfigForm({ effective, dbPartial, history }: AiConfigFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage]   =
    useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // フォーム状態（DB 値があればそれを、なければ effective を初期値に）
  const [form, setForm] = useState<AiKyoshitsuConfig>(() => ({
    ...effective,
    ...(dbPartial as Partial<AiKyoshitsuConfig>),
  }));
  const [changeNote, setChangeNote] = useState('');

  // ── プリセット適用 ─────────────────────────────────────────
  function applyPreset(presetId: string) {
    const preset = AI_CONFIG_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setForm((prev) => ({ ...prev, ...preset.values } as AiKyoshitsuConfig));
    setChangeNote(`プリセット「${preset.label}」を適用`);
  }

  // ── 保存（PUT） ─────────────────────────────────────────────
  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    try {
      // dbPartial と差があるフィールドだけ送る（minimal payload）
      const payload: Record<string, unknown> = {};
      (Object.keys(form) as (keyof AiKyoshitsuConfig)[]).forEach((k) => {
        if (form[k] !== AI_KYOSHITSU_DEFAULTS[k]) payload[k] = form[k];
      });
      if (changeNote.trim()) payload.changeNote = changeNote.trim();

      const res = await fetch('/api/admin/ai-config', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setMessage({ kind: 'ok', text: '保存しました（即時反映）' });
        setChangeNote('');
        startTransition(() => router.refresh());
      } else {
        setMessage({ kind: 'err', text: json.error ?? '保存に失敗しました' });
      }
    } catch {
      setMessage({ kind: 'err', text: '通信エラーが発生しました' });
    } finally {
      setIsSaving(false);
    }
  }

  // ── リセット（DELETE） ───────────────────────────────────────
  async function handleReset() {
    if (!confirm('DBの設定を削除して、コードのDEFAULTS値に戻します。よろしいですか？')) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const res  = await fetch('/api/admin/ai-config', { method: 'DELETE' });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setMessage({ kind: 'ok', text: 'リセットしました' });
        setForm({ ...AI_KYOSHITSU_DEFAULTS });
        setChangeNote('');
        startTransition(() => router.refresh());
      } else {
        setMessage({ kind: 'err', text: json.error ?? 'リセットに失敗しました' });
      }
    } catch {
      setMessage({ kind: 'err', text: '通信エラーが発生しました' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* メッセージ */}
      {message && (
        <div
          style={{
            padding:      '0.75rem 1rem',
            borderRadius: 8,
            fontSize:     14,
            background:   message.kind === 'ok' ? '#D1FAE5' : '#FEE2E2',
            color:        message.kind === 'ok' ? '#065F46' : '#991B1B',
            border:       `1px solid ${message.kind === 'ok' ? '#6EE7B7' : '#FCA5A5'}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* プリセット切替 */}
      <PresetSwitcher onApply={applyPreset} disabled={isSaving} />

      {/* Stage1 / Stage2 / Chat フィールド */}
      <StageFields form={form} onChange={setForm} disabled={isSaving} />

      {/* コスト試算 */}
      <CostEstimator form={form} />

      {/* 変更メモ + 保存ボタン */}
      <Section title="💾 保存">
        <Field label="変更メモ（任意・履歴に残ります）">
          <input
            type="text"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            placeholder="例: タイムアウトを 50秒に延長"
            maxLength={500}
            disabled={isSaving}
            style={{ ...inputStyle, width: '100%' }}
          />
        </Field>
        <div
          style={{
            display:    'flex',
            gap:        '0.5rem',
            flexWrap:   'wrap',
            marginTop:  '0.75rem',
          }}
        >
          <button
            onClick={handleSave}
            disabled={isSaving || isPending}
            style={{ ...btnPrimary, opacity: isSaving ? 0.5 : 1 }}
          >
            {isSaving ? '⏳ 保存中…' : '💾 保存（即時反映）'}
          </button>
          <button
            onClick={handleReset}
            disabled={isSaving || isPending}
            style={btnSecondary}
          >
            🔄 デフォルトに戻す
          </button>
        </div>
      </Section>

      {/* 履歴 */}
      <HistoryList history={history} />
    </div>
  );
}
