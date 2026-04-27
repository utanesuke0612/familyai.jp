/**
 * res/scripts/apply-0010-migration.ts
 * 単発スクリプト: drizzle/0010_ai_config.sql を本番/ローカルDBに直接適用する
 *
 * 使い方: pnpm tsx res/scripts/apply-0010-migration.ts
 *
 * drizzle-kit push が TTY を要求するため、互換性のあるシンプルな代替として作成。
 * 0010 専用なので、完了後は削除しても良い。
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const migrationPath = join(process.cwd(), 'drizzle', '0010_ai_config.sql');
  const migration = readFileSync(migrationPath, 'utf-8');

  // セミコロンで分割（コメント行は除外）
  const statements = migration
    .split(';')
    .map((s) =>
      s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim(),
    )
    .filter((s) => s.length > 0);

  console.log(`📄 ${statements.length} 個の SQL 文を実行します`);
  for (const stmt of statements) {
    const preview = stmt.slice(0, 80).replace(/\s+/g, ' ');
    console.log(`→ ${preview}...`);
    // neon の sql は tagged template が必須。動的 DDL には sql.query を使う
    await sql.query(stmt);
  }
  console.log('✅ migration 0010_ai_config 適用完了');
}

main().catch((err) => {
  console.error('❌ 失敗:', err);
  process.exit(1);
});
