/**
 * lib/config/ai-config.ts
 * familyai.jp — AI教室パイプラインのランタイム設定取得
 *
 * 設計方針:
 *   - 呼び出し側は `await getAiConfig()` だけで完結（async インターフェース）
 *   - 優先順位（下が優先）: DEFAULTS < DB（Phase 2）< env
 *   - レイヤーを後付けしても呼び出し側のコード変更不要
 *
 * 拡張ロードマップ:
 *   Phase 1（現行）: env オーバーライドのみ
 *   Phase 2:        DB レイヤー追加（管理画面から編集）
 *                   → loadFromDb() の中身を実装するだけで切替完了
 *   Phase 3:        Edge Config / Vercel KV キャッシュ追加
 *                   → loadFromDb() の頭にキャッシュ参照を追加するだけ
 */

import type { AiKyoshitsuConfig } from '@/shared/types';
import { AI_KYOSHITSU_DEFAULTS }    from '@/shared';
import { getAiConfigFromDb }        from '@/lib/repositories/ai-config';

/**
 * AI教室パイプラインの実効設定を取得する。
 *
 * @returns 必ず全フィールドが埋まった設定（DEFAULTS で保証）
 *
 * 利用例:
 * ```ts
 * const cfg = await getAiConfig();
 * await completeOpenRouter(cfg.stage2Model, ..., {
 *   maxTokens: cfg.stage2MaxTokens,
 *   temperature: cfg.stage2Temperature,
 * });
 * ```
 */
export async function getAiConfig(): Promise<AiKyoshitsuConfig> {
  // 1. DEFAULTS で初期化（必ず全フィールドが埋まる）
  let config: AiKyoshitsuConfig = { ...AI_KYOSHITSU_DEFAULTS };

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
  data:      Partial<AiKyoshitsuConfig>;
  expiresAt: number;
}

let dbCache: DbCacheEntry | null = null;

async function loadFromDbCached(): Promise<Partial<AiKyoshitsuConfig>> {
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

// ── env レイヤー（Phase 1 メイン実装） ────────────────────────────

/**
 * 環境変数から有効値だけを抽出する。
 * 未設定 / 空文字 / 数値変換失敗の場合は undefined を返し、
 * 上位の DEFAULTS / DB 値を使うようにする。
 */
function loadFromEnv(): Partial<AiKyoshitsuConfig> {
  return stripUndefined({
    stage1Model:       strOrUndef(process.env.AI_STAGE1_MODEL),
    stage2Model:       strOrUndef(process.env.AI_STAGE2_MODEL),
    stage1TimeoutMs:   numOrUndef(process.env.AI_STAGE1_TIMEOUT_MS),
    stage2TimeoutMs:   numOrUndef(process.env.AI_STAGE2_TIMEOUT_MS),
    stage2MaxTokens:   numOrUndef(process.env.AI_STAGE2_MAX_TOKENS),
    stage2Temperature: numOrUndef(process.env.AI_STAGE2_TEMPERATURE),
    chatModel:         strOrUndef(process.env.CHAT_DEFAULT_MODEL),
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
