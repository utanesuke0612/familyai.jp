-- 0014_user_animations_stage1_json.sql
-- R3-K Phase 1a: うごくAI教室 — 学習設計（Stage 1 JSON）の永続化
--
-- 背景:
--   AI教室パイプラインの Stage 1 では、教育設計の構造化 JSON を生成している
--   （concept_name / key_points / keywords / quiz / misconceptions など）。
--   これまでは Stage 2 の HTML だけを保存し、Stage 1 の JSON は使い捨てにしていた。
--   結果パネルに「📋 学習ポイント」「❓ クイズ」タブを追加するため、
--   Stage 1 JSON を DB に保存し、生成後・履歴閲覧時の両方で再利用できるようにする。
--
-- 仕様:
--   - JSONB で保存（部分検索やキー単位の参照を将来可能にしたいため）
--   - nullable（既存レコードは NULL → タブは「学習設計データなし」フォールバック）
--   - スキーマは lib/ai-kyoshitsu/stage1-schema.ts の Stage1Success と一致
--
-- 後方互換: 既存レコードへの影響なし（NULL 許容で ADD COLUMN）

ALTER TABLE "user_animations"
  ADD COLUMN IF NOT EXISTS "stage1_json" jsonb;
