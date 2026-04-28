-- 0012_user_animations_is_public.sql
-- R3-K3: AI教室の公開/非公開切替を追加
--
-- 設計方針:
--   - 既存データ・既存の share URL を壊さないため、is_public DEFAULT true
--   - 新規生成時のデフォルトも公開（既存挙動維持）
--   - ユーザーがマイページから個別に「🔒 非公開」に切替可能
--   - 非公開のアイテム:
--     * 所有者が見れる（マイページから）
--     * /share/[id] と /api/animations/[id] で他人がアクセスすると 404
--
-- 後方互換: 既存行はすべて is_public=true（公開）になる

ALTER TABLE "user_animations"
  ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT true;
