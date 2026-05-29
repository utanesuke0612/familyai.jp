-- 0022_article_comments.sql
-- 記事コメント機能 Phase 1: ログインユーザーのみ投稿・全員閲覧可能
--
-- 設計方針:
--   - body は Markdown テキスト（2000 字以内）
--   - article_slug は articles.slug への外部キーを持たない
--     （記事削除後もコメント閲覧履歴を残せる + JOIN コスト削減）
--   - user 削除時はコメントも cascade 削除（GDPR 対応）
--   - Phase 2 で is_hidden（管理者非表示）を追加予定

CREATE TABLE IF NOT EXISTS "article_comments" (
  "id"           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "article_slug" varchar(255) NOT NULL,
  "user_id"      uuid         NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "body"         text         NOT NULL,
  "created_at"   timestamp    NOT NULL DEFAULT now(),
  "updated_at"   timestamp    NOT NULL DEFAULT now()
);

-- 記事別コメント一覧（新着順）取得を高速化
CREATE INDEX IF NOT EXISTS "article_comments_slug_created_idx"
  ON "article_comments" ("article_slug", "created_at" DESC);

-- ユーザー別コメント履歴取得を高速化（将来のマイページ用）
CREATE INDEX IF NOT EXISTS "article_comments_user_id_idx"
  ON "article_comments" ("user_id");
