/**
 * app/manifest.ts
 * familyai.jp — Web App Manifest（Rev26 #4・機能2 PWAで拡張）
 * Next.js のファイルベース規約により自動的に /manifest.webmanifest として配信される。
 * 旧 public/manifest.json は廃止し、ここで一元管理する。
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'familyai.jp — AI活用事例とAIツール',
    short_name:       'familyai',
    description:      '仕事・学習・日常に役立つAI活用事例と、すぐ使えるAIツールをまとめた日本語メディアです。',
    start_url:        '/',
    display:          'standalone',
    background_color: '#FDF6ED',
    // PWA起動時の OS UI 色（iOS Safari / Android Chrome アドレスバー連動）
    // ブランドオレンジに統一（機能2 PWA・2026-04-29）
    theme_color:      '#FF8C42',
    lang:             'ja',
    orientation:      'portrait',
    icons: [
      // app/icon.tsx / app/apple-icon.tsx が動的生成するエンドポイント
      { src: '/icon',       sizes: '192x192', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
    // ホーム画面アイコン長押しで表示されるショートカット（Android Chrome 等で対応）
    shortcuts: [
      {
        name:        '記事を読む',
        short_name:  '記事',
        url:         '/learn',
        icons:       [{ src: '/icon', sizes: '192x192', type: 'image/png' }],
      },
      {
        name:        'VOA × AI ディクテーション教室',
        short_name:  'VOA',
        url:         '/tools/voaenglish',
        icons:       [{ src: '/icon', sizes: '192x192', type: 'image/png' }],
      },
      {
        name:        'うごくAI教室',
        short_name:  'AI教室',
        url:         '/tools/ai-kyoshitsu',
        icons:       [{ src: '/icon', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
