-- drizzle/0019_search_trigram_indexes.sql
-- familyai.jp — Codex P2 #7 / #16: 検索 ILIKE のスケール対策
--
-- 対象クエリ:
--   - GET /api/articles          : WHERE title  ILIKE '%kw%' OR description ILIKE '%kw%'
--   - GET /api/admin/articles    : 同上（タイトルのみ）
--   - GET /api/admin/users       : WHERE email ILIKE '%kw%' OR name ILIKE '%kw%'
--
-- 旧実装は btree index が効かず、行数が増えると全表 scan が走っていた。
-- pg_trgm + GIN index に乗せれば `%keyword%` の中間一致でも index seek できる。
-- Postgres プランナは ILIKE と LIKE のどちらでも gin_trgm_ops を活用する。
--
-- 注意 (本番運用):
--   Neon でも pg_trgm はデフォルトで有効化可能。CREATE EXTENSION は冪等。
--   本番では index 作成中の DML を止めないため `CONCURRENTLY` を付けて手動発行する:
--     CREATE EXTENSION IF NOT EXISTS pg_trgm;
--     CREATE INDEX CONCURRENTLY IF NOT EXISTS articles_title_trgm_idx
--       ON articles USING gin (title gin_trgm_ops);
--   ここでは drizzle-kit/手動 psql のどちらでも実行可能な形式にしている。

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 記事タイトル / 説明（公開検索） ────────────────────────
CREATE INDEX IF NOT EXISTS "articles_title_trgm_idx"
  ON "articles" USING gin ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "articles_description_trgm_idx"
  ON "articles" USING gin ("description" gin_trgm_ops);

-- ── 管理画面ユーザー検索 ───────────────────────────────────
CREATE INDEX IF NOT EXISTS "users_email_trgm_idx"
  ON "users" USING gin ("email" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "users_name_trgm_idx"
  ON "users" USING gin ("name" gin_trgm_ops);
