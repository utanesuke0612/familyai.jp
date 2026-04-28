/**
 * test/integration/admin-ai-config.integration.test.ts
 * QA-T1（Rev30）: 管理者用 AI教室パイプライン設定 API の Route Handler を直接叩く。
 *
 * 対象:
 *   GET    /api/admin/ai-config     — 現在値（effective + dbPartial）取得
 *   PUT    /api/admin/ai-config     — 設定保存（partial）
 *   DELETE /api/admin/ai-config     — 設定リセット（DEFAULTS に戻す）
 *
 * モック戦略:
 *   - `@/lib/auth`                        : auth() で 管理者 / 非管理者 / 未ログイン
 *   - `@/lib/repositories/ai-config`     : DB 操作関数を vi.fn() に差し替え
 *   - `@/lib/config/ai-config`           : getAiConfig / invalidateAiConfigCache をスタブ
 *
 * カバレッジ:
 *   GET    : 200（effective+dbPartial 返却）／ 403（非管理者）／ 403（未ログイン）／ 500（DB 例外）
 *   PUT    : 200（保存成功・履歴に changeNote 記録）／ 403（CSRF）／ 403（非管理者）／
 *            400（不正 JSON）／ 400（zod validation 失敗・未知モデル）／
 *            400（zod validation 失敗・範囲外）／ 500（DB 例外）
 *   DELETE : 200（リセット成功）／ 403（CSRF）／ 403（非管理者）／ 500（DB 例外）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ─── モック ─────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/ai-config', () => ({
  getAiConfigFromDb: vi.fn(),
  saveAiConfig:      vi.fn(),
  resetAiConfig:     vi.fn(),
  getAiConfigHistory: vi.fn(),
}));

vi.mock('@/lib/config/ai-config', () => ({
  getAiConfig:              vi.fn(),
  invalidateAiConfigCache:  vi.fn(),
}));

// ADMIN_EMAIL は isAdmin が読み取る
process.env.ADMIN_EMAIL = 'admin@familyai.jp';

// ─── import 先（モック適用後）──────────────────────────────────
import { auth } from '@/lib/auth';
import {
  getAiConfigFromDb,
  saveAiConfig,
  resetAiConfig,
} from '@/lib/repositories/ai-config';
import {
  getAiConfig,
  invalidateAiConfigCache,
} from '@/lib/config/ai-config';

// ─── ヘルパー ───────────────────────────────────────────────────
function setAdminSession() {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { email: 'admin@familyai.jp' },
  });
}
function setNonAdminSession() {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { email: 'random@user.jp' },
  });
}
function setUnauthSession() {
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

/** CSRF を通す origin 同一の NextRequest を生成 */
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

/** AiKyoshitsuConfig fixture（DEFAULTS と同一形） */
const sampleEffective = {
  stage1Model:       'google/gemini-2.0-flash-001',
  stage2Model:       'google/gemini-2.0-flash-001',
  stage1TimeoutMs:   10_000,
  stage2TimeoutMs:   40_000,
  stage2MaxTokens:   5_000,
  stage2Temperature: 0.5,
  chatModel:         'qwen/qwen3-14b',
};

// ─── GET ────────────────────────────────────────────────────────
describe('GET /api/admin/ai-config — 現在値取得', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('200 + data.effective / data.dbPartial を返す（管理者）', async () => {
    setAdminSession();
    (getAiConfig as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(sampleEffective);
    (getAiConfigFromDb as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      stage2MaxTokens: 4_000,
    });

    const { GET } = await import('@/app/api/admin/ai-config/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok:   boolean;
      data: { effective: typeof sampleEffective; dbPartial: Record<string, unknown> };
    };
    expect(json.ok).toBe(true);
    expect(json.data.effective).toEqual(sampleEffective);
    expect(json.data.dbPartial).toEqual({ stage2MaxTokens: 4_000 });
  });

  it('403 when 非管理者', async () => {
    setNonAdminSession();
    const { GET } = await import('@/app/api/admin/ai-config/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('403 when 未ログイン', async () => {
    setUnauthSession();
    const { GET } = await import('@/app/api/admin/ai-config/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('500 when DB 例外', async () => {
    setAdminSession();
    (getAiConfig as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    (getAiConfigFromDb as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { GET } = await import('@/app/api/admin/ai-config/route');
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ─── PUT ────────────────────────────────────────────────────────
describe('PUT /api/admin/ai-config — 設定保存', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('200 + saveAiConfig が呼ばれる（changeNote 含む）', async () => {
    setAdminSession();
    (saveAiConfig as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const { PUT } = await import('@/app/api/admin/ai-config/route');
    const res = await PUT(
      makeReq('http://familyai.jp/api/admin/ai-config', {
        method: 'PUT',
        body: {
          stage2MaxTokens: 4_000,
          changeNote:      'タイムアウトを延長',
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(saveAiConfig).toHaveBeenCalledOnce();
    // 第1引数は config（changeNote が剥がされている）
    expect((saveAiConfig as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
      stage2MaxTokens: 4_000,
    });
    // 第2引数は admin email
    expect((saveAiConfig as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe(
      'admin@familyai.jp',
    );
    // 第3引数は changeNote
    expect((saveAiConfig as unknown as ReturnType<typeof vi.fn>).mock.calls[0][2]).toBe(
      'タイムアウトを延長',
    );
    // キャッシュ無効化が呼ばれる
    expect(invalidateAiConfigCache).toHaveBeenCalledOnce();
  });

  it('403 when CSRF 違反（Origin 不一致）', async () => {
    setAdminSession();
    const { PUT } = await import('@/app/api/admin/ai-config/route');
    const res = await PUT(
      makeReq('http://familyai.jp/api/admin/ai-config', {
        method:         'PUT',
        body:           { stage2MaxTokens: 4_000 },
        originMismatch: true,
      }),
    );
    expect(res.status).toBe(403);
    expect(saveAiConfig).not.toHaveBeenCalled();
  });

  it('403 when 非管理者', async () => {
    setNonAdminSession();
    const { PUT } = await import('@/app/api/admin/ai-config/route');
    const res = await PUT(
      makeReq('http://familyai.jp/api/admin/ai-config', {
        method: 'PUT',
        body:   { stage2MaxTokens: 4_000 },
      }),
    );
    expect(res.status).toBe(403);
    expect(saveAiConfig).not.toHaveBeenCalled();
  });

  it('400 when JSON パース失敗', async () => {
    setAdminSession();
    // body を不正な文字列にする（NextRequest は body 文字列を受け付けるので生 body で渡す）
    const headers = new Headers({
      host:           'familyai.jp',
      origin:         'https://familyai.jp',
      'content-type': 'application/json',
    });
    const req = new NextRequest('http://familyai.jp/api/admin/ai-config', {
      method:  'PUT',
      headers,
      body:    '{invalid-json',
    });
    const { PUT } = await import('@/app/api/admin/ai-config/route');
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('400 when zod 違反（未知のモデル ID）', async () => {
    setAdminSession();
    const { PUT } = await import('@/app/api/admin/ai-config/route');
    const res = await PUT(
      makeReq('http://familyai.jp/api/admin/ai-config', {
        method: 'PUT',
        body:   { stage1Model: 'unknown/model-x' },
      }),
    );
    expect(res.status).toBe(400);
    expect(saveAiConfig).not.toHaveBeenCalled();
  });

  it('400 when zod 違反（数値範囲外・stage2TimeoutMs 上限超過）', async () => {
    setAdminSession();
    const { PUT } = await import('@/app/api/admin/ai-config/route');
    const res = await PUT(
      makeReq('http://familyai.jp/api/admin/ai-config', {
        method: 'PUT',
        // 範囲は最大 58_000（Vercel 60秒制限）
        body:   { stage2TimeoutMs: 999_999 },
      }),
    );
    expect(res.status).toBe(400);
    expect(saveAiConfig).not.toHaveBeenCalled();
  });

  it('500 when saveAiConfig が例外', async () => {
    setAdminSession();
    (saveAiConfig as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db down'));
    const { PUT } = await import('@/app/api/admin/ai-config/route');
    const res = await PUT(
      makeReq('http://familyai.jp/api/admin/ai-config', {
        method: 'PUT',
        body:   { stage2MaxTokens: 4_000 },
      }),
    );
    expect(res.status).toBe(500);
  });
});

// ─── DELETE ─────────────────────────────────────────────────────
describe('DELETE /api/admin/ai-config — 設定リセット', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('200 + resetAiConfig が呼ばれる', async () => {
    setAdminSession();
    (resetAiConfig as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const { DELETE } = await import('@/app/api/admin/ai-config/route');
    const res = await DELETE(
      makeReq('http://familyai.jp/api/admin/ai-config', { method: 'DELETE' }),
    );
    expect(res.status).toBe(200);
    expect(resetAiConfig).toHaveBeenCalledOnce();
    expect((resetAiConfig as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      'admin@familyai.jp',
    );
    expect(invalidateAiConfigCache).toHaveBeenCalledOnce();
  });

  it('403 when CSRF 違反', async () => {
    setAdminSession();
    const { DELETE } = await import('@/app/api/admin/ai-config/route');
    const res = await DELETE(
      makeReq('http://familyai.jp/api/admin/ai-config', {
        method:         'DELETE',
        originMismatch: true,
      }),
    );
    expect(res.status).toBe(403);
    expect(resetAiConfig).not.toHaveBeenCalled();
  });

  it('403 when 非管理者', async () => {
    setNonAdminSession();
    const { DELETE } = await import('@/app/api/admin/ai-config/route');
    const res = await DELETE(
      makeReq('http://familyai.jp/api/admin/ai-config', { method: 'DELETE' }),
    );
    expect(res.status).toBe(403);
    expect(resetAiConfig).not.toHaveBeenCalled();
  });

  it('500 when resetAiConfig が例外', async () => {
    setAdminSession();
    (resetAiConfig as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db down'));
    const { DELETE } = await import('@/app/api/admin/ai-config/route');
    const res = await DELETE(
      makeReq('http://familyai.jp/api/admin/ai-config', { method: 'DELETE' }),
    );
    expect(res.status).toBe(500);
  });
});
