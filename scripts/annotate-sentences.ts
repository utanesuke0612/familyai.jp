#!/usr/bin/env tsx
/**
 * scripts/annotate-sentences.ts
 * familyai.jp — sentences.json の本文に注釈構文 `{word|meaning|pron|example}` を
 * 一括追加するツール。家庭学習者がつまずきそうな単語を AI が選んで注釈付け。
 *
 * 使用例:
 *   pnpm tsx scripts/annotate-sentences.ts content/voaenglish/01_01_Anna/lesson-01.sentences.json
 *     → 同ファイルを上書き（注釈付きの text に変換）
 *
 *   pnpm tsx scripts/annotate-sentences.ts content/voaenglish/01_01_Anna/
 *     → ディレクトリ内の全 sentences.json を一括処理
 *
 * モデル: Claude 3.5 Haiku（OpenRouter 経由）
 * コスト目安: 1 lesson 約 1 円（80 文 ≒ 5K tokens 入出力）
 *
 * 設計:
 *   - 既に `{...}` 注釈が含まれている text はスキップ（再実行可能）
 *   - speaker prefix（"DrJill: " 等）は変更しない
 *   - LLM は「家庭学習者向けに難しそうな単語 1〜3 個」を選定
 *   - 失敗時は元のままにする（部分破損を防ぐ）
 */

import fs from 'node:fs';
import path from 'node:path';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY が設定されていません。.env.local を確認してください。');
  process.exit(1);
}

const MODEL = 'anthropic/claude-3.5-haiku';

// ── プロンプト ───────────────────────────────────────────────
const SYSTEM_PROMPT = `あなたは英語学習用コンテンツの編集者です。
家庭学習中の小学生〜中学生のために、英文の中で「つまずきそうな単語」に注釈を追加します。

## ルール
1. 各文（speaker プレフィックス除く本文）から、難しそうな単語を **0〜3 個** 選ぶ
   - 一般的すぎる単語（the, is, a, I, you, hello 等）は除外
   - 子供がつまずきそうな名詞・動詞・形容詞・副詞を優先
   - 既に注釈付き（{...}）の単語はそのまま保持
2. 選んだ単語を構文 \`{word|meaning|pron|example}\` で囲む
   - word: 元の単語そのまま（活用形を保つ）
   - meaning: 1〜3 個の日本語訳をスラッシュ区切り（例: "ようこそ"）
   - pron: IPA 発音記号（例: "/ˈwelkəm/"）
   - example: 短い英語例文（10 単語以内）
3. speaker プレフィックス（"DrJill: " "Anna: " 等）は変更しない
4. 入力に注釈不要なら、元の text をそのまま返す
5. 出力は JSON 配列のみ（前置き・コードブロック禁止）

## 入出力例
入力: [{"text": "DrJill: Hello and welcome to Let's Learn English with Anna."}]

出力: [{"text": "DrJill: Hello and {welcome|ようこそ|/ˈwelkəm/|Welcome to my home.} to Let's Learn English with Anna."}]

## 重要
- text フィールドのみ返却（start / end は呼び出し側で結合する）
- 配列の長さは入力と同じ
- 各 text の順序は入力と同じ
- 単語選定は控えめに（多すぎ NG・1 文 0〜2 個が理想）
- pron が分からない場合は省略可（{word|meaning} のみ）
`;

interface Sentence {
  start: number;
  end:   number;
  text:  string;
}

// 既に注釈付きかどうか
function hasAnnotation(text: string): boolean {
  return /\{[^|{}\n]+\|[^|{}\n]+/.test(text);
}

async function annotateBatch(sentences: Sentence[]): Promise<string[]> {
  // text のみ抽出して LLM へ
  const inputs = sentences.map((s) => ({ text: s.text }));

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
        { role: 'user',   content: JSON.stringify(inputs) },
      ],
      temperature: 0.2,
      max_tokens:  4000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${errText.slice(0, 300)}`);
  }

  const j = await res.json() as { choices: { message: { content: string } }[] };
  const raw = j.choices?.[0]?.message?.content?.trim() ?? '';

  // markdown コードブロックがあれば剥がす
  const stripped = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  // JSON パース
  let parsed: { text: string }[];
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    throw new Error(`JSON parse failed: ${(err as Error).message}\nRaw: ${stripped.slice(0, 500)}`);
  }

  if (!Array.isArray(parsed) || parsed.length !== sentences.length) {
    throw new Error(`Length mismatch: expected ${sentences.length}, got ${parsed.length}`);
  }

  return parsed.map((p) => p.text);
}

async function annotateFile(filePath: string): Promise<{ updated: number; skipped: number }> {
  const raw = fs.readFileSync(filePath, 'utf8');
  const sentences = JSON.parse(raw) as Sentence[];

  // 既に注釈付きの sentence をスキップ判定
  const allAnnotated = sentences.every((s) => hasAnnotation(s.text));
  if (allAnnotated) {
    console.log(`[skip] ${path.basename(filePath)} (already annotated)`);
    return { updated: 0, skipped: sentences.length };
  }

  // 30 文ずつバッチ処理（Haiku の 4K token 出力上限内に収める）
  const BATCH = 30;
  const results: string[] = [];
  for (let i = 0; i < sentences.length; i += BATCH) {
    const slice = sentences.slice(i, i + BATCH);
    process.stdout.write(`[batch] ${i + 1}-${Math.min(i + BATCH, sentences.length)}/${sentences.length}... `);
    const annotated = await annotateBatch(slice);
    results.push(...annotated);
    process.stdout.write('done\n');
  }

  // 元の start / end と合体
  const updated: Sentence[] = sentences.map((s, i) => ({
    start: s.start,
    end:   s.end,
    text:  results[i] ?? s.text,
  }));

  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
  return { updated: updated.length, skipped: 0 };
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: pnpm tsx scripts/annotate-sentences.ts <file-or-dir>');
    process.exit(1);
  }
  const absTarget = path.resolve(target);
  const stat = fs.statSync(absTarget);

  let files: string[];
  if (stat.isDirectory()) {
    files = fs.readdirSync(absTarget)
      .filter((f) => f.endsWith('.sentences.json'))
      .map((f) => path.join(absTarget, f))
      .sort();
  } else {
    files = [absTarget];
  }

  console.log(`[annotate] ${files.length} file(s) to process`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  for (const f of files) {
    try {
      const { updated, skipped } = await annotateFile(f);
      console.log(`[ok] ${path.basename(f)}: ${updated} sentences updated, ${skipped} skipped`);
      totalUpdated += updated;
      totalSkipped += skipped;
    } catch (err) {
      console.error(`[error] ${path.basename(f)}:`, (err as Error).message);
    }
  }

  console.log(`\n✅ done: ${totalUpdated} updated, ${totalSkipped} skipped (across ${files.length} file(s))`);
}

main();
