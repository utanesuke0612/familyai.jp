/**
 * scripts/sync-articles.ts
 * familyai.jp — Markdown記事 → Neon DB 同期スクリプト
 *
 * 実行方法:
 *   npm run db:sync
 *
 * 動作:
 *   content/articles/*.md を読み込み、DBにupsert（追加 or 更新）する
 *   ファイル名（拡張子なし）が slug になる
 *   例: content/articles/chatgpt-account-setup.md → slug: chatgpt-account-setup
 *
 * Markdownファイルの書き方:
 *   ---
 *   title: タイトル
 *   description: 一行説明
 *   categories: [basic]      # basic / office / cooking / study / health / design など
 *   level: beginner          # beginner / intermediate / advanced
 *   published: true          # false にすると非公開（DBには入るが表示されない）
 *   publishedAt: 2026-04-01  # 公開日（YYYY-MM-DD）
 *   audioUrl: ~              # 音声URLがある場合のみ記入（なければ ~ か省略）
 *   ---
 *
 *   本文（Markdown）をここに書く
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import fs         from 'fs';
import path       from 'path';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon }    from '@neondatabase/serverless';
import { articles } from '../lib/db/schema';
import { eq }       from 'drizzle-orm';

const db = drizzle(neon(process.env.DATABASE_URL!));

// content/articles/ フォルダのパス
const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles');

type FrontmatterValue = string | boolean | null | string[];

function parseScalar(value: string): string | boolean | null {
  const trimmed = value.trim();

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === '~' || trimmed === 'null') return null;

  return trimmed;
}

function parseFrontmatter(raw: string): { data: Record<string, FrontmatterValue>; content: string } {
  if (!raw.startsWith('---\n')) {
    return { data: {}, content: raw };
  }

  const endIndex = raw.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    return { data: {}, content: raw };
  }

  const fmText = raw.slice(4, endIndex);
  const content = raw.slice(endIndex + 5);
  const data: Record<string, FrontmatterValue> = {};
  const lines = fmText.split('\n');

  let currentKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (line.startsWith('  - ') || line.startsWith('- ')) {
      if (!currentKey) continue;
      const item = line.replace(/^\s*-\s*/, '').trim();
      const currentValue = data[currentKey];
      if (Array.isArray(currentValue)) {
        currentValue.push(item);
      } else {
        data[currentKey] = [item];
      }
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    currentKey = key;

    if (!rawValue) {
      data[key] = [];
      continue;
    }

    data[key] = parseScalar(rawValue);
  }

  return { data, content };
}

function toStringArray(value: FrontmatterValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}

async function syncArticles() {
  console.log('🔄 Markdown記事 → DB 同期を開始します...\n');

  // .md ファイルを全件取得
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.md'));

  if (files.length === 0) {
    console.log('⚠️  content/articles/ に .md ファイルが見つかりません');
    process.exit(0);
  }

  let inserted = 0;
  let updated  = 0;
  let skipped  = 0;

  for (const file of files) {
    const slug     = file.replace(/\.md$/, '');
    const filePath = path.join(ARTICLES_DIR, file);
    const raw      = fs.readFileSync(filePath, 'utf-8');

    // frontmatter と本文を分離
    const { data, content } = parseFrontmatter(raw);

    // 必須フィールドチェック
    if (!data.title || !data.categories || !data.level) {
      console.log(`  ⚠️  スキップ（必須フィールド不足）: ${file}`);
      skipped++;
      continue;
    }

    const record = {
      slug,
      title:       String(data.title),
      description: data.description ? String(data.description) : null,
      body:        content.trim(),
      categories:  toStringArray(data.categories),
      level:       String(data.level) as 'beginner' | 'intermediate' | 'advanced',
      published:   data.published === true,
      publishedAt: typeof data.publishedAt === 'string' ? new Date(data.publishedAt) : null,
      audioUrl:    (data.audioUrl && data.audioUrl !== '~') ? String(data.audioUrl) : null,
    };

    try {
      // 既存レコードを確認
      const existing = await db
        .select({ slug: articles.slug })
        .from(articles)
        .where(eq(articles.slug, slug));

      if (existing.length > 0) {
        // 既存 → 更新（upsert）
        await db
          .update(articles)
          .set({ ...record, updatedAt: new Date() })
          .where(eq(articles.slug, slug));
        console.log(`  🔁  更新: ${slug}`);
        updated++;
      } else {
        // 新規 → 追加
        await db.insert(articles).values(record);
        console.log(`  ✅  追加: ${slug}`);
        inserted++;
      }
    } catch (err) {
      console.error(`  ❌  エラー: ${slug}`, err);
    }
  }

  console.log(`\n✨ 完了: ${inserted} 件追加、${updated} 件更新、${skipped} 件スキップ`);
  console.log(`   合計 ${files.length} ファイルを処理しました`);
  process.exit(0);
}

syncArticles().catch((err) => {
  console.error('同期エラー:', err);
  process.exit(1);
});
