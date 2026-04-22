/**
 * test/unit/csrf.test.ts
 * Rev24 #⑤: verifyCsrf + verifyMobileClient のユニットテスト。
 *
 * MOBILE_API_KEYS はモジュール読み込み時に 1 回だけ評価されるため、
 * `vi.stubEnv` + `vi.resetModules` で envを差し替えてから動的 import する。
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
  // モジュール読み込み時の env を反映させるため毎回 reset
  vi.resetModules();
  return import('@/lib/csrf');
}

describe('verifyCsrf — 既存 Origin チェック（Rev22 時点の仕様）', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it('Origin なし → false（Rev28 #HIGH-5: 非ブラウザ経路は allowMobile オプトイン必須）', async () => {
    const { verifyCsrf } = await importCsrf();
    expect(verifyCsrf(makeReq({}))).toBe(false);
  });

  it('Origin なし + allowMobile:true + mobile 認証ヘッダ不在 → false', async () => {
    const { verifyCsrf } = await importCsrf();
    expect(verifyCsrf(makeReq({}), { allowMobile: true })).toBe(false);
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
});

describe('verifyMobileClient / verifyCsrf(allowMobile) — Rev24 #⑤', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it('MOBILE_API_KEYS 未設定の場合、モバイル経路は常に false', async () => {
    vi.stubEnv('MOBILE_API_KEYS', '');
    const { verifyMobileClient, verifyCsrf } = await importCsrf();
    const req = makeReq({
      'x-client-platform': 'ios',
      'x-mobile-api-key':  'whatever',
      origin:              'https://evil.example',
      host:                'familyai.jp',
    });
    expect(verifyMobileClient(req)).toBe(false);
    // allowMobile を許可しても Origin 不一致で落ちる
    expect(verifyCsrf(req, { allowMobile: true })).toBe(false);
  });

  it('platform + 許可された api key → verifyMobileClient true', async () => {
    vi.stubEnv('MOBILE_API_KEYS', 'key-ios-001,key-android-001');
    const { verifyMobileClient } = await importCsrf();
    const iosReq = makeReq({
      'x-client-platform': 'ios',
      'x-mobile-api-key':  'key-ios-001',
    });
    const androidReq = makeReq({
      'x-client-platform': 'android',
      'x-mobile-api-key':  'key-android-001',
    });
    expect(verifyMobileClient(iosReq)).toBe(true);
    expect(verifyMobileClient(androidReq)).toBe(true);
  });

  it('platform がサポート外（web/desktop）→ false', async () => {
    vi.stubEnv('MOBILE_API_KEYS', 'key-ios-001');
    const { verifyMobileClient } = await importCsrf();
    expect(
      verifyMobileClient(
        makeReq({ 'x-client-platform': 'web', 'x-mobile-api-key': 'key-ios-001' }),
      ),
    ).toBe(false);
  });

  it('api key が許可リストに無い → false', async () => {
    vi.stubEnv('MOBILE_API_KEYS', 'key-ios-001');
    const { verifyMobileClient } = await importCsrf();
    expect(
      verifyMobileClient(
        makeReq({ 'x-client-platform': 'ios', 'x-mobile-api-key': 'not-in-list' }),
      ),
    ).toBe(false);
  });

  it('allowMobile:true + 有効な ios key なら Origin 不一致でも true', async () => {
    vi.stubEnv('MOBILE_API_KEYS', 'key-ios-001');
    const { verifyCsrf } = await importCsrf();
    const req = makeReq({
      'x-client-platform': 'ios',
      'x-mobile-api-key':  'key-ios-001',
      origin:              'app://familyai.ios',  // ネイティブ Schemeのダミー
      host:                'familyai.jp',
    });
    expect(verifyCsrf(req, { allowMobile: true })).toBe(true);
  });

  it('allowMobile:false（デフォルト）なら admin API 同等に Origin で判断', async () => {
    vi.stubEnv('MOBILE_API_KEYS', 'key-ios-001');
    const { verifyCsrf } = await importCsrf();
    const req = makeReq({
      'x-client-platform': 'ios',
      'x-mobile-api-key':  'key-ios-001',
      origin:              'https://evil.example',
      host:                'familyai.jp',
    });
    expect(verifyCsrf(req)).toBe(false);
  });
});
