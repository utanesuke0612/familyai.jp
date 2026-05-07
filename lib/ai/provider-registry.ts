/**
 * lib/ai/provider-registry.ts
 * familyai.jp — AI プロバイダー設定レジストリ（Rev32 / DeepSeek + Qwen 直 API 対応）
 *
 * 各プロバイダーの baseUrl / 認証 ENV キー / 追加ヘッダーを集約。
 * 全て OpenAI Chat Completions 互換 API を提供する前提（DeepSeek・Qwen DashScope・OpenRouter）。
 *
 * 利用例:
 *   const cfg = getProviderConfig('deepseek');
 *   if (!cfg.apiKey) throw new Error(`${cfg.label} の API キー (${cfg.envKey}) が未設定`);
 *   fetch(`${cfg.baseUrl}/chat/completions`, {
 *     headers: { Authorization: `Bearer ${cfg.apiKey}`, ...cfg.extraHeaders },
 *     ...
 *   });
 */

/** サポートする AI プロバイダー ID */
export type ProviderId =
  | 'openrouter'   // 全モデルのフォールバック・統一エントリ（既存）
  | 'deepseek'     // DeepSeek 公式 API（OpenAI 互換）
  | 'qwen';        // Alibaba Cloud DashScope（OpenAI 互換モード）

interface ProviderRegistryEntry {
  /** UI / ログ表示用のラベル */
  label:        string;
  /** 例: `https://api.deepseek.com/v1` */
  baseUrl:      string;
  /** API キーが入っている環境変数名（実値ではない） */
  envKey:       string;
  /** 追加で付ける必要があるヘッダー（OpenRouter の HTTP-Referer / X-Title 等） */
  extraHeaders: () => Record<string, string>;
  /**
   * 直 API 呼び出し時の `model` パラメータ正規化:
   *   モデル ID (`AiModelOption.id`) を受け取り、プロバイダーが期待する形に変換。
   *   省略時はそのまま使われる。
   */
  normalizeModelId?: (id: string) => string;
}

const HARDCODED: Record<ProviderId, Omit<ProviderRegistryEntry, 'extraHeaders'> & {
  extraHeaders?: () => Record<string, string>;
}> = {
  openrouter: {
    label:   'OpenRouter',
    baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    envKey:  'OPENROUTER_API_KEY',
    extraHeaders: () => ({
      'HTTP-Referer': process.env.OPENROUTER_APP_URL  ?? 'https://familyai.jp',
      'X-Title':      process.env.OPENROUTER_APP_NAME ?? 'familyai.jp',
    }),
  },
  deepseek: {
    label:   'DeepSeek 公式',
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
    envKey:  'DEEPSEEK_API_KEY',
  },
  qwen: {
    label:   'Qwen (Alibaba DashScope)',
    /**
     * 国際版（推奨）: dashscope-intl.aliyuncs.com
     * 中国大陸版:     dashscope.aliyuncs.com
     * 環境変数 `DASHSCOPE_BASE_URL` で上書き可能。
     */
    baseUrl: process.env.DASHSCOPE_BASE_URL ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    envKey:  'DASHSCOPE_API_KEY',
  },
};

export interface ResolvedProviderConfig extends ProviderRegistryEntry {
  /** `process.env[envKey]` の実値（未設定なら undefined） */
  apiKey: string | undefined;
}

/** プロバイダー設定を解決（API キー含む）。Server-only。 */
export function getProviderConfig(provider: ProviderId): ResolvedProviderConfig {
  const entry = HARDCODED[provider];
  return {
    ...entry,
    extraHeaders: entry.extraHeaders ?? (() => ({})),
    apiKey:       process.env[entry.envKey],
  };
}

/** プロバイダーが利用可能か（API キーが設定されているか）。 */
export function isProviderConfigured(provider: ProviderId): boolean {
  return !!process.env[HARDCODED[provider].envKey];
}

/** 全プロバイダーの利用可能状態（管理画面の disabled 表示用） */
export function listProviderStatus(): Array<{
  provider: ProviderId;
  label:    string;
  envKey:   string;
  ready:    boolean;
}> {
  return (Object.keys(HARDCODED) as ProviderId[]).map((p) => ({
    provider: p,
    label:    HARDCODED[p].label,
    envKey:   HARDCODED[p].envKey,
    ready:    isProviderConfigured(p),
  }));
}
