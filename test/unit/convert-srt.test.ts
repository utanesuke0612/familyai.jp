/**
 * test/unit/convert-srt.test.ts
 * R3-機能3 Phase 2: scripts/convert-srt.ts の parseSrtToSentences をテスト。
 *
 * カバレッジ:
 *   - 標準的な SRT 形式
 *   - VTT ヘッダ（WEBVTT）スキップ
 *   - 改行をまたぐテキストの結合
 *   - スピーカープレフィックス（"DrJill:"）の保持（Q1=A）
 *   - タイムスタンプの ms 部分（カンマ・ピリオド両対応）
 *   - 空行・キュー番号行の無視
 *   - 不正な形式の堅牢性
 */

import { describe, it, expect } from 'vitest';
import { parseSrtToSentences } from '../../scripts/convert-srt';

describe('parseSrtToSentences', () => {
  it('標準的な SRT を Sentence[] に変換する', () => {
    const srt = `1
00:00:06,720 --> 00:00:11,840
DrJill: Hello and welcome to Let's Learn English with Anna.

2
00:00:11,639 --> 00:00:12,759
DrJill: I am Dr.
`;
    const result = parseSrtToSentences(srt);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      start: 6.72,
      end:   11.84,
      text:  "DrJill: Hello and welcome to Let's Learn English with Anna.",
    });
    expect(result[1]).toEqual({
      start: 11.639,
      end:   12.759,
      text:  'DrJill: I am Dr.',
    });
  });

  it('VTT 形式（ピリオドのミリ秒）も解釈する', () => {
    const vtt = `WEBVTT

1
00:00:06.720 --> 00:00:11.840
Hello world.
`;
    const result = parseSrtToSentences(vtt);
    expect(result).toHaveLength(1);
    expect(result[0].start).toBe(6.72);
    expect(result[0].end).toBe(11.84);
    expect(result[0].text).toBe('Hello world.');
  });

  it('複数行にまたがるテキストを半角スペースで結合する', () => {
    const srt = `1
00:00:00,000 --> 00:00:03,000
First line.
Second line.
Third line.
`;
    const result = parseSrtToSentences(srt);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('First line. Second line. Third line.');
  });

  it('スピーカープレフィックスは text に含めたまま（Q1=A）', () => {
    const srt = `1
00:00:00,000 --> 00:00:02,000
Anna: Hi! I am Anna.

2
00:00:02,500 --> 00:00:04,500
DrJill: Nice to meet you, Anna.
`;
    const result = parseSrtToSentences(srt);
    expect(result[0].text).toBe('Anna: Hi! I am Anna.');
    expect(result[1].text).toBe('DrJill: Nice to meet you, Anna.');
  });

  it('CRLF 改行も LF と同じく処理する', () => {
    const srt = '1\r\n00:00:00,000 --> 00:00:01,000\r\nHello\r\n\r\n';
    const result = parseSrtToSentences(srt);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Hello');
  });

  it('複数キューを連続で処理する', () => {
    const srt = `1
00:00:00,000 --> 00:00:01,000
A

2
00:00:01,000 --> 00:00:02,000
B

3
00:00:02,000 --> 00:00:03,000
C
`;
    const result = parseSrtToSentences(srt);
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.text)).toEqual(['A', 'B', 'C']);
  });

  it('空テキストのキューは除外する', () => {
    const srt = `1
00:00:00,000 --> 00:00:01,000


2
00:00:01,000 --> 00:00:02,000
Real text
`;
    const result = parseSrtToSentences(srt);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Real text');
  });

  it('時:分:秒.ミリ秒を秒（小数）に正しく変換する', () => {
    const srt = `1
01:02:03,456 --> 01:02:03,999
test
`;
    const result = parseSrtToSentences(srt);
    expect(result).toHaveLength(1);
    // 1h2m3.456s = 3600 + 120 + 3 + 0.456 = 3723.456
    expect(result[0].start).toBeCloseTo(3723.456, 3);
    expect(result[0].end).toBeCloseTo(3723.999, 3);
  });

  it('タイムスタンプ行が見つからない（メタデータのみ）の場合は空配列', () => {
    const srt = `WEBVTT

NOTE This is just a comment.
`;
    const result = parseSrtToSentences(srt);
    expect(result).toEqual([]);
  });

  it('Whisper 由来のセグメント重複（end < 次の start でない）も保持する', () => {
    // 行 1 の end が 11.84、行 2 の start が 11.639（逆順だが許容）
    const srt = `1
00:00:06,720 --> 00:00:11,840
First.

2
00:00:11,639 --> 00:00:12,759
Second.
`;
    const result = parseSrtToSentences(srt);
    expect(result).toHaveLength(2);
    expect(result[0].end).toBe(11.84);
    expect(result[1].start).toBe(11.639);
  });
});
