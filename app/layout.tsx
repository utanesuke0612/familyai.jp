import type { Metadata, Viewport } from 'next';
import { Zen_Maru_Gothic, Kaisei_Opti } from 'next/font/google';
import { Header }           from '@/components/layout/Header';
import { Footer }           from '@/components/layout/Footer';
import { GoogleAnalytics }  from '@/components/analytics/GoogleAnalytics';
import './globals.css';

// ── フォント定義 ──────────────────────────────────────────────
const zenMaruGothic = Zen_Maru_Gothic({
  weight:   ['400', '500', '700'],
  subsets:  ['latin'],
  variable: '--font-body',
  display:  'swap',
  preload:  true,
});

const kaiseiOpti = Kaisei_Opti({
  weight:   ['400', '700'],
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
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'familyai.jp' }],
  },
  twitter: {
    card:        'summary_large_image',
    site:        '@familyaijp',
    title:       'familyai.jp — 家族みんなのAI活用サイト',
    description: 'AI（愛）で家族をもっと幸せに。',
    images:      ['/og-default.png'],
  },
  icons: {
    icon:  [
      { url: '/favicon.ico',               sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.json',
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
      className={`${zenMaruGothic.variable} ${kaiseiOpti.variable}`}
    >
      <body className="antialiased full-height" style={{ backgroundColor: 'var(--color-cream)' }}>

        {/* スキップリンク（キーボードアクセシビリティ） */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-toast focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
          style={{ background: 'var(--color-orange)', color: 'white' }}
        >
          メインコンテンツへスキップ
        </a>

        {/* グローバルヘッダー */}
        <Header />

        {/* メインコンテンツ */}
        <main id="main-content">
          {children}
        </main>

        {/* グローバルフッター */}
        <Footer />

        {/* Google Analytics（NEXT_PUBLIC_GA_ID が設定されている場合のみ） */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}

      </body>
    </html>
  );
}
