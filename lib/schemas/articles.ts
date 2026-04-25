/**
 * lib/schemas/articles.ts
 * 記事 API の zod スキーマ（create / update）
 * Rev22 で app/api/admin/articles/route.ts と [slug]/route.ts に定義されていた
 * スキーマを独立ファイル化し、ユニットテスト可能にしたもの。
 */

import { z } from 'zod';

export const CATEGORIES   = ['education', 'lifestyle', 'work', 'creative'] as const;
export const LEVELS       = ['beginner', 'intermediate', 'advanced'] as const;
export const ARTICLE_SORTS = ['latest', 'oldest', 'popular', 'title'] as const;
export type ArticleSort = (typeof ARTICLE_SORTS)[number];

/** 管理 API の GET クエリパラメータ（Rev26 #6: sort を zod 検証・Rev24 #④: pagination 追加）*/
export const adminArticlesQuerySchema = z.object({
  search:   z.string().trim().min(1).max(100).optional(),
  sort:     z.enum(ARTICLE_SORTS).default('latest'),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

/** 日付文字列 → Date（空文字/undefined は null、未指定は undefined を保持）*/
export const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  });

export const createArticleSchema = z.object({
  slug:             z.string().min(1).max(255).regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'スラッグは英小文字・数字・ハイフンのみ使用できます（ハイフンは先頭・末尾不可）',
  ),
  title:            z.string().min(1).max(255),
  description:      z.string().nullable().optional().transform((v) => v ?? null),
  body:             z.string().min(1),
  categories:       z.array(z.enum(CATEGORIES)).default([]),
  level:            z.enum(LEVELS).default('beginner'),
  published:        z.boolean().optional().default(false),
  publishedAt:      optionalDate,
  thumbnailUrl:     z.string().nullable().optional().transform((v) => v ?? null),
  isFeatured:       z.boolean().optional().default(false),
});

export const updateArticleSchema = z.object({
  title:            z.string().min(1).max(255).optional(),
  description:      z.string().nullable().optional(),
  body:             z.string().min(1).optional(),
  categories:       z.array(z.enum(CATEGORIES)).optional(),
  level:            z.enum(LEVELS).optional(),
  published:        z.boolean().optional(),
  publishedAt:      optionalDate,
  thumbnailUrl:     z.string().nullable().optional(),
  isFeatured:       z.boolean().optional(),
});
