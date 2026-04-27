'use client';

/**
 * components/layout/MobileNav.tsx
 * familyai.jp — モバイル用ドロワーナビゲーション
 *
 * - ハンバーガー → 右側ドロワー
 * - ナビリンク（ホーム・AI活用事例・AIツール・マイページ）
 * - ユーザーアバター + 名前 + メール（ログイン時）
 * - ログイン / ログアウトボタン
 */

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

const NAV_LINKS = [
  { href: '/', label: 'ホーム', emoji: '🏠' },
  { href: '/learn', label: 'AI活用事例', emoji: '📝' },
  { href: '/tools', label: 'AIツール', emoji: '🧰' },
  { href: '/mypage', label: 'マイページ', emoji: '👤' },
];

interface MobileNavProps {
  onClose?: () => void;
}

export function MobileNav({ onClose }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  const handleOpen  = () => setOpen(true);
  const handleClose = () => { setOpen(false); onClose?.(); };
  const handleSignOut = () => { setOpen(false); signOut({ callbackUrl: '/' }); };

  const user    = session?.user;
  const initial = (user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  return (
    <>
      {/* ハンバーガーボタン */}
      <button
        onClick={handleOpen}
        className="lg:hidden flex items-center justify-center w-11 h-11 rounded-xl transition-colors"
        style={{ color: 'var(--color-brown)' }}
        aria-label="メニューを開く"
        aria-expanded={open}
      >
        <Menu size={24} strokeWidth={2} />
      </button>

      {/* オーバーレイ */}
      {open && (
        <div
          className="fixed inset-0 z-overlay animate-fade-in"
          style={{ background: 'rgba(139,94,60,0.25)', backdropFilter: 'blur(4px)' }}
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* ドロワー */}
      <nav
        role="dialog"
        aria-modal="true"
        aria-label="ナビゲーションメニュー"
        className={`
          fixed top-0 right-0 w-72 z-modal
          flex flex-col
          shadow-warm-lg
          transition-transform duration-300 ease-smooth-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          // h-full に頼らず viewport 全高で確実に背景を覆う
          height: '100vh',
          // CSS変数より明示的な hex で透明問題を回避
          background: '#FDF6ED',
        }}
      >
        {/* ドロワーヘッダー */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-beige-dark)' }}
        >
          <span className="font-display font-bold text-lg" style={{ color: 'var(--color-brown)' }}>
            <span style={{ color: 'var(--color-brown)' }}>family</span>
            <span style={{ color: 'var(--color-orange)' }}>ai</span>
            <span style={{ color: 'var(--color-brown)' }}>.jp</span>
          </span>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-11 h-11 rounded-xl transition-colors hover:opacity-70"
            style={{ color: 'var(--color-brown)' }}
            aria-label="メニューを閉じる"
          >
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        {/* ── ユーザープロフィール / 未ログインCTA ── */}
        {status === 'loading' ? (
          // 読み込み中スケルトン
          <div className="px-4 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--color-beige-dark)' }}>
            <div className="w-12 h-12 rounded-full animate-pulse" style={{ background: 'var(--color-beige-dark)' }} />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-3 w-3/4 rounded-full animate-pulse" style={{ background: 'var(--color-beige-dark)' }} />
              <div className="h-3 w-1/2 rounded-full animate-pulse" style={{ background: 'var(--color-beige)' }} />
            </div>
          </div>
        ) : user ? (
          // ログイン中: プロフィールカード
          <div
            className="px-4 py-4 border-b flex items-center gap-3 shrink-0"
            style={{ borderColor: 'var(--color-beige-dark)', background: '#fffdf8' }}
          >
            <div
              className="flex items-center justify-center rounded-full overflow-hidden shrink-0"
              style={{
                width: '48px',
                height: '48px',
                border: '2px solid white',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name ?? ''} width={48} height={48} className="object-cover w-full h-full" />
              ) : (
                <span
                  className="flex items-center justify-center w-full h-full text-lg font-bold text-white"
                  style={{ background: 'var(--color-orange)' }}
                >
                  {initial}
                </span>
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="font-semibold truncate text-sm" style={{ color: 'var(--color-brown)' }}>
                {user.name ?? 'ユーザー'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-brown-light)' }}>
                {user.email}
              </p>
            </div>
          </div>
        ) : (
          // 未ログイン: ログインCTA
          <div
            className="px-4 py-4 border-b flex flex-col gap-2"
            style={{ borderColor: 'var(--color-beige-dark)' }}
          >
            <p className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
              ログインして全機能を利用しましょう
            </p>
            <Link
              href="/auth/signin"
              onClick={handleClose}
              className="flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-bold transition-opacity hover:opacity-85"
              style={{
                minHeight: '44px',
                background: 'var(--color-orange)',
                color: 'white',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              <span aria-hidden="true">👤</span>
              ログイン
            </Link>
          </div>
        )}

        {/* ナビリンク */}
        <ul
          className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto"
          style={{ background: '#FDF6ED' }}
        >
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={handleClose}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-body font-medium transition-[background-color,color] min-h-[48px]"
                style={{ color: 'var(--color-brown)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-beige)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <span className="text-xl">{link.emoji}</span>
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* ── ログアウト（ログイン時のみ） ── */}
        {user && (
          <div
            className="px-4 py-3 border-t shrink-0"
            style={{ borderColor: 'var(--color-beige-dark)', background: '#FDF6ED' }}
          >
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl font-body font-medium transition-colors min-h-[48px]"
              style={{ color: 'var(--color-brown-light)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-beige)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span className="text-xl" aria-hidden="true">🚪</span>
              <span>ログアウト</span>
            </button>
          </div>
        )}

        {/* Safe Area */}
        <div className="pb-safe" />
      </nav>
    </>
  );
}
