/**
 * lib/tutor3d/static-models.ts
 * familyai.jp / うごくAI教室 3D 図鑑
 *
 * DB に登録しない「特殊実装の 3D モデル」を静的に定義する。
 * 太陽系は WebGL/HTML 実装 (public/3d/solar/) を iframe で埋め込んでおり、
 * GLB ファイルを持たないため DB レコードを必要としない。
 *
 * 用途:
 *   1. /tools/ai-kyoshitsu (一覧) で DB モデルと並べて表示する
 *   2. /tools/ai-kyoshitsu/[slug] (詳細) で slug='solar-system' のとき
 *      DB 取得を行わずこの静的データを利用する
 */

import type { Tutor3dModel, Tutor3dModelSummary } from '@/shared';

/**
 * 太陽系 (slug='solar-system') の静的モデルデータ。
 *
 * 注:
 *  - glbUrl は形式上必須だが、ModelDetailClient 側で slug をチェックして
 *    iframe にルーティングするため実際には使われない。
 *    互換のためダミー値 '/3d/solar/index.html' を入れる。
 *  - hotspots は空。天体クリックは iframe からの postMessage で動的に
 *    HotspotPanel に伝わる。
 */
export const SOLAR_SYSTEM_MODEL: Tutor3dModel = {
  id:           'static-solar-system',
  slug:         'solar-system',
  title:        '太陽系',
  description:  '太陽と 8 つの惑星が広がる宇宙を、回しながら観察しよう。それぞれの惑星をタップすると、AI が詳しく教えてくれます。',
  subject:      'earth-space',
  grade:        'elem-high',
  thumbnailUrl: null,
  isFeatured:   true,
  viewCount:    0,
  glbUrl:       '/3d/solar/index.html',  // ダミー (実体は iframe で参照)
  usdzUrl:      null,
  hotspots:     [],
  attribution:  '',
  license:      '',
  sourceUrl:    null,
  published:    true,
};

/** 一覧表示用の Summary 型 (Tutor3dModel から不要フィールドを除外) */
export const SOLAR_SYSTEM_SUMMARY: Tutor3dModelSummary = {
  id:           SOLAR_SYSTEM_MODEL.id,
  slug:         SOLAR_SYSTEM_MODEL.slug,
  title:        SOLAR_SYSTEM_MODEL.title,
  description:  SOLAR_SYSTEM_MODEL.description,
  subject:      SOLAR_SYSTEM_MODEL.subject,
  grade:        SOLAR_SYSTEM_MODEL.grade,
  thumbnailUrl: SOLAR_SYSTEM_MODEL.thumbnailUrl,
  isFeatured:   SOLAR_SYSTEM_MODEL.isFeatured,
  viewCount:    SOLAR_SYSTEM_MODEL.viewCount,
};

/** slug → 静的モデル の lookup map (将来追加に備えてマップ化) */
export const STATIC_MODELS_BY_SLUG: Record<string, Tutor3dModel> = {
  'solar-system': SOLAR_SYSTEM_MODEL,
};

/** 一覧に静的モデルを混ぜるためのリスト */
export const STATIC_MODEL_SUMMARIES: Tutor3dModelSummary[] = [
  SOLAR_SYSTEM_SUMMARY,
];
