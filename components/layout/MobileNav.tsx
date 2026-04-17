'use client';

/**
 * components/layout/MobileNav.tsx
 * familyai.jp — モバイル用ドロワーナビゲーション
 * shadcn/ui Sheet コンポーネントを使用
 */

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { ROUTES, ROLE_EMOJI } from '@/shared';

const NAV_LINKS = [
  { href: '/learn?role=common', label: '共通ガイド', emoji: '👨‍👩‍👧‍👦' },
  { href: '/learn?role=papa',   label: 'パパ向け',   emoji: ROLE_EMOJI.papa },
  { href: '/learn?role=mama',   label: 'ママ向け',   emoji: ROLE_EMOJI.mama },
  { href: '/learn?role=kids',   label: 'こども向け', emoji: ROLE_EMOJI.kids },
  { href: '/learn?role=senior', label: 'シニア向け', emoji: ROLE_EMOJI.senior },
];

interface MobileNavProps {
  onClose?: () => void;
}

export function MobileNav({ onClose }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const handleOpen  = () => setOpen(true);
  const handleClose = () => { setOpen(false); onClose?.(); };

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
          fixed top-0 right-0 h-full w-72 z-modal
          flex flex-col
          shadow-warm-lg
          transition-transform duration-300 ease-smooth-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ background: 'var(--color-cream)' }}
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

        {/* ナビリンク */}
        <ul className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
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

        {/* CTA */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--color-beige-dark)' }}>
          <Link
            href={ROUTES.login}
            onClick={handleClose}
            className="btn-primary w-full justify-center text-center"
          >
            ✨ 無料で始める
          </Link>
        </div>

        {/* Safe Area */}
        <div className="pb-safe" />
      </nav>
    </>
  );
}
