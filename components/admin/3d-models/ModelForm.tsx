'use client';

/**
 * components/admin/3d-models/ModelForm.tsx
 * familyai.jp / 管理画面 — 3D モデル 新規 / 編集 共通フォーム
 *
 * 新規 (mode='create'): /admin/3d-models/new
 * 編集 (mode='edit'):   /admin/3d-models/[slug]/edit
 *
 * 機能:
 * - 基本メタ情報入力（slug / title / description / subject / grade / isFeatured）
 * - アセットアップロード（GLB / USDZ / Thumbnail）by BlobUploadInput
 * - 出典・ライセンス
 * - 公開トグル
 * - 保存（POST or PUT）→ プレビュー or 一覧へ
 *
 * 段階 D で HotspotEditor が追加される。
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Tutor3dSubject, Tutor3dGrade, Tutor3dHotspot } from '@/shared';
import { TUTOR3D_SUBJECT_LABEL, TUTOR3D_SUBJECTS, TUTOR3D_GRADE_LABEL, TUTOR3D_GRADES } from '@/shared';
import { BlobUploadInput } from './BlobUploadInput';
import { HotspotEditor }   from './HotspotEditor';

export type ModelFormMode = 'create' | 'edit';

export interface ModelFormInitial {
  slug:         string;
  title:        string;
  description:  string;
  subject:      Tutor3dSubject;
  grade:        Tutor3dGrade;
  glbUrl:       string;
  usdzUrl:      string | null;
  thumbnailUrl: string | null;
  hotspots:     Tutor3dHotspot[];
  attribution:  string;
  license:      string;
  sourceUrl:    string | null;
  published:    boolean;
  isFeatured:   boolean;
}

export interface ModelFormProps {
  mode:     ModelFormMode;
  /** 編集モード時の初期値（新規時は空） */
  initial?: Partial<ModelFormInitial>;
  /** 編集モード時の slug（URL から取得） */
  originalSlug?: string;
}

const EMPTY_INITIAL: ModelFormInitial = {
  slug:         '',
  title:        '',
  description:  '',
  subject:      'biology',
  grade:        'elem-high',
  glbUrl:       '',
  usdzUrl:      null,
  thumbnailUrl: null,
  hotspots:     [],
  attribution:  '',
  license:      'CC0',
  sourceUrl:    null,
  published:    false,
  isFeatured:   false,
};

export function ModelForm({ mode, initial, originalSlug }: ModelFormProps) {
  const router = useRouter();
  const base: ModelFormInitial = { ...EMPTY_INITIAL, ...initial };

  const [slug,         setSlug]         = useState(base.slug);
  const [title,        setTitle]        = useState(base.title);
  const [description,  setDescription]  = useState(base.description);
  const [subject,      setSubject]      = useState<Tutor3dSubject>(base.subject);
  const [grade,        setGrade]        = useState<Tutor3dGrade>(base.grade);
  const [glbUrl,       setGlbUrl]       = useState<string>(base.glbUrl);
  const [usdzUrl,      setUsdzUrl]      = useState<string | null>(base.usdzUrl);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(base.thumbnailUrl);
  const [attribution,  setAttribution]  = useState(base.attribution);
  const [license,      setLicense]      = useState(base.license);
  const [sourceUrl,    setSourceUrl]    = useState<string>(base.sourceUrl ?? '');
  const [published,    setPublished]    = useState(base.published);
  const [isFeatured,   setIsFeatured]   = useState(base.isFeatured);

  // hotspots: HotspotEditor で 3D 上クリック採取・リスト編集可
  const [hotspots, setHotspots] = useState<Tutor3dHotspot[]>(base.hotspots);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  // slug 入力に使う識別子（編集モードでは固定）
  const effectiveSlug = mode === 'edit' ? (originalSlug ?? base.slug) : slug;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!effectiveSlug || !/^[a-z0-9-]+$/.test(effectiveSlug)) {
      setError('slug は英小文字・数字・ハイフンのみで入力してください');
      return;
    }
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    if (!glbUrl) {
      setError('GLB ファイルをアップロードしてください');
      return;
    }

    setSaving(true);
    try {
      const body = {
        slug:         effectiveSlug,
        title:        title.trim(),
        description:  description.trim(),
        subject,
        grade,
        glbUrl,
        usdzUrl:      usdzUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        hotspots,
        attribution:  attribution.trim(),
        license:      license.trim(),
        sourceUrl:    sourceUrl.trim() || null,
        published,
        isFeatured,
      };

      const url    = mode === 'create' ? '/api/admin/3d-models' : `/api/admin/3d-models/${effectiveSlug}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = (j as { error?: { message?: string } }).error?.message
          ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // 成功 → プレビュー画面へ
      router.push(`/admin/3d-models/${effectiveSlug}/preview`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 880 }}>
      {error && (
        <div role="alert" style={errorBoxStyle}>
          ⚠️ {error}
        </div>
      )}

      {/* ── 基本情報 ──────────────────────────────────── */}
      <Section title="📋 基本情報">
        <Field label="slug" required hint="URL の一部になる識別子（例: solar-system）">
          <input
            type="text"
            value={effectiveSlug}
            onChange={(e) => mode === 'create' && setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            disabled={mode === 'edit'}
            placeholder="solar-system"
            style={inputStyle}
            required
            pattern="[a-z0-9\-]+"
          />
        </Field>

        <Field label="タイトル" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="太陽系"
            style={inputStyle}
            required
            maxLength={200}
          />
        </Field>

        <Field label="説明文" hint="カタログカードと SEO meta に使われる">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="太陽と8つの惑星が…"
            rows={3}
            style={textareaStyle}
            maxLength={2000}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Field label="サブカテゴリ" required>
            <select value={subject} onChange={(e) => setSubject(e.target.value as Tutor3dSubject)} style={selectStyle}>
              {TUTOR3D_SUBJECTS.map((s) => (
                <option key={s} value={s}>{TUTOR3D_SUBJECT_LABEL[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="学年" required>
            <select value={grade} onChange={(e) => setGrade(e.target.value as Tutor3dGrade)} style={selectStyle}>
              {TUTOR3D_GRADES.map((g) => (
                <option key={g} value={g}>{TUTOR3D_GRADE_LABEL[g]}</option>
              ))}
            </select>
          </Field>
        </div>

        <CheckboxField
          checked={isFeatured}
          onChange={setIsFeatured}
          label="⭐ おすすめモデルとして表示"
          hint="カタログで最上段に固定表示される"
        />
      </Section>

      {/* ── アセットファイル ────────────────────────────────── */}
      <Section title="📤 アセットファイル">
        <BlobUploadInput
          slug={effectiveSlug}
          kind="glb"
          value={glbUrl || null}
          onChange={(url) => setGlbUrl(url ?? '')}
        />
        <div style={{ height: 14 }} />
        <BlobUploadInput
          slug={effectiveSlug}
          kind="usdz"
          value={usdzUrl}
          onChange={setUsdzUrl}
        />
        <div style={{ height: 14 }} />
        <BlobUploadInput
          slug={effectiveSlug}
          kind="thumbnail"
          value={thumbnailUrl}
          onChange={setThumbnailUrl}
        />
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 12 }}>
          💡 slug を先に入力するとアップロードが有効になります。
          ファイル名は <code>3d-models/&#123;slug&#125;-&#123;hash&#125;.glb</code> 形式で
          自動命名され、cache-busting されます。
        </p>
      </Section>

      {/* ── ホットスポット（段階 D-1: 3D 上クリック採取 UI） ── */}
      <Section title={`🎯 ホットスポット（${hotspots.length} 件）`}>
        <HotspotEditor
          glbUrl={glbUrl || undefined}
          hotspots={hotspots}
          onChange={setHotspots}
        />
      </Section>

      {/* ── 出典・ライセンス ────────────────────────────────── */}
      <Section title="📜 出典・ライセンス">
        <Field label="Attribution" hint="例: AI Coding Agent 生成 / Smithsonian Institution 等">
          <input
            type="text"
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            style={inputStyle}
            maxLength={800}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Field label="License">
            <select value={license} onChange={(e) => setLicense(e.target.value)} style={selectStyle}>
              <option value="CC0">CC0 (Public Domain)</option>
              <option value="CC BY 4.0">CC BY 4.0</option>
              <option value="CC BY-SA 4.0">CC BY-SA 4.0</option>
              <option value="CC BY-NC 4.0">CC BY-NC 4.0</option>
              <option value="Smithsonian Open Access">Smithsonian Open Access</option>
              <option value="Custom">その他（attribution に明記）</option>
            </select>
          </Field>
          <Field label="Source URL" hint="出典元の URL（任意）">
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://3d.si.edu/..."
              style={inputStyle}
            />
          </Field>
        </div>
      </Section>

      {/* ── 公開設定 ─────────────────────────────────────── */}
      <Section title="🚦 公開設定">
        <CheckboxField
          checked={published}
          onChange={setPublished}
          label="✅ 公開する"
          hint="チェックを外すと非公開（admin プレビューのみ閲覧可能）"
        />
      </Section>

      {/* ── アクション ───────────────────────────────────── */}
      <div style={actionBarStyle}>
        <Link href="/admin/3d-models" style={cancelBtnStyle}>← キャンセル</Link>
        <button type="submit" disabled={saving} style={saveBtnStyle(saving)}>
          {saving ? '💾 保存中…' : (mode === 'create' ? '💾 作成して保存' : '💾 変更を保存')}
        </button>
      </div>
    </form>
  );
}

// ── 小さい部品 ───────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24, padding: 20, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </section>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        {label}{required && <span style={{ color: '#DC2626' }}> *</span>}
      </div>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>{hint}</p>}
    </label>
  );
}

function CheckboxField({ checked, onChange, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2 }}
      />
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{hint}</div>}
      </div>
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB',
  borderRadius: 8, fontSize: 14, background: '#fff',
};
const textareaStyle: React.CSSProperties = { ...inputStyle, fontFamily: 'inherit', resize: 'vertical' };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
const errorBoxStyle: React.CSSProperties = {
  padding: 12, background: '#FEE2E2', border: '1px solid #FCA5A5',
  borderRadius: 8, color: '#991B1B', marginBottom: 16, fontSize: 14,
};
const actionBarStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: 16, background: '#F9FAFB', borderRadius: 12, gap: 12, flexWrap: 'wrap',
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 20px', background: '#fff', color: '#374151',
  border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14,
  fontWeight: 600, textDecoration: 'none',
};
function saveBtnStyle(saving: boolean): React.CSSProperties {
  return {
    padding: '10px 24px', background: saving ? '#9CA3AF' : '#3B82F6', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
    cursor: saving ? 'not-allowed' : 'pointer',
  };
}
