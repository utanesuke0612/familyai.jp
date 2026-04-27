/**
 * lib/ai/providers/openrouter.ts
 * familyai.jp — OpenRouter テキスト生成プロバイダー
 *
 * OpenRouter の SSE ストリーム（`data: {...}` 形式）を受け取り、
 * 独自の SSE 形式（`data: {"delta":"..."}` / `data: [DONE]`）に変換して返す。
 */

/**
 * メッセージ内のコンテンツブロック。
 * Anthropicプロンプトキャッシュ用に cache_control を指定可能。
 */
export interface OpenRouterContentBlock {
  type:           'text';
  text:           string;
  /** Anthropicモデルのみ対応。同じテキストの2回目以降のリクエストでコスト90%削減 */
  cache_control?: { type: 'ephemeral' };
}

export type OpenRouterMessageContent = string | OpenRouterContentBlock[];

export interface OpenRouterMessage {
  role:    'system' | 'user' | 'assistant';
  content: OpenRouterMessageContent;
}

export interface StreamOptions {
  maxTokens?:   number;
  temperature?: number;
  signal?:      AbortSignal;
}

export interface CompleteOptions {
  maxTokens?:   number;
  temperature?: number;
  signal?:      AbortSignal;
  /** 使用統計を取得（キャッシュヒット計測用） */
  returnUsage?: boolean;
}

/** モデルの使用統計（キャッシュヒット率の計測に使う） */
export interface UsageStats {
  prompt_tokens?:                   number;
  completion_tokens?:               number;
  total_tokens?:                    number;
  /** キャッシュから読まれたトークン数（Anthropicのみ） */
  cache_read_input_tokens?:         number;
  /** キャッシュに書き込まれたトークン数（Anthropicのみ・1.25倍料金） */
  cache_creation_input_tokens?:     number;
}

/**
 * OpenRouter API を呼び出してテキストを一括で返す（非ストリーミング）。
 * HTML 生成など、全文を受け取ってから処理する用途向け。
 *
 * messages の content に `cache_control: { type: 'ephemeral' }` を含む
 * ContentBlock 配列を渡すと、Anthropicモデルのプロンプトキャッシュが有効化される。
 */
export async function completeOpenRouter(
  model:    string,
  messages: OpenRouterMessage[],
  options:  CompleteOptions = {},
): Promise<string> {
  const result = await completeOpenRouterWithUsage(model, messages, options);
  return result.content;
}

/**
 * completeOpenRouter のキャッシュ統計付きバージョン。
 * キャッシュヒット率を計測したい場合はこちらを使用。
 */
export async function completeOpenRouterWithUsage(
  model:    string,
  messages: OpenRouterMessage[],
  options:  CompleteOptions = {},
): Promise<{ content: string; usage?: UsageStats }> {
  const apiKey  = process.env.OPENROUTER_API_KEY;
  const appUrl  = process.env.OPENROUTER_APP_URL  ?? 'https://familyai.jp';
  const appName = process.env.OPENROUTER_APP_NAME ?? 'familyai.jp';
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';

  if (!apiKey) throw new Error('OPENROUTER_API_KEY が設定されていません。');

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer':  appUrl,
      'X-Title':       appName,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream:      false,
      max_tokens:  options.maxTokens  ?? 8000,
      temperature: options.temperature ?? 0.7,
      // キャッシュヒット情報を含めてもらう
      usage:       { include: true },
    }),
    signal: options.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter API エラー: ${res.status} ${errText}`);
  }

  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?:   UsageStats;
  };
  const content = json.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('OpenRouter から空のレスポンスが返りました。');
  return { content, usage: json.usage };
}

/**
 * OpenRouter API を呼び出してテキスト生成ストリームを返す。
 * 返却する ReadableStream は `data: {"delta":"..."}` / `data: [DONE]` 形式。
 */
export async function streamOpenRouter(
  model:    string,
  messages: OpenRouterMessage[],
  options:  StreamOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const apiKey  = process.env.OPENROUTER_API_KEY;
  const appUrl  = process.env.OPENROUTER_APP_URL  ?? 'https://familyai.jp';
  const appName = process.env.OPENROUTER_APP_NAME ?? 'familyai.jp';
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY が設定されていません。');
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer':  appUrl,
      'X-Title':       appName,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream:     true,
      max_tokens: options.maxTokens  ?? 1000,
      temperature: options.temperature ?? 0.7,
    }),
    signal: options.signal,
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter API エラー: ${res.status} ${errText}`);
  }

  // OpenRouter の生 SSE を familyai 独自形式に変換
  return transformStream(res.body);
}

// ── SSE 変換ストリーム ────────────────────────────────────────────
function transformStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
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
          const lines  = buffer.split('\n');
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
              const json    = JSON.parse(payload);
              const content = (json.choices?.[0]?.delta?.content as string | undefined) ?? '';
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

        // ストリームが [DONE] なしで終了した場合
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
