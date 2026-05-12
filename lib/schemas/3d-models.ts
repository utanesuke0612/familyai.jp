/**
 * lib/schemas/3d-models.ts
 * familyai.jp / うごくAI教室 3D 図鑑（Rev34 Phase 1）
 *
 * zod スキーマ集約：DB 入出力 / API バリデーション / shared 型のソース・オブ・トゥルース。
 */

import { z } from 'zod';

// ── 教科サブカテゴリ・学年 ──────────────────────────────────
export const TUTOR3D_SUBJECT_VALUES = ['biology', 'chemistry', 'earth-space', 'physics'] as const;
export const TUTOR3D_GRADE_VALUES   = ['elem-low', 'elem-high', 'middle']                 as const;

export const tutor3dSubjectSchema = z.enum(TUTOR3D_SUBJECT_VALUES);
export const tutor3dGradeSchema   = z.enum(TUTOR3D_GRADE_VALUES);

// ── Hotspot ──────────────────────────────────────────────
const positionSchema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);

export const hotspotSchema = z.object({
  id:                 z.string().min(1).max(40),
  partName:           z.string().min(1).max(80),
  position:           positionSchema,
  normal:             positionSchema.optional(),
  defaultExplanation: z.string().max(400).default(''),
  promptHint:         z.string().max(800).default(''),
  // Phase 2 移行用: GLB の glTF Node 名（メッシュ名）。指定時はクリック検出で
  // 位置近似より先にメッシュ名一致を試みる。未指定なら位置近似のみで判定。
  meshName:           z.string().max(80).optional(),
});

export const hotspotArraySchema = z.array(hotspotSchema).max(30);

export type HotspotInput = z.input<typeof hotspotSchema>;
export type HotspotData  = z.output<typeof hotspotSchema>;

// ── 一覧クエリ（GET /api/3d-models 等の将来用）──────────────
export const tutor3dQuerySchema = z.object({
  subject: tutor3dSubjectSchema.optional(),
  grade:   tutor3dGradeSchema.optional(),
  featured: z.coerce.boolean().optional(),
  limit:   z.coerce.number().int().min(1).max(50).default(20),
});

// ── 管理者一覧（GET /api/admin/3d-models）──────────────────
export const ADMIN_MODEL_SORTS = ['latest', 'oldest', 'popular', 'title'] as const;

export const adminTutor3dQuerySchema = z.object({
  search:    z.string().trim().min(1).max(100).optional(),
  subject:   tutor3dSubjectSchema.optional(),
  grade:     tutor3dGradeSchema.optional(),
  published: z.union([z.literal('true'), z.literal('false'), z.literal('all')])
              .default('all')
              .transform((v) => (v === 'all' ? undefined : v === 'true')),
  sort:      z.enum(ADMIN_MODEL_SORTS).default('latest'),
  page:      z.coerce.number().int().min(1).max(1000).default(1),
  pageSize:  z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * Codex Q1-7 対応: GLB / USDZ / Thumbnail の URL を許可ドメインに制限する。
 * 任意 URL を許してしまうと、admin 権限が漏洩した場合に外部の悪意ある
 * 3D ファイルを参照させられる恐れがあるため、配信元を限定する。
 *
 * 許可パターン:
 *   - /3d-models/...                  ← public/3d-models/ 配下（ローカル）
 *   - /api/...                          ← 将来の署名 URL API（Vercel Blob 経由）
 *   - https://*.public.blob.vercel-storage.com/...  ← Vercel Blob 直リンク
 *   - https://blob.vercel-storage.com/...           ← Vercel Blob（短縮）
 */
const ASSET_URL_PATTERNS = [
  /^\/3d-models\//,
  /^\/api\//,
  /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//,
  /^https:\/\/blob\.vercel-storage\.com\//,
];
const assetUrlSchema = z.string().refine(
  (v) => ASSET_URL_PATTERNS.some((re) => re.test(v)),
  { message: 'URL は public/3d-models/ 配下または Vercel Blob のみ許可' },
);

// ── 管理者: 作成 / 更新 ──────────────────────────────────
export const createTutor3dModelSchema = z.object({
  slug:         z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/, {
    message: 'slug は小文字英数字とハイフンのみ',
  }),
  title:        z.string().trim().min(1).max(200),
  description:  z.string().max(2000).default(''),
  subject:      tutor3dSubjectSchema,
  grade:        tutor3dGradeSchema,
  glbUrl:       assetUrlSchema,
  usdzUrl:      assetUrlSchema.nullable().optional(),
  thumbnailUrl: assetUrlSchema.nullable().optional(),
  hotspots:     hotspotArraySchema.default([]),
  attribution:  z.string().max(800).default(''),
  license:      z.string().max(80).default(''),
  sourceUrl:    z.string().url().nullable().optional(),
  published:    z.boolean().default(false),
  isFeatured:   z.boolean().default(false),
});

export const updateTutor3dModelSchema = createTutor3dModelSchema.partial();

export type CreateTutor3dModelInput = z.input<typeof createTutor3dModelSchema>;
export type UpdateTutor3dModelInput = z.input<typeof updateTutor3dModelSchema>;
