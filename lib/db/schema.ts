/**
 * lib/db/schema.ts
 * familyai.jp — Drizzle ORM スキーマ定義
 *
 * ⚠️ カテゴリ・難易度の定数は shared/ 層が唯一の正。
 *    ここで直接定義せず shared/ から import すること（二重管理防止）。
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  real,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
  serial,
} from 'drizzle-orm/pg-core';

// ─── articles ─────────────────────────────────────────────────
export const articles = pgTable(
  'articles',
  {
    id:               uuid('id').defaultRandom().primaryKey(),
    slug:             varchar('slug', { length: 255 }).notNull().unique(),
    title:            varchar('title', { length: 255 }).notNull(),
    description:      text('description'),
    body:             text('body').notNull(),              // Markdown（react-markdown でレンダリング）

    // カテゴリ・難易度
    categories:       text('categories').array().notNull(),
    tags:             text('tags').array().notNull().default(sql`ARRAY[]::text[]`),
    level:            varchar('level', { length: 20 }).notNull().default('beginner'),

    // メタデータ
    thumbnailUrl:     text('thumbnail_url'),
    viewCount:        integer('view_count').notNull().default(0),         // 人気記事表示に使用
    isFeatured:       boolean('is_featured').notNull().default(false),    // トップページおすすめフラグ
    published:        boolean('published').notNull().default(false),
    publishedAt:      timestamp('published_at'),
    createdAt:        timestamp('created_at').defaultNow().notNull(),
    updatedAt:        timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // 一覧フィルタリング・ソート用インデックス
    idxPublished:   index('articles_published_idx').on(table.published),
    idxPublishedAt: index('articles_published_at_idx').on(table.publishedAt),
    idxViewCount:   index('articles_view_count_idx').on(table.viewCount),
    idxIsFeatured:  index('articles_is_featured_idx').on(table.isFeatured),
    // 配列カラムの絞込に GIN（`@>` `&&` オペレータで使用）
    idxCategories:  index('articles_categories_gin_idx').using('gin', table.categories),
    idxTags:        index('articles_tags_gin_idx').using('gin', table.tags),
  }),
);

// ─── users ────────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id:               uuid('id').defaultRandom().primaryKey(),
    email:            varchar('email', { length: 255 }).notNull().unique(),
    name:             varchar('name', { length: 255 }),
    image:            text('image'),

    // 認証プロバイダー: 'google' | 'local' | 'apple'（将来追加）
    authProvider:     varchar('auth_provider', { length: 20 }).notNull().default('local'),

    // ローカルアカウント用（Google/Apple ログイン時は null）
    // パスワードポリシー: 8文字以上・bcrypt saltRounds:12 でハッシュ化
    passwordHash:     text('password_hash'),

    // プラン: 'free' | 'premium'
    plan:             varchar('plan', { length: 20 }).notNull().default('free'),
    stripeCustomerId: text('stripe_customer_id'),

    createdAt:        timestamp('created_at').defaultNow().notNull(),
    updatedAt:        timestamp('updated_at').defaultNow().notNull(),
  },
  // Rev35 #perf: 管理者ユーザー一覧の sort / プラン絞り込みでフルスキャンを避ける。
  // email / name の trigram 検索 index は drizzle/0019_search_trigram_indexes.sql
  // で pg_trgm + GIN として追加済み（drizzle schema 側では gin_trgm_ops を直接
  // 表現できないため SQL migration 経由・本ファイルは btree のみ管理）。
  (t) => ({
    createdAtIdx: index('users_created_at_idx').on(t.createdAt),
    planIdx:      index('users_plan_idx').on(t.plan),
  }),
);



// ─── user_ai_memos ─────────────────────────────────────────────
/**
 * ログイン会員の AI メモをクラウドに保存するテーブル。
 * 非会員は localStorage のみを使用。
 */
export const userAiMemos = pgTable(
  'user_ai_memos',
  {
    id:           uuid('id').defaultRandom().primaryKey(),
    userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    memoId:       text('memo_id').notNull(),          // クライアント生成 UUID
    question:     text('question').notNull(),
    answer:       text('answer').notNull(),
    articleTitle: text('article_title').notNull(),
    articleSlug:  text('article_slug'),
    savedAt:      bigint('saved_at', { mode: 'number' }).notNull(), // エポックミリ秒
    createdAt:    timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniqUserMemo: uniqueIndex('user_ai_memos_user_id_memo_id_idx').on(t.userId, t.memoId),
    // Rev35 #perf: マイページ「AIメモ」一覧の (userId 絞り込み + savedAt 並び替え) を index で覆う。
    // B-tree は両方向スキャン可能なので DESC 表記は不要。
    savedAtIdx:   index('user_ai_memos_user_id_saved_at_idx').on(t.userId, t.savedAt),
  }),
);

// ─── user_vocab_bookmarks ──────────────────────────────────────
/**
 * ログイン会員の VOA 単語ブックマークをクラウドに保存するテーブル。
 * 非会員は localStorage のみを使用。
 */
export const userVocabBookmarks = pgTable(
  'user_vocab_bookmarks',
  {
    id:          uuid('id').defaultRandom().primaryKey(),
    userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    vocabId:     text('vocab_id').notNull(),           // "course/lesson/word"
    word:        text('word').notNull(),
    meaning:     text('meaning').notNull(),
    pron:        text('pron'),
    example:     text('example'),
    course:      text('course'),
    lesson:      text('lesson'),
    lessonTitle: text('lesson_title'),
    addedAt:     bigint('added_at', { mode: 'number' }).notNull(), // エポックミリ秒
    createdAt:   timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniqUserVocab: uniqueIndex('user_vocab_bookmarks_user_id_vocab_id_idx').on(t.userId, t.vocabId),
    // Rev35 #perf: マイページ「単語帳」一覧の (userId 絞り込み + addedAt 並び替え) を index で覆う。
    addedAtIdx:    index('user_vocab_bookmarks_user_id_added_at_idx').on(t.userId, t.addedAt),
  }),
);

// ─── user_sentence_bookmarks ──────────────────────────────────
/**
 * Rev34: VOA ディクテーション「📜 スクリプト」内のセンテンスを保存するテーブル。
 *
 * 単語帳（user_vocab_bookmarks）とは別物として扱う:
 *   - 単語: 1単語の意味暗記（フラッシュカード型）
 *   - センテンス: フレーズ記憶・シャドーイング・リスニング再復習
 *
 * 文の本文は注釈付き（`{word|reading}` / `**Speaker:**` 等）のまま保存し、
 * 検索用に注釈を剥がした text_plain も併せて保持する。
 * sentence_id は course/lesson/sentenceIndex の複合キー文字列。
 */
export const userSentenceBookmarks = pgTable(
  'user_sentence_bookmarks',
  {
    id:          uuid('id').defaultRandom().primaryKey(),
    userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    sentenceId:  text('sentence_id').notNull(),       // "course/lesson/idx"
    text:        text('text').notNull(),              // 注釈付き本文
    textPlain:   text('text_plain').notNull(),        // 検索用平文
    startSec:    real('start_sec').notNull().default(0),
    endSec:      real('end_sec').notNull().default(0),
    speaker:     text('speaker'),                     // "Anna" / "Pete" 等（あれば）
    course:      text('course').notNull(),
    lesson:      text('lesson').notNull(),
    lessonTitle: text('lesson_title'),
    audioUrl:    text('audio_url'),                   // 区間再生・将来用
    note:        text('note'),                        // ユーザー任意メモ
    addedAt:     bigint('added_at', { mode: 'number' }).notNull(),
    createdAt:   timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniqUserSentence: uniqueIndex('user_sentence_bookmarks_user_id_sentence_id_idx').on(t.userId, t.sentenceId),
    addedAtIdx:       index('user_sentence_bookmarks_user_id_added_at_idx').on(t.userId, t.addedAt),
  }),
);

// ─── user_animations ──────────────────────────────────────────
/**
 * 【Phase 2 用に残置 — 現状未使用・目標 2026 Q3 着手】(L-8)
 *
 * 旧: AI 生成アニメーション（HTML）を保存するテーブル。
 * Rev36 で機能を 3D 図鑑にリプレイス (commit 88362a4) し、関連 API・mapper・
 * repository は全削除済み。Codex Q2-4 / Q1-5 の指摘どおり「未接続の残骸」だが、
 * Phase 2 で AI 3D 生成版（Tripo 連携）として GLB URL を保存するテーブルとして
 * 再利用する予定のため、テーブル定義のみ残置している。
 *
 * Phase 2 移行時の改修案:
 *   - html_content を NULL 許可 → 任意項目化（または別カラムにリネーム）
 *   - glb_url / usdz_url / thumbnail_url / hotspots(jsonb) を追加
 *   - 旧 stage1Json は AI 生成 3D の構造化メタとして再利用
 *
 * Phase 2 着手時に「再利用 or 完全削除（破棄して新テーブル）」を再評価する。
 */
export const userAnimations = pgTable(
  'user_animations',
  {
    id:          uuid('id').defaultRandom().primaryKey(),
    userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    theme:       text('theme').notNull(),                          // 例: "影のでき方・太陽の動き"
    grade:       varchar('grade', { length: 20 }).notNull(),       // "elem-low" | "elem-high" | "middle"
    subject:     varchar('subject', { length: 20 }).notNull(),     // "science" | "math" | "social"
    prompt:      text('prompt').notNull(),                         // ユーザーが入力したプロンプト全文
    htmlContent: text('html_content').notNull(),                   // AIが生成したHTML全文
    createdAt:   timestamp('created_at').defaultNow().notNull(),
    // R3-U1: ユーザーが履歴ページで操作するメタ情報
    /** お気に入り（⭐）。マイページの絞り込み・並び替え用（migration 0011） */
    isFavorite:  boolean('is_favorite').notNull().default(false),
    /** ユーザーが付け直したタイトル。NULL なら theme をそのまま表示（migration 0011） */
    customTitle: text('custom_title'),
    // R3-K3（migration 0012）: 公開フラグ。
    // - true（既定）: 誰でも /share/[id] で閲覧可能（従来挙動）
    // - false: 所有者のみ閲覧可能・他人がアクセスすると 404
    isPublic:    boolean('is_public').notNull().default(true),
    /**
     * R3-K Phase 1a（migration 0014）: Stage 1 で生成された教育設計 JSON。
     * 結果パネルの「📋 学習ポイント」「❓ クイズ」タブで再利用するため永続化する。
     * 既存レコード（migration 適用前）は NULL となり、UI 側でフォールバック表示。
     * スキーマは lib/ai-kyoshitsu/stage1-schema.ts の Stage1Success と一致。
     */
    stage1Json:  jsonb('stage1_json'),
  },
  (t) => ({
    idxUserId:    index('user_animations_user_id_idx').on(t.userId),
    idxCreatedAt: index('user_animations_created_at_idx').on(t.createdAt),
  }),
);

// ─── ai_config（管理画面で編集可能な AIチャット設定）─────────
/**
 * AIチャットのランタイム設定（DB管理）。
 * 1行限定（id=1 固定）。partial 値を JSONB で保存し、
 * 未設定フィールドは shared/constants の AI_CHAT_DEFAULTS を使う。
 *
 * Rev40: 旧 AI教室パイプライン用の stage1/2 フィールドを廃止し、
 * AIチャット用 3 フィールド（chatModel / chatMaxTokens / chatTemperature）に
 * 再設計済み。JSONB なので migration 不要（旧キーは自動的に無視される）。
 */
export const aiConfig = pgTable('ai_config', {
  id:        integer('id').primaryKey().default(1),  // 常に 1
  config:    jsonb('config').notNull(),               // Partial<AiChatConfig>
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: varchar('updated_by', { length: 255 }),  // 管理者メール
});

/**
 * AIチャット設定の変更履歴（直近 10 件保持の運用想定）。
 * PUT 時に1件 INSERT、リセット時に1件 INSERT（空 config）。
 */
export const aiConfigHistory = pgTable(
  'ai_config_history',
  {
    id:         serial('id').primaryKey(),
    config:     jsonb('config').notNull(),                              // 変更後の値（partial）
    changedAt:  timestamp('changed_at').defaultNow().notNull(),
    changedBy:  varchar('changed_by', { length: 255 }),
    changeNote: varchar('change_note', { length: 500 }),                // 変更理由（任意）
  },
  (t) => ({
    idxChangedAt: index('ai_config_history_changed_at_idx').on(t.changedAt),
  }),
);

// ─── lessons_progress（R3-機能3 Phase 3）─────────────────────
/**
 * AIctation/VOA レッスンの進捗管理（migration 0013）。
 *
 * - lesson_key: "<course>/<slug>" 形式（例: "anna/lesson-01"）— Q2=A 採用
 * - 同一ユーザー × 同一レッスンは UNIQUE 制約で 1 行限定
 * - 😓💪 押下 → attempts +1
 * - 🌟 押下 → status='completed', completed_at=now()
 * - アカウント削除と同時にカスケード削除
 */
export const lessonsProgress = pgTable(
  'lessons_progress',
  {
    id:          uuid('id').defaultRandom().primaryKey(),
    userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lessonKey:   text('lesson_key').notNull(),
    status:      varchar('status', { length: 20 }).notNull().default('in_progress'),
    attempts:    integer('attempts').notNull().default(0),
    completedAt: timestamp('completed_at'),
    createdAt:   timestamp('created_at').defaultNow().notNull(),
    updatedAt:   timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    uniqUserLesson: uniqueIndex('lessons_progress_unique').on(t.userId, t.lessonKey),
    idxUserId:      index('lessons_progress_user_id_idx').on(t.userId),
  }),
);

// ─── ai_echo_entries（AI Echo 機能・migration 0015）──────────
/**
 * AI Echo: ユーザーが書いた英文 + AI フィードバックを保存する。
 *
 * - lesson_key  : "<course>/<slug>" 形式（lessons_progress と同じ命名規則）
 * - lesson_title: 表示用のレッスン名（参照切れ対策で正規化せず保存）
 * - level       : 1 / 2 / 3（🌱 / 🌿 / 🌳）
 * - user_input  : ユーザーが書いた英文
 * - ai_feedback : AI が返した日本語フィードバック
 * - 未ログイン時は保存しない（ログインユーザーのみ）
 * - アカウント削除と同時にカスケード削除
 */
export const aiEchoEntries = pgTable(
  'ai_echo_entries',
  {
    id:          uuid('id').defaultRandom().primaryKey(),
    userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lessonKey:   text('lesson_key').notNull(),
    lessonTitle: text('lesson_title').notNull(),
    level:       integer('level').notNull(),
    userInput:   text('user_input').notNull(),
    aiFeedback:  text('ai_feedback').notNull(),
    createdAt:   timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    idxUserLesson:  index('ai_echo_entries_user_lesson_idx').on(t.userId, t.lessonKey),
    idxUserCreated: index('ai_echo_entries_user_created_idx').on(t.userId, t.createdAt),
  }),
);

// ─── tutor3d_models（Rev34 Phase 1: 3D 図鑑・migration 0018）──
/**
 * うごくAI教室 — 管理者がキュレーションする 3D モデル（理科のみ・4 サブカテゴリ）。
 * Phase 1 では admin 手動投入のみ。Phase 2 で AI 生成版（user_animations 派生）が並ぶ予定。
 *
 * - subject: 'biology' | 'chemistry' | 'earth-space' | 'physics'
 * - grade  : 'elem-low' | 'elem-high' | 'middle'
 * - hotspots: HotspotData[]（lib/schemas/3d-models.ts の zod スキーマと一致）
 */
export const tutor3dModels = pgTable(
  'tutor3d_models',
  {
    id:           uuid('id').defaultRandom().primaryKey(),
    slug:         varchar('slug', { length: 120 }).notNull().unique(),
    title:        varchar('title', { length: 200 }).notNull(),
    description:  text('description').notNull().default(''),
    subject:      varchar('subject', { length: 20 }).notNull(),
    grade:        varchar('grade',   { length: 20 }).notNull(),
    glbUrl:       text('glb_url').notNull(),
    usdzUrl:      text('usdz_url'),
    thumbnailUrl: text('thumbnail_url'),
    hotspots:     jsonb('hotspots').notNull().default([]),
    attribution:  text('attribution').notNull().default(''),
    license:      varchar('license', { length: 80 }).notNull().default(''),
    sourceUrl:    text('source_url'),
    published:    boolean('published').notNull().default(false),
    isFeatured:   boolean('is_featured').notNull().default(false),
    viewCount:    integer('view_count').notNull().default(0),
    createdAt:    timestamp('created_at').defaultNow().notNull(),
    updatedAt:    timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    idxSubject:           index('tutor3d_models_subject_idx').on(t.subject),
    idxGrade:             index('tutor3d_models_grade_idx').on(t.grade),
    idxPublishedFeatured: index('tutor3d_models_published_featured_idx').on(t.published, t.isFeatured),
    // Rev38 #H2: getPublishedModelBySlug の WHERE published=true AND slug=? 用
    idxPublishedSlug:     index('tutor3d_models_published_slug_idx').on(t.published, t.slug),
  }),
);

// ─── user_3d_bookmarks（Rev34 Phase 1・migration 0018）────────
/**
 * 3D 図鑑のお気に入り。ログインユーザー専用。
 * (user_id, model_id) 複合 unique で重複登録を防止。
 *
 * 【現状: 接続未完了】Codex Q1-5 / Q2-6 指摘事項。
 * - DB テーブル ✅ migration 0018 で投入済み
 * - lib/repositories/3d-models.ts: addBookmark / removeBookmark / isBookmarked /
 *   listBookmarkedModels  ✅ 実装済み
 * - /api/user/3d-bookmarks CRUD ❌ 未実装
 * - mypage / 詳細ページの ⭐ ボタン UI ❌ 未実装
 *
 * TODO(L-7): Phase 2（目標 2026 Q3）で /api/user/3d-bookmarks + UI を接続する。
 * 期限までに着手しない場合はテーブル + repository を削除すること。
 */
export const user3dBookmarks = pgTable(
  'user_3d_bookmarks',
  {
    id:        uuid('id').defaultRandom().primaryKey(),
    userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    modelId:   uuid('model_id').notNull().references(() => tutor3dModels.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniqUserModel:    uniqueIndex('user_3d_bookmarks_user_model_unique').on(t.userId, t.modelId),
    idxUserCreatedAt: index('user_3d_bookmarks_user_id_created_at_idx').on(t.userId, t.createdAt),
  }),
);

// ─── 型エクスポート（Drizzle の推論型） ───────────────────────
export type Article              = typeof articles.$inferSelect;
export type NewArticle           = typeof articles.$inferInsert;
export type User                 = typeof users.$inferSelect;
export type NewUser              = typeof users.$inferInsert;
export type UserAiMemo           = typeof userAiMemos.$inferSelect;
export type NewUserAiMemo        = typeof userAiMemos.$inferInsert;
export type UserVocabBookmark    = typeof userVocabBookmarks.$inferSelect;
export type NewUserVocabBookmark = typeof userVocabBookmarks.$inferInsert;
export type Tutor3dModel         = typeof tutor3dModels.$inferSelect;
export type NewTutor3dModel      = typeof tutor3dModels.$inferInsert;
export type User3dBookmark       = typeof user3dBookmarks.$inferSelect;
export type NewUser3dBookmark    = typeof user3dBookmarks.$inferInsert;
export type UserSentenceBookmark    = typeof userSentenceBookmarks.$inferSelect;
export type NewUserSentenceBookmark = typeof userSentenceBookmarks.$inferInsert;
export type UserAnimation        = typeof userAnimations.$inferSelect;
export type NewUserAnimation     = typeof userAnimations.$inferInsert;
export type AiConfigRow          = typeof aiConfig.$inferSelect;
export type NewAiConfigRow       = typeof aiConfig.$inferInsert;
export type AiConfigHistoryRow   = typeof aiConfigHistory.$inferSelect;
export type NewAiConfigHistoryRow = typeof aiConfigHistory.$inferInsert;
export type LessonProgressRow      = typeof lessonsProgress.$inferSelect;
export type NewLessonProgressRow   = typeof lessonsProgress.$inferInsert;
export type AiEchoEntry            = typeof aiEchoEntries.$inferSelect;
export type NewAiEchoEntry         = typeof aiEchoEntries.$inferInsert;
