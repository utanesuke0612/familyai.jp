/**
 * shared/constants/index.ts
 * familyai.jp — アプリ全体で使う定数（pure TypeScript / iOS 移植対応）
 */

import type { FamilyRole, ContentCategory, DifficultyLevel } from '../types';

// ─── サイトメタ ────────────────────────────────────────────────
export const SITE = {
  name:        'familyai.jp',
  tagline:     'AI（愛）で家族をもっと幸せに',
  url:         'https://familyai.jp',
  locale:      'ja-JP',
  twitterHandle: '@familyai_jp',
} as const;

// ─── ロール設定 ────────────────────────────────────────────────
/** 各ロールのブランドカラー（Tailwind クラス名） */
export const ROLE_COLOR: Record<FamilyRole, { bg: string; text: string; border: string }> = {
  papa:   { bg: 'bg-sky',    text: 'text-sky-700',   border: 'border-sky-300' },
  mama:   { bg: 'bg-peach',  text: 'text-brown',     border: 'border-peach' },
  kids:   { bg: 'bg-mint',   text: 'text-green-700', border: 'border-mint' },
  senior: { bg: 'bg-yellow', text: 'text-amber-700', border: 'border-yellow' },
  common: { bg: 'bg-cream',  text: 'text-brown',     border: 'border-beige-dark' },
} as const;

/** 各ロールのアイコン絵文字 */
export const ROLE_EMOJI: Record<FamilyRole, string> = {
  papa:   '👨',
  mama:   '👩',
  kids:   '🧒',
  senior: '👴',
  common: '👨‍👩‍👧‍👦',
} as const;

// ─── カテゴリ設定 ──────────────────────────────────────────────
/** カテゴリの表示ラベル */
export const CATEGORY_LABEL: Record<ContentCategory, string> = {
  'chatgpt':   'ChatGPT',
  'claude':    'Claude',
  'gemini':    'Gemini',
  'image-gen': '画像生成',
  'voice':     '音声AI',
  'education': '学習・教育',
  'housework': '家事・育児',
  'health':    '健康・医療',
  'finance':   'お金・節約',
  'other':     'その他',
} as const;

/** カテゴリのアイコン絵文字 */
export const CATEGORY_EMOJI: Record<ContentCategory, string> = {
  'chatgpt':   '💬',
  'claude':    '🤖',
  'gemini':    '✨',
  'image-gen': '🎨',
  'voice':     '🎙️',
  'education': '📚',
  'housework': '🏠',
  'health':    '❤️',
  'finance':   '💰',
  'other':     '📌',
} as const;

// ─── 難易度設定 ────────────────────────────────────────────────
export const DIFFICULTY_LABEL: Record<DifficultyLevel, string> = {
  beginner:     'はじめて',
  intermediate: '慣れてきた',
  advanced:     '使いこなす',
} as const;

export const DIFFICULTY_COLOR: Record<DifficultyLevel, string> = {
  beginner:     'text-green-600',
  intermediate: 'text-amber-600',
  advanced:     'text-red-600',
} as const;

// ─── AI モデル設定 ─────────────────────────────────────────────
/** OpenRouter 経由で利用するモデル一覧 */
export const AI_MODELS = {
  /** 記事生成・長文向け */
  article:  'google/gemini-2.0-flash-001',
  /** チャット向け（コスト最適） */
  chat:     'google/gemini-2.0-flash-001',
  /** 高品質コンテンツ向け */
  premium:  'anthropic/claude-3-5-haiku',
  /** ふりがな・要約など軽量タスク */
  light:    'google/gemini-flash-1.5-8b',
} as const;

export type AiModelKey = keyof typeof AI_MODELS;

// ─── レート制限設定 ────────────────────────────────────────────
export const RATE_LIMIT = {
  /** 無料ユーザー：チャット API 1時間あたり */
  chatFreePerHour:    10,
  /** 有料ユーザー：チャット API 1時間あたり */
  chatPremiumPerHour: 60,
  /** OGP 生成 1時間あたり */
  ogPerHour:          30,
} as const;

// ─── ページネーション ──────────────────────────────────────────
export const PAGINATION = {
  defaultPerPage:  12,
  maxPerPage:      50,
} as const;

// ─── ストレージパス ────────────────────────────────────────────
/** Vercel Blob の格納パスプレフィックス */
export const BLOB_PATH = {
  audio:  'audio/',
  avatar: 'avatar/',
  og:     'og/',
} as const;

// ─── ルーティング ──────────────────────────────────────────────
export const ROUTES = {
  home:           '/',
  articles:       '/learn',
  article:        (slug: string) => `/learn/${slug}`,
  roleArticles:   (role: FamilyRole) => `/learn?role=${role}`,
  chat:           '/chat',
  login:          '/login',
  signup:         '/signup',
  dashboard:      '/dashboard',
  settings:       '/settings',
  api: {
    chat:         '/api/chat',
    articles:     '/api/articles',
    og:           '/api/og',
    rss:          '/api/rss',
  },
} as const;
