/**
 * test/unit/adminArticlesQuerySchema.test.ts
 * Rev24 #④: admin GET クエリの zod 検証（search/sort/page/pageSize）。
 */

import { describe, it, expect } from 'vitest';
import { adminArticlesQuerySchema } from '@/lib/schemas/articles';

describe('adminArticlesQuerySchema — Rev24 #④ pagination', () => {
  it('全省略時：search undefined / sort=latest / page=1 / pageSize=50', () => {
    const res = adminArticlesQuerySchema.safeParse({});
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.search).toBeUndefined();
      expect(res.data.sort).toBe('latest');
      expect(res.data.page).toBe(1);
      expect(res.data.pageSize).toBe(50);
    }
  });

  it('page/pageSize は文字列でも coerce される', () => {
    const res = adminArticlesQuerySchema.safeParse({ page: '3', pageSize: '20' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.page).toBe(3);
      expect(res.data.pageSize).toBe(20);
    }
  });

  it('page=0 は min(1) 違反で reject', () => {
    const res = adminArticlesQuerySchema.safeParse({ page: 0 });
    expect(res.success).toBe(false);
  });

  it('pageSize=201 は max(200) 違反で reject', () => {
    const res = adminArticlesQuerySchema.safeParse({ pageSize: 201 });
    expect(res.success).toBe(false);
  });

  it('sort の enum 外は reject', () => {
    const res = adminArticlesQuerySchema.safeParse({ sort: 'random' });
    expect(res.success).toBe(false);
  });

  it('search は trim + 1-100 文字に収める', () => {
    const tooLong = 'a'.repeat(101);
    const empty   = adminArticlesQuerySchema.safeParse({ search: '   ' });
    const huge    = adminArticlesQuerySchema.safeParse({ search: tooLong });
    expect(empty.success).toBe(false);
    expect(huge.success).toBe(false);
  });
});
