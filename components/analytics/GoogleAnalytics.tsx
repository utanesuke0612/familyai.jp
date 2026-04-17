'use client';

/**
 * components/analytics/GoogleAnalytics.tsx
 * familyai.jp — Google Analytics 4 スクリプト埋め込み
 *
 * - NEXT_PUBLIC_GA_ID が設定されていない場合は何もレンダリングしない
 * - next/script の afterInteractive で非同期ロード（パフォーマンス最適化）
 * - TODO: Phase2 - ページビュー・イベントトラッキングを追加
 */

import Script from 'next/script';

interface GoogleAnalyticsProps {
  gaId: string;
}

export function GoogleAnalytics({ gaId }: GoogleAnalyticsProps) {
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
