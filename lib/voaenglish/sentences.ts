/**
 * lib/voaenglish/sentences.ts
 * familyai.jp — VOA レッスンのタイムスタンプ付きセンテンス読み込み（R3-機能3）
 *
 * 配置規約:
 *   content/voaenglish/<dir>/<slug>.sentences.json
 *   （Phase 2 の SRT 変換スクリプト `pnpm db:convert-srt` で生成）
 *
 * 例:
 *   content/voaenglish/01_01_Anna/lesson-01.sentences.json
 *
 * 解決ロジック:
 *   1. lessons.ts の `getLesson(course, slug)` から filename を取得（例: "01_01_Anna/lesson-01.md"）
 *   2. .md → .sentences.json に置換した相対パスを CONTENT_DIR と結合
 *   3. ファイルが存在しなければ null（プレイヤーは表示しない・骨格のみ）
 */

import { cache } from 'react';
import fs from 'node:fs';
import path from 'node:path';
import type { Sentence } from '@/shared/types';
import { getLesson } from './lessons';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'voaenglish');

/**
 * 指定レッスンのセンテンス配列を取得。
 * 見つからない／JSON パース失敗時は `null` を返す（プレイヤー非表示）。
 */
export const getLessonSentences = cache(
  (course: string, slug: string): Sentence[] | null => {
    const lesson = getLesson(course, slug);
    if (!lesson) return null;

    // lesson.filename は CONTENT_DIR 相対パス（例: "01_01_Anna/lesson-01.md"）
    const sentencesRel = lesson.filename.replace(/\.md$/, '.sentences.json');
    const sentencesAbs = path.join(CONTENT_DIR, sentencesRel);

    if (!fs.existsSync(sentencesAbs)) return null;

    try {
      const raw    = fs.readFileSync(sentencesAbs, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;

      // 必須フィールドの簡易バリデーション（壊れた JSON 由来の事故を防ぐ）
      const valid = parsed.every(
        (s) =>
          typeof s === 'object' && s !== null &&
          typeof s.start === 'number' &&
          typeof s.end   === 'number' &&
          typeof s.text  === 'string',
      );
      if (!valid) {
        console.warn(`[sentences] invalid format: ${sentencesRel}`);
        return null;
      }
      return parsed as Sentence[];
    } catch (err) {
      console.warn(
        `[sentences] read failed: ${sentencesRel}`,
        err instanceof Error ? err.message : String(err),
      );
      return null;
    }
  },
);
