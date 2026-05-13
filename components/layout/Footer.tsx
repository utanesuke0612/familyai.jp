/**
 * components/layout/Footer.tsx
 * familyai.jp — グローバルフッター
 *
 * - 背景: var(--color-brown)
 * - 4カラムグリッド（ブランド / ナビ / カテゴリ / サイト情報）
 * - ボトム: コピーライト
 */

import Link from 'next/link';
import { ROUTES } from '@/shared';

const NAV_LINKS = [
  // Rev40 Phase G: 絵文字撤廃 — 民藝奥付風の純テキストへ
  { href: ROUTES.home,     label: 'ホーム' },
  { href: '/tools',        label: 'AIツール' },
  { href: ROUTES.articles, label: 'AI活用事例' },
];

const CATEGORY_LINKS = [
  { href: '/learn?cat=education', label: '学習・教育' },
  { href: '/learn?cat=lifestyle', label: '家事・暮らし' },
  { href: '/learn?cat=work',      label: '仕事・効率化' },
  { href: '/learn?cat=creative',  label: '創作・表現' },
];

const SITE_LINKS = [
  { href: '/about',   label: 'このサイトについて' },
  { href: '/privacy', label: 'プライバシーポリシー' },
  { href: '/terms',   label: '利用規約' },
];

export function Footer() {
  return (
    <footer style={{ background: 'var(--sumi)', color: 'var(--washi)' }}>

      {/* ── メインコンテンツ ── */}
      <div
        className="max-w-container mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 py-14"
        style={{ paddingInline: 'var(--container-px)' }}
      >

        {/* ① ブランドカラム */}
        <div className="lg:col-span-1">
          <Link
            href={ROUTES.home}
            className="inline-flex items-center gap-3 mb-4 min-h-[44px]"
            aria-label="familyai.jp トップへ"
          >
            <span
              className="flex items-center justify-center w-9 h-9 text-base font-mincho"
              style={{
                background: 'var(--shu)',
                color:      'var(--washi)',
                border:     '1px solid var(--shu-deep)',
                borderRadius: '4px',
              }}
              aria-hidden="true"
            >
              愛
            </span>
            <span className="font-mincho text-xl leading-none tracking-wide">
              <span style={{ color: 'var(--washi)' }}>family</span>
              <span style={{ color: 'var(--shu)' }}>ai</span>
              <span style={{ color: 'var(--washi)' }}>.jp</span>
            </span>
          </Link>
          <p className="font-mincho text-sm leading-relaxed max-w-[240px]" style={{ color: 'rgba(245,237,222,0.72)' }}>
            <span className="ornament ornament-shu mr-1" aria-hidden="true">⁂</span>
            AI＝愛、暮らしに役立つ活用事例と道具をまとめた手帖。
          </p>
          {/* SNSリンク */}
          <div className="flex gap-3 mt-5">
            <a
              href="https://x.com/familyaijp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 text-sm transition-opacity hover:opacity-70 min-h-[44px] min-w-[44px] font-mincho"
              style={{
                background:   'rgba(245,237,222,0.08)',
                border:       '1px solid rgba(245,237,222,0.16)',
                borderRadius: '4px',
                color:        'var(--washi)',
              }}
              aria-label="X（旧Twitter）"
            >
              𝕏
            </a>
          </div>
        </div>

        {/* ② ナビ */}
        <div>
          <h3 className="font-mincho text-base mb-4 tracking-wider" style={{ color: 'var(--washi)' }}>
            <span className="ornament ornament-shu mr-1" aria-hidden="true">⁂</span>
            目次
          </h3>
          <ul className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-mincho inline-flex items-center gap-2 text-sm hover:opacity-100 transition-opacity min-h-[44px]"
                  style={{ color: 'rgba(245,237,222,0.72)' }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ③ カテゴリ */}
        <div>
          <h3 className="font-mincho text-base mb-4 tracking-wider" style={{ color: 'var(--washi)' }}>
            <span className="ornament ornament-shu mr-1" aria-hidden="true">⁂</span>
            分類
          </h3>
          <ul className="flex flex-col gap-2">
            {CATEGORY_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-mincho text-sm hover:opacity-100 transition-opacity min-h-[44px] inline-flex items-center"
                  style={{ color: 'rgba(245,237,222,0.72)' }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ④ サイト情報 */}
        <div>
          <h3 className="font-mincho text-base mb-4 tracking-wider" style={{ color: 'var(--washi)' }}>
            <span className="ornament ornament-shu mr-1" aria-hidden="true">⁂</span>
            奥付
          </h3>
          <ul className="flex flex-col gap-2">
            {SITE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-mincho text-sm hover:opacity-100 transition-opacity min-h-[44px] inline-flex items-center"
                  style={{ color: 'rgba(245,237,222,0.72)' }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── ボトムバー ── */}
      <div
        className="border-t max-w-container mx-auto flex items-center justify-center py-6 font-mincho text-sm"
        style={{
          paddingInline: 'var(--container-px)',
          borderColor:   'rgba(245,237,222,0.16)',
          color:         'rgba(245,237,222,0.5)',
        }}
      >
        <p>
          © 2026{' '}
          <span style={{ color: 'rgba(245,237,222,0.85)' }}>family</span>
          <span style={{ color: 'var(--shu)' }}>ai</span>
          <span style={{ color: 'rgba(245,237,222,0.85)' }}>.jp</span>
          {' ― AI＝愛'}
        </p>
      </div>

      {/* iOS Safe Area */}
      <div className="pb-safe" />
    </footer>
  );
}
