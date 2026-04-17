/**
 * shared/types/index.ts
 * familyai.jp — ドメイン共通型定義（pure TypeScript / iOS 移植対応）
 * ブラウザ・Node・iOS のどの環境でも動作する型のみ定義する。
 */

// ─── ユーザーロール ────────────────────────────────────────────
/** サイトが対象とする家族メンバーのロール */
export type FamilyRole = 'papa' | 'mama' | 'kids' | 'senior' | 'common';

/** ロール別の表示ラベル（日本語） */
export const FAMILY_ROLE_LABEL: Record<FamilyRole, string> = {
  papa:   'パパ',
  mama:   'ママ',
  kids:   'こども',
  senior: 'シニア',
  common: 'みんな',
} as const;

// ─── コンテンツ関連 ────────────────────────────────────────────
/** 記事・コンテンツのカテゴリ */
export type ContentCategory =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'image-gen'
  | 'voice'
  | 'education'
  | 'housework'
  | 'health'
  | 'finance'
  | 'other';

/** 記事の難易度 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/** 記事サマリ型（一覧表示用） */
export interface ArticleSummary {
  id:          string;
  slug:        string;
  title:       string;
  description: string;
  roles:       FamilyRole[];      // DB schema に合わせて配列（複数ロール対応）
  categories:  ContentCategory[]; // DB schema に合わせて配列（複数カテゴリ対応）
  level:       DifficultyLevel;
  tags:        string[];
  publishedAt: string; // ISO 8601
  updatedAt?:  string;
  coverImage?: string;
  readingMin:  number; // 読了目安（分）
}

/** 記事詳細型 */
export interface Article extends ArticleSummary {
  content: string; // Markdown
  author?: {
    name:   string;
    avatar?: string;
  };
}

// ─── AI チャット関連 ───────────────────────────────────────────
/** チャットメッセージのロール */
export type ChatRole = 'user' | 'assistant' | 'system';

/** チャットメッセージ */
export interface ChatMessage {
  id:        string;
  role:      ChatRole;
  content:   string;
  createdAt: string; // ISO 8601
}

/** AI 応答ストリームのデルタ */
export interface ChatStreamDelta {
  id:      string;
  delta:   string;
  done:    boolean;
}

// ─── ユーザー関連 ──────────────────────────────────────────────
/** 認証済みユーザーのプロファイル */
export interface UserProfile {
  id:          string;
  email:       string;
  name?:       string;
  image?:      string;
  role?:       FamilyRole;
  isPremium:   boolean;
  createdAt:   string;
}

// ─── API レスポンス共通型 ──────────────────────────────────────
/** 成功レスポンスラッパー */
export interface ApiSuccess<T> {
  ok:   true;
  data: T;
}

/** エラーレスポンスラッパー */
export interface ApiError {
  ok:      false;
  error:   string;
  code?:   string;
  status?: number;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── ページネーション ──────────────────────────────────────────
export interface PaginationMeta {
  page:       number;
  perPage:    number;
  total:      number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta:  PaginationMeta;
}
