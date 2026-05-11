/**
 * lib/repositories/3d-models.ts
 * familyai.jp / うごくAI教室 3D 図鑑（Rev34 Phase 1）
 *
 * tutor3d_models / user_3d_bookmarks テーブルへのアクセスを集約。
 * すべての公開 API は DB row ではなく shared DTO 型を返す（mappers 経由）。
 */

import { cache }                          from 'react';
import { eq, and, desc, sql }              from 'drizzle-orm';
import { db }                              from '@/lib/db';
import { tutor3dModels, user3dBookmarks }  from '@/lib/db/schema';
import type {
  Tutor3dModel,
  Tutor3dModelSummary,
  Tutor3dSubject,
  Tutor3dGrade,
} from '@/shared';
import {
  toTutor3dModelDetail,
  toTutor3dModelSummary,
} from '@/lib/mappers/3d-models';
import type {
  CreateTutor3dModelInput,
  UpdateTutor3dModelInput,
} from '@/lib/schemas/3d-models';

// ── 公開取得（Catalog / Detail）──────────────────────────────

export interface ListPublishedOptions {
  subject?: Tutor3dSubject;
  grade?:   Tutor3dGrade;
  featuredFirst?: boolean;
  limit?:   number;
}

/**
 * 公開済みモデルの一覧（カタログ向け）。
 * published = true のみ。is_featured 優先 → 新しい順。
 */
export async function listPublishedModels(opts: ListPublishedOptions = {}): Promise<Tutor3dModelSummary[]> {
  const filters = [eq(tutor3dModels.published, true)];
  if (opts.subject) filters.push(eq(tutor3dModels.subject, opts.subject));
  if (opts.grade)   filters.push(eq(tutor3dModels.grade,   opts.grade));

  const rows = await db
    .select()
    .from(tutor3dModels)
    .where(and(...filters))
    .orderBy(desc(tutor3dModels.isFeatured), desc(tutor3dModels.createdAt))
    .limit(opts.limit ?? 50);

  return rows.map(toTutor3dModelSummary);
}

/** slug から公開モデル詳細を取得（非公開なら null）。 */
export async function getPublishedModelBySlug(slug: string): Promise<Tutor3dModel | null> {
  const [row] = await db
    .select()
    .from(tutor3dModels)
    .where(and(eq(tutor3dModels.slug, slug), eq(tutor3dModels.published, true)))
    .limit(1);
  return row ? toTutor3dModelDetail(row) : null;
}

/** React.cache でリクエスト単位メモ化（generateMetadata と Page 本体での重複呼び出し対策）。 */
export const getPublishedModelBySlugCached = cache(getPublishedModelBySlug);

/** ビューカウント増加（fire-and-forget で OK）。 */
export async function incrementViewCount(slug: string): Promise<void> {
  try {
    await db
      .update(tutor3dModels)
      .set({ viewCount: sql`${tutor3dModels.viewCount} + 1` })
      .where(eq(tutor3dModels.slug, slug));
  } catch (err) {
    // ビューカウントの失敗は致命ではないのでログのみ
    console.error('[3d-models] viewCount 更新失敗:', err);
  }
}

// ── 管理者用 CRUD（Phase 1 はシード経由で投入・Phase 2 で管理画面 UI）─

/** 全件取得（admin/3d-models 一覧用・非公開含む） */
export async function listAllModelsForAdmin(): Promise<Tutor3dModel[]> {
  const rows = await db
    .select()
    .from(tutor3dModels)
    .orderBy(desc(tutor3dModels.createdAt));
  return rows.map(toTutor3dModelDetail);
}

export async function getModelBySlugForAdmin(slug: string): Promise<Tutor3dModel | null> {
  const [row] = await db
    .select()
    .from(tutor3dModels)
    .where(eq(tutor3dModels.slug, slug))
    .limit(1);
  return row ? toTutor3dModelDetail(row) : null;
}

export async function upsertModel(input: CreateTutor3dModelInput): Promise<string> {
  const existing = await db
    .select({ id: tutor3dModels.id })
    .from(tutor3dModels)
    .where(eq(tutor3dModels.slug, input.slug))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(tutor3dModels)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(tutor3dModels.slug, input.slug));
    return existing[0]!.id;
  }

  const [row] = await db
    .insert(tutor3dModels)
    .values({ ...input })
    .returning({ id: tutor3dModels.id });
  if (!row) throw new Error('3D モデルの作成に失敗しました。');
  return row.id;
}

export async function updateModel(slug: string, patch: UpdateTutor3dModelInput): Promise<boolean> {
  const result = await db
    .update(tutor3dModels)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(tutor3dModels.slug, slug))
    .returning({ id: tutor3dModels.id });
  return result.length > 0;
}

export async function deleteModel(slug: string): Promise<boolean> {
  const result = await db
    .delete(tutor3dModels)
    .where(eq(tutor3dModels.slug, slug))
    .returning({ id: tutor3dModels.id });
  return result.length > 0;
}

// ── ブックマーク ─────────────────────────────────────────────

export async function addBookmark(userId: string, modelId: string): Promise<void> {
  await db
    .insert(user3dBookmarks)
    .values({ userId, modelId })
    .onConflictDoNothing();
}

export async function removeBookmark(userId: string, modelId: string): Promise<boolean> {
  const result = await db
    .delete(user3dBookmarks)
    .where(and(eq(user3dBookmarks.userId, userId), eq(user3dBookmarks.modelId, modelId)))
    .returning({ id: user3dBookmarks.id });
  return result.length > 0;
}

export async function isBookmarked(userId: string, modelId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: user3dBookmarks.id })
    .from(user3dBookmarks)
    .where(and(eq(user3dBookmarks.userId, userId), eq(user3dBookmarks.modelId, modelId)))
    .limit(1);
  return Boolean(row);
}

export async function listBookmarkedModels(userId: string): Promise<Tutor3dModelSummary[]> {
  const rows = await db
    .select({
      model:   tutor3dModels,
      created: user3dBookmarks.createdAt,
    })
    .from(user3dBookmarks)
    .innerJoin(tutor3dModels, eq(user3dBookmarks.modelId, tutor3dModels.id))
    .where(eq(user3dBookmarks.userId, userId))
    .orderBy(desc(user3dBookmarks.createdAt));

  return rows.map((r) => toTutor3dModelSummary(r.model));
}
