-- drizzle/0016_user_sentence_bookmarks.sql
-- familyai.jp — Rev34: VOA ディクテーション スクリプト文ブックマーク
--
-- ログイン会員が「📜 スクリプト」内の任意のセンテンスを保存できるようにする。
-- 単語帳（user_vocab_bookmarks）とは別テーブルで管理し、UI 側でタブ統合する。
--   - 単語: 1単語の意味暗記用（既存）
--   - センテンス: フレーズ記憶・シャドーイング・リスニング再復習用（本テーブル）
--
-- 文の本文は注釈付き（`{word|reading}` / `**Speaker:**` 等）のまま保存し、
-- 検索用に注釈を剥がした text_plain も併せて保持する。
-- センテンス_id は course/lesson/sentenceIndex の複合キー文字列。

CREATE TABLE IF NOT EXISTS "user_sentence_bookmarks" (
  "id"            uuid                       PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"       uuid                       NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sentence_id"   text                       NOT NULL,
  "text"          text                       NOT NULL,
  "text_plain"    text                       NOT NULL,
  "start_sec"     real                       NOT NULL DEFAULT 0,
  "end_sec"       real                       NOT NULL DEFAULT 0,
  "speaker"       text,
  "course"        text                       NOT NULL,
  "lesson"        text                       NOT NULL,
  "lesson_title"  text,
  "audio_url"     text,
  "note"          text,
  "added_at"      bigint                     NOT NULL,
  "created_at"    timestamp                  NOT NULL DEFAULT now()
);

-- (user_id, sentence_id) ユニーク制約: 同じ user が同じ文を二重登録しないように
CREATE UNIQUE INDEX IF NOT EXISTS "user_sentence_bookmarks_user_id_sentence_id_idx"
  ON "user_sentence_bookmarks" ("user_id", "sentence_id");

-- 一覧取得（新しい順）の高速化用
CREATE INDEX IF NOT EXISTS "user_sentence_bookmarks_user_id_added_at_idx"
  ON "user_sentence_bookmarks" ("user_id", "added_at" DESC);
