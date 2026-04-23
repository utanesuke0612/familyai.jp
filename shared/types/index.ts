/**
 * shared/types/index.ts
 * familyai.jp — ドメイン共通型定義（pure TypeScript / iOS 移植対応）
 * ブラウザ・Node・iOS のどの環境でも動作する型のみ定義する。
 */

// ─── コンテンツ関連 ────────────────────────────────────────────
/** 記事・コンテンツのカテゴリ */
export type ContentCategory =
  | 'education'
  | 'lifestyle'
  | 'work'
  | 'creative';

/** 記事の難易度 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * 記事サマリ型（一覧表示用・Rev26 #1）
 *
 * API `/api/articles` の返却 DTO と 1:1 対応。DB スキーマ（lib/db/schema.ts）から
 * `lib/mappers/articles.ts` の `toArticleSummary()` で変換される。
 * iOS/Android など shared/api を利用するクライアントはこの契約を信頼してよい。
 */
export interface ArticleSummary {
  id:               string;
  slug:             string;
  title:            string;
  description:      string | null;
  categories:       ContentCategory[];
  level:            DifficultyLevel;
  audioUrl:         string | null;
  audioDurationSec: number | null;
  audioLanguage:    string | null;
  thumbnailUrl:     string | null;
  viewCount:        number;
  audioPlayCount:   number;
  isFeatured:       boolean;
  publishedAt:      string | null;  // ISO 8601
  updatedAt?:       string;          // ISO 8601
}

/** 記事詳細型（本文 + 読了目安を含む） */
export interface Article extends ArticleSummary {
  body:             string;          // Markdown（旧 `content`）
  audioTranscript:  string | null;
  readingMin:       number;          // 読了目安（分・mapper が本文から計算）
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

// ストリーム契約は ./ai-stream.ts を参照（再 export で shared/types 単一入口を維持）
export type {
  ChatStreamDelta,
  ChatStreamError,
  ChatStreamPayload,
  ChatStreamErrorCode,
} from './ai-stream';
export {
  CHAT_STREAM_DONE,
  CHAT_STREAM_ERROR_CODES,
  isChatStreamDelta,
  isChatStreamError,
} from './ai-stream';

// ─── ユーザー関連 ──────────────────────────────────────────────
/** 認証済みユーザーのプロファイル */
export interface UserProfile {
  id:          string;
  email:       string;
  name?:       string;
  image?:      string;
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
  hasNext:    boolean;
  hasPrev:    boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta:  PaginationMeta;
}
