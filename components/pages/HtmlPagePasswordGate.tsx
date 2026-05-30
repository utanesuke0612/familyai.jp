'use client';

/**
 * components/pages/HtmlPagePasswordGate.tsx
 * familyai.jp — HTML ページ パスワード入力フォーム
 *
 * 正しいパスワードが入力されると /api/pages/[slug]/auth に POST し、
 * 成功後にページをリロードして本文を表示する。
 */

import { useState, useRef } from 'react';

interface Props {
  slug:  string;
  title: string;
}

export function HtmlPagePasswordGate({ slug, title }: Props) {
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError('パスワードを入力してください'); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/pages/${slug}/auth`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      });

      if (res.ok) {
        // Cookie が発行されたのでリロードすれば本文が表示される
        window.location.reload();
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'パスワードが違います');
      setPassword('');
      inputRef.current?.focus();
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight:      '100vh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'var(--washi)',
        padding:        '1rem',
      }}
    >
      <div
        style={{
          width:        '100%',
          maxWidth:     '360px',
          background:   'white',
          border:       '1px solid var(--line)',
          borderRadius: '12px',
          padding:      '2rem',
          boxShadow:    '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* 鍵アイコン */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '2rem' }}>🔒</span>
          <h1
            className="font-mincho"
            style={{
              fontSize:   '18px',
              fontWeight: 500,
              color:      'var(--sumi)',
              marginTop:  '0.5rem',
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--sumi-light)', marginTop: '4px' }}>
            このページはパスワードで保護されています
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            autoFocus
            autoComplete="current-password"
            style={{
              width:        '100%',
              padding:      '10px 12px',
              border:       `1px solid ${error ? '#FCA5A5' : 'var(--line)'}`,
              borderRadius: '8px',
              fontSize:     '15px',
              outline:      'none',
              boxSizing:    'border-box',
            }}
          />

          {error && (
            <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding:      '11px',
              background:   loading ? '#9CA3AF' : 'var(--shu)',
              color:        'white',
              border:       'none',
              borderRadius: '8px',
              fontSize:     '15px',
              fontWeight:   600,
              cursor:       loading ? 'wait' : 'pointer',
              transition:   'background 0.15s',
            }}
          >
            {loading ? '確認中…' : '入室する'}
          </button>
        </form>
      </div>
    </div>
  );
}
