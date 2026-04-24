/**
 * test/unit/csrf.test.ts
 * verifyCsrf（Origin ベース CSRF 防御）のユニットテスト。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

// 最小限の NextRequest モック（headers.get のみ利用）
function makeReq(headers: Record<string, string> = {}): NextRequest {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    headers: {
      get: (name: string) => normalized[name.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest;
}

async function importCsrf() {
  vi.resetModules();
  return import('@/lib/csrf');
}

describe('verifyCsrf — Origin チェック', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it('Origin なし → false', async () => {
    const { verifyCsrf } = await importCsrf();
    expect(verifyCsrf(makeReq({}))).toBe(false);
  });

  it('Origin host === Host → true', async () => {
    const { verifyCsrf } = await importCsrf();
    const req = makeReq({ origin: 'https://familyai.jp', host: 'familyai.jp' });
    expect(verifyCsrf(req)).toBe(true);
  });

  it('Origin host ≠ Host → false', async () => {
    const { verifyCsrf } = await importCsrf();
    const req = makeReq({ origin: 'https://evil.example', host: 'familyai.jp' });
    expect(verifyCsrf(req)).toBe(false);
  });

  it('localhost は開発用途で true', async () => {
    const { verifyCsrf } = await importCsrf();
    const req = makeReq({ origin: 'http://localhost:3000', host: 'familyai.jp' });
    expect(verifyCsrf(req)).toBe(true);
  });

  it('127.0.0.1 は開発用途で true', async () => {
    const { verifyCsrf } = await importCsrf();
    const req = makeReq({ origin: 'http://127.0.0.1:3000', host: 'familyai.jp' });
    expect(verifyCsrf(req)).toBe(true);
  });

  it('Host 不在 → false', async () => {
    const { verifyCsrf } = await importCsrf();
    const req = makeReq({ origin: 'https://familyai.jp' });
    expect(verifyCsrf(req)).toBe(false);
  });
});
