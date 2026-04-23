import type { Metadata, Viewport } from 'next';
import { Zen_Kaku_Gothic_New, Shippori_Mincho } from 'next/font/google';
import { GoogleAnalytics }  from '@/components/analytics/GoogleAnalytics';
import './globals.css';

// ── フォント定義 ──────────────────────────────────────────────
const zenKakuGothic = Zen_Kaku_Gothic_New({
  weight:   ['400', '500', '700', '900'],
  subsets:  ['latin'],
  variable: '--font-body',
  display:  'swap',
  preload:  true,
});

const shipporiMincho = Shippori_Mincho({
  weight:   ['500', '700', '800'],
  subsets:  ['latin'],
  variable: '--font-display',
  display:  'swap',
  preload:  true,
});

// ── メタデータ ────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL('https://familyai.jp'),
  title: {
    default:  'familyai.jp — 家族みんなのAI活用サイト',
    template: '%s | familyai.jp',
  },
  description:
    'AI（愛）で家族をもっと幸せに。パパ・ママ・子ども・シニアに向けたAI活用事例とやさしいガイドをお届けします。',
  keywords: [
    'AI活用', '家族', 'ChatGPT', 'Claude', 'Gemini',
    '子育て', 'シニア', '語学学習', '家事', '副業',
  ],
  authors:  [{ name: 'familyai.jp' }],
  creator:  'familyai.jp',
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type:      'website',
    locale:    'ja_JP',
    siteName:  'familyai.jp',
    title:     'familyai.jp — 家族みんなのAI活用サイト',
    description:
      'AI（愛）で家族をもっと幸せに。パパ・ママ・子ども・シニアに向けたやさしいAIガイド。',
    // Rev26 #4: 画像は app/opengraph-image.tsx が自動配信（/opengraph-image）。
    // 明示指定しないことで Next.js のファイル規約に任せ、欠落を防ぐ。
  },
  twitter: {
    card:        'summary_large_image',
    site:        '@familyaijp',
    title:       'familyai.jp — 家族みんなのAI活用サイト',
    description: 'AI（愛）で家族をもっと幸せに。',
    // OG 画像は app/opengraph-image.tsx が自動生成するため未指定で OK。
  },
  // icons / manifest は app/icon.tsx、app/apple-icon.tsx、app/manifest.ts が
  // Next.js のファイル規約で自動的に配信するため、ここで明示指定しない（Rev26 #4）。
};

// ── viewport（テーマカラー・PWA 対応） ───────────────────────
export const viewport: Viewport = {
  width:              'device-width',
  initialScale:       1,
  themeColor:         '#FDF6ED',
  colorScheme:        'light',
  viewportFit:        'cover',   // iOS ノッチ対応
};

// ── ルートレイアウト ──────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      className={`${zenKakuGothic.variable} ${shipporiMincho.variable}`}
    >
      <body className="antialiased full-height" style={{ backgroundColor: 'var(--color-cream)' }}>

        {/* スキップリンク（キーボードアクセシビリティ・全ページ共通） */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-toast focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
          style={{ background: 'var(--color-orange)', color: 'white' }}
        >
          メインコンテンツへスキップ
        </a>

        {/* Header・Footer・main は各レイアウト（(site)/layout.tsx / admin/layout.tsx）が担当 */}
        {children}

        {/* Google Analytics（NEXT_PUBLIC_GA_ID が設定されている場合のみ） */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}

      </body>
    </html>
  );
}
