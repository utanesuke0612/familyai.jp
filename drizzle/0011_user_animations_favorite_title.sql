-- 0011_user_animations_favorite_title.sql
-- R3-U1: AI教室履歴に「お気に入り (⭐)」と「カスタムタイトル (✏️)」機能を追加
--
-- 変更内容:
--   - is_favorite  boolean: お気に入り星マーク
--   - custom_title text:    ユーザーが付け直したタイトル（NULL なら theme を表示）
--
-- 後方互換: 既存行は is_favorite=false / custom_title=NULL で問題なく動作

ALTER TABLE "user_animations"
  ADD COLUMN IF NOT EXISTS "is_favorite"  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "custom_title" text;

-- お気に入りフィルタ用の部分インデックス（is_favorite = true の行のみインデックス化）
-- フィルタする行が少数（数件〜数十件）なので部分インデックスで十分
CREATE INDEX IF NOT EXISTS "user_animations_favorites_idx"
  ON "user_animations" ("user_id", "created_at" DESC)
  WHERE "is_favorite" = true;
