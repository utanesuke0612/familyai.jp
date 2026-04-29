import type { Metadata, Viewport } from 'next';
import { Zen_Kaku_Gothic_New, Shippori_Mincho } from 'next/font/google';
import { SpeedInsights }     from '@vercel/speed-insights/next';
import { GoogleAnalytics }  from '@/components/analytics/GoogleAnalytics';
import { Providers }        from '@/components/Providers';
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
    default:  'familyai.jp — AI活用事例とAIツール',
    template: '%s | familyai.jp',
  },
  description:
    '仕事・学習・日常に役立つAI活用事例と、すぐ使えるAIツールをまとめた日本語メディアです。',
  keywords: [
    'AI活用', 'AIツール', 'ChatGPT', 'Claude', 'Gemini',
    '語学学習', '画像生成', '音声AI', '家事', '仕事効率化',
  ],
  authors:  [{ name: 'familyai.jp' }],
  creator:  'familyai.jp',
  verification: {
    google: 'mpj_iCKG8iCIBmuM1buGAGKiWseS1RKiyB3u0cBgvQg',
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type:      'website',
    locale:    'ja_JP',
    siteName:  'familyai.jp',
    title:     'familyai.jp — AI活用事例とAIツール',
    description:
      '仕事・学習・日常に役立つAI活用事例と、すぐ使えるAIツールをまとめた日本語メディアです。',
    images: [{
      url:    '/og-default.png',
      width:  1200,
      height: 630,
      alt:    'familyai.jp — AI活用事例とAIツール',
    }],
  },
  twitter: {
    card:        'summary_large_image',
    site:        '@familyaijp',
    title:       'familyai.jp — AI活用事例とAIツール',
    description: '仕事・学習・日常に役立つAI活用事例とAIツールを紹介します。',
    images:      ['/og-default.png'],
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
        {/* Providers: SessionProvider（useSession フック用）を全ページに注入 */}
        <Providers>
          {children}
        </Providers>

        {/* Google Analytics（NEXT_PUBLIC_GA_ID が設定されている場合のみ） */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}

        {/* Vercel Speed Insights — Real Experience Score / Web Vitals 計測 */}
        {/* 本番（Vercel）でのみデータ送信される。dev / preview では収集されない。 */}
        <SpeedInsights />

      </body>
    </html>
  );
}
