-- drizzle/0018_tutor3d_models.sql
-- familyai.jp / うごくAI教室 — Rev34 Phase 1: 3D 図鑑化
--
-- 新規追加（既存テーブルへの破壊的変更なし）:
--   1. tutor3d_models       : 管理者がキュレーションする 3D モデル
--   2. user_3d_bookmarks    : ログインユーザーのお気に入り
--
-- 既存テーブルへの変更:
--   user_animations は Phase 1 では触らない（既存 row は別途 manual DELETE 推奨）。
--   Phase 2 で 3D 生成が来た際に html_content → NULL 化 / GLB 関連カラム追加を別マイグレで実施。

-- ── tutor3d_models: 管理キュレーション ────────────────────────
CREATE TABLE IF NOT EXISTS "tutor3d_models" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"              varchar(120) NOT NULL UNIQUE,
  "title"             varchar(200) NOT NULL,
  "description"       text          NOT NULL DEFAULT '',
  -- 教科サブカテゴリ: biology / chemistry / earth-space / physics
  "subject"           varchar(20)   NOT NULL,
  -- 学年: elem-low / elem-high / middle
  "grade"             varchar(20)   NOT NULL,
  -- アセット URL（Vercel Blob CDN または public/3d-models/ 相対パス）
  "glb_url"           text          NOT NULL,
  "usdz_url"          text,
  "thumbnail_url"     text,
  -- hotspots: [{ id, partName, position[3], normal?[3], defaultExplanation, promptHint }]
  "hotspots"          jsonb         NOT NULL DEFAULT '[]'::jsonb,
  -- 出典・ライセンス（attribution.md と整合）
  "attribution"       text          NOT NULL DEFAULT '',
  "license"           varchar(80)   NOT NULL DEFAULT '',
  "source_url"        text,
  -- 公開制御
  "published"         boolean       NOT NULL DEFAULT false,
  "is_featured"       boolean       NOT NULL DEFAULT false,
  -- 統計
  "view_count"        integer       NOT NULL DEFAULT 0,
  "created_at"        timestamp     NOT NULL DEFAULT now(),
  "updated_at"        timestamp     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "tutor3d_models_subject_idx"           ON "tutor3d_models" ("subject");
CREATE INDEX IF NOT EXISTS "tutor3d_models_grade_idx"             ON "tutor3d_models" ("grade");
CREATE INDEX IF NOT EXISTS "tutor3d_models_published_featured_idx" ON "tutor3d_models" ("published", "is_featured");

-- ── user_3d_bookmarks: ユーザーお気に入り ─────────────────────
CREATE TABLE IF NOT EXISTS "user_3d_bookmarks" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid       NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "model_id"    uuid       NOT NULL REFERENCES "tutor3d_models"("id") ON DELETE CASCADE,
  "created_at"  timestamp  NOT NULL DEFAULT now(),
  CONSTRAINT "user_3d_bookmarks_user_model_unique" UNIQUE ("user_id", "model_id")
);

CREATE INDEX IF NOT EXISTS "user_3d_bookmarks_user_id_created_at_idx"
  ON "user_3d_bookmarks" ("user_id", "created_at");
