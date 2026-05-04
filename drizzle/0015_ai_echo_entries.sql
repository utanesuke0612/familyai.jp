-- 0015_ai_echo_entries.sql
-- AI Echo 機能 Phase 1: ユーザーが書いた英文 + AI フィードバックを保存するテーブル
--
-- 用途:
--   - レッスンページの AI Echo パネルでユーザーが書いた英文 + AI 評価を保存
--   - MyPage の「AI Echo 履歴」で振り返り可能にする
--   - ログインユーザーのみ保存（未ログイン時は表示のみ）
--
-- スキーマ設計:
--   - lesson_key  : "<course>/<slug>" 形式（lessons_progress と同じ命名規則）
--   - lesson_title: 表示用のレッスン名（コンテンツ移動時の参照切れ対策で正規化せず保存）
--   - level       : 1=Level 1（3文）/ 2=Level 2（くわしく復述）/ 3=Level 3（意見）
--   - user_input  : ユーザーが書いた英文（最大 ~2000 字想定）
--   - ai_feedback : AI が返した日本語フィードバック（✅良かった点 + 💡提案 + 励まし）
--
-- 後方互換: 既存データ無し（新規テーブル）

CREATE TABLE IF NOT EXISTS "ai_echo_entries" (
  "id"           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      uuid          NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lesson_key"   text          NOT NULL,
  "lesson_title" text          NOT NULL,
  "level"        integer       NOT NULL,
  "user_input"   text          NOT NULL,
  "ai_feedback"  text          NOT NULL,
  "created_at"   timestamp     NOT NULL DEFAULT now()
);

-- レッスン別の履歴取得を高速化（AIEchoPanel 内で同レッスンの過去履歴を表示する場合に使用）
CREATE INDEX IF NOT EXISTS "ai_echo_entries_user_lesson_idx"
  ON "ai_echo_entries" ("user_id", "lesson_key");

-- マイページの一覧（新しい順）取得を高速化
CREATE INDEX IF NOT EXISTS "ai_echo_entries_user_created_idx"
  ON "ai_echo_entries" ("user_id", "created_at" DESC);
