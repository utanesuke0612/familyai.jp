/**
 * test/unit/shared-api.contract.test.ts
 * Rev27 #1: shared/api の apiFetch が server の {ok,data,error} ラッパーを
 * 正しく1枚剥がすことを検証する。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiFetch } from '@/shared/api';

describe('apiFetch contract — Rev27 #1', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('200 { ok: true, data: T } → data が1枚剥がれて返る', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:     true,
      status: 200,
      json:   async () => ({ ok: true, data: { items: [{ slug: 'a' }], meta: { page: 1 } } }),
    } as unknown as Response);

    const res = await apiFetch<{ items: Array<{ slug: string }>; meta: { page: number } }>(
      'https://x.test/api/articles',
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      // 二重ネストしていないこと（data.data.items ではなく data.items）
      expect(res.data.items[0].slug).toBe('a');
      expect(res.data.meta.page).toBe(1);
    }
  });

  it('4xx { ok: false, error: { message } } → error に message が入る', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:     false,
      status: 400,
      json:   async () => ({
        ok:    false,
        error: { code: 'INVALID_PARAMS', message: 'クエリパラメータが不正です。' },
      }),
    } as unknown as Response);

    const res = await apiFetch('https://x.test/api/articles');

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('クエリパラメータが不正です。');
      expect(res.status).toBe(400);
    }
  });

  it('500 + ネットワーク例外 → NETWORK_ERROR', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const res = await apiFetch('https://x.test/api/articles');

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('NETWORK_ERROR');
    }
  });
});
