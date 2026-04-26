-- うごくAI教室：AIが生成した教育アニメーションHTMLを保存するテーブル
CREATE TABLE IF NOT EXISTS "user_animations" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"      uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "theme"        text NOT NULL,
  "grade"        varchar(20) NOT NULL,
  "subject"      varchar(20) NOT NULL,
  "prompt"       text NOT NULL,
  "html_content" text NOT NULL,
  "created_at"   timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_animations_user_id_idx"    ON "user_animations" ("user_id");
CREATE INDEX IF NOT EXISTS "user_animations_created_at_idx" ON "user_animations" ("created_at");
