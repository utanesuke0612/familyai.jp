/**
 * app/robots.ts
 * familyai.jp — robots.txt 自動生成
 *
 * Next.js の MetadataRoute.Robots を使用。
 * /robots.txt として自動配信される。
 */

import type { MetadataRoute } from 'next';
import { SITE }               from '@/shared';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // 一般クローラー
        userAgent:   '*',
        allow:       '/',
        disallow:    [
          '/api/',         // API エンドポイントは除外
          '/dashboard/',   // ユーザーダッシュボード（将来）
          '/auth/',        // 認証ページ
          '/_next/',       // Next.js 内部
        ],
      },
    ],
    sitemap:  `${SITE.url}/sitemap.xml`,
    host:     SITE.url,
  };
}
