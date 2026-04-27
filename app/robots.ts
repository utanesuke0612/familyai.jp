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
        allow:       [
          '/',
          '/api/og',       // OGP画像生成 API（Twitter/SNS クローラー用）
        ],
        disallow:    [
          '/api/',         // API エンドポイントは除外（/api/og は上の allow で許可）
          '/dashboard/',   // ユーザーダッシュボード（将来）
          '/auth/',        // 認証ページ
          '/mypage/',      // マイページ（履歴など、ログインユーザー個人領域）
          '/share/',       // シェアリンク（URLを知る人のみ閲覧可・検索結果に出さない）
          '/_next/',       // Next.js 内部
        ],
      },
    ],
    sitemap:  `${SITE.url}/sitemap.xml`,
    host:     SITE.url,
  };
}
