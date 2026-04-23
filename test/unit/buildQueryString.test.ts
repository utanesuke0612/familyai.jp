import { describe, it, expect } from 'vitest';
import { buildQueryString } from '@/shared/utils';

describe('buildQueryString', () => {
  it('V1: 単一値を ?k=v 形式で返す', () => {
    expect(buildQueryString({ sort: 'latest' })).toBe('?sort=latest');
  });

  it('V1b: 複数の単一値', () => {
    const q = buildQueryString({ search: 'voice', sort: 'latest' });
    expect(q).toContain('search=voice');
    expect(q).toContain('sort=latest');
    expect(q.startsWith('?')).toBe(true);
  });

  it('V2: 配列を繰り返しパラメータに展開（Rev22 cat複数対応）', () => {
    expect(buildQueryString({ cat: ['work', 'creative'] }))
      .toBe('?cat=work&cat=creative');
  });

  it('V2b: 3要素配列', () => {
    expect(buildQueryString({ cat: ['a', 'b', 'c'] }))
      .toBe('?cat=a&cat=b&cat=c');
  });

  it('V3: undefined / null は省略', () => {
    expect(buildQueryString({ search: undefined, sort: null })).toBe('');
  });

  it('V3b: 空オブジェクトは空文字', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('V3c: boolean 値は文字列化', () => {
    expect(buildQueryString({ published: true })).toBe('?published=true');
  });

  it('V3d: number 値は文字列化', () => {
    expect(buildQueryString({ page: 2 })).toBe('?page=2');
  });

  it('V3e: 空配列はキー自体を省略', () => {
    expect(buildQueryString({ cat: [] })).toBe('');
  });

  it('V3f: URL エンコード（特殊文字）', () => {
    expect(buildQueryString({ search: 'AI & Family' }))
      .toBe('?search=AI+%26+Family');
  });
});
