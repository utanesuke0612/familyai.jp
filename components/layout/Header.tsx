'use client';

/**
 * components/layout/Header.tsx
 * familyai.jp — グローバルヘッダー
 *
 * - sticky top-0 / glass（クリーム半透明 + backdrop-blur）
 * - PC: 横並びナビリンク + CTA
 * - Mobile: ハンバーガー → MobileNav ドロワー
 */

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { MobileNav } from './MobileNav';
import { ROUTES, ROLE_EMOJI } from '@/shared';

const NAV_LINKS = [
  { href: '/learn?role=common', role: 'common', label: '共通ガイド' },
  { href: '/learn?role=papa',   role: 'papa',   label: `${ROLE_EMOJI.papa} パパ` },
  { href: '/learn?role=mama',   role: 'mama',   label: `${ROLE_EMOJI.mama} ママ` },
  { href: '/learn?role=kids',   role: 'kids',   label: `${ROLE_EMOJI.kids} こども` },
  { href: '/learn?role=senior', role: 'senior', label: `${ROLE_EMOJI.senior} シニア` },
];

export function Header() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const currentRole  = searchParams.get('role');

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
            const isActive = pathname === '/learn' && currentRole === link.role;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-2 text-sm font-medium rounded-lg min-h-[44px] flex items-center transition-colors group whitespace-nowrap"
                style={{ color: isActive ? 'var(--color-orange)' : 'var(--color-brown)' }}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
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

        {/* ── PC CTA + Mobile ハンバーガー ── */}
        <div className="flex items-center gap-3">
          {/* Mobile のみ表示 */}
          <MobileNav />
        </div>

      </div>
    </header>
  );
}
