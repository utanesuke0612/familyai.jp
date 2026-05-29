-- 0023_user_article_bookmarks.sql
-- 記事ブックマーク機能: ログインユーザーが記事をブックマークできる
--
-- 設計方針:
--   - article_slug は articles.slug への外部キーを持たない
--     （記事削除後もブックマーク履歴を残せる + JOIN コスト削減）
--     ← article_comments と同じ方針
--   - article_title は表示用に非正規化して保存（JOIN 不要・保存時点のタイトルを保持）
--   - user 削除時はカスケード削除（GDPR 対応）
--   - (user_id, article_slug) のユニーク制約で二重登録を防止

CREATE TABLE IF NOT EXISTS "user_article_bookmarks" (
  "id"            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       uuid         NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "article_slug"  varchar(255) NOT NULL,
  "article_title" text         NOT NULL,
  "created_at"    timestamp    NOT NULL DEFAULT now()
);

-- (user_id, article_slug) ユニーク制約: 同一記事の二重登録を防止
CREATE UNIQUE INDEX IF NOT EXISTS "user_article_bookmarks_user_article_idx"
  ON "user_article_bookmarks" ("user_id", "article_slug");

-- マイページ・ブックマーク一覧（新しい順）の高速化
CREATE INDEX IF NOT EXISTS "user_article_bookmarks_user_created_at_idx"
  ON "user_article_bookmarks" ("user_id", "created_at" DESC);
