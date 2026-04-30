-- 0013_lessons_progress.sql
-- R3-機能3 Phase 3: AIctation/VOA レッスンの進捗管理テーブルを追加
--
-- 用途:
--   - 「🌟 完璧」を達成したレッスンを記録（ユーザー別）
--   - 試行回数（attempts）を記録（😓💪 を押すたびに +1）
--   - 「完璧になるまで次のレッスンに進めない」設計の土台
--
-- lesson_key 命名規則（Q2=A 採用）:
--   "<course>/<slug>" 形式（例: "anna/lesson-01"）
--   → URL `/tools/voaenglish/<course>/<slug>` と直接対応して直感的
--
-- 後方互換: 既存データ無し（新規テーブル）

CREATE TABLE IF NOT EXISTS "lessons_progress" (
  "id"           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      uuid          NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lesson_key"   text          NOT NULL,                                 -- 例: "anna/lesson-01"
  "status"       varchar(20)   NOT NULL DEFAULT 'in_progress',           -- 'in_progress' | 'completed'
  "attempts"     integer       NOT NULL DEFAULT 0,                       -- 😓💪 押下時に +1
  "completed_at" timestamp,                                              -- 🌟 押下時に NOW()
  "created_at"   timestamp     NOT NULL DEFAULT now(),
  "updated_at"   timestamp     NOT NULL DEFAULT now(),
  CONSTRAINT "lessons_progress_unique" UNIQUE ("user_id", "lesson_key")
);

-- ユーザー別の一覧取得を高速化（マイページ等で使用）
CREATE INDEX IF NOT EXISTS "lessons_progress_user_id_idx"
  ON "lessons_progress" ("user_id");

-- 完了済みのみフィルタする部分インデックス（マイページの達成数表示用）
CREATE INDEX IF NOT EXISTS "lessons_progress_completed_idx"
  ON "lessons_progress" ("user_id", "completed_at" DESC)
  WHERE "status" = 'completed';
