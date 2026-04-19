import { describe, it, expect } from 'vitest';
import { escapeLike } from '@/lib/repositories/articles';

describe('escapeLike (ILIKE meta-char escape / Rev22)', () => {
  it('E2a: 通常文字列はそのまま返す', () => {
    expect(escapeLike('hello')).toBe('hello');
  });

  it('E2b: % をエスケープ', () => {
    expect(escapeLike('100%')).toBe('100\\%');
  });

  it('E2c: _ をエスケープ', () => {
    expect(escapeLike('foo_bar')).toBe('foo\\_bar');
  });

  it('E2d: \\ をエスケープ', () => {
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  it('E2e: 混合文字列', () => {
    expect(escapeLike('50%_off')).toBe('50\\%\\_off');
  });

  it('E2f: 空文字', () => {
    expect(escapeLike('')).toBe('');
  });

  it('E2g: 日本語に影響しない', () => {
    expect(escapeLike('家族AI')).toBe('家族AI');
  });

  it('E2h: SQLインジェクション的な試行も単なる文字列として扱う', () => {
    // ILIKE にリテラルとして渡されるため、SQL として実行されない
    const input = "'; DROP TABLE users; --";
    const escaped = escapeLike(input);
    // % / _ / \ を含まないのでそのまま
    expect(escaped).toBe(input);
  });
});
