-- Migration 0007: user_ai_memos + user_vocab_bookmarks
-- ログイン会員の AI メモ・VOA 単語ブックマークをクラウドに保存するテーブルを追加。
-- 非会員は引き続き localStorage を使用し、会員はハイブリッド（DB + localStorage キャッシュ）になる。

CREATE TABLE "user_ai_memos" (
  "id"            uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"       uuid        NOT NULL,
  "memo_id"       text        NOT NULL,
  "question"      text        NOT NULL,
  "answer"        text        NOT NULL,
  "article_title" text        NOT NULL,
  "article_slug"  text,
  "saved_at"      bigint      NOT NULL,
  "created_at"    timestamp   DEFAULT now() NOT NULL
);

ALTER TABLE "user_ai_memos"
  ADD CONSTRAINT "user_ai_memos_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "user_ai_memos_user_id_memo_id_idx"
  ON "user_ai_memos" ("user_id", "memo_id");

--> statement-breakpoint

CREATE TABLE "user_vocab_bookmarks" (
  "id"           uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"      uuid        NOT NULL,
  "vocab_id"     text        NOT NULL,
  "word"         text        NOT NULL,
  "meaning"      text        NOT NULL,
  "pron"         text,
  "example"      text,
  "course"       text,
  "lesson"       text,
  "lesson_title" text,
  "added_at"     bigint      NOT NULL,
  "created_at"   timestamp   DEFAULT now() NOT NULL
);

ALTER TABLE "user_vocab_bookmarks"
  ADD CONSTRAINT "user_vocab_bookmarks_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "user_vocab_bookmarks_user_id_vocab_id_idx"
  ON "user_vocab_bookmarks" ("user_id", "vocab_id");
