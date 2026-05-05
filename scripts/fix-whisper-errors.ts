#!/usr/bin/env tsx
/**
 * scripts/fix-whisper-errors.ts
 * familyai.jp — sentences.json の Whisper 誤認識を一括修正。
 *
 * 修正対象:
 *   1. "Chill"     → "Jill"     (Dr. Jill が Dr. Chill と認識される)
 *   2. "Ana,"      → "Anna,"    (呼びかけの "Anna," が "Ana," になる)
 *   3. " Ana "     → " Anna "   (本文中の "Ana" → "Anna")
 *   4. "weepers"   → "Meepers"  (猫の名前)
 *   5. "bass"      → "bats"     (動物文脈・コウモリ)・楽器文脈は対象外
 *   6. "bathouse"  → "bat house"
 *   7. "Audon"     → 削除（謎単語）
 *   8. lesson-36 末尾の不適切センテンス削除（"If you don't want the penis,"）
 *
 * 注意:
 *   - 大文字小文字を考慮した置換
 *   - "bass" は動物文脈のみ修正（楽器の bass は残す → 個別判定）
 *   - 注釈構文 {word|...} 内も対象（再注釈は別途必要）
 *
 * 使用例:
 *   pnpm tsx scripts/fix-whisper-errors.ts content/voaenglish/01_01_Anna/
 */

import fs   from 'node:fs';
import path from 'node:path';

interface Sentence {
  start: number;
  end:   number;
  text:  string;
}

/** 単純な単語境界置換（大文字小文字を保持） */
function replaceWord(text: string, from: string, to: string): { text: string; changed: number } {
  // 単語境界 \b で囲み、置換
  // 「from」が大文字始まりなら大文字で、小文字なら小文字で置換（ただし固有名詞は固定）
  const re = new RegExp(`\\b${from}\\b`, 'g');
  let count = 0;
  const out = text.replace(re, () => { count++; return to; });
  return { text: out, changed: count };
}

interface FixCounts {
  [key: string]: number;
}

function fixSentence(text: string, ctx: { slug: string; idx: number }, counts: FixCounts): string {
  let t = text;

  // 1. "Chill" → "Jill" (Dr. Chill / standalone Chill)
  {
    const r = replaceWord(t, 'Chill', 'Jill');
    if (r.changed) {
      counts.chill = (counts.chill || 0) + r.changed;
      t = r.text;
    }
  }

  // 2-3. "Ana" → "Anna" (固有名詞・本文中・呼びかけ全てカバー)
  {
    const r = replaceWord(t, 'Ana', 'Anna');
    if (r.changed) {
      counts.ana = (counts.ana || 0) + r.changed;
      t = r.text;
    }
  }

  // 4. "weepers" → "Meepers" (大文字小文字両方)
  {
    let count = 0;
    t = t.replace(/\bweepers\b/g, () => { count++; return 'Meepers'; });
    t = t.replace(/\bWeepers\b/g, () => { count++; return 'Meepers'; });
    if (count) counts.weepers = (counts.weepers || 0) + count;
  }

  // 5. "bass" → "bats" (動物文脈のみ・bat house / flying / cave などキーワード周辺)
  //    楽器文脈の bass は残す（lesson-34 で発生）
  {
    // この lesson のテキスト全体に "fly" "cave" "wing" などが多ければ動物文脈
    // 簡易判定: lesson 23 のみ対象（明確に動物文脈）
    if (ctx.slug === 'lesson-23' && /\bbass\b/.test(t)) {
      const r = replaceWord(t, 'bass', 'bats');
      if (r.changed) {
        counts.bass = (counts.bass || 0) + r.changed;
        t = r.text;
      }
    }
  }

  // 6. "bathouse" → "bat house"
  {
    let count = 0;
    t = t.replace(/\bbathouse\b/gi, (m) => {
      count++;
      // 大文字始まりなら "Bat house"、それ以外は "bat house"
      return /^B/.test(m) ? 'Bat house' : 'bat house';
    });
    if (count) counts.bathouse = (counts.bathouse || 0) + count;
  }

  // 7. "Audon" → 削除（注釈構文ごと取り除く）
  {
    // {Audon|...} 形式で囲まれている場合は構文ごと削除
    const before = t;
    t = t.replace(/\{Audon\|[^}]*\}/g, '');
    t = t.replace(/\bAudon\b/g, '');
    // 連続する句読点や空白を整理
    t = t.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
    if (t !== before) counts.audon = (counts.audon || 0) + 1;
  }

  return t;
}

function processFile(filePath: string): { changed: number; total: number; counts: FixCounts; removedIdx: number[] } {
  const slug = path.basename(filePath, '.sentences.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Sentence[];
  const counts: FixCounts = {};
  const removedIdx: number[] = [];
  let changed = 0;

  // 8. lesson-36 末尾の "If you don't want..." を削除
  let filtered: Sentence[] = data;
  if (slug === 'lesson-36') {
    filtered = data.filter((s, i) => {
      // "If you don't want the penis" を含む sentence を除去
      const plain = s.text.replace(/\{[^}]+\}/g, ' ').toLowerCase();
      if (plain.includes("don't want the penis") || plain.includes('want the penis')) {
        removedIdx.push(i);
        return false;
      }
      return true;
    });
  }

  // 各 sentence を修正
  const fixed = filtered.map((s, i) => {
    const newText = fixSentence(s.text, { slug, idx: i }, counts);
    if (newText !== s.text) changed++;
    return { ...s, text: newText };
  });

  // 変更があれば書き戻し
  if (changed > 0 || removedIdx.length > 0) {
    fs.writeFileSync(filePath, JSON.stringify(fixed, null, 2) + '\n');
  }

  return { changed, total: fixed.length, counts, removedIdx };
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: pnpm tsx scripts/fix-whisper-errors.ts <file-or-dir>');
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

  const totalCounts: FixCounts = {};
  let totalChanged = 0;
  let totalRemoved = 0;

  for (const f of files) {
    const { changed, total, counts, removedIdx } = processFile(f);
    if (changed > 0 || removedIdx.length > 0) {
      const detail: string[] = [];
      for (const [k, v] of Object.entries(counts)) {
        if (v > 0) {
          detail.push(`${k}:${v}`);
          totalCounts[k] = (totalCounts[k] || 0) + v;
        }
      }
      if (removedIdx.length > 0) detail.push(`removed:${removedIdx.length}`);
      console.log(`[ok] ${path.basename(f)}: ${changed}/${total} fixed (${detail.join(', ')})`);
      totalChanged += changed;
      totalRemoved += removedIdx.length;
    }
  }

  console.log(`\n✅ ${totalChanged} sentences fixed, ${totalRemoved} removed across ${files.length} files`);
  console.log('📋 修正タイプ別カウント:');
  for (const [k, v] of Object.entries(totalCounts)) {
    console.log(`   ${k.padEnd(10)} : ${v} 件`);
  }
}

main();
