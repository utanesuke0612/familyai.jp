/**
 * app/admin/ai-config/AiConfigForm.tsx
 * familyai.jp — AI設定フォーム（Client Component）
 *
 * 機能:
 *  - 各フィールドの入力（モデル選択 / 数値入力）
 *  - プリセット切替（最安・標準・品質重視・最高品質）
 *  - 保存（PUT）/ リセット（DELETE）
 *  - リアルタイムコスト試算
 *  - 変更履歴表示
 */

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AI_MODEL_OPTIONS,
  AI_CONFIG_PRESETS,
  AI_CONFIG_RANGES,
  AI_KYOSHITSU_DEFAULTS,
  estimateAiCost,
  estimateMonthlyCost,
} from '@/shared';
import type { AiKyoshitsuConfig } from '@/shared/types';

interface HistoryItem {
  id:         number;
  config:     Record<string, unknown>;
  changedAt:  string;
  changedBy:  string;
  changeNote: string;
}

interface AiConfigFormProps {
  effective: AiKyoshitsuConfig;
  dbPartial: Partial<AiKyoshitsuConfig>;
  history:   HistoryItem[];
}

export function AiConfigForm({ effective, dbPartial, history }: AiConfigFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving]   = useState(false);
  const [message, setMessage]     = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // フォーム状態（DB 値があればそれを、なければ effective を初期値に）
  const [form, setForm] = useState<AiKyoshitsuConfig>(() => ({
    ...effective,
    ...(dbPartial as Partial<AiKyoshitsuConfig>),
  }));

  const [changeNote, setChangeNote] = useState('');

  // リアルタイムコスト試算
  const cost = useMemo(() => estimateAiCost(form), [form]);
  const [monthlyRequests, setMonthlyRequests] = useState(1000);
  const monthlyCost = useMemo(
    () => estimateMonthlyCost(form, monthlyRequests),
    [form, monthlyRequests],
  );

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
      const json = await res.json() as { ok: boolean; error?: string };
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
      const res = await fetch('/api/admin/ai-config', { method: 'DELETE' });
      const json = await res.json() as { ok: boolean; error?: string };
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
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 8, fontSize: 14,
          background: message.kind === 'ok' ? '#D1FAE5' : '#FEE2E2',
          color:      message.kind === 'ok' ? '#065F46' : '#991B1B',
          border:     `1px solid ${message.kind === 'ok' ? '#6EE7B7' : '#FCA5A5'}`,
        }}>
          {message.text}
        </div>
      )}

      {/* プリセット */}
      <Section title="🎁 プリセット切替">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {AI_CONFIG_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              disabled={isSaving}
              style={{
                padding: '0.5rem 1rem', borderRadius: 8, fontSize: 13,
                background: 'white', border: '1px solid #D1D5DB', cursor: 'pointer',
              }}
              title={p.description}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Stage 1 設定 */}
      <Section title="🧠 Stage 1（テーマ詳細化・JSON設計）">
        <Field label="モデル">
          <ModelSelect
            value={form.stage1Model}
            onChange={(v) => setForm({ ...form, stage1Model: v })}
            disabled={isSaving}
          />
          <Hint>デフォルト: <code>{AI_KYOSHITSU_DEFAULTS.stage1Model}</code></Hint>
        </Field>
        <Field label={`タイムアウト（${AI_CONFIG_RANGES.stage1TimeoutMs.min}〜${AI_CONFIG_RANGES.stage1TimeoutMs.max} ms）`}>
          <NumberInput
            value={form.stage1TimeoutMs}
            onChange={(v) => setForm({ ...form, stage1TimeoutMs: v })}
            min={AI_CONFIG_RANGES.stage1TimeoutMs.min}
            max={AI_CONFIG_RANGES.stage1TimeoutMs.max}
            step={500}
            disabled={isSaving}
          />
          <Hint>デフォルト: {AI_KYOSHITSU_DEFAULTS.stage1TimeoutMs} ms</Hint>
        </Field>
      </Section>

      {/* Stage 2 設定 */}
      <Section title="🎬 Stage 2（HTML生成）">
        <Field label="モデル">
          <ModelSelect
            value={form.stage2Model}
            onChange={(v) => setForm({ ...form, stage2Model: v })}
            disabled={isSaving}
          />
          <Hint>デフォルト: <code>{AI_KYOSHITSU_DEFAULTS.stage2Model}</code></Hint>
        </Field>
        <Field label={`タイムアウト（${AI_CONFIG_RANGES.stage2TimeoutMs.min}〜${AI_CONFIG_RANGES.stage2TimeoutMs.max} ms）`}>
          <NumberInput
            value={form.stage2TimeoutMs}
            onChange={(v) => setForm({ ...form, stage2TimeoutMs: v })}
            min={AI_CONFIG_RANGES.stage2TimeoutMs.min}
            max={AI_CONFIG_RANGES.stage2TimeoutMs.max}
            step={1000}
            disabled={isSaving}
          />
          <Hint>Vercel 60秒制限を考慮し最大 58000 まで。デフォルト: {AI_KYOSHITSU_DEFAULTS.stage2TimeoutMs} ms</Hint>
        </Field>
        <Field label={`最大トークン（${AI_CONFIG_RANGES.stage2MaxTokens.min}〜${AI_CONFIG_RANGES.stage2MaxTokens.max}）`}>
          <NumberInput
            value={form.stage2MaxTokens}
            onChange={(v) => setForm({ ...form, stage2MaxTokens: v })}
            min={AI_CONFIG_RANGES.stage2MaxTokens.min}
            max={AI_CONFIG_RANGES.stage2MaxTokens.max}
            step={500}
            disabled={isSaving}
          />
          <Hint>大きいほど詳細だが時間とコストがかかる。デフォルト: {AI_KYOSHITSU_DEFAULTS.stage2MaxTokens}</Hint>
        </Field>
        <Field label={`Temperature（${AI_CONFIG_RANGES.stage2Temperature.min}〜${AI_CONFIG_RANGES.stage2Temperature.max}）`}>
          <NumberInput
            value={form.stage2Temperature}
            onChange={(v) => setForm({ ...form, stage2Temperature: v })}
            min={AI_CONFIG_RANGES.stage2Temperature.min}
            max={AI_CONFIG_RANGES.stage2Temperature.max}
            step={0.1}
            disabled={isSaving}
          />
          <Hint>低いほど確定的。デフォルト: {AI_KYOSHITSU_DEFAULTS.stage2Temperature}</Hint>
        </Field>
      </Section>

      {/* チャットモデル */}
      <Section title="💬 AIチャット（既定モデル）">
        <Field label="モデル">
          <ModelSelect
            value={form.chatModel}
            onChange={(v) => setForm({ ...form, chatModel: v })}
            disabled={isSaving}
          />
          <Hint>デフォルト: <code>{AI_KYOSHITSU_DEFAULTS.chatModel}</code></Hint>
        </Field>
      </Section>

      {/* コスト試算 */}
      <Section title="💰 コスト試算（現在のフォーム値・推定）">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <Stat label="1回コスト"   value={`${cost.totalJpy.toFixed(2)} 円`} />
          <Stat label="Stage1合計"  value={`${(cost.stage1InputJpy + cost.stage1OutputJpy).toFixed(2)} 円`} />
          <Stat label="Stage2合計"  value={`${(cost.stage2InputJpy + cost.stage2OutputJpy).toFixed(2)} 円`} />
        </div>
        {cost.hasUnknownModel && (
          <Hint>※ 一部モデルが料金テーブルに無いため部分的な試算です</Hint>
        )}
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#374151' }}>月間リクエスト数:</span>
          <input
            type="number"
            value={monthlyRequests}
            onChange={(e) => setMonthlyRequests(Math.max(1, Number(e.target.value) || 1))}
            style={inputStyle}
          />
          <span style={{ fontSize: 13, color: '#374151' }}>
            → 月額 <strong>{monthlyCost.toLocaleString('ja-JP', { maximumFractionDigits: 0 })} 円</strong>
          </span>
        </div>
      </Section>

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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
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
      <Section title="📜 変更履歴（直近10件）">
        {history.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6B7280' }}>まだ変更履歴はありません</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {history.map((h) => (
              <div key={h.id} style={{
                padding: '0.75rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>
                    {new Date(h.changedAt).toLocaleString('ja-JP')}
                  </span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{h.changedBy || '-'}</span>
                </div>
                {h.changeNote && (
                  <div style={{ marginTop: 4, fontSize: 13, color: '#374151' }}>
                    📝 {h.changeNote}
                  </div>
                )}
                <pre style={{
                  marginTop: 8, fontSize: 11, background: 'white', padding: '0.5rem',
                  borderRadius: 4, border: '1px solid #E5E7EB', overflow: 'auto', maxHeight: 120,
                }}>
                  {JSON.stringify(h.config, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── サブコンポーネント ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: 'white', borderRadius: 12, padding: '1.25rem', border: '1px solid #E5E7EB' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: '0.75rem' }}>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ marginTop: 4, fontSize: 11, color: '#6B7280' }}>{children}</p>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#F9FAFB', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #E5E7EB' }}>
      <div style={{ fontSize: 11, color: '#6B7280' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>{value}</div>
    </div>
  );
}

function ModelSelect({
  value, onChange, disabled,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{ ...inputStyle, width: '100%' }}
    >
      {AI_MODEL_OPTIONS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}（{m.note}・速度{m.speed}）
        </option>
      ))}
    </select>
  );
}

function NumberInput({
  value, onChange, min, max, step, disabled,
}: {
  value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; disabled?: boolean;
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

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', fontSize: 14, borderRadius: 6,
  border: '1px solid #D1D5DB', background: 'white', color: '#1F2937',
};

const btnPrimary: React.CSSProperties = {
  padding: '0.625rem 1.25rem', fontSize: 14, fontWeight: 700, color: 'white',
  background: '#FF8C42', border: 'none', borderRadius: 8, cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '0.625rem 1.25rem', fontSize: 14, fontWeight: 600, color: '#374151',
  background: 'white', border: '1px solid #D1D5DB', borderRadius: 8, cursor: 'pointer',
};
