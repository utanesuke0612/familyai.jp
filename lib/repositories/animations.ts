/**
 * lib/repositories/animations.ts
 * うごくAI教室 — user_animations テーブル操作
 */

import { cache }          from 'react';
import { eq, desc, and }  from 'drizzle-orm';
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

/**
 * IDからアニメーションを取得（React.cache でリクエスト単位メモ化）。
 * 同じリクエスト内で複数回呼ばれても DB クエリは 1 回しか走らない。
 *
 * 用途: Server Component の generateMetadata と Page 本体で同じ animation を取得する際、
 * クエリの重複を防ぐ（例: app/(site)/share/[id]/page.tsx）。
 */
export const getAnimationByIdCached = cache(getAnimationById);

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
    .where(and(eq(userAnimations.id, id), eq(userAnimations.userId, userId)))
    .returning({ id: userAnimations.id });
  return result.length > 0;
}

// ─── R3-U1: お気に入り / カスタムタイトル更新 ─────────────────

/** 部分更新できるフィールド */
export interface UpdateAnimationPatch {
  /** お気に入り（⭐）の ON/OFF */
  isFavorite?:  boolean;
  /**
   * ユーザーが付け直したタイトル。
   * - 文字列を渡せばその値で上書き（trim され空文字なら null 化）
   * - null を明示すれば DB 上 NULL に戻す（元の theme を表示）
   */
  customTitle?: string | null;
  /** 公開フラグ（R3-K3・migration 0012） */
  isPublic?:    boolean;
}

/**
 * アニメーションのメタ情報を更新する（本人のみ・migration 0011 対応）。
 * 更新成功すれば true、対象が存在しないか他人のものなら false。
 */
export async function updateAnimation(
  id:     string,
  userId: string,
  patch:  UpdateAnimationPatch,
): Promise<boolean> {
  // 渡されたフィールドだけを set 対象にする
  const set: Partial<{
    isFavorite:  boolean;
    customTitle: string | null;
    isPublic:    boolean;
  }> = {};
  if (patch.isFavorite !== undefined) set.isFavorite = patch.isFavorite;
  if (patch.isPublic   !== undefined) set.isPublic   = patch.isPublic;
  if (patch.customTitle !== undefined) {
    if (patch.customTitle === null) {
      set.customTitle = null;
    } else {
      const trimmed = patch.customTitle.trim();
      set.customTitle = trimmed.length === 0 ? null : trimmed;
    }
  }
  // 何も更新フィールドがなければ no-op で true 扱い（呼び出し側のフロー単純化）
  if (Object.keys(set).length === 0) return true;

  const result = await db
    .update(userAnimations)
    .set(set)
    .where(and(eq(userAnimations.id, id), eq(userAnimations.userId, userId)))
    .returning({ id: userAnimations.id });
  return result.length > 0;
}
