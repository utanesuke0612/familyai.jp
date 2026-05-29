'use client';

/**
 * components/layout/MobileNav.tsx
 * familyai.jp — モバイル用ドロワーナビゲーション（Rev40 Phase D-1: Mingei リファクタ）
 *
 * - ハンバーガー → 右側ドロワー（矩形・washi 背景）
 * - 通し番号 + 明朝ナビリンク
 * - .btn-mingei ログイン/ログアウト CTA
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, UserCircle, LogOut, ArrowRight } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

const NAV_LINKS = [
  { href: '/',       label: 'ホーム',     no: '01' },
  { href: '/tools',  label: 'ツール',     no: '02' },
  { href: '/learn',  label: '記事',       no: '03' },
  { href: '/mypage', label: 'マイページ', no: '04' },
] as const;

interface MobileNavProps {
  onClose?: () => void;
}

export function MobileNav({ onClose }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  const handleOpen    = () => setOpen(true);
  const handleClose   = () => { setOpen(false); onClose?.(); };
  const handleSignOut = () => { setOpen(false); signOut({ callbackUrl: '/' }); };

  const user    = session?.user;
  const initial = (user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  return (
    <>
      {/* ハンバーガーボタン */}
      <button
        onClick={handleOpen}
        className="lg:hidden flex items-center justify-center w-11 h-11 transition-colors"
        style={{ color: 'var(--sumi)' }}
        aria-label="メニューを開く"
        aria-expanded={open}
      >
        <Menu size={22} strokeWidth={1.5} />
      </button>

      {/* オーバーレイ */}
      {open && (
        <div
          className="fixed inset-0 z-overlay animate-fade-in"
          style={{ background: 'rgba(42,26,18,0.30)', backdropFilter: 'blur(2px)' }}
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
          fixed top-0 right-0 w-80 z-modal flex flex-col
          transition-transform duration-300 ease-smooth-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          height:     '100vh',
          background: 'var(--washi)',
          borderLeft: '1px solid var(--line)',
        }}
      >

        {/* ── ヘッダー（罫線で囲む）── */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderTop:    '1px solid var(--line)',
            borderBottom: '1px solid var(--line)',
            minHeight:    'var(--header-height)',
          }}
        >
          <span
            className="font-mincho text-lg"
            style={{ fontWeight: 500 }}
          >
            <span style={{ color: 'var(--sumi)' }}>family</span>
            <span style={{ color: 'var(--shu)' }}>ai</span>
            <span style={{ color: 'var(--sumi)' }}>.jp</span>
          </span>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-9 h-9 transition-colors hover:bg-[var(--washi-deep)]"
            style={{ color: 'var(--sumi)' }}
            aria-label="メニューを閉じる"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* ── 目次ナビ（通し番号 + 罫線） ── */}
        <ul className="flex-1 overflow-y-auto py-2" role="menu">
          {NAV_LINKS.map((link) => (
            <li key={link.href} role="none">
              <Link
                href={link.href}
                onClick={handleClose}
                role="menuitem"
                className="group flex items-baseline gap-4 px-6 py-4 transition-colors hover:bg-[var(--washi-deep)]"
                style={{
                  borderBottom: '1px solid var(--line-soft)',
                  color:        'var(--sumi)',
                }}
              >
                <span className="serial shrink-0" style={{ width: '3em' }}>№{link.no}</span>
                <span className="font-mincho flex-1" style={{ fontSize: '17px', fontWeight: 500 }}>
                  {link.label}
                </span>
                <ArrowRight
                  strokeWidth={1}
                  size={16}
                  className="shrink-0 transition-transform group-hover:translate-x-1"
                  style={{ color: 'var(--sumi-soft)' }}
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>

        {/* ── 下部: ユーザー情報 + CTA ── */}
        <div
          className="px-6 py-4 flex flex-col gap-3"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {status === 'loading' ? (
            <div className="h-10 animate-pulse" style={{ background: 'var(--washi-deep)' }} />
          ) : user ? (
            <>
              {/* ユーザー情報 */}
              <div className="flex items-center gap-3">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt=""
                    width={40}
                    height={40}
                    className="object-cover"
                    style={{ border: '1px solid var(--line)' }}
                  />
                ) : (
                  <span
                    className="font-mincho flex items-center justify-center"
                    style={{
                      width:      40,
                      height:     40,
                      background: 'var(--sumi)',
                      color:      'var(--washi)',
                      border:     '1px solid var(--sumi)',
                    }}
                  >
                    {initial}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-mincho text-sm truncate" style={{ color: 'var(--sumi)' }}>
                    {user.name ?? 'ユーザー'}
                  </p>
                  <p className="serial truncate" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                    {user.email}
                  </p>
                </div>
              </div>

              {/* ログアウト */}
              <button
                type="button"
                onClick={handleSignOut}
                className="btn-mingei btn-mingei-outline group justify-center w-full"
              >
                <LogOut strokeWidth={1.25} size={14} aria-hidden="true" />
                <span>ログアウト</span>
              </button>
            </>
          ) : (
            <Link
              href="/auth/signin"
              onClick={handleClose}
              className="btn-mingei group justify-center w-full"
            >
              <UserCircle strokeWidth={1.25} size={16} aria-hidden="true" />
              <span>ログイン</span>
              <ArrowRight
                strokeWidth={1.5}
                size={14}
                className="transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
