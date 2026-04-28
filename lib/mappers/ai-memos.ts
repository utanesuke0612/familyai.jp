/**
 * lib/mappers/ai-memos.ts
 * familyai.jp — user_ai_memos DB 行 → API DTO（shared/types 契約）変換
 *
 * iOS/Android クライアントが shared/api 経由で受け取る契約を保証する。
 * 既存パターン参考: lib/mappers/animations.ts
 */

import type { AiMemoItem } from '@/shared/types';

/** DB 行の最小型（lib/db/schema.ts:userAiMemos の select 結果） */
export interface AiMemoRow {
  memoId:       string;
  answer:       string;
  question:     string;
  articleTitle: string;
  articleSlug:  string | null;
  savedAt:      number;
}

export function toAiMemoItem(row: AiMemoRow): AiMemoItem {
  return {
    id:           row.memoId,
    answer:       row.answer,
    question:     row.question,
    articleTitle: row.articleTitle,
    articleSlug:  row.articleSlug ?? undefined,
    savedAt:      row.savedAt,
  };
}
