'use client';

/**
 * components/layout/Header.tsx
 * familyai.jp — グローバルヘッダー（Rev40 Phase D-1: Mingei リファクタ）
 *
 * - 上下罫線で囲む出版物の柱見出し風
 * - ロゴ: Shippori Mincho テキストのみ（絵文字・グラデ廃）
 * - PC ナビ: 通し番号 № + 縦罫線区切り
 * - アクティブ: shu 色 + 太め下罫線
 * - ドロップダウン: .box-mingei 矩形 + 線画アイコン
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { UserCircle, LogOut } from 'lucide-react';
import { MobileNav } from './MobileNav';
import { ROUTES } from '@/shared';

// ── ナビ定義 ─────────────────────────────────────────────
const NAV_LINKS = [
  { href: '/',       label: 'ホーム',     no: '01' },
  { href: '/tools',  label: 'ツール',     no: '02' },
  { href: '/learn',  label: '記事',       no: '03' },
  { href: '/mypage', label: 'マイページ', no: '04' },
] as const;

function isLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ── ユーザーアバター＆ドロップダウン ─────────────────────────
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

  // セッション読み込み中
  if (status === 'loading') {
    return (
      <div
        className="w-9 h-9 animate-pulse"
        style={{ background: 'var(--washi-deep)', border: '1px solid var(--line)' }}
      />
    );
  }

  // ── 未ログイン ──────────────────────────────────────────
  if (!session) {
    return (
      <Link
        href="/auth/signin"
        aria-label="ログイン"
        className="flex items-center justify-center transition-colors hover:bg-[var(--washi-deep)]"
        style={{
          width:  '36px',
          height: '36px',
          border: '1px solid var(--line)',
          color:  'var(--sumi-light)',
        }}
      >
        <UserCircle strokeWidth={1.25} size={20} aria-hidden="true" />
      </Link>
    );
  }

  // ── ログイン済み ────────────────────────────────────────
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
        className="flex items-center justify-center overflow-hidden transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2"
        style={{
          width:  '36px',
          height: '36px',
          border: '1px solid var(--line)',
          outline: 'none',
        }}
      >
        {user.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={user.image} alt={user.name ?? ''} width={36} height={36} className="object-cover w-full h-full" />
        ) : (
          <span
            className="font-mincho flex items-center justify-center w-full h-full text-sm"
            style={{ background: 'var(--sumi)', color: 'var(--washi)' }}
          >
            {initial}
          </span>
        )}
      </button>

      {/* ドロップダウン */}
      {open && (
        <div
          className="box-mingei absolute right-0 z-50 mt-2 w-60 py-1 text-sm"
          style={{ top: '100%' }}
        >
          {/* ユーザー情報 */}
          <div
            className="px-4 py-3"
            style={{ borderBottom: '1px solid var(--line-soft)' }}
          >
            <p className="font-mincho font-medium truncate" style={{ color: 'var(--sumi)' }}>
              {user.name ?? 'ユーザー'}
            </p>
            <p className="serial mt-1 truncate" style={{ letterSpacing: '0.05em', fontSize: '10px' }}>
              {user.email}
            </p>
          </div>

          {/* マイページ */}
          <Link
            href="/mypage"
            onClick={() => setOpen(false)}
            className="font-mincho flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--washi-deep)]"
            style={{ color: 'var(--sumi)' }}
          >
            <UserCircle strokeWidth={1} size={16} style={{ color: 'var(--sumi-soft)' }} aria-hidden="true" />
            マイページ
          </Link>

          {/* ログアウト */}
          <button
            type="button"
            onClick={() => { setOpen(false); signOut({ callbackUrl: '/' }); }}
            className="font-mincho flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--washi-deep)]"
            style={{ color: 'var(--sumi)' }}
          >
            <LogOut strokeWidth={1} size={16} style={{ color: 'var(--sumi-soft)' }} aria-hidden="true" />
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}

// ── Header ───────────────────────────────────────────────
export function Header() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-header"
      style={{
        height:       'var(--header-height)',
        background:   'var(--washi)',
        borderTop:    '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        className="h-full flex items-center justify-between max-w-container mx-auto"
        style={{ paddingInline: 'var(--container-px)' }}
      >

        {/* ── ロゴ（テキストのみ・Shippori Mincho）── */}
        <Link
          href={ROUTES.home}
          className="flex items-baseline gap-3 shrink-0 min-h-[44px] py-2"
          aria-label="familyai.jp トップへ"
        >
          <span
            className="font-mincho text-xl"
            style={{ fontWeight: 500 }}
          >
            <span style={{ color: 'var(--sumi)' }}>family</span>
            <span style={{ color: 'var(--shu)' }}>ai</span>
            <span style={{ color: 'var(--sumi)' }}>.jp</span>
          </span>
          <span
            className="hidden sm:inline serial"
            style={{ color: 'var(--sumi-soft)', fontSize: '10px' }}
          >
            AI = 愛
          </span>
        </Link>

        {/* ── PC ナビ（通し番号 + 縦罫線区切り）── */}
        <nav className="hidden lg:flex items-stretch" aria-label="メインナビゲーション">
          {NAV_LINKS.map((link, i) => {
            const isActive = isLinkActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 flex items-center gap-2 group min-h-[44px] transition-colors whitespace-nowrap"
                style={{
                  color: isActive ? 'var(--shu)' : 'var(--sumi)',
                  borderLeft: i > 0 ? '1px solid var(--line-soft)' : 'none',
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className="serial"
                  style={{
                    color: isActive ? 'var(--shu)' : 'var(--sumi-soft)',
                  }}
                >
                  №{link.no}
                </span>
                <span
                  className="font-mincho text-sm group-hover:text-[var(--shu)] transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  {link.label}
                </span>
                {/* アクティブ時の下罫線（太め） */}
                {isActive && (
                  <span
                    className="absolute left-3 right-3 bottom-1.5"
                    style={{ height: '2px', background: 'var(--shu)' }}
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── PC アバター + Mobile ハンバーガー ── */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex">
            <UserAvatarMenu />
          </div>
          <MobileNav />
        </div>

      </div>
    </header>
  );
}
