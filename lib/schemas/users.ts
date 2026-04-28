/**
 * lib/schemas/users.ts
 * ユーザー API の zod スキーマ
 *
 * 管理画面会員一覧 (`/api/admin/users`) のクエリパラメータ検証用。
 * 数値フィールド (page / pageSize) で `Number('abc') = NaN` が
 * offset/limit に流れる事故を防ぐ。
 *
 * 既存パターン参考: lib/schemas/articles.ts:adminArticlesQuerySchema
 */

import { z } from 'zod';

export const USER_PLAN_FILTERS = ['all', 'free', 'premium'] as const;
export const USER_SORTS        = ['newest', 'oldest', 'name', 'plan'] as const;
export type UserPlanFilter = (typeof USER_PLAN_FILTERS)[number];
export type UserSort       = (typeof USER_SORTS)[number];

/** 管理 API `/api/admin/users` の GET クエリパラメータ */
export const adminUsersQuerySchema = z.object({
  search:   z.string().trim().min(1).max(100).optional(),
  plan:     z.enum(USER_PLAN_FILTERS).default('all'),
  sort:     z.enum(USER_SORTS).default('newest'),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
