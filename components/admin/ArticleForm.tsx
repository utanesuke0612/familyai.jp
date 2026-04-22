'use client';

/**
 * components/admin/ArticleForm.tsx
 * familyai.jp — 記事作成・編集フォーム（Client Component）
 *
 * 機能:
 * - 全フィールドの入力
 * - Markdown 左右分割エディタ（入力 | リアルタイムプレビュー）
 * - 新規作成（POST）/ 更新（PUT）を自動判定
 * - バリデーション・エラー表示
 * - 保存後 /admin にリダイレクト
 */

import { useId, useRef, useState } from 'react';
import { useRouter }        from 'next/navigation';
import { ArticleBody }      from '@/components/article/ArticleBody';
import type { Article }     from '@/lib/db/schema';
import {
  FAMILY_ROLE_LABEL,
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
} from '@/shared';
import type { FamilyRole, ContentCategory, DifficultyLevel } from '@/shared';

// ─── 定数 ─────────────────────────────────────────────────────
const ROLES:      FamilyRole[]       = ['papa', 'mama', 'kids', 'senior', 'common'];
const CATEGORIES: ContentCategory[]  = ['image-gen', 'voice', 'education', 'housework'];
const LEVELS:     DifficultyLevel[]  = ['beginner', 'intermediate', 'advanced'];

// ─── 型 ───────────────────────────────────────────────────────
interface ArticleFormProps {
  /** 編集モード時は既存記事を渡す。undefined は新規作成モード。 */
  article?: Article;
}

// ─── ヘルパー ─────────────────────────────────────────────────
const dateToInput = (d: Date | null | undefined): string =>
  d ? new Date(d).toISOString().split('T')[0]! : '';

// ─── フォーム本体 ─────────────────────────────────────────────
export function ArticleForm({ article }: ArticleFormProps) {
  const router  = useRouter();
  const isEdit  = !!article;

  // ── State ─────────────────────────────────────────────────
  const [slug,            setSlug]            = useState(article?.slug            ?? '');
  const [title,           setTitle]           = useState(article?.title           ?? '');
  const [description,     setDescription]     = useState(article?.description     ?? '');
  const [body,            setBody]            = useState(article?.body            ?? '');
  const [roles,           setRoles]           = useState<FamilyRole[]>(
    (article?.roles ?? ['common']) as FamilyRole[],
  );
  const [categories,      setCategories]      = useState<ContentCategory[]>(
    (article?.categories ?? []) as ContentCategory[],
  );
  const [level,           setLevel]           = useState<DifficultyLevel>(
    (article?.level ?? 'beginner') as DifficultyLevel,
  );
  const [published,       setPublished]       = useState(article?.published       ?? false);
  const [publishedAt,     setPublishedAt]     = useState(dateToInput(article?.publishedAt));
  const [audioUrl,        setAudioUrl]        = useState(article?.audioUrl        ?? '');
  const [audioTranscript, setAudioTranscript] = useState(article?.audioTranscript ?? '');
  const [audioDurationSec,setAudioDurationSec]= useState(article?.audioDurationSec?.toString() ?? '');
  const [audioLanguage,   setAudioLanguage]   = useState(article?.audioLanguage   ?? '');
  const [thumbnailUrl,    setThumbnailUrl]    = useState(article?.thumbnailUrl    ?? '');
  const [isFeatured,      setIsFeatured]      = useState(article?.isFeatured      ?? false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [preview, setPreview] = useState<'split' | 'full'>('split');
  // Rev28 #HIGH-7: 送信失敗時に SR がエラーへ辿れるよう、バナーにフォーカス移動する
  const errorRef = useRef<HTMLDivElement | null>(null);

  // ── ロール / カテゴリ チェックボックス制御 ─────────────────
  function toggleRole(r: FamilyRole) {
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  }
  function toggleCategory(c: ContentCategory) {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  // ── 送信 ──────────────────────────────────────────────────
  function fail(msg: string): void {
    setError(msg);
    // エラー領域へフォーカス移動（role="alert" と合わせて SR に即読み上げさせる）
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!slug.trim())            return fail('スラッグは必須です');
    if (!title.trim())           return fail('タイトルは必須です');
    if (!body.trim())            return fail('本文は必須です');
    if (roles.length === 0)      return fail('ロールを1つ以上選択してください');
    if (categories.length === 0) return fail('カテゴリを1つ以上選択してください');

    setLoading(true);
    try {
      const payload = {
        slug:             slug.trim(),
        title:            title.trim(),
        description:      description.trim() || null,
        body:             body.trim(),
        roles,
        categories,
        level,
        published,
        publishedAt:      publishedAt || null,
        audioUrl:         audioUrl.trim()        || null,
        audioTranscript:  audioTranscript.trim() || null,
        audioDurationSec: audioDurationSec ? parseInt(audioDurationSec) : null,
        audioLanguage:    audioLanguage.trim()   || null,
        thumbnailUrl:     thumbnailUrl.trim()    || null,
        isFeatured,
      };

      const url    = isEdit ? `/api/admin/articles/${article!.slug}` : '/api/admin/articles';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const json = await res.json() as { error?: string };
      if (!res.ok) {
        fail(json.error ?? '保存に失敗しました');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      fail('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  // ── レンダリング ──────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit}>
      {/* エラーバナー（Rev28 #HIGH-7: SR 通知対応） */}
      {error && (
        <div
          ref={errorRef}
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          tabIndex={-1}
          style={{
            padding: '12px 16px', borderRadius: '8px', marginBottom: '1.5rem',
            background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', fontSize: '14px',
            outline: 'none',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '2rem' }}>

        {/* ── セクション: 基本情報 ── */}
        <Section title="基本情報">
          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* スラッグ */}
            <Field
              label="スラッグ（URL）"
              required
              hint={<>英数字とハイフンのみ。URL: /learn/{slug || '…'}</>}
            >
              {({ id, hintId }) => (
                <input
                  id={id}
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                  placeholder="article-slug-here"
                  readOnly={isEdit}
                  aria-describedby={hintId}
                  style={{ ...inputStyle, ...(isEdit ? { background: '#F9FAFB', cursor: 'not-allowed' } : {}) }}
                  required
                />
              )}
            </Field>

            {/* タイトル */}
            <Field label="タイトル" required>
              {({ id }) => (
                <input
                  id={id}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="記事タイトル"
                  style={inputStyle}
                  required
                />
              )}
            </Field>

            {/* 説明文 */}
            <Field label="説明文（SNS シェア時に表示）">
              {({ id }) => (
                <textarea
                  id={id}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="記事の簡単な説明（省略可）"
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              )}
            </Field>

            {/* ロール */}
            <FieldGroup label="対象ロール" required>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {ROLES.map((r) => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={roles.includes(r)}
                      onChange={() => toggleRole(r)}
                      style={{ accentColor: 'var(--color-orange)', width: '16px', height: '16px' }}
                    />
                    {FAMILY_ROLE_LABEL[r]}
                  </label>
                ))}
              </div>
            </FieldGroup>

            {/* カテゴリ */}
            <FieldGroup label="カテゴリ" required>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {CATEGORIES.map((c) => (
                  <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={categories.includes(c)}
                      onChange={() => toggleCategory(c)}
                      style={{ accentColor: 'var(--color-orange)', width: '16px', height: '16px' }}
                    />
                    {CATEGORY_LABEL[c]}
                  </label>
                ))}
              </div>
            </FieldGroup>

            {/* 難易度 / 公開設定 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <Field label="難易度">
                {({ id }) => (
                  <select
                    id={id}
                    value={level}
                    onChange={(e) => setLevel(e.target.value as DifficultyLevel)}
                    style={inputStyle}
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>{DIFFICULTY_LABEL[l]}</option>
                    ))}
                  </select>
                )}
              </Field>

              <Field label="公開日">
                {({ id }) => (
                  <input
                    id={id}
                    type="date"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    style={inputStyle}
                  />
                )}
              </Field>

              <FieldGroup label="ステータス">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 0' }}>
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    style={{ accentColor: 'var(--color-orange)', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px' }}>公開する</span>
                </label>
              </FieldGroup>

              <FieldGroup label="おすすめ記事">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 0' }}>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    style={{ accentColor: 'var(--color-orange)', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '14px' }}>トップおすすめに表示</span>
                </label>
              </FieldGroup>
            </div>
          </div>
        </Section>

        {/* ── セクション: 本文エディタ ── */}
        <Section
          title="本文（Markdown）"
          action={
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['split', 'full'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreview(mode)}
                  style={{
                    padding:      '4px 10px',
                    borderRadius: '6px',
                    border:       '1px solid #D1D5DB',
                    fontSize:     '12px',
                    background:   preview === mode ? 'var(--color-orange)' : 'white',
                    color:        preview === mode ? 'white' : '#374151',
                    cursor:       'pointer',
                  }}
                >
                  {mode === 'split' ? '分割表示' : '全画面入力'}
                </button>
              ))}
            </div>
          }
        >
          {preview === 'split' ? (
            <div
              className="grid gap-4 md:grid-cols-2 grid-cols-1"
              style={{ minHeight: '520px' }}
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={'## 見出し\n\n本文を Markdown で書いてください…'}
                aria-label="本文（Markdown 入力）"
                style={{
                  ...inputStyle,
                  fontFamily:  'ui-monospace, SFMono-Regular, monospace',
                  fontSize:    '13px',
                  lineHeight:  1.7,
                  resize:      'none',
                  height:      '520px',
                }}
              />
              <div style={{
                border:       '1px solid #D1D5DB',
                borderRadius: '8px',
                padding:      '1rem',
                background:   'white',
                overflowY:    'auto',
                height:       '520px',
              }}>
                {body.trim()
                  ? <ArticleBody content={body} />
                  : <p style={{ color: '#9CA3AF', fontSize: '14px' }}>プレビューがここに表示されます</p>
                }
              </div>
            </div>
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={'## 見出し\n\n本文を Markdown で書いてください…'}
              aria-label="本文（Markdown 入力）"
              style={{
                ...inputStyle,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                fontSize:   '13px',
                lineHeight: 1.7,
                resize:     'vertical',
                height:     '600px',
              }}
            />
          )}
        </Section>

        {/* ── セクション: メディア ── */}
        <Section title="メディア（任意）">
          <div style={{ display: 'grid', gap: '1rem' }}>
            <Field label="サムネイル画像 URL">
              {({ id }) => (
                <input
                  id={id}
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://…（Vercel Blob の URL）"
                  style={inputStyle}
                />
              )}
            </Field>

            <Field label="音声ファイル URL（MP3）">
              {({ id }) => (
                <input
                  id={id}
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://…（Vercel Blob の URL）"
                  style={inputStyle}
                />
              )}
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <Field label="音声の長さ（秒）">
                {({ id }) => (
                  <input
                    id={id}
                    type="number"
                    value={audioDurationSec}
                    onChange={(e) => setAudioDurationSec(e.target.value)}
                    placeholder="例: 240"
                    min={0}
                    style={inputStyle}
                  />
                )}
              </Field>
              <Field label="音声の言語コード">
                {({ id }) => (
                  <input
                    id={id}
                    type="text"
                    value={audioLanguage}
                    onChange={(e) => setAudioLanguage(e.target.value)}
                    placeholder="例: en / zh / ko"
                    maxLength={10}
                    style={inputStyle}
                  />
                )}
              </Field>
            </div>

            <Field label="音声トランスクリプト（SEO 用）">
              {({ id }) => (
                <textarea
                  id={id}
                  value={audioTranscript}
                  onChange={(e) => setAudioTranscript(e.target.value)}
                  placeholder="音声の文字起こし内容（省略可）"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              )}
            </Field>
          </div>
        </Section>

        {/* ── 送信ボタン ── */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingBottom: '2rem' }}>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            style={{
              padding:      '10px 24px',
              borderRadius: '8px',
              border:       '1px solid #D1D5DB',
              background:   'white',
              color:        '#374151',
              fontSize:     '14px',
              fontWeight:   600,
              cursor:       'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding:      '10px 32px',
              borderRadius: '8px',
              border:       'none',
              background:   loading ? '#9CA3AF' : 'var(--color-orange)',
              color:        'white',
              fontSize:     '14px',
              fontWeight:   700,
              cursor:       loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '保存中…' : isEdit ? '変更を保存' : '記事を作成'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── 補助コンポーネント ────────────────────────────────────────

function Section({
  title,
  action,
  children,
}: {
  title:    string;
  action?:  React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background:   'white',
      borderRadius: '12px',
      border:       '1px solid #E5E7EB',
      overflow:     'hidden',
    }}>
      <div style={{
        padding:        '14px 20px',
        borderBottom:   '1px solid #E5E7EB',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h2>
        {action}
      </div>
      <div style={{ padding: '1.25rem 1.5rem' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * 単一 input 向け Field（Rev28 #HIGH-6）。
 * 生成した id を render-prop で子に渡し、label[htmlFor] ↔ input[id] を一致させる。
 * checkbox/radio グループは FieldGroup を使うこと。
 */
function Field({
  label,
  required,
  hint,
  children,
}: {
  label:    string;
  required?: boolean;
  hint?:    React.ReactNode;
  children: (ids: { id: string; hintId?: string }) => React.ReactNode;
}) {
  const id     = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label
        htmlFor={id}
        style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}
      >
        {label}
        {required && <span style={{ color: 'var(--color-orange)', marginLeft: '4px' }}>*</span>}
      </label>
      {children({ id, hintId })}
      {hint && (
        <p id={hintId} style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * 複数入力（チェックボックス/ラジオ群）向け Field（Rev28 #HIGH-6）。
 * 単一 id を各 input に割り振れないため fieldset/legend パターンで labeling する。
 */
function FieldGroup({
  label,
  required,
  children,
}: {
  label:    string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
      <legend style={{ padding: 0, fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
        {label}
        {required && <span style={{ color: 'var(--color-orange)', marginLeft: '4px' }}>*</span>}
      </legend>
      {children}
    </fieldset>
  );
}

const inputStyle: React.CSSProperties = {
  width:        '100%',
  padding:      '9px 12px',
  borderRadius: '8px',
  border:       '1px solid #D1D5DB',
  fontSize:     '14px',
  // Rev26 #7: outline:none を削除（フォーカス可視性確保）。
  // ブラウザ標準の :focus-visible アウトラインが表示される。
  boxSizing:    'border-box',
  background:   'white',
};
