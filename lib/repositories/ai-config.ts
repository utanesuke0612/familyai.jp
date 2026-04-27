/**
 * lib/repositories/ai-config.ts
 * familyai.jp — AI教室パイプライン設定の DB アクセス層
 *
 * 1行限定の ai_config テーブルと、変更履歴 ai_config_history を扱う。
 * 値は AiKyoshitsuConfig の Partial（管理画面で設定したフィールドだけ）。
 * 未設定フィールドは shared/constants の DEFAULTS が使われる。
 */

import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { aiConfig, aiConfigHistory } from '@/lib/db/schema';
import type { AiKyoshitsuConfig } from '@/shared/types';

/** ai_config テーブルの単一行 ID（1行限定運用） */
const AI_CONFIG_ROW_ID = 1;

/** 履歴の保持件数（直近 N 件のみ保持・古いものは自動削除） */
const HISTORY_KEEP_COUNT = 10;

/**
 * 現在保存されている AI設定（Partial）を取得する。
 * 行が存在しない場合は空オブジェクトを返す（DEFAULTS が使われる）。
 */
export async function getAiConfigFromDb(): Promise<Partial<AiKyoshitsuConfig>> {
  const [row] = await db
    .select()
    .from(aiConfig)
    .where(eq(aiConfig.id, AI_CONFIG_ROW_ID))
    .limit(1);
  if (!row) return {};
  // jsonb 列なので Drizzle が自動 JSON.parse 済み
  return (row.config as Partial<AiKyoshitsuConfig>) ?? {};
}

/**
 * AI設定を保存する。
 * - ai_config に upsert（id=1 を上書き or 新規作成）
 * - ai_config_history に1件追加
 * - 履歴を直近 HISTORY_KEEP_COUNT 件に剪定
 *
 * @param config     保存する設定（Partial）
 * @param changedBy  変更者メールアドレス
 * @param changeNote 変更理由（任意）
 */
export async function saveAiConfig(
  config:     Partial<AiKyoshitsuConfig>,
  changedBy:  string,
  changeNote?: string,
): Promise<void> {
  // 1. ai_config を upsert
  await db
    .insert(aiConfig)
    .values({
      id:        AI_CONFIG_ROW_ID,
      config,
      updatedBy: changedBy,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: aiConfig.id,
      set: {
        config,
        updatedBy: changedBy,
        updatedAt: new Date(),
      },
    });

  // 2. 履歴を追加
  await db.insert(aiConfigHistory).values({
    config,
    changedBy,
    changeNote: changeNote ?? null,
  });

  // 3. 古い履歴を剪定（直近 HISTORY_KEEP_COUNT 件のみ保持）
  await pruneHistory();
}

/**
 * 設定をリセット（DBの行を削除して DEFAULTS を使うようにする）。
 * 履歴には「リセット」イベントを残す。
 */
export async function resetAiConfig(
  changedBy:  string,
  changeNote?: string,
): Promise<void> {
  await db.delete(aiConfig).where(eq(aiConfig.id, AI_CONFIG_ROW_ID));
  await db.insert(aiConfigHistory).values({
    config:     {} as Partial<AiKyoshitsuConfig>,
    changedBy,
    changeNote: changeNote ?? 'リセット（DEFAULTS に戻す）',
  });
  await pruneHistory();
}

/**
 * 変更履歴を直近 limit 件取得（新しい順）。
 */
export async function getAiConfigHistory(limit: number = HISTORY_KEEP_COUNT) {
  return db
    .select()
    .from(aiConfigHistory)
    .orderBy(desc(aiConfigHistory.changedAt))
    .limit(limit);
}

/**
 * 履歴テーブルを直近 HISTORY_KEEP_COUNT 件に保つ。
 * 新規 INSERT 後に呼び出され、超過分を削除する。
 */
async function pruneHistory(): Promise<void> {
  // PostgreSQL: 直近 N 件以外を削除（id ベースで簡潔に）
  // SELECT id ORDER BY changed_at DESC LIMIT N の id 集合に含まれない行を削除
  const recent = await db
    .select({ id: aiConfigHistory.id })
    .from(aiConfigHistory)
    .orderBy(desc(aiConfigHistory.changedAt))
    .limit(HISTORY_KEEP_COUNT);

  if (recent.length < HISTORY_KEEP_COUNT) return;  // まだ N 件未満なら何もしない

  const lastId = recent[recent.length - 1].id;
  // 直近N件の最後（古い側）の changed_at より古い行を削除
  // 簡潔さのため id ベース: 直近N件以外 = id < lastId
  // ただし changed_at で並べ直しているので、id 順と一致しない可能性あり
  // 安全策: NOT IN サブクエリで削除
  const recentIds = recent.map((r) => r.id);
  // drizzle の NOT IN 構文: notInArray
  const { notInArray } = await import('drizzle-orm');
  await db.delete(aiConfigHistory).where(notInArray(aiConfigHistory.id, recentIds));
  // lastId は使わないが将来 changed_at ベース剪定に切替時のヒント用に残す
  void lastId;
}
