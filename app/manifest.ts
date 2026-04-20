/**
 * app/manifest.ts
 * familyai.jp — Web App Manifest（Rev26 #4）
 * Next.js のファイルベース規約により自動的に /manifest.webmanifest として配信される。
 * 旧 public/manifest.json は廃止し、ここで一元管理する。
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'familyai.jp — 家族みんなのAI活用サイト',
    short_name:       'familyai',
    description:      'AI（愛）で家族をもっと幸せに。パパ・ママ・子ども・シニアに向けたやさしいAIガイド。',
    start_url:        '/',
    display:          'standalone',
    background_color: '#FDF6ED',
    theme_color:      '#FDF6ED',
    lang:             'ja',
    orientation:      'portrait',
    icons: [
      // app/icon.tsx / app/apple-icon.tsx が動的生成するエンドポイント
      { src: '/icon',       sizes: '192x192', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
