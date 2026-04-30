/**
 * lib/db/schema.ts
 * familyai.jp — Drizzle ORM スキーマ定義
 *
 * ⚠️ カテゴリ・難易度の定数は shared/ 層が唯一の正。
 *    ここで直接定義せず shared/ から import すること（二重管理防止）。
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
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
  }),
);

// ─── users ────────────────────────────────────────────────────
export const users = pgTable('users', {
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
});



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
  }),
);

// ─── user_animations ──────────────────────────────────────────
/**
 * うごくAI教室 — AIが生成した教育アニメーションHTMLを保存するテーブル。
 * ログイン会員専用。生成したHTMLはDBに全文保存し、iframeで表示する。
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

// ─── ai_config（管理画面で編集可能なAI教室パイプライン設定）───
/**
 * AI教室パイプラインのランタイム設定（DB管理）。
 * 1行限定（id=1 固定）。partial 値を JSONB で保存し、
 * 未設定フィールドは shared/constants の AI_KYOSHITSU_DEFAULTS を使う。
 */
export const aiConfig = pgTable('ai_config', {
  id:        integer('id').primaryKey().default(1),  // 常に 1
  config:    jsonb('config').notNull(),               // Partial<AiKyoshitsuConfig>
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: varchar('updated_by', { length: 255 }),  // 管理者メール
});

/**
 * AI教室設定の変更履歴（直近 10 件保持の運用想定）。
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

// ─── 型エクスポート（Drizzle の推論型） ───────────────────────
export type Article              = typeof articles.$inferSelect;
export type NewArticle           = typeof articles.$inferInsert;
export type User                 = typeof users.$inferSelect;
export type NewUser              = typeof users.$inferInsert;
export type UserAiMemo           = typeof userAiMemos.$inferSelect;
export type NewUserAiMemo        = typeof userAiMemos.$inferInsert;
export type UserVocabBookmark    = typeof userVocabBookmarks.$inferSelect;
export type NewUserVocabBookmark = typeof userVocabBookmarks.$inferInsert;
export type UserAnimation        = typeof userAnimations.$inferSelect;
export type NewUserAnimation     = typeof userAnimations.$inferInsert;
export type AiConfigRow          = typeof aiConfig.$inferSelect;
export type NewAiConfigRow       = typeof aiConfig.$inferInsert;
export type AiConfigHistoryRow   = typeof aiConfigHistory.$inferSelect;
export type NewAiConfigHistoryRow = typeof aiConfigHistory.$inferInsert;
export type LessonProgressRow      = typeof lessonsProgress.$inferSelect;
export type NewLessonProgressRow   = typeof lessonsProgress.$inferInsert;
