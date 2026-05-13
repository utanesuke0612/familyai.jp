-- drizzle/0020_tutor3d_models_published_slug_idx.sql
-- familyai.jp / うごくAI教室 — Rev38 #H2: 公開モデル詳細取得の index 追加
--
-- 対象クエリ:
--   lib/repositories/3d-models.ts:getPublishedModelBySlug()
--     SELECT ... FROM tutor3d_models WHERE slug = ? AND published = true LIMIT 1;
--
-- slug は UNIQUE で既に index されているため単独 select は既に高速だが、
-- (published, slug) 複合 index を張ることで:
--   1. プランナが index-only scan を選びやすくなる
--   2. published=false の行を skip するコストが消える
--   3. 将来 (published, slug) で複数件返すような派生クエリにも備える
--
-- 本番運用注意:
--   index 作成中の DML を止めないため CONCURRENTLY を付けて手動発行することを推奨:
--     CREATE INDEX CONCURRENTLY IF NOT EXISTS tutor3d_models_published_slug_idx
--       ON tutor3d_models (published, slug);

CREATE INDEX IF NOT EXISTS "tutor3d_models_published_slug_idx"
  ON "tutor3d_models" ("published", "slug");
