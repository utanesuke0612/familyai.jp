-- drizzle/0017_review_perf_indexes.sql
-- familyai.jp — Rev35 #perf: 一覧 API のフルスキャンを避けるための index 追加
--
-- 対象クエリ:
--   - GET /api/user/vocab-bookmarks       : WHERE user_id = ? ORDER BY added_at
--   - GET /api/user/ai-memos              : WHERE user_id = ? ORDER BY saved_at
--   - GET /api/admin/users                : ORDER BY created_at DESC, WHERE plan = ?
--
-- DESC 表記は付けない（B-tree は両方向スキャン可能）。
-- CONCURRENTLY は手動運用時のみ付与する想定（drizzle-kit migrate との互換のため
-- ここでは省略・本番適用時に `CREATE INDEX CONCURRENTLY` で発行可能）。

-- ── マイページ「単語帳」一覧 ───────────────────────────────────
CREATE INDEX IF NOT EXISTS "user_vocab_bookmarks_user_id_added_at_idx"
  ON "user_vocab_bookmarks" ("user_id", "added_at");

-- ── マイページ「AIメモ」一覧 ───────────────────────────────────
CREATE INDEX IF NOT EXISTS "user_ai_memos_user_id_saved_at_idx"
  ON "user_ai_memos" ("user_id", "saved_at");

-- ── 管理画面：ユーザー一覧 sort / プラン絞り込み ──────────────
CREATE INDEX IF NOT EXISTS "users_created_at_idx"
  ON "users" ("created_at");

CREATE INDEX IF NOT EXISTS "users_plan_idx"
  ON "users" ("plan");
