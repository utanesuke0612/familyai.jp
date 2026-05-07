/**
 * lib/ai/providers/openai-compatible.ts
 * familyai.jp — OpenAI Chat Completions 互換プロバイダー（汎用）
 *
 * Rev32: DeepSeek 公式 / Qwen DashScope 等の「OpenAI 互換」エンドポイントを
 * 統一インターフェースで叩くための薄いアダプタ。OpenRouter とほぼ同じ形式の
 * リクエスト/レスポンスを期待するが、provider-registry で baseUrl・apiKey・
 * 追加ヘッダーを切替える。
 *
 * 既存の OpenRouter プロバイダー（`./openrouter.ts`）はそのまま残す（後方互換）。
 * 新規モデルはこの汎用アダプタ経由で呼ぶことで provider 別実装が増えるのを防ぐ。
 */

import { getProviderConfig, type ProviderId } from '../provider-registry';
import type {
  OpenRouterMessage,
  StreamOptions,
  CompleteOptions,
  UsageStats,
} from './openrouter';

/** OpenRouter と共通の型を再 export（callsites の import 経路を統一） */
export type ChatMessage = OpenRouterMessage;
export type {
  StreamOptions,
  CompleteOptions,
  UsageStats,
} from './openrouter';

// ─── 共通 fetch ヘルパー ────────────────────────────────────────
function buildHeaders(provider: ProviderId): Record<string, string> {
  const cfg = getProviderConfig(provider);
  if (!cfg.apiKey) {
    throw new Error(
      `${cfg.label} の API キー (${cfg.envKey}) が設定されていません。Vercel の環境変数を確認してください。`,
    );
  }
  return {
    'Authorization': `Bearer ${cfg.apiKey}`,
    'Content-Type':  'application/json',
    ...cfg.extraHeaders(),
  };
}

function buildUrl(provider: ProviderId, path: string): string {
  const cfg = getProviderConfig(provider);
  return `${cfg.baseUrl.replace(/\/$/, '')}${path}`;
}

function resolveModelId(provider: ProviderId, id: string): string {
  const cfg = getProviderConfig(provider);
  return cfg.normalizeModelId ? cfg.normalizeModelId(id) : id;
}

// ─── 非ストリーム ────────────────────────────────────────────────
/**
 * OpenAI 互換 Chat Completions API を呼び出して全文レスポンスを返す。
 */
export async function completeOpenAICompat(
  provider: ProviderId,
  model:    string,
  messages: ChatMessage[],
  options:  CompleteOptions = {},
): Promise<{ content: string; usage?: UsageStats }> {
  const cfg = getProviderConfig(provider);
  const res = await fetch(buildUrl(provider, '/chat/completions'), {
    method:  'POST',
    headers: buildHeaders(provider),
    body: JSON.stringify({
      model:       resolveModelId(provider, model),
      messages,
      stream:      false,
      max_tokens:  options.maxTokens  ?? 8000,
      temperature: options.temperature ?? 0.7,
      // OpenRouter 互換の usage include。DeepSeek/Qwen も response.usage を含む。
      ...(provider === 'openrouter' ? { usage: { include: true } } : {}),
    }),
    signal: options.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`${cfg.label} API エラー: ${res.status} ${errText.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?:   UsageStats;
  };
  const content = json.choices?.[0]?.message?.content ?? '';
  if (!content) {
    throw new Error(`${cfg.label} から空のレスポンスが返りました。`);
  }
  return { content, usage: json.usage };
}

// ─── ストリーム ──────────────────────────────────────────────────
/**
 * OpenAI 互換 Chat Completions API を呼び出して
 * `data: {"delta":"..."}` / `data: [DONE]` 形式のストリームに変換して返す。
 */
export async function streamOpenAICompat(
  provider: ProviderId,
  model:    string,
  messages: ChatMessage[],
  options:  StreamOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const cfg = getProviderConfig(provider);
  const res = await fetch(buildUrl(provider, '/chat/completions'), {
    method:  'POST',
    headers: buildHeaders(provider),
    body: JSON.stringify({
      model:       resolveModelId(provider, model),
      messages,
      stream:      true,
      max_tokens:  options.maxTokens  ?? 1000,
      temperature: options.temperature ?? 0.7,
    }),
    signal: options.signal,
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(`${cfg.label} API エラー: ${res.status} ${errText.slice(0, 300)}`);
  }

  return transformOpenAISSE(res.body);
}

// ─── SSE → familyai 形式 変換 ───────────────────────────────────
function transformOpenAISSE(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload);
              const content =
                (json.choices?.[0]?.delta?.content as string | undefined) ?? '';
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta: content })}\n\n`),
                );
              }
            } catch {
              // 不正な JSON 行はスキップ
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
