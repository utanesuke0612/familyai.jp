'use client';

/**
 * components/admin/AdminHtmlPageManager.tsx
 * familyai.jp — HTML ページ管理（アップロード + 一覧）
 */

import { useState, useRef, useCallback } from 'react';

interface HtmlPageRow {
  id:          string;
  slug:        string;
  title:       string;
  blobUrl:     string;
  hasPassword: boolean;
  createdAt:   string;
}

interface Props {
  initialPages: HtmlPageRow[];
}


export function AdminHtmlPageManager({ initialPages }: Props) {
  const [pages,    setPages]    = useState<HtmlPageRow[]>(initialPages);
  const [slug,     setSlug]     = useState('');
  const [title,    setTitle]    = useState('');
  const [password, setPassword] = useState('');
  const [file,     setFile]     = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied,   setCopied]   = useState<string | null>(null);
  // パスワード管理
  const [pwEditId,  setPwEditId]  = useState<string | null>(null);
  const [pwInput,   setPwInput]   = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState<string | null>(null);

  // ─── ファイル選択 ─────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.html')) {
      setError('.html ファイルのみアップロードできます');
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setError('ファイルサイズは 2MB 以下にしてください');
      return;
    }
    setFile(f);
    setError(null);
    // タイトル未入力なら filename から自動設定
    if (!title) setTitle(f.name.replace(/\.html$/i, ''));
  }, [title]);

  // ─── アップロード & 登録 ──────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!slug.trim())  { setError('スラッグを入力してください'); return; }
    if (!title.trim()) { setError('タイトルを入力してください'); return; }
    if (!file)         { setError('HTML ファイルを選択してください'); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError('スラッグは英小文字・数字・ハイフンのみ使用できます');
      return;
    }

    setProgress(10); // 開始を示す
    try {
      // FormData でサーバーに送信 → サーバーが Blob に put()
      const fd = new FormData();
      fd.append('file',  file);
      fd.append('slug',  slug.trim());
      fd.append('title', title.trim());
      if (password.trim()) fd.append('password', password.trim());

      setProgress(30);

      const res  = await fetch('/api/admin/html-pages/upload', {
        method: 'POST',
        body:   fd,
        // Content-Type は FormData が自動設定するため指定しない
      });

      setProgress(90);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'アップロードに失敗しました');
        setProgress(null);
        return;
      }

      setProgress(100);
      setPages((prev) => [data.data, ...prev]);
      setSlug('');
      setTitle('');
      setPassword('');
      setFile(null);
      setSuccess(`公開 URL: ${window.location.origin}/pages/${slug.trim()}`);
      setTimeout(() => setProgress(null), 600);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
      setProgress(null);
    }
  };

  // ─── 削除 ─────────────────────────────────────────────────
  const handleDelete = async (id: string, pageSlug: string) => {
    if (!window.confirm(`"${pageSlug}" を削除しますか？`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/html-pages?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { alert('削除に失敗しました'); return; }
      setPages((prev) => prev.filter((p) => p.id !== id));
    } catch { alert('ネットワークエラー'); }
    finally { setDeleting(null); }
  };

  // ─── パスワード設定・変更・解除 ───────────────────────────
  const handlePasswordSave = async (id: string) => {
    if (!pwInput.trim()) { setPwError('パスワードを入力してください'); return; }
    setPwLoading(true);
    setPwError(null);
    try {
      const res = await fetch('/api/admin/html-pages', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'set-password', id, password: pwInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error ?? '失敗しました'); return; }
      setPages((prev) => prev.map((p) => p.id === id ? { ...p, hasPassword: true } : p));
      setPwEditId(null);
      setPwInput('');
    } catch { setPwError('ネットワークエラー'); }
    finally { setPwLoading(false); }
  };

  const handlePasswordRemove = async (id: string) => {
    if (!window.confirm('パスワードを解除しますか？以降は誰でも閲覧可能になります。')) return;
    setPwLoading(true);
    try {
      const res = await fetch('/api/admin/html-pages', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'remove-password', id }),
      });
      if (!res.ok) { alert('解除に失敗しました'); return; }
      setPages((prev) => prev.map((p) => p.id === id ? { ...p, hasPassword: false } : p));
    } catch { alert('ネットワークエラー'); }
    finally { setPwLoading(false); }
  };

  // ─── URL コピー ───────────────────────────────────────────
  const copyUrl = (pageSlug: string) => {
    const url = `${window.location.origin}/pages/${pageSlug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(pageSlug);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ─── アップロードフォーム ─── */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>
          新規アップロード
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* タイトル */}
          <div>
            <label style={labelStyle}>タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 夏の工作教材"
              style={inputStyle}
            />
          </div>

          {/* スラッグ */}
          <div>
            <label style={labelStyle}>
              スラッグ
              <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '8px' }}>
                公開 URL: /pages/<strong>{slug || 'your-slug'}</strong>
              </span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="例: natsu-kogaku-2026"
              style={inputStyle}
            />
          </div>

          {/* パスワード（任意） */}
          <div>
            <label style={labelStyle}>
              パスワード
              <span style={{ fontSize: '11px', color: '#9CA3AF', marginLeft: '8px' }}>
                任意 — 設定するとアクセス時に入力が必要になります
              </span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="（空欄 = パスワードなし・公開）"
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>

          {/* HTML ファイル */}
          <div>
            <label style={labelStyle}>HTML ファイル（最大 2MB）</label>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              style={{
                border:       `2px dashed ${dragOver ? '#3B82F6' : file ? '#10B981' : '#D1D5DB'}`,
                borderRadius: '8px',
                padding:      '20px',
                textAlign:    'center',
                cursor:       'pointer',
                background:   dragOver ? '#EFF6FF' : file ? '#ECFDF5' : '#F9FAFB',
                transition:   'all 0.15s',
              }}
            >
              {progress !== null ? (
                <div>
                  <p style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
                    アップロード中… {progress}%
                  </p>
                  <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#3B82F6', width: `${progress}%`, transition: 'width 0.2s' }} />
                  </div>
                </div>
              ) : file ? (
                <p style={{ fontSize: '13px', color: '#065F46' }}>✅ {file.name} ({Math.round(file.size / 1024)}KB)</p>
              ) : (
                <p style={{ fontSize: '13px', color: '#6B7280' }}>
                  .html ファイルをドラッグ &amp; ドロップ、またはクリックして選択
                </p>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".html,text/html"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {error   && <p style={{ fontSize: '13px', color: '#DC2626' }}>⚠️ {error}</p>}
          {success && <p style={{ fontSize: '13px', color: '#059669' }}>✅ {success}</p>}

          <button
            type="submit"
            disabled={progress !== null}
            style={{
              padding:      '10px 20px',
              background:   progress !== null ? '#9CA3AF' : '#111827',
              color:        'white',
              border:       'none',
              borderRadius: '8px',
              fontSize:     '14px',
              fontWeight:   600,
              cursor:       progress !== null ? 'wait' : 'pointer',
              alignSelf:    'flex-start',
            }}
          >
            {progress !== null ? 'アップロード中…' : 'アップロードして公開'}
          </button>
        </form>
      </div>

      {/* ─── 公開ページ一覧 ─── */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>
          公開中ページ一覧（{pages.length} 件）
        </h2>

        {pages.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>まだアップロードされたページはありません</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                  <th style={thStyle}>タイトル / スラッグ</th>
                  <th style={thStyle}>公開 URL</th>
                  <th style={thStyle}>パスワード</th>
                  <th style={thStyle}>作成日</th>
                  <th style={thStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{p.title}</div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{p.slug}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={`/pages/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#3B82F6', fontSize: '13px' }}
                        >
                          /pages/{p.slug}
                        </a>
                        <button
                          onClick={() => copyUrl(p.slug)}
                          style={copyBtnStyle}
                          title="URL をコピー"
                        >
                          {copied === p.slug ? '✅' : '📋'}
                        </button>
                      </div>
                    </td>
                    {/* パスワード列 */}
                    <td style={tdStyle}>
                      {pwEditId === p.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
                          <input
                            type="password"
                            value={pwInput}
                            onChange={(e) => setPwInput(e.target.value)}
                            placeholder="新しいパスワード"
                            autoFocus
                            style={{ ...inputStyle, fontSize: '12px', padding: '4px 8px' }}
                          />
                          {pwError && <p style={{ fontSize: '11px', color: '#DC2626', margin: 0 }}>{pwError}</p>}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handlePasswordSave(p.id)} disabled={pwLoading} style={smallBtnStyle('#111827')}>
                              {pwLoading ? '…' : '保存'}
                            </button>
                            <button onClick={() => { setPwEditId(null); setPwInput(''); setPwError(null); }} style={smallBtnStyle('#6B7280')}>
                              取消
                            </button>
                          </div>
                        </div>
                      ) : p.hasPassword ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#059669' }}>🔒 設定済み</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => { setPwEditId(p.id); setPwInput(''); setPwError(null); }} style={smallBtnStyle('#374151')}>変更</button>
                            <button onClick={() => handlePasswordRemove(p.id)} disabled={pwLoading} style={smallBtnStyle('#DC2626')}>解除</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setPwEditId(p.id); setPwInput(''); setPwError(null); }} style={smallBtnStyle('#374151')}>
                          🔓 設定する
                        </button>
                      )}
                    </td>

                    <td style={{ ...tdStyle, color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {new Date(p.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleDelete(p.id, p.slug)}
                        disabled={deleting === p.id}
                        style={deleteBtnStyle(deleting === p.id)}
                      >
                        {deleting === p.id ? '削除中…' : '削除'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── スタイル ──────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'white', border: '1px solid #E5E7EB',
  borderRadius: '12px', padding: '1.5rem',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: '#374151', marginBottom: '6px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  border: '1px solid #D1D5DB', borderRadius: '8px',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};
const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left',
  fontWeight: 600, color: '#374151', fontSize: '13px',
};
const tdStyle: React.CSSProperties = {
  padding: '10px 12px', verticalAlign: 'top',
};
const copyBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none',
  cursor: 'pointer', fontSize: '14px', padding: '2px',
};
const smallBtnStyle = (color: string): React.CSSProperties => ({
  padding: '3px 8px', fontSize: '11px', borderRadius: '4px',
  border: `1px solid ${color}`, background: 'white', color,
  cursor: 'pointer', whiteSpace: 'nowrap' as const,
});
const deleteBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '4px 10px', fontSize: '12px', borderRadius: '4px',
  border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626',
  cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1,
});
