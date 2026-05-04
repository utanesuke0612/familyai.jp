/**
 * lib/repositories/ai-echo.ts
 * AI Echo — ai_echo_entries テーブル操作
 *
 * ログインユーザーが書いた英文 + AI フィードバックを保存・取得・削除する。
 * 未ログイン時は呼ばれない（呼び出し側で auth() チェック必須）。
 */

import { eq, desc, and } from 'drizzle-orm';
import { db }            from '@/lib/db';
import { aiEchoEntries } from '@/lib/db/schema';
import type { AiEchoEntry, NewAiEchoEntry } from '@/lib/db/schema';

/** 1 回分のフィードバックを保存して ID を返す */
export async function createAiEchoEntry(
  data: Omit<NewAiEchoEntry, 'id' | 'createdAt'>,
): Promise<string> {
  const [row] = await db
    .insert(aiEchoEntries)
    .values(data)
    .returning({ id: aiEchoEntries.id });
  if (!row) throw new Error('AI Echo の保存に失敗しました。');
  return row.id;
}

/**
 * ユーザーの履歴を新しい順で取得（最大 100 件）。
 * MyPage の AI Echo 履歴ページで使用。
 */
export async function listAiEchoEntries(userId: string): Promise<AiEchoEntry[]> {
  return db
    .select()
    .from(aiEchoEntries)
    .where(eq(aiEchoEntries.userId, userId))
    .orderBy(desc(aiEchoEntries.createdAt))
    .limit(100);
}

/**
 * 特定レッスンに紐づく履歴を新しい順で取得（最大 20 件）。
 * AIEchoPanel が「このレッスンの過去のフィードバック」表示に使う想定。
 */
export async function listAiEchoEntriesByLesson(
  userId:    string,
  lessonKey: string,
): Promise<AiEchoEntry[]> {
  return db
    .select()
    .from(aiEchoEntries)
    .where(and(eq(aiEchoEntries.userId, userId), eq(aiEchoEntries.lessonKey, lessonKey)))
    .orderBy(desc(aiEchoEntries.createdAt))
    .limit(20);
}

/**
 * 1 件削除（本人のみ）。削除した行があれば true。
 */
export async function deleteAiEchoEntry(id: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(aiEchoEntries)
    .where(and(eq(aiEchoEntries.id, id), eq(aiEchoEntries.userId, userId)))
    .returning({ id: aiEchoEntries.id });
  return result.length > 0;
}

/**
 * 1 件取得（本人のみ）。共有/監査用。
 */
export async function getAiEchoEntryById(
  id:     string,
  userId: string,
): Promise<AiEchoEntry | null> {
  const [row] = await db
    .select()
    .from(aiEchoEntries)
    .where(and(eq(aiEchoEntries.id, id), eq(aiEchoEntries.userId, userId)))
    .limit(1);
  return row ?? null;
}
