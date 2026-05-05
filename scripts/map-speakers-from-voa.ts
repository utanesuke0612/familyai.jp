#!/usr/bin/env tsx
/**
 * scripts/map-speakers-from-voa.ts
 * VOA 公式 transcript から、Whisper SRT の Speaker N に実際のキャラ名を割り当てる。
 *
 * 動作:
 *  1. VOA HTML から「Name: text」形式の対話文を抽出（Pete, Anna, Marsha 等）
 *  2. 各 SRT エントリの text を VOA 各行と単語類似度（Jaccard）で照合
 *  3. 高類似度（>= 50%）ならその VOA 行の話者を採用、未一致 narration は "Anna"
 *  4. SRT を `Speaker_Name: text` 形式で書き戻す
 *
 * 前提:
 *   - VOA 各 lesson の HTML が `--voa-dir` に保存済み（`lesson-XX.html`）
 *   - SRT が `--srt-dir` に保存済み（`lesson-XX.srt`）
 *
 * 使用例:
 *   pnpm tsx scripts/map-speakers-from-voa.ts \
 *     --srt-dir content/voaenglish/01_03_Level2 \
 *     --voa-dir /tmp/voa-pages \
 *     --lessons 1-30
 *
 *   # 個別指定:
 *   pnpm tsx scripts/map-speakers-from-voa.ts \
 *     --srt-dir content/voaenglish/01_02_Level1 \
 *     --voa-dir /tmp/voa-pages \
 *     --lessons 1,5,30
 */

import fs from 'node:fs';
import path from 'node:path';

interface CliArgs {
  srtDir:  string;
  voaDir:  string;
  lessons: string[];   // ["01", "02", ...]
}

function parseArgs(): CliArgs {
  const args: Record<string, string> = {};
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) {
      const key = process.argv[i].slice(2);
      args[key] = process.argv[++i] ?? '';
    }
  }
  if (!args['srt-dir'] || !args['voa-dir'] || !args['lessons']) {
    console.error('Usage: pnpm tsx scripts/map-speakers-from-voa.ts \\');
    console.error('  --srt-dir content/voaenglish/01_03_Level2 \\');
    console.error('  --voa-dir /tmp/voa-pages \\');
    console.error('  --lessons 1-30   # 範囲 or "1,5,30"');
    process.exit(1);
  }
  // lessons 解析: "1-30" または "1,5,30"
  const lessons: string[] = [];
  for (const part of args['lessons'].split(',')) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      const [a, b] = [parseInt(range[1], 10), parseInt(range[2], 10)];
      for (let i = a; i <= b; i++) lessons.push(String(i).padStart(2, '0'));
    } else {
      lessons.push(String(parseInt(part, 10)).padStart(2, '0'));
    }
  }
  return { srtDir: args['srt-dir'], voaDir: args['voa-dir'], lessons };
}

// ── VOA 対話抽出 ────────────────────────────────────
function extractVoaDialogue(html: string): Array<{ speaker: string; text: string }> {
  const start = html.indexOf('id="article-content"');
  if (start < 0) return [];
  let body = html.slice(start, start + 80000);
  body = body.replace(/<script[\s\S]*?<\/script>/g, '');
  body = body.replace(/<style[\s\S]*?<\/style>/g, '');

  let text = body.replace(/<[^>]+>/g, '\n');
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
              .replace(/&rsquo;|&lsquo;/g, "'").replace(/&hellip;/g, '...')
              .replace(/&ldquo;|&rdquo;/g, '"');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const dialogue: Array<{ speaker: string; text: string }> = [];
  for (const l of lines) {
    const m = l.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s*:\s+(.+)$/);
    if (m && !/^Embed|^Direct link|^http|Pop-out|^by /.test(l)) {
      dialogue.push({ speaker: m[1].trim(), text: m[2].trim() });
    }
  }
  return dialogue;
}

// ── テキスト類似度（Jaccard / contained ratio） ─────────────
function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(srtText: string, voaText: string): number {
  const sw = Array.from(new Set(normalize(srtText).split(' ').filter(Boolean)));
  const vw = new Set(normalize(voaText).split(' ').filter(Boolean));
  if (sw.length === 0 || vw.size === 0) return 0;
  let intersect = 0;
  for (const w of sw) if (vw.has(w)) intersect++;
  return intersect / sw.length;  // SRT 単語のうち VOA に含まれる割合
}

// ── SRT パース ──────────────────────────────────
interface SrtBlock {
  idLine: string;
  tsLine: string;
  text:   string;
}

function parseSrt(srt: string): SrtBlock[] {
  const blocks = srt.split(/\n\n+/).filter((b) => b.trim());
  return blocks.map((b) => {
    const lines = b.split('\n');
    return {
      idLine: lines[0],
      tsLine: lines[1] || '',
      text:   lines.slice(2).join(' ').trim(),
    };
  });
}

function stripSrtSpeaker(text: string): string {
  return text.replace(/^Speaker\s*\d+\s*:\s*/i, '').trim();
}

// ── メイン ────────────────────────────────────
const SIMILARITY_THRESHOLD = 0.5;
const NARRATION_DEFAULT = 'Anna';

const { srtDir, voaDir, lessons } = parseArgs();

for (const n of lessons) {
  const slug = `lesson-${n}`;
  const srtPath = path.join(srtDir, `${slug}.srt`);
  const voaPath = path.join(voaDir, `${slug}.html`);

  if (!fs.existsSync(srtPath) || !fs.existsSync(voaPath)) {
    console.log(`[skip] ${slug}: ファイルなし`);
    continue;
  }

  const srt = fs.readFileSync(srtPath, 'utf8');
  const voa = fs.readFileSync(voaPath, 'utf8');
  const dialogue = extractVoaDialogue(voa);
  const blocks   = parseSrt(srt);

  console.log(`\n=== ${slug} ===`);
  console.log(`VOA 対話: ${dialogue.length} 行・SRT エントリ: ${blocks.length} 個`);

  const stats = { matched: 0, narration: 0 };
  const charCount: Record<string, number> = {};

  const newBlocks = blocks.map((b) => {
    const cleanText = stripSrtSpeaker(b.text);

    let best: { score: number; speaker: string | null } = { score: 0, speaker: null };
    for (const d of dialogue) {
      const score = similarity(cleanText, d.text);
      if (score > best.score) best = { score, speaker: d.speaker };
    }

    let assigned: string;
    if (best.score >= SIMILARITY_THRESHOLD && best.speaker) {
      assigned = best.speaker;
      stats.matched++;
    } else {
      assigned = NARRATION_DEFAULT;
      stats.narration++;
    }
    charCount[assigned] = (charCount[assigned] || 0) + 1;

    const newText = `${assigned}: ${cleanText}`;
    return [b.idLine, b.tsLine, newText].join('\n');
  });

  console.log(`  ✅ VOA 一致: ${stats.matched}・narration→Anna: ${stats.narration}`);
  console.log(`  キャラ別カウント:`, charCount);

  fs.writeFileSync(srtPath, newBlocks.join('\n\n') + '\n');
}

console.log(`\n✅ Done. ${lessons.length} lesson processed.`);
