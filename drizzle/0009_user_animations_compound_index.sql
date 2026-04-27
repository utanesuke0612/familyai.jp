-- うごくAI教室: user_animations の複合インデックス追加
--
-- 実クエリ: SELECT ... WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
-- （lib/repositories/animations.ts: listUserAnimations）
--
-- 単一インデックス user_id だけだと、Postgres は user_id で絞り込み後に
-- in-memory ソートする。複合インデックスを (user_id, created_at DESC) で
-- 作っておくと、インデックスをそのままソート済みとして使えるためソート不要。
CREATE INDEX IF NOT EXISTS "user_animations_user_id_created_at_idx"
  ON "user_animations" ("user_id", "created_at" DESC);

-- 補足:
-- 既存の単一インデックス user_animations_user_id_idx は、複合インデックスでも
-- 先頭カラムが user_id のため等価検索でカバーされる（単独で参照されることは
-- 実コード上ない）。ただしディスク容量への影響は軽微なので、安全側に倒して
-- このマイグレーションでは削除しない。将来的に不要と判断したら別途削除可能。
