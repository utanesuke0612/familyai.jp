/**
 * lib/repositories/lessons-progress.ts
 * familyai.jp — AIctation/VOA レッスン進捗の DB 操作層（R3-機能3 Phase 3）
 *
 * 用途:
 *   - 試行回数（attempts）の累積
 *   - 完璧達成（status='completed'）の記録
 *   - マイページでの進捗一覧取得
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { lessonsProgress, type LessonProgressRow } from '@/lib/db/schema';

/** 同一ユーザー × 同一レッスンの 1 行を取得（無ければ null） */
export async function getLessonProgress(
  userId:    string,
  lessonKey: string,
): Promise<LessonProgressRow | null> {
  const [row] = await db
    .select()
    .from(lessonsProgress)
    .where(and(
      eq(lessonsProgress.userId,    userId),
      eq(lessonsProgress.lessonKey, lessonKey),
    ))
    .limit(1);
  return row ?? null;
}

/** ユーザーの全進捗を新しい順で取得（マイページ用） */
export async function listUserProgress(userId: string): Promise<LessonProgressRow[]> {
  return db
    .select()
    .from(lessonsProgress)
    .where(eq(lessonsProgress.userId, userId))
    .orderBy(desc(lessonsProgress.updatedAt))
    .limit(200);  // 上限（暴走防止）
}

/**
 * 「😓 もう一度やる」or「💪 頑張りました」押下時：
 *   - 行が無ければ INSERT（attempts=1）
 *   - 行があれば attempts +1（status は 'completed' なら維持）
 */
export async function recordAttempt(
  userId:    string,
  lessonKey: string,
): Promise<LessonProgressRow> {
  const [row] = await db
    .insert(lessonsProgress)
    .values({
      userId,
      lessonKey,
      status:   'in_progress',
      attempts: 1,
    })
    .onConflictDoUpdate({
      target: [lessonsProgress.userId, lessonsProgress.lessonKey],
      set: {
        attempts:  sql`${lessonsProgress.attempts} + 1`,
        updatedAt: new Date(),
        // status は変更しない（completed のまま attempts だけ増えるケースもある）
      },
    })
    .returning();
  if (!row) throw new Error('Failed to record attempt');
  return row;
}

/**
 * 「🌟 完璧」押下時：
 *   - 行が無ければ INSERT（attempts=1, completed）
 *   - 行があれば status='completed'・completed_at=now・attempts +1
 */
export async function markCompleted(
  userId:    string,
  lessonKey: string,
): Promise<LessonProgressRow> {
  const now = new Date();
  const [row] = await db
    .insert(lessonsProgress)
    .values({
      userId,
      lessonKey,
      status:      'completed',
      attempts:    1,
      completedAt: now,
    })
    .onConflictDoUpdate({
      target: [lessonsProgress.userId, lessonsProgress.lessonKey],
      set: {
        status:      'completed',
        attempts:    sql`${lessonsProgress.attempts} + 1`,
        completedAt: now,
        updatedAt:   now,
      },
    })
    .returning();
  if (!row) throw new Error('Failed to mark lesson completed');
  return row;
}
