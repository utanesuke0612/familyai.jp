/**
 * lib/config/ai-config.ts
 * familyai.jp — AIチャット設定のランタイム取得
 *
 * 設計方針:
 *   - 呼び出し側は `await getAiChatConfig()` だけで完結（async インターフェース）
 *   - 優先順位（下が優先）: DEFAULTS < DB < env
 *   - レイヤーを後付けしても呼び出し側のコード変更不要
 *
 * レイヤー構成:
 *   1. DEFAULTS: shared/constants の AI_CHAT_DEFAULTS（ハードコード保証値）
 *   2. DB:       ai_config テーブル（/admin/ai-config から編集・60秒キャッシュ）
 *   3. env:      緊急時の即時オーバーライド（最優先）
 */

import type { AiChatConfig } from '@/shared/types';
import { AI_CHAT_DEFAULTS }    from '@/shared';
import { getAiConfigFromDb }   from '@/lib/repositories/ai-config';

/**
 * AIチャットの実効設定を取得する。
 *
 * @returns 必ず全フィールドが埋まった設定（DEFAULTS で保証）
 *
 * 利用例:
 * ```ts
 * const cfg = await getAiChatConfig();
 * await streamByModelId(cfg.chatModel, messages, {
 *   maxTokens:   cfg.chatMaxTokens,
 *   temperature: cfg.chatTemperature,
 * });
 * ```
 */
export async function getAiChatConfig(): Promise<AiChatConfig> {
  // 1. DEFAULTS で初期化（必ず全フィールドが埋まる）
  let config: AiChatConfig = { ...AI_CHAT_DEFAULTS };

  // 2. DB レイヤー（管理画面 /admin/ai-config で編集可能）
  //    キャッシュ TTL = 60秒。DB 障害時は黙ってスキップ（DEFAULTS で動く保証）
  config = { ...config, ...(await loadFromDbCached()) };

  // 3. env レイヤー（緊急時の即時オーバーライド・最優先）
  config = { ...config, ...loadFromEnv() };

  return config;
}

// ── DB レイヤー（キャッシュ付き）────────────────────────────────

/** キャッシュ TTL（60秒） */
const DB_CACHE_TTL_MS = 60_000;

interface DbCacheEntry {
  data:      Partial<AiChatConfig>;
  expiresAt: number;
}

let dbCache: DbCacheEntry | null = null;

async function loadFromDbCached(): Promise<Partial<AiChatConfig>> {
  if (dbCache && dbCache.expiresAt > Date.now()) {
    return dbCache.data;
  }
  try {
    const fresh = await getAiConfigFromDb();
    dbCache = { data: fresh, expiresAt: Date.now() + DB_CACHE_TTL_MS };
    return fresh;
  } catch (err) {
    // DB 障害時は黙ってスキップ（DEFAULTS + env で動く）
    console.warn('[ai-config] DB レイヤー読み込み失敗・スキップ:', (err as Error)?.message);
    return {};
  }
}

/**
 * DB キャッシュを即時無効化する。
 * 管理画面で設定を保存した直後に呼び出して、次のリクエストから即反映させる。
 */
export function invalidateAiConfigCache(): void {
  dbCache = null;
}

// ── env レイヤー ────────────────────────────────────────────────

/**
 * 環境変数から有効値だけを抽出する。
 * 未設定 / 空文字 / 数値変換失敗の場合は undefined を返し、
 * 上位の DEFAULTS / DB 値を使うようにする。
 */
function loadFromEnv(): Partial<AiChatConfig> {
  return stripUndefined({
    chatModel:       strOrUndef(process.env.CHAT_DEFAULT_MODEL),
    chatMaxTokens:   numOrUndef(process.env.CHAT_MAX_TOKENS),
    chatTemperature: numOrUndef(process.env.CHAT_TEMPERATURE),
  });
}

// ── ヘルパー関数 ────────────────────────────────────────────────

/** 空文字 / undefined を除外 */
function strOrUndef(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** 数値変換できない場合は undefined */
function numOrUndef(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** undefined を持つキーを取り除く（spread 演算子で上書きされないようにする） */
function stripUndefined<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [k, v] of Object.entries(obj) as [keyof T, T[keyof T]][]) {
    if (v !== undefined) result[k] = v;
  }
  return result;
}
