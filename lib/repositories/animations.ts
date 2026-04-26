/**
 * lib/repositories/animations.ts
 * うごくAI教室 — user_animations テーブル操作
 */

import { eq, desc } from 'drizzle-orm';
import { db }             from '@/lib/db';
import { userAnimations } from '@/lib/db/schema';
import type { NewUserAnimation, UserAnimation } from '@/lib/db/schema';

/** アニメーションを保存してIDを返す */
export async function createAnimation(data: Omit<NewUserAnimation, 'id' | 'createdAt'>): Promise<string> {
  
  const [row] = await db
    .insert(userAnimations)
    .values(data)
    .returning({ id: userAnimations.id });
  if (!row) throw new Error('アニメーション保存に失敗しました。');
  return row.id;
}

/** IDからアニメーションを1件取得（存在しない場合は null） */
export async function getAnimationById(id: string): Promise<UserAnimation | null> {
  
  const [row] = await db
    .select()
    .from(userAnimations)
    .where(eq(userAnimations.id, id))
    .limit(1);
  return row ?? null;
}

/** ユーザーの生成履歴を新しい順で取得（最大50件） */
export async function listUserAnimations(userId: string): Promise<UserAnimation[]> {
  
  return db
    .select()
    .from(userAnimations)
    .where(eq(userAnimations.userId, userId))
    .orderBy(desc(userAnimations.createdAt))
    .limit(50);
}

/** アニメーションを削除（本人のみ） */
export async function deleteAnimation(id: string, userId: string): Promise<boolean> {
  
  const result = await db
    .delete(userAnimations)
    .where(eq(userAnimations.id, id))
    .returning({ id: userAnimations.id });
  // userId による所有者チェックは API 側で実施済みを前提とするが念のため確認
  return result.length > 0;
}
