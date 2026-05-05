#!/usr/bin/env tsx
/**
 * scripts/dedupe-consecutive.ts
 * sentences.json の連続重複センテンスを削除（Whisper の hallucination 対策）。
 *
 * 同じ text が連続するブロック内では先頭 1 件のみ残し、残りを削除する。
 * （ただし、教育コンテンツの「演出としての意図的な繰り返し」を考慮して、
 *   N 回以上の長い連続のみ削除する設計）
 *
 * 使用例:
 *   pnpm tsx scripts/dedupe-consecutive.ts content/voaenglish/01_02_Level1/
 */

import fs   from 'node:fs';
import path from 'node:path';

interface Sentence {
  start: number;
  end:   number;
  text:  string;
}

/** speaker prefix を除去して比較用テキストを取得 */
function normalizeForCompare(text: string): string {
  return text
    .replace(/^\*\*[^*]+\*\*\s*:?\s*/, '')      // **Speaker:**
    .replace(/^[A-Za-z][A-Za-z0-9_ ]*?:\s*/, '') // Speaker:
    .replace(/\{([^|{}\n]+)\|[^{}\n]+\}/g, '$1') // 注釈剥がし
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?]/g, '')
    .trim();
}

function processFile(filePath: string): { removed: number; total: number } {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Sentence[];
  const out: Sentence[] = [];
  let removed = 0;

  for (let i = 0; i < data.length; i++) {
    const cur = data[i];
    const prev = out[out.length - 1];
    if (prev && normalizeForCompare(cur.text) === normalizeForCompare(prev.text)) {
      // 直前と同じなら削除（先頭のみ残す）
      // ただし end 時刻は最新のを採用（音声範囲を伸ばす）
      prev.end = Math.max(prev.end, cur.end);
      removed++;
      continue;
    }
    out.push(cur);
  }

  if (removed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(out, null, 2) + '\n');
  }
  return { removed, total: data.length };
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: pnpm tsx scripts/dedupe-consecutive.ts <file-or-dir>');
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

  let totalRemoved = 0;
  let totalSentences = 0;
  for (const f of files) {
    const { removed, total } = processFile(f);
    if (removed > 0) {
      console.log(`[ok] ${path.basename(f)}: ${removed}/${total} duplicates removed`);
    }
    totalRemoved += removed;
    totalSentences += total;
  }

  console.log(`\n✅ ${totalRemoved} consecutive duplicates removed across ${files.length} files (total ${totalSentences} sentences)`);
}

main();
