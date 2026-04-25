'use client';

/**
 * components/layout/Header.tsx
 * familyai.jp — グローバルヘッダー
 *
 * - sticky top-0 / glass（クリーム半透明 + backdrop-blur）
 * - PC: 横並びナビリンク + ユーザーアバター（ドロップダウン）
 * - Mobile: ハンバーガー → MobileNav ドロワー
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { MobileNav } from './MobileNav';
import { ROUTES } from '@/shared';

// ── ユーザーアバター＆ドロップダウン ────────────────────────────
function UserAvatarMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // セッション読み込み中は空を返す
  if (status === 'loading') {
    return <div className="w-9 h-9 rounded-full animate-pulse" style={{ background: 'var(--color-beige-dark)' }} />;
  }

  // ── 未ログイン ──────────────────────────────────────────────
  if (!session) {
    return (
      <Link
        href="/auth/signin"
        aria-label="ログイン"
        className="flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
        style={{
          width: '36px',
          height: '36px',
          background: 'var(--color-cream)',
          border: '1.5px solid var(--color-beige-dark)',
          color: 'var(--color-brown-light)',
          fontSize: '18px',
        }}
      >
        👤
      </Link>
    );
  }

  // ── ログイン済み ────────────────────────────────────────────
  const user = session.user;
  const initial = (user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase();

  return (
    <div ref={ref} className="relative">
      {/* アバターボタン */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="アカウントメニューを開く"
        aria-expanded={open}
        className="flex items-center justify-center rounded-full overflow-hidden transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2"
        style={{
          width: '36px',
          height: '36px',
          border: '2px solid white',
          boxShadow: 'var(--shadow-warm-sm)',
          outline: 'none',
        }}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt={user.name ?? ''} width={36} height={36} className="object-cover w-full h-full" />
        ) : (
          <span
            className="flex items-center justify-center w-full h-full text-sm font-bold text-white"
            style={{ background: 'var(--color-orange)' }}
          >
            {initial}
          </span>
        )}
      </button>

      {/* ドロップダウン */}
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-56 rounded-2xl py-1 text-sm"
          style={{
            background: 'white',
            boxShadow: 'var(--shadow-warm)',
            border: '1px solid var(--color-beige-dark)',
            top: '100%',
          }}
        >
          {/* ユーザー情報 */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--color-beige-dark)' }}
          >
            <p className="font-semibold truncate" style={{ color: 'var(--color-brown)' }}>
              {user.name ?? 'ユーザー'}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-brown-light)' }}>
              {user.email}
            </p>
          </div>

          {/* マイページ */}
          <Link
            href="/mypage"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 font-medium transition-colors hover:bg-[var(--color-cream)]"
            style={{ color: 'var(--color-brown)' }}
          >
            <span aria-hidden="true">👤</span>
            マイページ
          </Link>

          {/* ログアウト */}
          <button
            type="button"
            onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 font-medium transition-colors hover:bg-[var(--color-cream)]"
            style={{ color: 'var(--color-brown)' }}
          >
            <span aria-hidden="true">🚪</span>
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}

const NAV_LINKS = [
  { href: '/', label: 'ホーム', emoji: '🏠' },
  { href: '/learn', label: 'AI活用事例', emoji: '📝' },
  { href: '/tools', label: 'AIツール', emoji: '🧰' },
  { href: '/mypage', label: 'マイページ', emoji: '👤' },
];

function isLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();

  return (
    <header
      className="glass sticky top-0 z-header"
      style={{ height: 'var(--header-height)' }}
    >
      <div
        className="h-full flex items-center justify-between max-w-container mx-auto"
        style={{ paddingInline: 'var(--container-px)' }}
      >

        {/* ── ロゴ ── */}
        <Link
          href={ROUTES.home}
          className="flex items-center gap-2.5 shrink-0 min-h-[44px]"
          aria-label="familyai.jp トップへ"
        >
          {/* アイコン：peach→orange グラデーション背景 */}
          <span
            className="flex items-center justify-center w-9 h-9 rounded-xl text-lg animate-float shadow-peach"
            style={{
              background: 'linear-gradient(135deg, var(--color-peach) 0%, var(--color-orange) 100%)',
            }}
            aria-hidden="true"
          >
            🏠
          </span>
          <span className="font-display text-xl font-bold leading-none">
            <span style={{ color: 'var(--color-brown)' }}>family</span>
            <span style={{ color: 'var(--color-orange)' }}>ai</span>
            <span style={{ color: 'var(--color-brown)' }}>.jp</span>
          </span>
        </Link>

        {/* ── PC ナビ ── */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="メインナビゲーション">
          {NAV_LINKS.map((link) => {
            const isActive = isLinkActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-2 text-sm font-medium rounded-lg min-h-[44px] flex items-center transition-colors group whitespace-nowrap"
                style={{ color: isActive ? 'var(--color-orange)' : 'var(--color-brown)' }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true">{link.emoji}</span>
                  <span>{link.label}</span>
                </span>
                {/* ホバー下線アニメーション */}
                <span
                  className="absolute bottom-1 left-3 right-3 h-0.5 rounded-full transition-transform duration-300 origin-left"
                  style={{
                    background: 'var(--color-orange)',
                    transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                  }}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </nav>

        {/* ── PC アバター + Mobile ハンバーガー ── */}
        <div className="flex items-center gap-3">
          {/* PC のみ表示: ユーザーアバター or ログインアイコン */}
          <div className="hidden lg:flex">
            <UserAvatarMenu />
          </div>
          {/* Mobile のみ表示 */}
          <MobileNav />
        </div>

      </div>
    </header>
  );
}
