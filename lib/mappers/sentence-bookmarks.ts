/**
 * lib/mappers/sentence-bookmarks.ts
 * familyai.jp — user_sentence_bookmarks DB 行 → API DTO（shared/types 契約）変換
 *
 * Rev34 で新設。`lib/mappers/vocab-bookmarks.ts` と同じパターン。
 * iOS/Android クライアントが shared/api 経由で受け取る契約を保証する。
 */

import type { SentenceBookmarkItem } from '@/shared/types';

/** DB 行の最小型（lib/db/schema.ts:userSentenceBookmarks の select 結果） */
export interface SentenceBookmarkRow {
  sentenceId:  string;
  text:        string;
  textPlain:   string;
  startSec:    number;
  endSec:      number;
  speaker:     string | null;
  course:      string;
  lesson:      string;
  lessonTitle: string | null;
  audioUrl:    string | null;
  note:        string | null;
  addedAt:     number;
}

export function toSentenceBookmarkItem(row: SentenceBookmarkRow): SentenceBookmarkItem {
  return {
    id:          row.sentenceId,
    text:        row.text,
    textPlain:   row.textPlain,
    startSec:    row.startSec,
    endSec:      row.endSec,
    speaker:     row.speaker     ?? undefined,
    course:      row.course,
    lesson:      row.lesson,
    lessonTitle: row.lessonTitle ?? undefined,
    audioUrl:    row.audioUrl    ?? undefined,
    note:        row.note        ?? undefined,
    addedAt:     row.addedAt,
  };
}
