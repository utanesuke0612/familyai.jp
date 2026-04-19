import { describe, it, expect } from 'vitest';
import { createArticleSchema } from '@/lib/schemas/articles';

const validBase = {
  slug: 'test-article',
  title: 'テスト記事',
  body: '本文テスト',
};

describe('createArticleSchema (Rev22)', () => {
  it('Z1a: 最小必須フィールドで合格', () => {
    const r = createArticleSchema.safeParse(validBase);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.roles).toEqual([]);
      expect(r.data.categories).toEqual([]);
      expect(r.data.level).toBe('beginner');
      expect(r.data.published).toBe(false);
    }
  });

  it('Z1b: slug 欠落で失敗', () => {
    const { slug: _s, ...rest } = validBase;
    expect(createArticleSchema.safeParse(rest).success).toBe(false);
  });

  it('Z1c: title 欠落で失敗', () => {
    const { title: _t, ...rest } = validBase;
    expect(createArticleSchema.safeParse(rest).success).toBe(false);
  });

  it('Z1d: body 欠落で失敗', () => {
    const { body: _b, ...rest } = validBase;
    expect(createArticleSchema.safeParse(rest).success).toBe(false);
  });

  it('Z1e: 空文字列の title で失敗（min(1)）', () => {
    expect(createArticleSchema.safeParse({ ...validBase, title: '' }).success).toBe(false);
  });

  it('Z2a: 不正な role enum で失敗', () => {
    expect(createArticleSchema.safeParse({ ...validBase, roles: ['invalid'] }).success).toBe(false);
  });

  it('Z2b: 正常な role enum で合格', () => {
    const r = createArticleSchema.safeParse({ ...validBase, roles: ['papa', 'mama', 'kids'] });
    expect(r.success).toBe(true);
  });

  it('Z2c: 不正な category enum で失敗', () => {
    expect(createArticleSchema.safeParse({ ...validBase, categories: ['finance'] }).success).toBe(false);
  });

  it('Z2d: 正常な level enum で合格', () => {
    const r = createArticleSchema.safeParse({ ...validBase, level: 'advanced' });
    expect(r.success && r.data.level).toBe('advanced');
  });

  it('Z2e: 不正な level で失敗', () => {
    expect(createArticleSchema.safeParse({ ...validBase, level: 'xxx' }).success).toBe(false);
  });

  it('Z3a: 空文字列の publishedAt は null に変換', () => {
    const r = createArticleSchema.safeParse({ ...validBase, publishedAt: '' });
    expect(r.success && r.data.publishedAt).toBeNull();
  });

  it('Z3b: null の publishedAt はそのまま null', () => {
    const r = createArticleSchema.safeParse({ ...validBase, publishedAt: null });
    expect(r.success && r.data.publishedAt).toBeNull();
  });

  it('Z3c: 有効な日付文字列は Date に変換', () => {
    const r = createArticleSchema.safeParse({ ...validBase, publishedAt: '2026-04-19' });
    expect(r.success && r.data.publishedAt instanceof Date).toBe(true);
  });

  it('Z3d: 不正な日付文字列は null', () => {
    const r = createArticleSchema.safeParse({ ...validBase, publishedAt: 'not-a-date' });
    expect(r.success && r.data.publishedAt).toBeNull();
  });

  it('Z1f: Number("abc") のように NaN が渡っても reject（audioDurationSec）', () => {
    const r = createArticleSchema.safeParse({ ...validBase, audioDurationSec: Number.NaN });
    expect(r.success).toBe(false);
  });

  it('Z1g: audioDurationSec 負数で失敗', () => {
    const r = createArticleSchema.safeParse({ ...validBase, audioDurationSec: -5 });
    expect(r.success).toBe(false);
  });

  it('Z1h: audioDurationSec 正の整数で合格', () => {
    const r = createArticleSchema.safeParse({ ...validBase, audioDurationSec: 120 });
    expect(r.success && r.data.audioDurationSec).toBe(120);
  });
});
