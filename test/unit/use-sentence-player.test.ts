/**
 * test/unit/use-sentence-player.test.ts
 * R3-機能3 Phase 4: useSentencePlayer の純粋ロジック関数テスト。
 *
 * テスト対象:
 *   - findIndexAtTime（センテンス境界判定の核心ロジック）
 *
 * 実 HTMLAudioElement を使う統合的テストは jsdom では困難なため、
 * 純粋ロジックのみテスト。フック全体の動作確認は手動 / Phase 7 E2E に委ねる。
 */

import { describe, it, expect } from 'vitest';
import { findIndexAtTime } from '@/lib/hooks/useSentencePlayer';
import type { Sentence } from '@/shared/types';

// 標準的なセンテンス配列（重複なし・隙間なし）
const continuous: Sentence[] = [
  { start: 0,    end: 3,    text: 'A' },
  { start: 3,    end: 6,    text: 'B' },
  { start: 6,    end: 10,   text: 'C' },
];

// 隙間ありのセンテンス配列（間に無音あり・実音声でよくあるパターン）
const withGap: Sentence[] = [
  { start: 0,    end: 2,    text: 'A' },
  { start: 3,    end: 5,    text: 'B' },     // [2, 3) は隙間
  { start: 7,    end: 10,   text: 'C' },     // [5, 7) は隙間
];

describe('findIndexAtTime', () => {
  it('範囲内の時刻 → 該当する index を返す（continuous）', () => {
    expect(findIndexAtTime(continuous, 0)).toBe(0);
    expect(findIndexAtTime(continuous, 1.5)).toBe(0);
    expect(findIndexAtTime(continuous, 3)).toBe(1);
    expect(findIndexAtTime(continuous, 4.999)).toBe(1);
    expect(findIndexAtTime(continuous, 6)).toBe(2);
    expect(findIndexAtTime(continuous, 9.99)).toBe(2);
  });

  it('全センテンスより前の時刻 → 0 を返す', () => {
    expect(findIndexAtTime(continuous, -5)).toBe(0);
  });

  it('全センテンスより後の時刻 → 最後の index を返す', () => {
    expect(findIndexAtTime(continuous, 100)).toBe(2);
  });

  it('隙間にいる時刻 → 直前のセンテンスを返す（withGap）', () => {
    // [2, 3) の隙間 → センテンス A を返す
    expect(findIndexAtTime(withGap, 2.5)).toBe(0);
    // [5, 7) の隙間 → センテンス B を返す
    expect(findIndexAtTime(withGap, 6)).toBe(1);
  });

  it('隙間ありで範囲内なら正しく拾う', () => {
    expect(findIndexAtTime(withGap, 0)).toBe(0);
    expect(findIndexAtTime(withGap, 3)).toBe(1);
    expect(findIndexAtTime(withGap, 7)).toBe(2);
  });

  it('空配列の場合は 0 を返す（防御的）', () => {
    expect(findIndexAtTime([], 5)).toBe(0);
  });

  it('1 件のみの配列', () => {
    const one: Sentence[] = [{ start: 1, end: 5, text: 'only' }];
    expect(findIndexAtTime(one, 0)).toBe(0);   // 前
    expect(findIndexAtTime(one, 3)).toBe(0);   // 範囲内
    expect(findIndexAtTime(one, 10)).toBe(0);  // 後
  });

  it('Whisper 重複セグメント（end > 次の start）でも index を返す', () => {
    // 行 1 の end が 11.84、行 2 の start が 11.639 で逆順
    const overlap: Sentence[] = [
      { start: 0,      end: 11.84,  text: 'first'  },
      { start: 11.639, end: 12.759, text: 'second' },
    ];
    // t=11.7 は両方の範囲に該当するが、最初に見つかった「first」を返す
    expect(findIndexAtTime(overlap, 11.7)).toBe(0);
    // t=12.0 は first の範囲外、second の範囲内
    expect(findIndexAtTime(overlap, 12.0)).toBe(1);
  });
});
