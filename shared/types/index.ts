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
  tags:        string[];
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

// ─── 旧うごくAI教室（AI 生成アニメ）の型は Rev36 で削除 ──────────
//
// Codex Q2-4 対応: AI 生成アニメ機能は 3D 図鑑へ全面リプレイス済み
// （commit 88362a4 / 9bf6957）。
// 旧型 (AnimationGrade / AnimationSubject / AnimationSummary / Animation) と
// 旧定数 (MAX_GENERATED_HTML_BYTES / MAX_ANIMATION_PROMPT) は未参照のため削除した。
//
// DB の `user_animations` テーブルは Phase 2 で AI 3D 生成版として再利用
// する想定で残置（lib/db/schema.ts のコメント参照）。
// AI 教室パイプライン用の `AiKyoshitsuConfig`（stage1/2 設定）は Rev40 で
// 完全削除し、現行の AI チャット設定 `AiChatConfig` に再設計した（下記参照）。

// ─── 3D 図鑑（Rev34 Phase 1）─────────────────────────────────
/**
 * 3D モデルの教科サブカテゴリ。理科のみ・4 区分。
 * Phase 1 では算数・社会は対象外（将来別ツールで対応する余地あり）。
 */
export type Tutor3dSubject = 'biology' | 'chemistry' | 'earth-space' | 'physics';

/**
 * 学年区分（AnimationGrade と互換だが、3D 専用に独立型で扱う）。
 */
export type Tutor3dGrade = 'elem-low' | 'elem-high' | 'middle';

/**
 * 3D モデルのホットスポット（タップで AI が解説する点）。
 * - position: ローカル座標系の 3D 座標 [x, y, z]
 * - normal:   法線（任意・吹き出し向き等に使用）
 * - defaultExplanation: タップ即時に表示する短文（音声読み上げ素地）
 * - promptHint: AI 深掘り会話の参考情報（システムプロンプトに埋め込む）
 * - meshName:  Phase 2 で案 ③（メッシュ名識別）に移行する際に使用。
 *              GLB の glTF Node 名と一致させると、クリック時に位置近似ではなく
 *              実際のメッシュ命中で正確に判定可能。
 *              Phase 1 は座標近似のため optional。
 */
export interface Tutor3dHotspot {
  id:                  string;
  partName:            string;
  position:            [number, number, number];
  normal?:             [number, number, number];
  defaultExplanation:  string;
  promptHint:          string;
  /** Phase 2 移行用: GLB 内のメッシュ/Node 名。未指定なら位置近似のみで判定。 */
  meshName?:           string;
}

/**
 * 3D モデルのサマリ（カタログ一覧用・hotspots は含めない）。
 */
export interface Tutor3dModelSummary {
  id:           string;
  slug:         string;
  title:        string;
  description:  string;
  subject:      Tutor3dSubject;
  grade:        Tutor3dGrade;
  thumbnailUrl: string | null;
  isFeatured:   boolean;
  viewCount:    number;
}

/**
 * 3D モデルの詳細（個別ページ + 管理画面で使用・hotspots / GLB URL を含む）。
 *
 * `published` フィールドは公開ページの絞り込みでは「常に true」となるが、
 * 管理画面（/admin/3d-models）では非公開状態を直接編集する必要があるため、
 * DTO 側に含める。
 */
export interface Tutor3dModel extends Tutor3dModelSummary {
  glbUrl:       string;
  usdzUrl:      string | null;
  hotspots:     Tutor3dHotspot[];
  attribution:  string;
  license:      string;
  sourceUrl:    string | null;
  published:    boolean;
}

// ─── VOA / AIctation センテンスプレイヤー（R3-機能3）──────────

/**
 * タイムスタンプ付きセンテンス（1 文 = 1 オブジェクト）。
 * SRT/VTT を `pnpm db:convert-srt` で JSON 化したもの。
 *
 * - `start` / `end`: 秒（小数）。MP3 上の時刻範囲。
 * - `text`: 本文。スピーカープレフィックス（"DrJill: ..." 等）は含めたまま。
 *   表示時にプレイヤー側で正規表現で分けて表示する。
 *
 * 配置場所:
 *   content/voaenglish/<course>/<lessonSlug>.sentences.json
 * 例:
 *   content/voaenglish/01_01_Anna/lesson-01.sentences.json
 */
export interface Sentence {
  start: number;
  end:   number;
  text:  string;
}

/**
 * レッスン進捗（LessonsProgress テーブル / API レスポンス）。
 * - `lessonKey` は `"<course>/<slug>"` 形式（例: `"anna/lesson-01"`）。
 * - `status='completed'` のとき `completedAt` が ISO 文字列で入る。
 */
export interface LessonProgress {
  lessonKey:    string;
  status:       'in_progress' | 'completed';
  attempts:     number;
  completedAt?: string;  // ISO 8601
}

/**
 * AI チャット機能のランタイム設定。
 * 記事チャット・AI Echo・3D 図鑑ホットスポットの全 AI チャットで共有される。
 * /admin/ai-config から編集可能。
 *
 * 設定の優先順位（下が優先）: コード DEFAULTS < DB < env
 * iOS / Android 側でも同じ型で扱えるよう shared/types に置く。
 */
export interface AiChatConfig {
  /** AIチャット既定モデル ID */
  chatModel:       string;
  /** 最大出力トークン数（応答の長さ上限） */
  chatMaxTokens:   number;
  /** 生成 temperature（0=厳密 〜 1=創造的） */
  chatTemperature: number;
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

// ─── センテンスブックマーク関連 ────────────────────────────────
/**
 * Rev34: VOA ディクテーション「📜 スクリプト」内のセンテンス保存。
 *
 * API `/api/user/sentence-bookmarks` の data[] と 1:1 対応。
 * DB スキーマ（lib/db/schema.ts:userSentenceBookmarks）から
 * `lib/mappers/sentence-bookmarks.ts` の `toSentenceBookmarkItem()` で変換される。
 *
 * 単語帳（VocabItem）とは別物：
 *   - VocabItem: 1単語の意味暗記用
 *   - SentenceBookmarkItem: フレーズ記憶・シャドーイング・リスニング再復習用
 */
export interface SentenceBookmarkItem {
  /** course/lesson/sentenceIndex をスラッシュで繋いだ一意キー */
  id:           string;
  /** 注釈付き本文（`{word|reading}` / `**Speaker:**` 等そのまま） */
  text:         string;
  /** 検索用平文（注釈剥離済み） */
  textPlain:    string;
  /** 音声開始秒 */
  startSec:     number;
  /** 音声終了秒 */
  endSec:       number;
  /** 話者（"Anna" / "Pete" 等・あれば） */
  speaker?:     string;
  course:       string;
  lesson:       string;
  lessonTitle?: string;
  /** レッスン音声 URL（区間再生・将来用） */
  audioUrl?:    string;
  /** ユーザー任意メモ */
  note?:        string;
  /** 追加時刻 unix ms */
  addedAt:      number;
}

// ─── 記事ブックマーク関連 ──────────────────────────────────────
/**
 * 記事ブックマーク（記事ページのブックマークボタン保存）
 *
 * API `/api/user/article-bookmarks` の data[] と 1:1 対応。
 * `slug` が自然キー（toggle 操作の識別子）。
 */
export interface ArticleBookmarkItem {
  /** articles.slug — 一意キー */
  slug:      string;
  title:     string;
  /** 保存時刻 ISO 8601 */
  createdAt: string;
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
