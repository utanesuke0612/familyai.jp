-- 0010_ai_config.sql
-- AI教室パイプラインのランタイム設定とその変更履歴を保存するテーブル。
-- /admin/ai-config ページから編集できる。
-- 設定の優先順位: コードのDEFAULTS < ai_config（DB）< env

-- ── ai_config（現在の有効設定・1行限定） ────────────────────
CREATE TABLE IF NOT EXISTS "ai_config" (
  "id"         integer PRIMARY KEY DEFAULT 1,
  "config"     jsonb NOT NULL,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "updated_by" varchar(255),
  CONSTRAINT "ai_config_id_check" CHECK ("id" = 1)
);

-- ── ai_config_history（変更履歴・直近10件保持の運用） ───────
CREATE TABLE IF NOT EXISTS "ai_config_history" (
  "id"          serial PRIMARY KEY,
  "config"      jsonb NOT NULL,
  "changed_at"  timestamp NOT NULL DEFAULT now(),
  "changed_by"  varchar(255),
  "change_note" varchar(500)
);

CREATE INDEX IF NOT EXISTS "ai_config_history_changed_at_idx"
  ON "ai_config_history" ("changed_at" DESC);
