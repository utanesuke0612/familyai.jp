/**
 * components/layout/Footer.tsx
 * familyai.jp — グローバルフッター
 *
 * - 背景: var(--color-brown)
 * - 4カラムグリッド（ブランド / ロール / カテゴリ / サイト情報）
 * - ボトム: コピーライト
 */

import Link from 'next/link';
import { ROUTES, ROLE_EMOJI } from '@/shared';

const ROLE_LINKS = [
  { href: ROUTES.roleArticles('papa'),   label: 'パパ向け',   emoji: ROLE_EMOJI.papa },
  { href: ROUTES.roleArticles('mama'),   label: 'ママ向け',   emoji: ROLE_EMOJI.mama },
  { href: ROUTES.roleArticles('kids'),   label: 'こども向け', emoji: ROLE_EMOJI.kids },
  { href: ROUTES.roleArticles('senior'), label: 'シニア向け', emoji: ROLE_EMOJI.senior },
];

const CATEGORY_LINKS = [
  { href: '/learn?cat=image-gen', label: '🎨 画像生成' },
  { href: '/learn?cat=voice',     label: '🎙️ 音声AI' },
  { href: '/learn?cat=education', label: '📚 学習・教育' },
  { href: '/learn?cat=housework', label: '🏠 家事・育児' },
];

const SITE_LINKS = [
  { href: '/about',   label: 'このサイトについて' },
  { href: '/common',  label: '共通ガイド' },
  { href: '/privacy', label: 'プライバシーポリシー' },
  { href: '/terms',   label: '利用規約' },
];

export function Footer() {
  return (
    <footer style={{ background: 'var(--color-brown)', color: 'rgba(255,255,255,0.8)' }}>

      {/* ── メインコンテンツ ── */}
      <div
        className="max-w-container mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 py-14"
        style={{ paddingInline: 'var(--container-px)' }}
      >

        {/* ① ブランドカラム */}
        <div className="lg:col-span-1">
          <Link
            href={ROUTES.home}
            className="inline-flex items-center gap-2 mb-4 min-h-[44px]"
            aria-label="familyai.jp トップへ"
          >
            <span
              className="flex items-center justify-center w-9 h-9 rounded-xl text-lg"
              style={{
                background: 'linear-gradient(135deg, var(--color-peach) 0%, var(--color-orange) 100%)',
              }}
              aria-hidden="true"
            >
              🏠
            </span>
            <span className="font-display text-xl font-bold leading-none">
              <span className="text-white/90">family</span>
              <span style={{ color: 'var(--color-peach)' }}>ai</span>
              <span className="text-white/90">.jp</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed text-white/70 max-w-[200px]">
            AI = 愛、家族の幸せのために。<br />
            パパ・ママ・こども・シニアへやさしいAI活用ガイドをお届けします。
          </p>
          {/* SNSリンク（将来実装用） */}
          <div className="flex gap-3 mt-5">
            <a
              href="https://x.com/familyaijp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-sm transition-opacity hover:opacity-70 min-h-[44px] min-w-[44px]"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              aria-label="X（旧Twitter）"
            >
              𝕏
            </a>
          </div>
        </div>

        {/* ② ロール別 */}
        <div>
          <h3 className="font-display font-bold text-base text-white mb-4">
            ロール別
          </h3>
          <ul className="flex flex-col gap-2">
            <li>
              <Link
                href="/learn?role=common"
                className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors min-h-[44px]"
              >
                👨‍👩‍👧‍👦 みんなで使える
              </Link>
            </li>
            {ROLE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors min-h-[44px]"
                >
                  {link.emoji} {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ③ カテゴリ */}
        <div>
          <h3 className="font-display font-bold text-base text-white mb-4">
            カテゴリ
          </h3>
          <ul className="flex flex-col gap-2">
            {CATEGORY_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/70 hover:text-white transition-colors min-h-[44px] inline-flex items-center"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ④ サイト情報 */}
        <div>
          <h3 className="font-display font-bold text-base text-white mb-4">
            サイト情報
          </h3>
          <ul className="flex flex-col gap-2">
            {SITE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/70 hover:text-white transition-colors min-h-[44px] inline-flex items-center"
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
        className="border-t max-w-container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 py-6 text-sm text-white/50"
        style={{
          paddingInline: 'var(--container-px)',
          borderColor: 'rgba(255,255,255,0.12)',
        }}
      >
        <p>© 2026 familyai.jp — AI = 愛</p>
        <p className="text-xs">
          Powered by Next.js · Hosted on Vercel
        </p>
      </div>

      {/* iOS Safe Area */}
      <div className="pb-safe" />
    </footer>
  );
}
