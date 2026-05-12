/**
 * lib/mappers/3d-models.ts
 * familyai.jp / うごくAI教室 3D 図鑑（Rev34 Phase 1）
 *
 * DB row → shared 型 (Tutor3dModel / Tutor3dModelSummary) への変換。
 * Repository から外に出る前に必ずここを通すこと（型と契約の単一ソース）。
 */

import type { Tutor3dModel as Tutor3dModelDto, Tutor3dModelSummary, Tutor3dHotspot } from '@/shared';
import type { Tutor3dModel as Tutor3dModelRow } from '@/lib/db/schema';
import { hotspotArraySchema } from '@/lib/schemas/3d-models';

/**
 * jsonb の hotspots を安全に Hotspot[] に変換する。
 * 不正データなら空配列にフォールバック（404 にせず空 hotspot として返す）。
 */
function parseHotspots(raw: unknown): Tutor3dHotspot[] {
  const result = hotspotArraySchema.safeParse(raw);
  if (!result.success) return [];
  return result.data as Tutor3dHotspot[];
}

/** カタログ一覧用サマリ（hotspots / glbUrl / usdzUrl は含めない）。 */
export function toTutor3dModelSummary(row: Tutor3dModelRow): Tutor3dModelSummary {
  return {
    id:           row.id,
    slug:         row.slug,
    title:        row.title,
    description:  row.description,
    subject:      row.subject as Tutor3dModelSummary['subject'],
    grade:        row.grade   as Tutor3dModelSummary['grade'],
    thumbnailUrl: row.thumbnailUrl ?? null,
    isFeatured:   row.isFeatured,
    viewCount:    row.viewCount,
  };
}

/** 個別ページ用詳細（hotspots / GLB URL 含む）。 */
export function toTutor3dModelDetail(row: Tutor3dModelRow): Tutor3dModelDto {
  return {
    ...toTutor3dModelSummary(row),
    glbUrl:      row.glbUrl,
    usdzUrl:     row.usdzUrl ?? null,
    hotspots:    parseHotspots(row.hotspots),
    attribution: row.attribution,
    license:     row.license,
    sourceUrl:   row.sourceUrl ?? null,
    published:   row.published,
  };
}
