#!/usr/bin/env tsx
/**
 * scripts/generate-descriptions.ts
 * 各 lesson の sentences.json 内容を AI に渡して、frontmatter に追加する
 * 日本語の description を一括生成する。
 *
 * lesson-01 (Anna) のスタイルに揃える:
 *   "Dr. Jill が登場する初回レッスン。Anna のツリーハウスを訪ね、「あなたは誰？」という
 *    質問を通して **自己紹介の基本フレーズ**（Who are you? / I am ...）を学びます。"
 *
 * 出力:
 *   /tmp/descriptions-<courseSlug>.json
 *     { "lesson-01": "...", "lesson-02": "...", ... }
 *   後で別スクリプトで .md に流し込む
 */

import fs   from 'node:fs';
import path from 'node:path';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY が設定されていません。');
  process.exit(1);
}

const MODEL = 'anthropic/claude-3.5-haiku';

const SYSTEM_PROMPT = `あなたは英語学習コンテンツの編集者です。
VOA "Let's Learn English" のレッスン本文（英語）を読み、家族向けの教材として
日本語の "description" を作成します。

## ルール
1. 80〜180 文字の日本語（短く、読みやすく）
2. レッスンのテーマを 1 文目で明示
3. 「**重要なフレーズ**」を太字で 1 つだけ示す（その英語表現を () で添える）
4. 学習者が「何を学べるか」が分かる結びにする
5. 親しみやすい家庭学習向けの口調

## 出力フォーマット
JSON 配列のみ（前置き禁止・コードブロック禁止）:
[
  { "slug": "lesson-XX", "description": "..." }
]

## 例
入力: lesson-01 (Welcome!) - "Pete: Hi! Are you Anna? / Anna: Yes! / ..."
出力: { "slug": "lesson-01", "description": "Anna が引っ越してきたばかりのアパートで隣人 Pete と初対面。「**はじめまして**」（Nice to meet you / I'm Anna）と自己紹介の基本表現を学びます。" }

入力で渡される情報の各 lesson に対して 1 件ずつ description を返してください。
`;

interface Sentence {
  start: number;
  end:   number;
  text:  string;
}

function summarizeLesson(slug: string, title: string, sentences: Sentence[]): string {
  // 注釈を剥がして本文だけ抽出
  const plain = sentences.map((s) => {
    return s.text
      .replace(/\{([^|{}\n]+)\|[^{}\n]+\}/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1');
  });
  // 最大 30 文・2000 字に制限
  const sample = plain.slice(0, 30).join(' ').slice(0, 2000);
  return `slug: ${slug}\ntitle: ${title}\n本文（先頭抜粋）: ${sample}`;
}

async function generateBatch(items: Array<{ slug: string; title: string; sentences: Sentence[] }>): Promise<Array<{ slug: string; description: string }>> {
  const userMessage = items.map((it) => summarizeLesson(it.slug, it.title, it.sentences)).join('\n\n---\n\n');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage },
      ],
      temperature: 0.4,
      max_tokens:  4000,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 200)}`);
  }

  const j = await res.json() as { choices: { message: { content: string } }[] };
  const raw = j.choices?.[0]?.message?.content?.trim() ?? '';
  const stripped = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = JSON.parse(stripped);
  return parsed;
}

async function main() {
  const dir       = process.argv[2];
  const outPath   = process.argv[3];
  if (!dir || !outPath) {
    console.error('Usage: pnpm tsx scripts/generate-descriptions.ts <content-dir> <out-json>');
    process.exit(1);
  }

  // .md と .sentences.json を組にして集める
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  const items: Array<{ slug: string; title: string; sentences: Sentence[] }> = [];
  for (const f of files) {
    const slug = f.replace('.md', '');
    const md   = fs.readFileSync(path.join(dir, f), 'utf8');
    const titleMatch = md.match(/^title:\s*"?([^"\n]+?)"?\s*$/m);
    const title = titleMatch ? titleMatch[1] : slug;
    const sjPath = path.join(dir, `${slug}.sentences.json`);
    if (!fs.existsSync(sjPath)) {
      console.warn(`[skip] ${slug}: no sentences.json`);
      continue;
    }
    const sentences = JSON.parse(fs.readFileSync(sjPath, 'utf8')) as Sentence[];
    items.push({ slug, title, sentences });
  }

  console.log(`[descriptions] ${items.length} lessons to process`);

  // 10 件ずつバッチ
  const BATCH = 10;
  const allResults: Array<{ slug: string; description: string }> = [];
  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    process.stdout.write(`[batch] ${i + 1}-${Math.min(i + BATCH, items.length)}/${items.length}... `);
    try {
      const result = await generateBatch(slice);
      allResults.push(...result);
      process.stdout.write(`done (${result.length} descriptions)\n`);
    } catch (err) {
      process.stdout.write(`FAILED: ${(err as Error).message}\n`);
    }
  }

  // slug をキーに連想配列化して JSON 保存
  const map: Record<string, string> = {};
  for (const r of allResults) map[r.slug] = r.description;
  fs.writeFileSync(outPath, JSON.stringify(map, null, 2) + '\n');
  console.log(`\n✅ ${Object.keys(map).length} descriptions saved to ${outPath}`);
}

main();
