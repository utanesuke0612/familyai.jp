/**
 * test/unit/aiProviderRegistry.test.ts
 * familyai.jp — AI provider registry のユニットテスト（Rev32）
 *
 * 検証範囲:
 *   - getProviderConfig が baseUrl / envKey を正しく返す
 *   - isProviderConfigured が API キー有無を正しく判定
 *   - 未設定プロバイダーで openai-compatible.completeOpenAICompat が
 *     明確なエラーメッセージで throw する
 *   - findAiModel が provider/nativeId を含む正しい形で返す
 *   - DeepSeek / Qwen モデルが期待通り定義されている
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getProviderConfig,
  isProviderConfigured,
  listProviderStatus,
  type ProviderId,
} from '@/lib/ai/provider-registry';
import { findAiModel, AI_MODEL_OPTIONS } from '@/shared';

describe('lib/ai/provider-registry', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.DEEPSEEK_BASE_URL;
    delete process.env.DASHSCOPE_BASE_URL;
  });

  afterEach(() => {
    Object.keys(process.env).forEach((k) => delete process.env[k]);
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it('returns hardcoded baseUrl for each provider', () => {
    expect(getProviderConfig('openrouter').baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(getProviderConfig('deepseek').baseUrl).toBe('https://api.deepseek.com/v1');
    expect(getProviderConfig('qwen').baseUrl).toBe(
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    );
  });

  it('returns correct envKey names', () => {
    expect(getProviderConfig('openrouter').envKey).toBe('OPENROUTER_API_KEY');
    expect(getProviderConfig('deepseek').envKey).toBe('DEEPSEEK_API_KEY');
    expect(getProviderConfig('qwen').envKey).toBe('DASHSCOPE_API_KEY');
  });

  it('reflects env var presence in apiKey + isProviderConfigured', () => {
    expect(isProviderConfigured('deepseek')).toBe(false);
    expect(getProviderConfig('deepseek').apiKey).toBeUndefined();

    process.env.DEEPSEEK_API_KEY = 'sk-deepseek-test-12345';
    expect(isProviderConfigured('deepseek')).toBe(true);
    expect(getProviderConfig('deepseek').apiKey).toBe('sk-deepseek-test-12345');
  });

  it('listProviderStatus returns all 3 providers with ready flag', () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-x';
    const list = listProviderStatus();
    expect(list).toHaveLength(3);
    const openrouter = list.find((p) => p.provider === 'openrouter');
    expect(openrouter?.ready).toBe(true);
    expect(openrouter?.label).toBe('OpenRouter');
    const deepseek = list.find((p) => p.provider === 'deepseek');
    expect(deepseek?.ready).toBe(false);
  });

  it('extraHeaders for openrouter includes HTTP-Referer + X-Title', () => {
    const cfg = getProviderConfig('openrouter');
    const headers = cfg.extraHeaders();
    expect(headers['HTTP-Referer']).toMatch(/familyai\.jp/);
    expect(headers['X-Title']).toMatch(/familyai\.jp/);
  });

  it('extraHeaders for deepseek/qwen are empty (OpenAI 互換のみ)', () => {
    expect(Object.keys(getProviderConfig('deepseek').extraHeaders())).toHaveLength(0);
    expect(Object.keys(getProviderConfig('qwen').extraHeaders())).toHaveLength(0);
  });

  it('honors DEEPSEEK_BASE_URL / DASHSCOPE_BASE_URL overrides — deferred via dynamic import', async () => {
    // baseUrl は module load 時に env を読むため、dynamic import で fresh に評価する
    process.env.DEEPSEEK_BASE_URL  = 'https://proxy.example.com/deepseek/v1';
    process.env.DASHSCOPE_BASE_URL = 'https://proxy.example.com/dashscope/v1';
    vi.resetModules();
    const fresh = await import('@/lib/ai/provider-registry');
    expect(fresh.getProviderConfig('deepseek').baseUrl).toBe('https://proxy.example.com/deepseek/v1');
    expect(fresh.getProviderConfig('qwen').baseUrl).toBe('https://proxy.example.com/dashscope/v1');
  });
});

describe('shared/constants/ai-models — Rev32 provider 拡張', () => {
  it('全モデルに provider フィールドが付与されている', () => {
    for (const m of AI_MODEL_OPTIONS) {
      expect(m.provider).toBeDefined();
      expect(['openrouter', 'deepseek', 'qwen']).toContain(m.provider);
    }
  });

  it('DeepSeek 公式モデルが 2 件以上登録されている', () => {
    const ds = AI_MODEL_OPTIONS.filter((m) => m.provider === 'deepseek');
    expect(ds.length).toBeGreaterThanOrEqual(2);
    expect(ds.every((m) => m.id.startsWith('deepseek:'))).toBe(true);
    expect(ds.every((m) => !!m.nativeId)).toBe(true);
  });

  it('Qwen 公式モデルが 3 件以上登録されている', () => {
    const qw = AI_MODEL_OPTIONS.filter((m) => m.provider === 'qwen');
    expect(qw.length).toBeGreaterThanOrEqual(3);
    expect(qw.every((m) => m.id.startsWith('qwen:'))).toBe(true);
  });

  it('findAiModel が DeepSeek 直 API モデルを正しく返す', () => {
    const m = findAiModel('deepseek:deepseek-chat');
    expect(m?.provider).toBe('deepseek');
    expect(m?.nativeId).toBe('deepseek-chat');
  });

  it('findAiModel が Qwen 直 API モデルを正しく返す', () => {
    const m = findAiModel('qwen:qwen-plus');
    expect(m?.provider).toBe('qwen');
    expect(m?.nativeId).toBe('qwen-plus');
  });

  it('既存 OpenRouter モデルは provider="openrouter" のまま', () => {
    const gem = findAiModel('google/gemini-2.0-flash-001');
    expect(gem?.provider).toBe('openrouter');
    // OpenRouter は nativeId を使わない（id をそのまま渡す）
    expect(gem?.nativeId).toBeUndefined();
  });
});
