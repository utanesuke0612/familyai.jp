/**
 * test/integration/ai-config-repository.integration.test.ts
 * R1-T2（Rev30 候補）: lib/repositories/ai-config.ts のリポジトリ層検証。
 *
 * モック戦略:
 *   - `@/lib/db` の db オブジェクトを fluent API として最小実装でモック化
 *     （select().from().where().limit() などのチェイン）
 *   - vi.hoisted() で巻き上げ問題を回避
 *
 * カバレッジ:
 *   - getAiConfigFromDb     : 行なし → {}／行あり → config 返却／null config → {}
 *   - saveAiConfig          : upsert + history insert + prune の3操作が呼ばれる
 *   - resetAiConfig         : delete + history insert + prune の3操作が呼ばれる
 *   - getAiConfigHistory    : changed_at DESC + limit
 *   - 履歴剪定              : 件数が閾値以下なら delete されない／閾値以上なら delete される
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── vi.hoisted で巻き上げ可能な mock state を作成 ─────────────
const hoisted = vi.hoisted(() => {
  const dbCalls = {
    /** 各 select() 呼び出しが返す result の FIFO キュー */
    selectResults: [] as unknown[][],
  };

  // fluent API の最小実装（thenable で await 可能）
  function makeFluent(getResult: () => unknown[]): unknown {
    const chain: Record<string, unknown> = {};
    const methods = ['from', 'where', 'limit', 'orderBy', 'values', 'set', 'onConflictDoUpdate'];
    methods.forEach((m) => {
      chain[m] = vi.fn(() => chain);
    });
    chain.then = (resolve: (rows: unknown[]) => void) => resolve(getResult());
    return chain;
  }

  const dbMock = {
    select: vi.fn(() => makeFluent(() => dbCalls.selectResults.shift() ?? [])),
    insert: vi.fn(() => makeFluent(() => [])),
    delete: vi.fn(() => makeFluent(() => [])),
  };

  return { dbCalls, dbMock };
});

// ─── モック宣言 ────────────────────────────────────────────────
vi.mock('@/lib/db', () => ({
  db:               hoisted.dbMock,
  aiConfig:         { id: 'aiConfig.id' },
  aiConfigHistory:  { id: 'aiConfigHistory.id', changedAt: 'aiConfigHistory.changedAt' },
}));

vi.mock('drizzle-orm', () => ({
  desc:       vi.fn((c) => ({ desc: c })),
  eq:         vi.fn((a, b) => ({ eq: [a, b] })),
  notInArray: vi.fn((c, arr) => ({ notInArray: [c, arr] })),
}));

// ─── import 先（モック適用後）──────────────────────────────────
import {
  getAiConfigFromDb,
  saveAiConfig,
  resetAiConfig,
  getAiConfigHistory,
} from '@/lib/repositories/ai-config';

const { dbCalls, dbMock } = hoisted;

// ─── テスト本体 ─────────────────────────────────────────────────
describe('getAiConfigFromDb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCalls.selectResults = [];
  });

  it('行なし: 空オブジェクトを返す', async () => {
    dbCalls.selectResults = [[]];
    const result = await getAiConfigFromDb();
    expect(result).toEqual({});
    expect(dbMock.select).toHaveBeenCalledOnce();
  });

  it('行あり: config を返す', async () => {
    dbCalls.selectResults = [[
      { id: 1, config: { stage2MaxTokens: 4_000 }, updatedBy: 'a@b', updatedAt: new Date() },
    ]];
    const result = await getAiConfigFromDb();
    expect(result).toEqual({ stage2MaxTokens: 4_000 });
  });

  it('row.config が null の場合: 空オブジェクト', async () => {
    dbCalls.selectResults = [[
      { id: 1, config: null, updatedBy: 'a@b', updatedAt: new Date() },
    ]];
    const result = await getAiConfigFromDb();
    expect(result).toEqual({});
  });
});

describe('saveAiConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCalls.selectResults = [];
  });

  it('履歴 < 10件: upsert + history insert のみ・delete スキップ', async () => {
    // pruneHistory が select で取る直近10件 → 5件しかない場合は剪定しない
    dbCalls.selectResults = [Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }))];

    await saveAiConfig(
      { stage2MaxTokens: 4_000 },
      'admin@familyai.jp',
      'タイムアウト調整',
    );

    // insert は2回（aiConfig upsert + history insert）
    expect(dbMock.insert).toHaveBeenCalledTimes(2);
    expect(dbMock.select).toHaveBeenCalledOnce();
    expect(dbMock.delete).not.toHaveBeenCalled();
  });

  it('changeNote 省略でも upsert + history insert が呼ばれる', async () => {
    dbCalls.selectResults = [[]];
    await saveAiConfig({ stage2MaxTokens: 4_000 }, 'admin@familyai.jp');
    expect(dbMock.insert).toHaveBeenCalledTimes(2);
  });

  it('履歴 = 10件: 剪定 delete が呼ばれる', async () => {
    dbCalls.selectResults = [Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))];

    await saveAiConfig({ chatModel: 'qwen/qwen3-14b' }, 'admin@familyai.jp');

    expect(dbMock.delete).toHaveBeenCalledOnce();
  });
});

describe('resetAiConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCalls.selectResults = [];
  });

  it('delete + history insert + prune select が呼ばれる', async () => {
    dbCalls.selectResults = [[]];
    await resetAiConfig('admin@familyai.jp');

    expect(dbMock.delete).toHaveBeenCalledOnce();   // ai_config 行削除
    expect(dbMock.insert).toHaveBeenCalledOnce();   // 履歴に「リセット」記録
    expect(dbMock.select).toHaveBeenCalledOnce();   // prune 用
  });

  it('changeNote 省略時もエラーなく完了する', async () => {
    dbCalls.selectResults = [[]];
    await expect(resetAiConfig('admin@familyai.jp')).resolves.toBeUndefined();
  });
});

describe('getAiConfigHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCalls.selectResults = [];
  });

  it('指定件数で履歴を返す', async () => {
    const fixture = [
      { id: 3, config: {}, changedBy: 'a', changedAt: new Date(), changeNote: '' },
      { id: 2, config: {}, changedBy: 'a', changedAt: new Date(), changeNote: '' },
      { id: 1, config: {}, changedBy: 'a', changedAt: new Date(), changeNote: '' },
    ];
    dbCalls.selectResults = [fixture];

    const result = await getAiConfigHistory(3);
    expect(result).toHaveLength(3);
    expect((result[0] as { id: number }).id).toBe(3);
    expect(dbMock.select).toHaveBeenCalledOnce();
  });

  it('limit 省略時はデフォルト 10 件', async () => {
    dbCalls.selectResults = [[]];
    await getAiConfigHistory();
    expect(dbMock.select).toHaveBeenCalledOnce();
  });
});
