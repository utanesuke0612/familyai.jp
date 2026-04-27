'use client';

/**
 * components/admin/AdminNav.tsx
 * familyai.jp — 管理画面ナビゲーションバー
 */

import Link       from 'next/link';
import { signOut } from 'next-auth/react';

interface AdminNavProps {
  email: string;
}

export function AdminNav({ email }: AdminNavProps) {
  return (
    <header
      style={{
        background:   'white',
        borderBottom: '1px solid #E5E7EB',
        padding:      '0 1.5rem',
        height:       '56px',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        position:     'sticky',
        top:          0,
        zIndex:       50,
      }}
    >
      {/* 左：ロゴ + ナビ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link
          href="/admin"
          style={{
            fontWeight:  700,
            fontSize:    '16px',
            color:       'var(--color-orange)',
            textDecoration: 'none',
            letterSpacing: '-0.3px',
          }}
        >
          familyai <span style={{ color: '#6B7280', fontWeight: 400 }}>管理画面</span>
        </Link>

        <nav style={{ display: 'flex', gap: '1.25rem' }}>
          <Link href="/admin" style={navLinkStyle}>
            📋 記事一覧
          </Link>
          <Link href="/admin/articles/new" style={navLinkStyle}>
            ✏️ 新規作成
          </Link>
          <Link href="/admin/users" style={navLinkStyle}>
            👥 会員管理
          </Link>
          <Link href="/admin/ai-config" style={navLinkStyle}>
            🛠️ AI設定
          </Link>
          <Link href="/" target="_blank" style={navLinkStyle}>
            🌐 サイトを見る
          </Link>
        </nav>
      </div>

      {/* 右：メール + ログアウト */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '13px', color: '#6B7280' }}>{email}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          style={{
            fontSize:     '13px',
            padding:      '6px 14px',
            borderRadius: '6px',
            border:       '1px solid #E5E7EB',
            background:   'white',
            color:        '#374151',
            cursor:       'pointer',
          }}
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}

const navLinkStyle: React.CSSProperties = {
  fontSize:       '13px',
  color:          '#374151',
  textDecoration: 'none',
  padding:        '4px 0',
};
