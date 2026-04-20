/**
 * test/unit/shared-api.latest-related.test.ts
 * Rev24 #①: fetchLatest / fetchRelated のクライアント契約検証。
 *
 * - エンドポイント URL が正しく組み立てられること（limit クエリ付き）
 * - 200 { ok, data: ArticleSummary[] } を apiFetch が1枚剥がして返すこと
 * - 404（related で記事が存在しない場合）エラーが message として返ること
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchLatest, fetchRelated } from '@/shared/api';

const BASE = 'https://x.test';

describe('fetchLatest / fetchRelated contract — Rev24 #①', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchLatest: ?limit=6 で叩き、data: ArticleSummary[] を返す', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok:     true,
      status: 200,
      json:   async () => ({
        ok:   true,
        data: [{ slug: 'a' }, { slug: 'b' }],
      }),
    } as unknown as Response);
    global.fetch = mockFetch;

    const res = await fetchLatest(BASE, 6);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(2);
      expect(res.data[0]?.slug).toBe('a');
    }

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toBe(`${BASE}/api/articles/latest?limit=6`);
  });

  it('fetchRelated: /api/articles/:slug/related?limit=3 で叩く', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok:     true,
      status: 200,
      json:   async () => ({ ok: true, data: [{ slug: 'x' }] }),
    } as unknown as Response);
    global.fetch = mockFetch;

    const res = await fetchRelated(BASE, 'hello-world', 3);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data[0]?.slug).toBe('x');
    }

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toBe(`${BASE}/api/articles/hello-world/related?limit=3`);
  });

  it('fetchRelated: 404 NOT_FOUND の error.message が返る', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:     false,
      status: 404,
      json:   async () => ({
        ok:    false,
        error: { code: 'NOT_FOUND', message: '記事が見つかりません。' },
      }),
    } as unknown as Response);

    const res = await fetchRelated(BASE, 'does-not-exist');

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('記事が見つかりません。');
      expect(res.status).toBe(404);
      expect(res.code).toBe('NOT_FOUND');
    }
  });
});
