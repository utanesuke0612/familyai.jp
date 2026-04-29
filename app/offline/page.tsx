/**
 * app/offline/page.tsx
 * familyai.jp — オフラインフォールバックページ（PWA 対応・機能2）
 *
 * Service Worker が事前キャッシュし、ネットワーク不通時に表示する。
 * ブラウザの「ページが表示できません」エラーの代わりに、
 * ブランド準拠の親しみやすい案内を出す。
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title:       'オフライン | familyai.jp',
  description: 'インターネット接続を確認してください。',
  // 検索エンジンには出さない（フォールバック専用ページ）
  robots:      'noindex, nofollow',
};

export default function OfflinePage() {
  return (
    <main
      style={{
        background: 'var(--color-cream)',
        minHeight:  '70vh',
      }}
    >
      <div
        className="mx-auto flex flex-col items-center text-center gap-6 py-20"
        style={{
          maxWidth:     '480px',
          paddingInline: 'clamp(16px, 5vw, 32px)',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 72, lineHeight: 1 }}>
          📡
        </span>

        <h1
          className="font-display font-bold leading-tight"
          style={{
            fontSize: 'clamp(22px, 4vw, 32px)',
            color:    'var(--color-brown)',
          }}
        >
          オフラインです
        </h1>

        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--color-brown-light)' }}
        >
          インターネット接続を確認してください。
          <br />
          キャッシュ済みの音声・記事は引き続きご利用いただけます。
        </p>

        <div
          className="rounded-2xl px-4 py-3 text-xs leading-relaxed"
          style={{
            background:  'rgba(255,255,255,0.85)',
            color:       'var(--color-brown-light)',
            border:      '1px solid var(--color-beige-dark)',
            maxWidth:    '380px',
          }}
        >
          💡 ヒント: 機内モードや Wi-Fi 設定をご確認ください。
        </div>

        <Link
          href="/"
          className="inline-flex items-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            minHeight:  '48px',
            background: 'var(--color-orange)',
            color:      'white',
            boxShadow:  '0 2px 8px rgba(255,140,66,0.3)',
          }}
        >
          🏠 ホームに戻る
        </Link>
      </div>
    </main>
  );
}
