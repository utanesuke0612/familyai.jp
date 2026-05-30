-- 0025_html_pages_password.sql
-- html_pages にパスワード保護機能を追加
-- password_hash が NULL = 公開ページ / NOT NULL = パスワード保護

ALTER TABLE "html_pages"
  ADD COLUMN IF NOT EXISTS "password_hash" text;
