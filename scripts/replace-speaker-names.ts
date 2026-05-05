#!/usr/bin/env tsx
/**
 * scripts/replace-speaker-names.ts
 * familyai.jp — sentences.json の "Speaker N" 表記を実際のキャラクター名に置換。
 *
 * VOA "Let's Learn English with Anna" の登場人物パターンに基づく推定:
 *   Speaker 1 → DrJill   (毎回 "Hello, I'm Dr. Jill" と挨拶する番組ホスト)
 *   Speaker 2 → Anna     (treehouse の主人公)
 *   Speaker 3 → Max      (Anna の AI 助手・質問を運ぶロボット声)
 *   Speaker 4-9 → Students (学生インタビュー・lesson-01 の "Students:" 表記に揃える)
 *
 * 注意:
 *   - 高信頼ケースのみ自動置換。誤判定があれば手動で個別修正
 *   - "**Speaker 1:**" / "**Speaker 1 :**" / "Speaker 1:" 等の表記揺れに対応
 *   - 既に DrJill / Anna / Max 等になっているものはそのまま
 *
 * 使用例:
 *   pnpm tsx scripts/replace-speaker-names.ts content/voaenglish/01_01_Anna/
 */

import fs   from 'node:fs';
import path from 'node:path';

interface Sentence {
  start: number;
  end:   number;
  text:  string;
}

const MAPPING: Record<string, string> = {
  '1': 'DrJill',
  '2': 'Anna',
  '3': 'Max',
  '4': 'Students',
  '5': 'Students',
  '6': 'Students',
  '7': 'Students',
  '8': 'Students',
  '9': 'Students',
};

interface Counts {
  [k: string]: number;
}

function replaceSpeaker(text: string, counts: Counts): string {
  // 太字 markdown: "**Speaker 1:**", "**Speaker 1 :**", "**Speaker 1**:"
  let out = text.replace(
    /\*\*\s*Speaker\s+(\d+)\s*:?\s*\*\*\s*:?\s*/g,
    (_, num: string) => {
      const name = MAPPING[num];
      if (!name) return _; // 知らない番号はそのまま
      counts[name] = (counts[name] || 0) + 1;
      return `**${name}:** `;
    },
  );

  // 太字なし: "Speaker 1: ..."
  out = out.replace(
    /\bSpeaker\s+(\d+)\s*:\s*/g,
    (_, num: string) => {
      const name = MAPPING[num];
      if (!name) return _;
      counts[name] = (counts[name] || 0) + 1;
      return `${name}: `;
    },
  );

  return out;
}

function processFile(filePath: string): { changed: number; total: number; counts: Counts } {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Sentence[];
  const counts: Counts = {};
  let changed = 0;
  const updated = data.map((s) => {
    const newText = replaceSpeaker(s.text, counts);
    if (newText !== s.text) changed++;
    return { ...s, text: newText };
  });
  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
  }
  return { changed, total: data.length, counts };
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: pnpm tsx scripts/replace-speaker-names.ts <file-or-dir>');
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

  const totalCounts: Counts = {};
  let totalChanged = 0;

  for (const f of files) {
    const { changed, total, counts } = processFile(f);
    if (changed > 0) {
      const detail = Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(', ');
      console.log(`[ok] ${path.basename(f)}: ${changed}/${total} replaced (${detail})`);
      for (const [k, v] of Object.entries(counts)) {
        totalCounts[k] = (totalCounts[k] || 0) + v;
      }
      totalChanged += changed;
    }
  }

  console.log(`\n✅ ${totalChanged} sentences updated across ${files.length} files`);
  console.log('📋 置換タイプ別カウント:');
  for (const [k, v] of Object.entries(totalCounts)) {
    console.log(`   ${k.padEnd(10)} : ${v} 件`);
  }
}

main();
