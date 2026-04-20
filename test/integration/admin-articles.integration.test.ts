/**
 * test/integration/admin-articles.integration.test.ts
 * QA-T3（API 統合テスト）: 管理画面 API の Route Handler を直接叩く。
 *
 * モック戦略:
 *   - `@/lib/auth` の `auth()` で管理者 / 非管理者 / 未ログインを切替
 *   - `@/lib/repositories/articles` の CRUD 関数を vi.fn() で差し替え
 *   - `@/lib/ratelimit` の enforceAdminRateLimit を成功/429 に切替
 *
 * カバレッジ:
 *   - GET  /api/admin/articles           : 200（pagination meta）／403（非管理者）／400（不正 sort）
 *   - POST /api/admin/articles           : 201（create）／403（CSRF）／400（validation）／429（rate limit）
 *   - PUT  /api/admin/articles/:slug     : 200（update）／404（not found）／400（validation）
 *   - DELETE /api/admin/articles/:slug   : 200（delete）／404
 *   - PATCH /api/admin/articles/:slug/toggle : 200（toggle）／404
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ─── モック: auth / repositories / ratelimit ─────────────────────
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/repositories/articles', () => ({
  listAllArticles: vi.fn(),
  createArticle:   vi.fn(),
  updateArticle:   vi.fn(),
  deleteArticle:   vi.fn(),
  togglePublished: vi.fn(),
}));
vi.mock('@/lib/ratelimit', () => ({
  enforceAdminRateLimit: vi.fn(),
  rateLimitedResponse:   () =>
    NextResponse.json(
      { ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
      { status: 429 },
    ),
  getClientIp:     vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimiter:  vi.fn().mockReturnValue(null),
}));

// ADMIN_EMAIL は requireAdmin が読み取る
process.env.ADMIN_EMAIL = 'admin@familyai.jp';

// ─── import 先のモジュール（モック適用後） ──────────────────
import { auth }  from '@/lib/auth';
import {
  listAllArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  togglePublished,
} from '@/lib/repositories/articles';
import { enforceAdminRateLimit } from '@/lib/ratelimit';

// ─── ヘルパー ───────────────────────────────────────────────────
function setAdminSession() {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { email: 'admin@familyai.jp' },
  });
}
function setUnauthSession() {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}
function setNonAdminSession() {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { email: 'random@user.jp' },
  });
}

/** CSRF が通る NextRequest を生成（origin = host 同一）*/
function makeReq(
  url: string,
  init: { method?: string; body?: unknown; originMismatch?: boolean } = {},
): NextRequest {
  const headers = new Headers({
    host:   'familyai.jp',
    origin: init.originMismatch ? 'https://evil.example' : 'https://familyai.jp',
    'content-type': 'application/json',
  });
  return new NextRequest(url, {
    method:  init.method ?? 'GET',
    headers,
    body:    init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

// 記事 fixture
const article = {
  id:               'u1',
  slug:             'hello',
  title:            'Hello',
  description:      null,
  body:             'body text',
  roles:            ['papa'],
  categories:       ['education'],
  level:            'beginner',
  published:        true,
  publishedAt:      new Date('2026-04-20T00:00:00Z'),
  audioUrl:         null,
  audioTranscript:  null,
  audioDurationSec: null,
  audioLanguage:    null,
  audioPlayCount:   0,
  thumbnailUrl:     null,
  viewCount:        10,
  isFeatured:       false,
  createdAt:        new Date('2026-04-01T00:00:00Z'),
  updatedAt:        new Date('2026-04-10T00:00:00Z'),
};

// ─── テスト本体 ─────────────────────────────────────────────────
describe('GET /api/admin/articles — 一覧（Rev24 #④ pagination）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (enforceAdminRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('200 + data.items/data.meta（page/pageSize/total/totalPages）を返す', async () => {
    setAdminSession();
    (listAllArticles as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [article], total: 1, totalPages: 1, page: 1, pageSize: 50,
    });

    const { GET } = await import('@/app/api/admin/articles/route');
    const res = await GET(makeReq('http://familyai.jp/api/admin/articles?page=1&pageSize=50'));
    expect(res.status).toBe(200);
    const json = await res.json() as {
      ok: boolean;
      data: { items: unknown[]; meta: { page: number; total: number; totalPages: number; pageSize: number } };
    };
    expect(json.ok).toBe(true);
    expect(json.data.items).toHaveLength(1);
    expect(json.data.meta).toEqual({ page: 1, pageSize: 50, total: 1, totalPages: 1 });
  });

  it('403 when 非管理者', async () => {
    setNonAdminSession();
    const { GET } = await import('@/app/api/admin/articles/route');
    const res = await GET(makeReq('http://familyai.jp/api/admin/articles'));
    expect(res.status).toBe(403);
  });

  it('403 when 未ログイン', async () => {
    setUnauthSession();
    const { GET } = await import('@/app/api/admin/articles/route');
    const res = await GET(makeReq('http://familyai.jp/api/admin/articles'));
    expect(res.status).toBe(403);
  });

  it('400 when 不正な sort', async () => {
    setAdminSession();
    const { GET } = await import('@/app/api/admin/articles/route');
    const res = await GET(makeReq('http://familyai.jp/api/admin/articles?sort=random'));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/articles — 新規作成', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (enforceAdminRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('201 で新規記事が返る（正常系）', async () => {
    setAdminSession();
    (createArticle as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(article);

    const { POST } = await import('@/app/api/admin/articles/route');
    const res = await POST(
      makeReq('http://familyai.jp/api/admin/articles', {
        method: 'POST',
        body:   {
          slug:  'hello',
          title: 'Hello',
          body:  'body text',
        },
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json() as { ok: boolean; data: unknown };
    expect(json.ok).toBe(true);
    expect(createArticle).toHaveBeenCalledOnce();
  });

  it('403 when CSRF 違反（Origin 不一致）', async () => {
    setAdminSession();
    const { POST } = await import('@/app/api/admin/articles/route');
    const res = await POST(
      makeReq('http://familyai.jp/api/admin/articles', {
        method:         'POST',
        body:           { slug: 'x', title: 't', body: 'b' },
        originMismatch: true,
      }),
    );
    expect(res.status).toBe(403);
  });

  it('400 when zod validation 失敗（slug 欠落）', async () => {
    setAdminSession();
    const { POST } = await import('@/app/api/admin/articles/route');
    const res = await POST(
      makeReq('http://familyai.jp/api/admin/articles', {
        method: 'POST',
        body:   { title: 'Hello', body: 'body' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('429 when rate limit（enforceAdminRateLimit が 429 Response を返す）', async () => {
    setAdminSession();
    (enforceAdminRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many' } },
        { status: 429 },
      ),
    );
    const { POST } = await import('@/app/api/admin/articles/route');
    const res = await POST(
      makeReq('http://familyai.jp/api/admin/articles', {
        method: 'POST',
        body:   { slug: 'hello', title: 'Hello', body: 'body' },
      }),
    );
    expect(res.status).toBe(429);
  });
});

describe('PUT /api/admin/articles/:slug — 更新', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (enforceAdminRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('200 + data で更新結果が返る', async () => {
    setAdminSession();
    (updateArticle as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...article, title: 'Updated',
    });
    const { PUT } = await import('@/app/api/admin/articles/[slug]/route');
    const res = await PUT(
      makeReq('http://familyai.jp/api/admin/articles/hello', {
        method: 'PUT',
        body:   { title: 'Updated' },
      }),
      { params: { slug: 'hello' } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean; data: { title: string } };
    expect(json.data.title).toBe('Updated');
  });

  it('404 when 対象 slug が存在しない', async () => {
    setAdminSession();
    (updateArticle as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { PUT } = await import('@/app/api/admin/articles/[slug]/route');
    const res = await PUT(
      makeReq('http://familyai.jp/api/admin/articles/no-such', {
        method: 'PUT',
        body:   { title: 'x' },
      }),
      { params: { slug: 'no-such' } },
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/articles/:slug — 削除', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (enforceAdminRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('200 when 削除成功', async () => {
    setAdminSession();
    (deleteArticle as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const { DELETE } = await import('@/app/api/admin/articles/[slug]/route');
    const res = await DELETE(
      makeReq('http://familyai.jp/api/admin/articles/hello', { method: 'DELETE' }),
      { params: { slug: 'hello' } },
    );
    expect(res.status).toBe(200);
  });

  it('404 when 対象記事なし', async () => {
    setAdminSession();
    (deleteArticle as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const { DELETE } = await import('@/app/api/admin/articles/[slug]/route');
    const res = await DELETE(
      makeReq('http://familyai.jp/api/admin/articles/none', { method: 'DELETE' }),
      { params: { slug: 'none' } },
    );
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/articles/:slug/toggle — 公開切替', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (enforceAdminRateLimit as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('200 + data.published で反転結果を返す', async () => {
    setAdminSession();
    (togglePublished as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ published: false });
    const { PATCH } = await import('@/app/api/admin/articles/[slug]/toggle/route');
    const res = await PATCH(
      makeReq('http://familyai.jp/api/admin/articles/hello/toggle', { method: 'PATCH' }),
      { params: { slug: 'hello' } },
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean; data: { published: boolean } };
    expect(json.data.published).toBe(false);
  });

  it('404 when 対象記事なし', async () => {
    setAdminSession();
    (togglePublished as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { PATCH } = await import('@/app/api/admin/articles/[slug]/toggle/route');
    const res = await PATCH(
      makeReq('http://familyai.jp/api/admin/articles/none/toggle', { method: 'PATCH' }),
      { params: { slug: 'none' } },
    );
    expect(res.status).toBe(404);
  });
});
