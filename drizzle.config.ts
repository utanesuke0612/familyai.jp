/**
 * drizzle.config.ts
 * familyai.jp — Drizzle Kit 設定
 *
 * マイグレーション: pnpm db:generate → pnpm db:migrate
 * スタジオ確認:     pnpm db:studio
 */

import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// drizzle-kit は .env.local を自動で読まないため明示的に読み込む
config({ path: '.env.local' });

export default {
  schema:    './lib/db/schema.ts',
  out:       './drizzle',           // マイグレーションファイルの出力先
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // テーブル名・カラム名のログを詳細表示
  verbose: true,
  strict:  true,
} satisfies Config;
