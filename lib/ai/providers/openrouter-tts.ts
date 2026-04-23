/**
 * lib/ai/providers/openrouter-tts.ts
 * familyai.jp — OpenRouter Text-to-Speech provider
 */

export type OpenRouterTtsVoice =
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'sage'
  | 'shimmer'
  | 'verse';

export type OpenRouterTtsFormat = 'mp3';

export interface OpenRouterTtsOptions {
  model?: string;
  voice?: OpenRouterTtsVoice;
  format?: OpenRouterTtsFormat;
  speed?: number;
  signal?: AbortSignal;
}

export async function generateOpenRouterTts(
  input: string,
  options: OpenRouterTtsOptions = {},
): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const appUrl = process.env.OPENROUTER_APP_URL ?? 'https://familyai.jp';
  const appName = process.env.OPENROUTER_APP_NAME ?? 'familyai.jp';
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY が設定されていません。');
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': appUrl,
      'X-Title': appName,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      model: options.model ?? 'openai/gpt-4o-mini-tts-2025-12-15',
      voice: options.voice ?? 'coral',
      response_format: options.format ?? 'mp3',
      ...(options.speed ? { speed: options.speed } : {}),
    }),
    signal: options.signal,
  });

  if (!res.ok) {
    throw new Error(`OpenRouter TTS API エラー: ${res.status}`);
  }

  return res;
}
