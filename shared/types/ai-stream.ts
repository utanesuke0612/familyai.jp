/**
 * shared/types/ai-stream.ts
 * familyai.jp — /api/ai SSE ストリーム契約（pure TypeScript / iOS 移植対応）
 *
 * サーバ側（app/api/ai/route.ts）が流す SSE の `data:` 行は以下の 3 種類:
 *   1. `data: {"delta":"..."}`               — トークン追加
 *   2. `data: {"error":"...","code":"..."}`  — ストリーム内エラー通知
 *   3. `data: [DONE]`                         — 終端マーカー
 *
 * Web / iOS / Android 各クライアントは同じ shape を期待するため、
 * 本ファイルをサーバとクライアントの double source of truth として
 * import し、文字列リテラルの散在を防ぐ。
 */

/** 1チャンク分のトークン追加通知 */
export interface ChatStreamDelta {
  delta: string;
}

/** ストリーム内で送られるエラー通知 */
export interface ChatStreamError {
  error: string;
  /** エラー分類コード（例: TIMEOUT, AI_UNAVAILABLE, AI_ERROR） */
  code:  string;
}

/** SSE `data:` 行のペイロード（DONE マーカーを除く） */
export type ChatStreamPayload = ChatStreamDelta | ChatStreamError;

/** SSE ストリーム終端マーカー */
export const CHAT_STREAM_DONE = '[DONE]' as const;

/** エラーコードの既知値（サーバ側と揃える） */
export const CHAT_STREAM_ERROR_CODES = [
  'UNSUPPORTED_TYPE',
  'TIMEOUT',
  'AI_UNAVAILABLE',
  'AI_ERROR',
] as const;
export type ChatStreamErrorCode = (typeof CHAT_STREAM_ERROR_CODES)[number];

// ─── 型ガード ──────────────────────────────────────────────────
export function isChatStreamDelta(v: unknown): v is ChatStreamDelta {
  return !!v && typeof v === 'object' && typeof (v as { delta?: unknown }).delta === 'string';
}

export function isChatStreamError(v: unknown): v is ChatStreamError {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as { error?: unknown }).error === 'string' &&
    typeof (v as { code?:  unknown }).code  === 'string'
  );
}
