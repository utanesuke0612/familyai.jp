/**
 * test/integration/lessons-progress.integration.test.ts
 * R3-機能3 Phase 3: /api/user/lessons-progress の Route Handler を直接叩く統合テスト
 *
 * モック戦略:
 *   - `@/lib/auth` の `auth()` でログイン / 未ログインを切替
 *   - `@/lib/repositories/lessons-progress` の関数を vi.fn() に差し替え
 *
 * カバレッジ:
 *   GET    : 200（一覧）／ 401（未ログイン）／ 500（DB 例外）
 *   POST   : 200 attempt / 200 complete / 401（未ログイン）／ 403（CSRF）／
 *            400（不正 JSON）／ 400（不正 lessonKey）／ 400（不正 action）／ 500（DB 例外）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── モック ─────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/lessons-progress', () => ({
  listUserProgress: vi.fn(),
  recordAttempt:    vi.fn(),
  markCompleted:    vi.fn(),
}));

// ─── import 先（モック適用後）──────────────────────────────────
import { auth } from '@/lib/auth';
import {
  listUserProgress,
  recordAttempt,
  markCompleted,
} from '@/lib/repositories/lessons-progress';

// ─── ヘルパー ───────────────────────────────────────────────────
function setLoggedInSession() {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: 'user-uuid-1234', email: 'user@example.com' },
  });
}
function setUnauthSession() {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

function makeReq(
  url: string,
  init: { method?: string; body?: unknown; originMismatch?: boolean } = {},
): NextRequest {
  const headers = new Headers({
    host:           'familyai.jp',
    origin:         init.originMismatch ? 'https://evil.example' : 'https://familyai.jp',
    'content-type': 'application/json',
  });
  return new NextRequest(url, {
    method:  init.method ?? 'GET',
    headers,
    body:    init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

// fixture
const sampleRow = {
  id:          'progress-uuid-1',
  userId:      'user-uuid-1234',
  lessonKey:   'anna/lesson-01',
  status:      'in_progress' as const,
  attempts:    1,
  completedAt: null,
  createdAt:   new Date('2026-04-29T10:00:00Z'),
  updatedAt:   new Date('2026-04-29T10:00:00Z'),
};

// ─── GET ────────────────────────────────────────────────────────
describe('GET /api/user/lessons-progress', () => {
  beforeEach(() => vi.clearAllMocks());

  it('200 + 進捗一覧（ログイン済み）', async () => {
    setLoggedInSession();
    (listUserProgress as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([sampleRow]);

    const { GET } = await import('@/app/api/user/lessons-progress/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data: Array<{ lessonKey: string; attempts: number }> };
    expect(json.ok).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0]).toEqual({
      lessonKey: 'anna/lesson-01',
      status:    'in_progress',
      attempts:  1,
    });
  });

  it('completedAt がある場合 ISO 文字列で返る', async () => {
    setLoggedInSession();
    (listUserProgress as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{
      ...sampleRow,
      status:      'completed',
      completedAt: new Date('2026-04-29T11:00:00Z'),
    }]);

    const { GET } = await import('@/app/api/user/lessons-progress/route');
    const res = await GET();
    const json = (await res.json()) as { data: Array<{ status: string; completedAt: string }> };
    expect(json.data[0].status).toBe('completed');
    expect(json.data[0].completedAt).toBe('2026-04-29T11:00:00.000Z');
  });

  it('401 when 未ログイン', async () => {
    setUnauthSession();
    const { GET } = await import('@/app/api/user/lessons-progress/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('500 when DB 例外', async () => {
    setLoggedInSession();
    (listUserProgress as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB down'));
    const { GET } = await import('@/app/api/user/lessons-progress/route');
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ─── POST ───────────────────────────────────────────────────────
describe('POST /api/user/lessons-progress', () => {
  beforeEach(() => vi.clearAllMocks());

  it('200 attempt 記録（😓💪 押下時）', async () => {
    setLoggedInSession();
    (recordAttempt as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...sampleRow,
      attempts: 2,
    });

    const { POST } = await import('@/app/api/user/lessons-progress/route');
    const res = await POST(makeReq('http://familyai.jp/api/user/lessons-progress', {
      method: 'POST',
      body:   { lessonKey: 'anna/lesson-01', action: 'attempt' },
    }));
    expect(res.status).toBe(200);
    expect(recordAttempt).toHaveBeenCalledWith('user-uuid-1234', 'anna/lesson-01');
    expect(markCompleted).not.toHaveBeenCalled();
  });

  it('200 complete 記録（🌟 押下時）+ status=completed', async () => {
    setLoggedInSession();
    (markCompleted as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...sampleRow,
      status:      'completed',
      attempts:    3,
      completedAt: new Date('2026-04-29T12:00:00Z'),
    });

    const { POST } = await import('@/app/api/user/lessons-progress/route');
    const res = await POST(makeReq('http://familyai.jp/api/user/lessons-progress', {
      method: 'POST',
      body:   { lessonKey: 'anna/lesson-01', action: 'complete' },
    }));
    expect(res.status).toBe(200);
    expect(markCompleted).toHaveBeenCalledWith('user-uuid-1234', 'anna/lesson-01');
    expect(recordAttempt).not.toHaveBeenCalled();

    const json = (await res.json()) as { data: { status: string; completedAt: string } };
    expect(json.data.status).toBe('completed');
    expect(json.data.completedAt).toBe('2026-04-29T12:00:00.000Z');
  });

  it('401 when 未ログイン', async () => {
    setUnauthSession();
    const { POST } = await import('@/app/api/user/lessons-progress/route');
    const res = await POST(makeReq('http://familyai.jp/api/user/lessons-progress', {
      method: 'POST',
      body:   { lessonKey: 'anna/lesson-01', action: 'attempt' },
    }));
    expect(res.status).toBe(401);
    expect(recordAttempt).not.toHaveBeenCalled();
  });

  it('403 when CSRF 違反', async () => {
    setLoggedInSession();
    const { POST } = await import('@/app/api/user/lessons-progress/route');
    const res = await POST(makeReq('http://familyai.jp/api/user/lessons-progress', {
      method:         'POST',
      body:           { lessonKey: 'anna/lesson-01', action: 'attempt' },
      originMismatch: true,
    }));
    expect(res.status).toBe(403);
    expect(recordAttempt).not.toHaveBeenCalled();
  });

  it('400 when 不正な JSON', async () => {
    setLoggedInSession();
    const headers = new Headers({
      host:           'familyai.jp',
      origin:         'https://familyai.jp',
      'content-type': 'application/json',
    });
    const req = new NextRequest('http://familyai.jp/api/user/lessons-progress', {
      method:  'POST',
      headers,
      body:    '{invalid-json',
    });
    const { POST } = await import('@/app/api/user/lessons-progress/route');
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('400 when lessonKey が不正な形式（"<course>/<slug>" でない）', async () => {
    setLoggedInSession();
    const { POST } = await import('@/app/api/user/lessons-progress/route');
    const res = await POST(makeReq('http://familyai.jp/api/user/lessons-progress', {
      method: 'POST',
      body:   { lessonKey: 'anna lesson-01', action: 'attempt' },  // スペース混入
    }));
    expect(res.status).toBe(400);
  });

  it('400 when action が enum 外', async () => {
    setLoggedInSession();
    const { POST } = await import('@/app/api/user/lessons-progress/route');
    const res = await POST(makeReq('http://familyai.jp/api/user/lessons-progress', {
      method: 'POST',
      body:   { lessonKey: 'anna/lesson-01', action: 'unknown-action' },
    }));
    expect(res.status).toBe(400);
  });

  it('500 when DB 例外', async () => {
    setLoggedInSession();
    (recordAttempt as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    const { POST } = await import('@/app/api/user/lessons-progress/route');
    const res = await POST(makeReq('http://familyai.jp/api/user/lessons-progress', {
      method: 'POST',
      body:   { lessonKey: 'anna/lesson-01', action: 'attempt' },
    }));
    expect(res.status).toBe(500);
  });
});
