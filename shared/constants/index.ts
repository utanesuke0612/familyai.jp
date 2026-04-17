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

// ─── AI モデルルーター設定 ─────────────────────────────────────
/**
 * 用途別モデルルーター（/api/ai の `type` パラメータと対応）
 * すべて OpenRouter 経由で呼び出す。
 *
 * text-simple    : 汎用チャット・要約など軽量タスク
 * text-quality   : 語学・高品質な長文応答
 * math-reasoning : 数学・論理・コーディング
 * transcribe     : 音声→テキスト
 * image-gen      : テキスト→画像
 * tts-japanese   : テキスト→日本語音声
 */
export const MODEL_ROUTER = {
  'text-simple':    'google/gemini-2.0-flash-001',
  'text-quality':   'anthropic/claude-3-5-haiku',
  'math-reasoning': 'anthropic/claude-3-5-sonnet',
  'transcribe':     'openai/whisper-large-v3',
  'image-gen':      'black-forest-labs/flux-1.1-pro',
  'tts-japanese':   'fishaudio/fish-speech-1.5',
  /** どのモデルも利用不可の場合の最終フォールバック */
  fallback:         'google/gemini-2.0-flash-001',
} as const;

export type ModelRouterType = Exclude<keyof typeof MODEL_ROUTER, 'fallback'>;

/** @deprecated AI_MODELS → MODEL_ROUTER に移行済み */
export const AI_MODELS = {
  article: MODEL_ROUTER['text-simple'],
  chat:    MODEL_ROUTER['text-simple'],
  premium: MODEL_ROUTER['text-quality'],
  light:   MODEL_ROUTER['text-simple'],
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
    ai:           '/api/ai',    // AIルーター（/api/chat から統一）
    audio:        '/api/audio',
    play:         '/api/audio/play',
    articles:     '/api/articles',
    og:           '/api/og',
    rss:          '/api/rss',
  },
} as const;
