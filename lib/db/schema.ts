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
  timestamp,
  index,
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

    // 音声コンテンツ
    audioUrl:         text('audio_url'),
    audioTranscript:  text('audio_transcript'),           // SEO 用テキスト・ページ本文にも表示
    audioDurationSec: integer('audio_duration_sec'),
    audioLanguage:    varchar('audio_language', { length: 10 }), // 語学コンテンツの言語: 'en'|'zh'|'ko' 等
    audioPlayCount:   integer('audio_play_count').notNull().default(0),

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

// ─── audio_play_logs（再生カウント重複防止用） ────────────────
// /api/audio/play から記録。30秒以上 + 1日1回制限のチェックに使用。
export const audioPlayLogs = pgTable(
  'audio_play_logs',
  {
    id:        uuid('id').defaultRandom().primaryKey(),
    articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
    // 未ログインユーザーは IP ハッシュ（プライバシー保護のため平文 IP は保存しない）
    userId:    uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    ipHash:    varchar('ip_hash', { length: 64 }),
    playedAt:  timestamp('played_at').defaultNow().notNull(),
  },
  (table) => ({
    idxArticleId: index('audio_play_logs_article_id_idx').on(table.articleId),
    idxPlayedAt:  index('audio_play_logs_played_at_idx').on(table.playedAt),
  }),
);

// ─── 型エクスポート（Drizzle の推論型） ───────────────────────
export type Article        = typeof articles.$inferSelect;
export type NewArticle     = typeof articles.$inferInsert;
export type User           = typeof users.$inferSelect;
export type NewUser        = typeof users.$inferInsert;
export type AudioPlayLog   = typeof audioPlayLogs.$inferSelect;
export type NewAudioPlayLog = typeof audioPlayLogs.$inferInsert;
