#!/usr/bin/env tsx
/**
 * scripts/convert-srt.ts
 * familyai.jp — SRT/VTT → sentences.json 変換ツール（R3-機能3 Phase 2）
 *
 * 用途:
 *   Whisper や手動で生成した SRT/VTT を、AIctation センテンスプレイヤーが
 *   消費する `<lesson>.sentences.json` 形式に変換する。
 *
 * 使用例:
 *   pnpm db:convert-srt content/voaenglish/01_01_Anna/lesson-01.srt
 *     → content/voaenglish/01_01_Anna/lesson-01.sentences.json を生成
 *
 *   pnpm db:convert-srt content/voaenglish/01_01_Anna/
 *     → ディレクトリ内の .srt / .vtt を一括変換
 *
 * 出力フォーマット（shared/types `Sentence[]`）:
 *   [
 *     { "start": 6.72, "end": 11.84, "text": "DrJill: Hello and welcome..." },
 *     { "start": 11.639, "end": 12.759, "text": "DrJill: I am Dr." },
 *     ...
 *   ]
 *
 * 設計方針:
 *   - スピーカープレフィックス（"DrJill: "）は text に含めたまま（Q1=A 採用）
 *   - SRT の番号行は無視
 *   - 改行を含むテキストは半角スペースで結合
 *   - VTT のヘッダ（"WEBVTT" 等）は自動スキップ
 *   - タイムスタンプの逆順（end < 次の start 等）はそのまま保持（Whisper の重複セグメントは実用上問題なし）
 */

import fs   from 'node:fs';
import path from 'node:path';

// ── タイムスタンプ "HH:MM:SS,mmm" or "HH:MM:SS.mmm" を秒（小数）に変換 ──
function parseTimestamp(stamp: string): number {
  // SRT は "00:00:06,720"、VTT は "00:00:06.720" の形式
  const m = stamp.trim().match(/^(\d+):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!m) throw new Error(`Invalid timestamp: ${stamp}`);
  const [, hh, mm, ss, ms] = m;
  // ミリ秒は最大 3 桁（足りなければ 0 埋め扱い）
  const milli = Number((ms + '000').slice(0, 3));
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + milli / 1000;
}

interface Sentence {
  start: number;
  end:   number;
  text:  string;
}

/**
 * SRT/VTT 文字列を Sentence[] にパース。
 * - "WEBVTT" や `NOTE` 行などの VTT メタデータは無視
 * - キュー番号行（数字のみ）は無視
 * - "HH:MM:SS,mmm --> HH:MM:SS,mmm" を発見したら次の空行までを 1 センテンスとして取り込む
 */
export function parseSrtToSentences(input: string): Sentence[] {
  // CRLF / CR を LF に正規化
  const normalized = input.replace(/\r\n|\r/g, '\n');
  const lines = normalized.split('\n');
  const out: Sentence[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // タイムスタンプ行を探す
    const tsMatch = line.match(
      /^(\d+:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d+:\d{2}:\d{2}[,.]\d{1,3})/,
    );
    if (!tsMatch) {
      i++;
      continue;
    }

    const start = parseTimestamp(tsMatch[1]);
    const end   = parseTimestamp(tsMatch[2]);

    // 次行から空行までをテキストとして集める
    const textLines: string[] = [];
    i++;
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i].trim());
      i++;
    }
    const text = textLines.join(' ').trim();
    if (text.length > 0) {
      out.push({ start, end, text });
    }
    // 空行をスキップ
    while (i < lines.length && lines[i].trim() === '') i++;
  }

  return out;
}

// ── 1 ファイル変換 ────────────────────────────────────────────
function convertFile(srtPath: string): { ok: boolean; outPath: string; count: number } {
  const raw = fs.readFileSync(srtPath, 'utf-8');
  const sentences = parseSrtToSentences(raw);

  // 出力先：<同ディレクトリ>/<basename>.sentences.json
  const dir      = path.dirname(srtPath);
  const baseName = path.basename(srtPath).replace(/\.(srt|vtt)$/i, '');
  const outPath  = path.join(dir, `${baseName}.sentences.json`);

  fs.writeFileSync(outPath, JSON.stringify(sentences, null, 2) + '\n', 'utf-8');
  return { ok: true, outPath, count: sentences.length };
}

// ── ディレクトリ一括変換 ──────────────────────────────────────
function convertDir(dirPath: string): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const targets = entries
    .filter((e) => e.isFile() && /\.(srt|vtt)$/i.test(e.name))
    .map((e) => path.join(dirPath, e.name));

  if (targets.length === 0) {
    console.log(`[convert-srt] no .srt/.vtt files in ${dirPath}`);
    return;
  }

  for (const f of targets) {
    const res = convertFile(f);
    console.log(`[convert-srt] ${path.basename(f)} → ${path.basename(res.outPath)} (${res.count} sentences)`);
  }
}

// ── CLI エントリポイント ──────────────────────────────────────
function main(): void {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage:');
    console.error('  pnpm db:convert-srt <path-to-srt-or-vtt-or-dir>');
    console.error('Examples:');
    console.error('  pnpm db:convert-srt content/voaenglish/01_01_Anna/lesson-01.srt');
    console.error('  pnpm db:convert-srt content/voaenglish/01_01_Anna/');
    process.exit(1);
  }

  const target = path.resolve(arg);
  if (!fs.existsSync(target)) {
    console.error(`[convert-srt] file or directory not found: ${target}`);
    process.exit(1);
  }

  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    convertDir(target);
  } else if (stat.isFile()) {
    if (!/\.(srt|vtt)$/i.test(target)) {
      console.error(`[convert-srt] unsupported extension: ${target}`);
      process.exit(1);
    }
    const res = convertFile(target);
    console.log(`[convert-srt] ${path.basename(target)} → ${path.basename(res.outPath)} (${res.count} sentences)`);
  }
}

// このファイルが直接実行された場合のみ main() を起動（テストからは parseSrtToSentences のみ参照）
if (require.main === module) {
  main();
}
