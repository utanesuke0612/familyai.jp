/**
 * test/unit/csv.test.ts
 * R3-U3（Rev30 候補）: rowsToCsv（shared/utils）の CSV エスケープ検証。
 *
 * RFC 4180 ベースのエスケープ:
 *   - " を含むセルは "" に変換し全体を " で囲む
 *   - , または改行を含むセルは " で囲む
 *   - 通常文字はそのまま
 */

import { describe, it, expect } from 'vitest';
import { rowsToCsv } from '@/shared';

describe('rowsToCsv', () => {
  it('header 行を keys から自動生成する', () => {
    const csv = rowsToCsv(
      [{ id: '1', name: 'a' }],
      ['id', 'name'],
    );
    expect(csv.split('\n')[0]).toBe('id,name');
  });

  it('通常文字列はエスケープなし', () => {
    const csv = rowsToCsv(
      [{ id: 'abc', name: 'foo' }],
      ['id', 'name'],
    );
    expect(csv).toBe('id,name\nabc,foo');
  });

  it(', を含むセルは " で囲む', () => {
    const csv = rowsToCsv(
      [{ a: 'hello, world' }],
      ['a'],
    );
    expect(csv).toBe('a\n"hello, world"');
  });

  it('" を含むセルは "" に変換し全体を " で囲む', () => {
    const csv = rowsToCsv(
      [{ a: 'say "hi"' }],
      ['a'],
    );
    expect(csv).toBe('a\n"say ""hi"""');
  });

  it('改行を含むセルは " で囲む（CRLF→LF 正規化）', () => {
    const csv = rowsToCsv(
      [{ a: 'line1\r\nline2' }],
      ['a'],
    );
    expect(csv).toBe('a\n"line1\nline2"');
  });

  it('null / undefined は空文字列', () => {
    const csv = rowsToCsv(
      [{ a: null, b: undefined, c: 'x' }],
      ['a', 'b', 'c'],
    );
    expect(csv).toBe('a,b,c\n,,x');
  });

  it('数値は文字列化される', () => {
    const csv = rowsToCsv(
      [{ id: 1, count: 100 }],
      ['id', 'count'],
    );
    expect(csv).toBe('id,count\n1,100');
  });

  it('複数行の出力は \\n 区切り', () => {
    const csv = rowsToCsv(
      [
        { a: '1', b: 'foo' },
        { a: '2', b: 'bar' },
      ],
      ['a', 'b'],
    );
    expect(csv).toBe('a,b\n1,foo\n2,bar');
  });

  it('空配列でもヘッダだけは出力する', () => {
    const csv = rowsToCsv([] as Array<{ id: string }>, ['id']);
    expect(csv).toBe('id');
  });

  it('日本語と複合エスケープを正しく扱う', () => {
    const csv = rowsToCsv(
      [{
        question: '"光合成"とは何ですか？',
        answer:   '植物が光,水,二酸化炭素から\n糖を作る反応です',
      }],
      ['question', 'answer'],
    );
    // question: " を含む → 全体を囲み、" を ""
    // answer:   , と \n を含む → 全体を囲む
    expect(csv).toBe(
      'question,answer\n"""光合成""とは何ですか？","植物が光,水,二酸化炭素から\n糖を作る反応です"',
    );
  });
});
