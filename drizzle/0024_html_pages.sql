-- 0024_html_pages.sql
-- HTML ページ公開機能: 管理者が HTML ファイルをアップロードして公開 URL を発行

CREATE TABLE IF NOT EXISTS "html_pages" (
  "id"         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"       varchar(255) NOT NULL,
  "title"      varchar(500) NOT NULL,
  "blob_url"   text         NOT NULL,  -- Vercel Blob の public URL
  "created_at" timestamp    NOT NULL DEFAULT now(),
  "updated_at" timestamp    NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "html_pages_slug_idx"
  ON "html_pages" ("slug");
