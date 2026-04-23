/**
 * lib/db/seed.ts
 * familyai.jp — 初期シードデータ投入スクリプト
 *
 * 実行方法:
 *   pnpm db:seed
 *
 * ⚠️ 既存レコード（同一 slug）はスキップ（onConflictDoNothing）
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle }  from 'drizzle-orm/neon-http';
import { neon }     from '@neondatabase/serverless';
import { articles } from './schema';

const db = drizzle(neon(process.env.DATABASE_URL!));

const seedArticles = [
  {
    slug:        'english-learning-voice-ai',
    title:       '音声AIで毎日10分の英語練習を習慣にする方法',
    description: 'AIと会話することで発音・リスニング・スピーキングを同時に鍛えられます。',
    body: `## 毎日10分でOK！音声AIで英語が話せるようになる

英会話スクールに通わなくても、スマホの音声AIと話すだけで発音・リスニング・スピーキングを毎日鍛えられます。

## おすすめの音声AI練習ツール

### ① ChatGPT（音声モード）
- スマホアプリで「音声会話」ボタンをタップするだけ
- 日本語で「英語の先生として会話練習してください」と言えばすぐスタート

### ② Google アシスタント
- 「OK Google, let's talk in English」で始められる
- 発音を聞き取ってもらう練習になる

## 毎日10分の練習メニュー

\`\`\`
【準備】ChatGPTアプリの音声モードを起動

【3分】自己紹介の練習
→「Please be my English teacher. Let's start with self-introduction.」

【4分】今日の出来事を英語で話す
→「今日あったことを英語で話すので、間違いを直してください」

【3分】発音フィードバックをもらう
→「私の発音で気になるところを教えてください」
\`\`\`

## まとめ

毎日10分、AIと話すだけ。英会話スクールより手軽で、自分のペースで続けられます。`,
    categories:  ['education'],
    level:       'intermediate',
    published:   true,
    publishedAt: new Date('2026-04-17'),
  },
  {
    slug:        'ai-homework-helper',
    title:       '子どもの宿題をAIで楽しく教える方法',
    description: '子どもが「わからない」と言ったときの強い味方。AIを使って、お父さん・お母さんも一緒に楽しく学べます。',
    body: `## AIは「もう一人の先生」

子どもの宿題でわからないことが出てきたとき、AIがわかりやすく説明してくれます。難しい算数も、理科の実験も、お父さん・お母さんと一緒にAIに聞いてみましょう。

## 算数の説明を頼む

**プロンプト例：**

\`\`\`
小学3年生でもわかるように、かけ算の意味を
絵や例を使って教えてください。
\`\`\`

\`\`\`
分数の足し算のやり方を、具体的な例（ピザなど）
を使って小学4年生向けに説明してください。
\`\`\`

## 作文・読書感想文のサポート

AIに完成させてもらうのではなく、「一緒に考える道具」として使いましょう。

\`\`\`
「走れメロス」の読書感想文を書きます。
メロスの行動で印象に残ったことについて、
どんなことを書けばいいか、アイデアを5つ教えてください。
（文章は自分で書きます）
\`\`\`

## まとめ

AIは「答えを教えてくれる機械」ではなく「一緒に考えてくれる相手」として使うのが最もよい使い方です。`,
    categories:  ['education'],
    level:       'beginner',
    published:   true,
    publishedAt: new Date('2026-04-07'),
  },
] as const;

async function seed() {
  console.log('🌱 シードデータの投入を開始します...\n');

  let inserted = 0;
  let skipped  = 0;

  for (const article of seedArticles) {
    try {
      const result = await db
        .insert(articles)
        .values(article)
        .onConflictDoNothing({ target: articles.slug });

      const affected = (result as unknown as { rowCount?: number }).rowCount ?? 1;
      if (affected === 0) {
        console.log(`  ⏭  スキップ: ${article.slug}`);
        skipped++;
      } else {
        console.log(`  ✅  追加:   ${article.slug}`);
        inserted++;
      }
    } catch (err) {
      console.error(`  ❌  エラー: ${article.slug}`, err);
    }
  }

  console.log(`\n✨ 完了: ${inserted} 件追加、${skipped} 件スキップ`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('シードエラー:', err);
  process.exit(1);
});
