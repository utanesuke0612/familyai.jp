/**
 * app/api/tts/route.ts
 * familyai.jp — OpenRouter Text-to-Speech API
 *
 * POST /api/tts
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { MODEL_ROUTER, RATE_LIMIT } from '@/shared';
import { verifyCsrf } from '@/lib/csrf';
import { getClientIp, getRateLimiter, rateLimitedResponse } from '@/lib/ratelimit';
import {
  generateOpenRouterTts,
  type OpenRouterTtsVoice,
} from '@/lib/ai/providers/openrouter-tts';

export const runtime = 'nodejs';

const voiceSchema = z.enum([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
]);

const formatSchema = z.literal('mp3');

const bodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
  voice: voiceSchema.optional(),
  format: formatSchema.optional(),
  speed: z.number().min(0.25).max(4).optional(),
});

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(
    JSON.stringify({ ok: false, error: { code, message } }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) {
    return errorResponse('FORBIDDEN', '不正なリクエストです。', 403);
  }

  const limiter = getRateLimiter('ratelimit:tts', RATE_LIMIT.ttsPerMinute, '1 m');
  if (limiter) {
    const { success } = await limiter.limit(getClientIp(req));
    if (!success) {
      return rateLimitedResponse('音声生成のリクエストが多すぎます。少し待ってから再試行してください。');
    }
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse('INVALID_BODY', 'リクエストボディが不正です。', 400);
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse('INVALID_PARAMS', '入力内容を確認してください。', 400);
  }

  const { text, voice, format = 'mp3', speed } = parsed.data;

  try {
    const upstream = await generateOpenRouterTts(text, {
      model: MODEL_ROUTER['tts-japanese'],
      voice: (voice ?? 'coral') as OpenRouterTtsVoice,
      format,
      speed,
      signal: req.signal,
    });

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '不明なエラー';
    console.error('[POST /api/tts] TTS エラー:', msg);

    if (msg.includes('OPENROUTER_API_KEY')) {
      return errorResponse(
        'TTS_UNAVAILABLE',
        'TTS が一時的に利用できません。',
        503,
      );
    }

    return errorResponse(
      'TTS_ERROR',
      '音声生成に失敗しました。しばらくしてからお試しください。',
      502,
    );
  }
}
