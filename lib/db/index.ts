/**
 * lib/db/index.ts
 * familyai.jp — Drizzle + Neon 接続クライアント（lazy 初期化）
 *
 * @neondatabase/serverless を使用。
 * Vercel Serverless / Edge Functions どちらでも動作する。
 *
 * ⚠️ DATABASE_URL の検証はモジュールロード時ではなくリクエスト時に行う。
 *    これにより DATABASE_URL 未設定環境（Vercel Preview の初回ビルド等）でも
 *    import だけでクラッシュしなくなる。
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon }    from '@neondatabase/serverless';
import * as schema from './schema';

// ── lazy singleton ────────────────────────────────────────────
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '❌ DATABASE_URL が設定されていません。.env.local を確認してください。',
    );
  }

  // fetchOptions: cache:'no-store' で Next.js のフェッチキャッシュをバイパス
  // （App Router の Server Component で常に最新 DB データを取得するために必須）
  const sql = neon(url, { fetchOptions: { cache: 'no-store' } });
  _db = drizzle(sql, { schema });
  return _db;
}

// Proxy: db.select() 等の呼び出し時に初めて初期化する
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle<typeof schema>>];
  },
});

// スキーマの型・テーブル定義を再エクスポート
export * from './schema';
