import { describe, it, expect } from 'vitest';
import { updateArticleSchema } from '@/lib/schemas/articles';

describe('updateArticleSchema (Rev22)', () => {
  it('Z4a: 空オブジェクトで成功（全フィールド optional）', () => {
    expect(updateArticleSchema.safeParse({}).success).toBe(true);
  });

  it('Z4b: title のみ更新', () => {
    const r = updateArticleSchema.safeParse({ title: '新タイトル' });
    expect(r.success && r.data.title).toBe('新タイトル');
  });

  it('Z4c: published のみ更新', () => {
    const r = updateArticleSchema.safeParse({ published: true });
    expect(r.success && r.data.published).toBe(true);
  });

  it('Z4d: 空文字列 title で失敗（min(1)）', () => {
    expect(updateArticleSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('Z4e: description を null で上書き可', () => {
    const r = updateArticleSchema.safeParse({ description: null });
    expect(r.success && r.data.description).toBeNull();
  });

  it('Z4f: publishedAt 空文字列 → null 変換', () => {
    const r = updateArticleSchema.safeParse({ publishedAt: '' });
    expect(r.success && r.data.publishedAt).toBeNull();
  });

  it('Z4g: audioDurationSec 非整数で失敗', () => {
    expect(updateArticleSchema.safeParse({ audioDurationSec: 1.5 }).success).toBe(false);
  });
});
