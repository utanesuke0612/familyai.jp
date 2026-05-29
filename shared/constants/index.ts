/**
 * shared/constants/index.ts
 * familyai.jp — アプリ全体で使う定数（pure TypeScript / iOS 移植対応）
 */

import type { ContentCategory, DifficultyLevel, AiChatConfig } from '../types';

// ─── サイトメタ ────────────────────────────────────────────────
export const SITE = {
  name:        'familyai.jp',
  tagline:     'AI活用事例とAIツールをわかりやすく',
  url:         'https://familyai.jp',
  locale:      'ja-JP',
  twitterHandle: '@familyaijp',
} as const;

// ─── AIチャット設定 関連 ──────────────────────────────────────
// Rev36: 旧 AI 生成アニメ用の MAX_GENERATED_HTML_BYTES / MAX_ANIMATION_PROMPT は
// 本機能の 3D 図鑑化により削除済。
// Rev40: 旧 AI教室パイプライン用の AI_KYOSHITSU_DEFAULTS（stage1/2 設定）を
// 完全削除し、現行の AI チャット設定 AI_CHAT_DEFAULTS に再設計した。

/**
 * AIチャット設定のデフォルト値（フォールバック値）。
 *
 * `lib/config/ai-config.ts:getAiChatConfig()` の最下層レイヤーとして利用される。
 * env / DB から値が来ない場合は必ずこの値が使われるため、
 * 「ハードコードのまま動く保証値」となる。
 */
export const AI_CHAT_DEFAULTS: AiChatConfig = {
  chatModel:       'qwen/qwen3-14b',   // 現状の chatModel デフォルトを維持
  chatMaxTokens:   800,                // 約 300 文字の応答想定
  chatTemperature: 0.7,
};

/** カテゴリの表示ラベル */
export const CATEGORY_LABEL: Record<ContentCategory, string> = {
  'education': '学習・教育',
  'lifestyle': '家事・暮らし',
  'work':      '仕事・効率化',
  'creative':  '創作・表現',
} as const;

/** カテゴリのアイコン絵文字（Rev41: 絵文字撤廃、lucide-react に置換） */
export const CATEGORY_EMOJI: Record<ContentCategory, string> = {
  'education': '',
  'lifestyle': '',
  'work':      '',
  'creative':  '',
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
 * stage1-fast    : AI教室パイプライン Stage1（テーマ詳細化・JSON設計）
 * stage2-html    : AI教室パイプライン Stage2（HTML生成）
 * transcribe     : 音声→テキスト
 * image-gen      : テキスト→画像
 * tts-japanese   : テキスト→日本語音声
 */
export const MODEL_ROUTER = {
  'text-simple':    'qwen/qwen3-14b',
  'text-quality':   'qwen/qwen3-235b-a22b-2507',
  'math-reasoning': 'deepseek/deepseek-r1-0528',
  'html-gen':       'google/gemini-2.5-flash',            // HTML/CSS/JS生成向け（高速・高品質）
  'stage1-fast':    'google/gemini-2.0-flash-001',        // AI教室Stage1: 高速・低コスト・JSON出力得意
  'stage2-html':    'google/gemini-2.0-flash-001',        // AI教室Stage2: テスト段階・最高速最安（Vercel 60秒制限内に収めるため）
  'transcribe':     'openai/whisper-large-v3',
  'image-gen':      'black-forest-labs/flux-1.1-pro',
  'tts-japanese':   'openai/gpt-4o-mini-tts-2025-12-15',
  /** どのモデルも利用不可の場合の最終フォールバック */
  fallback:         'qwen/qwen3-14b',
} as const;

export type ModelRouterType = Exclude<keyof typeof MODEL_ROUTER, 'fallback'>;

// ─── レート制限設定 ────────────────────────────────────────────
export const RATE_LIMIT = {
  /** 無料ユーザー：チャット API 1時間あたり */
  chatFreePerHour:    10,
  /** 有料ユーザー：チャット API 1時間あたり */
  chatPremiumPerHour: 60,
  /** TTS API 1分あたり（IP単位） */
  ttsPerMinute:       5,
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
  tools:          '/tools',
  chat:           '/chat',
  login:          '/auth/signin',
  signup:         '/auth/register',
  dashboard:      '/dashboard',
  settings:       '/settings',
  api: {
    ai:           '/api/ai',    // AIルーター（/api/chat から統一）
    tts:          '/api/tts',
    audio:        '/api/audio',
    play:         '/api/audio/play',
    articles:     '/api/articles',
    og:           '/api/og',
    rss:          '/api/rss',
  },
} as const;

// ─── 3D 図鑑（Rev34 Phase 1）─────────────────────────────────
import type { Tutor3dSubject, Tutor3dGrade } from '../types';

/** 3D 教科サブカテゴリのラベル */
export const TUTOR3D_SUBJECT_LABEL: Record<Tutor3dSubject, string> = {
  biology:       '生物',
  chemistry:     '化学',
  'earth-space': '地学・宇宙',
  physics:       '物理',
} as const;

/** 3D 教科サブカテゴリのアクセントカラー（既存 design tokens） */
export const TUTOR3D_SUBJECT_COLOR: Record<Tutor3dSubject, string> = {
  biology:       'var(--color-mint)',
  chemistry:     'var(--color-peach-light)',
  'earth-space': 'var(--color-sky)',
  physics:       'var(--color-yellow)',
} as const;

/** 3D 学年区分のラベル（既存 GRADE_LABEL とは別管理） */
export const TUTOR3D_GRADE_LABEL: Record<Tutor3dGrade, string> = {
  'elem-low':  '小学校 低学年',
  'elem-high': '小学校 高学年',
  'middle':    '中学校',
} as const;

/** 3D サブカテゴリの並び順（UI 表示順） */
export const TUTOR3D_SUBJECTS: readonly Tutor3dSubject[] = [
  'biology',
  'chemistry',
  'earth-space',
  'physics',
] as const;

/** 3D 学年区分の並び順 */
export const TUTOR3D_GRADES: readonly Tutor3dGrade[] = [
  'elem-low',
  'elem-high',
  'middle',
] as const;

// ─── AIチャット設定のモデル一覧・プリセット・範囲制限（再エクスポート） ──
export {
  AI_MODEL_OPTIONS,
  AI_CONFIG_PRESETS,
  AI_CONFIG_RANGES,
  findAiModel,
} from './ai-models';
export type { AiModelOption, AiConfigPreset, AiProvider } from './ai-models';
