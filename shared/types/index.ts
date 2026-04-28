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
  id:          string;
  slug:        string;
  title:       string;
  description: string | null;
  categories:  ContentCategory[];
  level:       DifficultyLevel;
  thumbnailUrl: string | null;
  viewCount:   number;
  isFeatured:  boolean;
  publishedAt: string | null;  // ISO 8601
  updatedAt?:  string;          // ISO 8601
}

/** 記事詳細型（本文 + 読了目安を含む） */
export interface Article extends ArticleSummary {
  body:       string;   // Markdown
  readingMin: number;   // 読了目安（分・mapper が本文から計算）
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

// ─── うごくAI教室 関連 ─────────────────────────────────────────
/** アニメーション学年 */
export type AnimationGrade   = 'elem-low' | 'elem-high' | 'middle';

/** アニメーション教科 */
export type AnimationSubject = 'science' | 'math' | 'social';

/**
 * アニメーションサマリ（一覧表示用・htmlContent を含まない）
 *
 * API `/api/user/animations` の items[] と 1:1 対応。
 * DB スキーマ（lib/db/schema.ts:userAnimations）から
 * `lib/mappers/animations.ts` の `toAnimationSummary()` で変換される。
 */
export interface AnimationSummary {
  id:        string;
  theme:     string;
  grade:     AnimationGrade;
  subject:   AnimationSubject;
  prompt:    string;
  createdAt: string;  // ISO 8601
  // R3-U1（migration 0011）でユーザーが操作するメタ情報。
  // 既存サーバー / クライアントとの互換のため optional。
  /** お気に入りマーク（⭐）。デフォルト false */
  isFavorite?:  boolean;
  /** ユーザーが付け直したタイトル。空 / undefined なら theme を表示 */
  customTitle?: string;
  /** 公開フラグ。デフォルト true（既存互換）。false なら所有者しか閲覧不可 */
  isPublic?:    boolean;
}

/** アニメーション詳細（本文 HTML を含む・所有者のみ取得想定） */
export interface Animation extends AnimationSummary {
  htmlContent: string;
  userId:      string;
}

/**
 * うごくAI教室パイプラインのランタイム設定。
 *
 * `lib/config/ai-config.ts:getAiConfig()` から取得する。
 * Phase 1（現行）: コードのデフォルト値 < env オーバーライド
 * Phase 2（将来）: DB レイヤーが間に入る予定（呼び出し側に変更不要）
 *
 * iOS / Android 側でも同じ型で扱えるよう shared/types に置く。
 */
export interface AiKyoshitsuConfig {
  /** Stage 1（テーマ詳細化）モデル ID */
  stage1Model:        string;
  /** Stage 2（HTML生成）モデル ID */
  stage2Model:        string;
  /** Stage 1 の最大実行時間（ms） */
  stage1TimeoutMs:    number;
  /** Stage 2 の最大実行時間（ms） */
  stage2TimeoutMs:    number;
  /** Stage 2 の最大出力トークン数 */
  stage2MaxTokens:    number;
  /** Stage 2 の生成 temperature（0〜1） */
  stage2Temperature:  number;
  /** AIチャット既定モデル ID */
  chatModel:          string;
}

// ─── AI メモ関連 ───────────────────────────────────────────────
/**
 * AI メモアイテム（記事ページの AI チャット応答を保存）
 *
 * API `/api/user/ai-memos` の data[] と 1:1 対応。
 * DB スキーマ（lib/db/schema.ts:userAiMemos）から
 * `lib/mappers/ai-memos.ts` の `toAiMemoItem()` で変換される。
 */
export interface AiMemoItem {
  id:           string;
  answer:       string;
  question:     string;
  articleTitle: string;
  articleSlug?: string;
  /** 保存時刻 unix ms */
  savedAt:      number;
}

// ─── 単語ブックマーク関連 ──────────────────────────────────────
/**
 * 単語ブックマーク（VOA English 等の単語）
 *
 * API `/api/user/vocab-bookmarks` の data[] と 1:1 対応。
 * DB スキーマ（lib/db/schema.ts:userVocabBookmarks）から
 * `lib/mappers/vocab-bookmarks.ts` の `toVocabItem()` で変換される。
 */
export interface VocabItem {
  /** course/lesson/word をスラッシュでつないだ一意キー（小文字化） */
  id:           string;
  word:         string;
  meaning:      string;
  pron?:        string;
  example?:     string;
  course?:      string;
  lesson?:      string;
  lessonTitle?: string;
  /** 追加時刻 unix ms */
  addedAt:      number;
}

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
