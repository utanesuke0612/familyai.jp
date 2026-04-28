/**
 * lib/mappers/vocab-bookmarks.ts
 * familyai.jp — user_vocab_bookmarks DB 行 → API DTO（shared/types 契約）変換
 *
 * iOS/Android クライアントが shared/api 経由で受け取る契約を保証する。
 * 既存パターン参考: lib/mappers/animations.ts
 */

import type { VocabItem } from '@/shared/types';

/** DB 行の最小型（lib/db/schema.ts:userVocabBookmarks の select 結果） */
export interface VocabBookmarkRow {
  vocabId:     string;
  word:        string;
  meaning:     string;
  pron:        string | null;
  example:     string | null;
  course:      string | null;
  lesson:      string | null;
  lessonTitle: string | null;
  addedAt:     number;
}

export function toVocabItem(row: VocabBookmarkRow): VocabItem {
  return {
    id:          row.vocabId,
    word:        row.word,
    meaning:     row.meaning,
    pron:        row.pron        ?? undefined,
    example:     row.example     ?? undefined,
    course:      row.course      ?? undefined,
    lesson:      row.lesson      ?? undefined,
    lessonTitle: row.lessonTitle ?? undefined,
    addedAt:     row.addedAt,
  };
}
