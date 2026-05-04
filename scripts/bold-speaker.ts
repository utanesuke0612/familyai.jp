#!/usr/bin/env tsx
/**
 * scripts/bold-speaker.ts
 * familyai.jp — sentences.json の speaker prefix を markdown 太字に変換。
 *
 * 変換例:
 *   "DrJill: Hello..."   → "**DrJill:** Hello..."
 *   "Anna: Hi there"     → "**Anna:** Hi there"
 *   "Speaker 1: text..." → "**Speaker 1:** text..."
 *   既に `**` 付きの場合はスキップ（再実行可能）
 *
 * 使用例:
 *   pnpm tsx scripts/bold-speaker.ts content/voaenglish/01_01_Anna/
 */

import fs from 'node:fs';
import path from 'node:path';

interface Sentence {
  start: number;
  end:   number;
  text:  string;
}

// `Speaker: rest` を `**Speaker:** rest` に変換（既に `**` で始まっていればスキップ）
function boldifySpeaker(text: string): string {
  if (text.startsWith('**')) return text;
  // "Speaker: rest" or "Speaker N: rest"
  const m = text.match(/^([A-Za-z][A-Za-z0-9_ ]*?):\s*(.*)$/);
  if (!m) return text;
  const speaker = m[1].trim();
  const rest    = m[2];
  return `**${speaker}:** ${rest}`;
}

function processFile(filePath: string): { changed: number; total: number } {
  const raw       = fs.readFileSync(filePath, 'utf8');
  const sentences = JSON.parse(raw) as Sentence[];
  let changed = 0;
  const updated = sentences.map((s) => {
    const newText = boldifySpeaker(s.text);
    if (newText !== s.text) changed++;
    return { ...s, text: newText };
  });
  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
  }
  return { changed, total: sentences.length };
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: pnpm tsx scripts/bold-speaker.ts <file-or-dir>');
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

  let totalChanged = 0;
  let totalSentences = 0;
  for (const f of files) {
    const { changed, total } = processFile(f);
    console.log(`[ok] ${path.basename(f)}: ${changed}/${total} sentences boldified`);
    totalChanged += changed;
    totalSentences += total;
  }

  console.log(`\n✅ ${totalChanged}/${totalSentences} sentences updated across ${files.length} files`);
}

main();
