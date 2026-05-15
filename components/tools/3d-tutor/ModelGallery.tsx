/**
 * components/tools/3d-tutor/ModelGallery.tsx
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1 / Rev40 Phase K+)
 *
 * カタログ一覧のカード表示（Server Component から呼ばれる前提）。
 * モバイル縦 1 列 / タブレット 2 列 / PC 3 列のグリッド。
 *
 * Rev40 Phase K+: /tools ツールカードと同じ box-ehon + group hover の
 * 「紙が持ち上がる + タイトル朱色化 + 矢印スライド」動作に統一。
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Tutor3dModelSummary } from '@/shared';
import { TUTOR3D_SUBJECT_LABEL, TUTOR3D_GRADE_LABEL } from '@/shared';

export interface ModelGalleryProps {
  models: Tutor3dModelSummary[];
}

export function ModelGallery({ models }: ModelGalleryProps) {
  if (models.length === 0) {
    return (
      <div
        style={{
          padding:      '48px 24px',
          textAlign:    'center',
          color:        'var(--sumi-light)',
          background:   'var(--washi-deep)',
          border:       '1px solid var(--line)',
          borderRadius: 4,
        }}
      >
        <p style={{ margin: 0, fontSize: 16 }}>このカテゴリの 3D モデルはまだ準備中です</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap:                 24,
      }}
    >
      {models.map((m) => (
        <Link
          key={m.id}
          href={`/tools/ai-kyoshitsu/${m.slug}`}
          className="group block"
        >
          <article className="box-ehon p-0 transition-transform duration-200 hover:-translate-y-1">

            {/* サムネ */}
            <div
              style={{
                width:           '100%',
                aspectRatio:     '4/3',
                background:      m.thumbnailUrl
                  ? `var(--washi-deep) url("${m.thumbnailUrl}") center/cover no-repeat`
                  : 'var(--washi-deep)',
                borderBottom:    '1px solid var(--line-soft)',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                fontSize:        48,
                fontFamily:      'var(--font-mincho), serif',
                color:           'var(--sumi-light)',
              }}
              aria-hidden
            >
              {!m.thumbnailUrl && <span>3D</span>}
            </div>

            {/* ボディ */}
            <div className="p-5 flex flex-col gap-2">

              {/* バッジ行 */}
              <div className="flex flex-wrap gap-1.5">
                <span
                  className="font-mincho"
                  style={{
                    fontSize:     11,
                    fontWeight:   500,
                    padding:      '3px 10px',
                    borderRadius: 4,
                    background:   'var(--washi-deep)',
                    color:        'var(--sumi)',
                    border:       '1px solid var(--line)',
                  }}
                >
                  {TUTOR3D_SUBJECT_LABEL[m.subject]}
                </span>
                <span
                  className="font-mincho"
                  style={{
                    fontSize:     11,
                    padding:      '3px 10px',
                    borderRadius: 4,
                    background:   'var(--washi-light)',
                    color:        'var(--sumi-light)',
                    border:       '1px solid var(--line)',
                  }}
                >
                  {TUTOR3D_GRADE_LABEL[m.grade]}
                </span>
                {m.isFeatured && (
                  <span
                    className="font-mincho"
                    style={{
                      fontSize:     11,
                      fontWeight:   500,
                      padding:      '3px 10px',
                      borderRadius: 4,
                      background:   'var(--shu)',
                      color:        '#fff',
                    }}
                  >
                    おすすめ
                  </span>
                )}
              </div>

              {/* タイトル — group-hover で朱色化 */}
              <h3
                className="font-mincho leading-snug group-hover:text-[var(--shu)] transition-colors"
                style={{
                  margin:     0,
                  fontSize:   17,
                  fontWeight: 500,
                  color:      'var(--sumi)',
                }}
              >
                {m.title}
              </h3>

              {/* 説明 */}
              {m.description && (
                <p
                  style={{
                    margin:           0,
                    fontSize:         13,
                    color:            'var(--sumi-light)',
                    lineHeight:       1.5,
                    display:          '-webkit-box',
                    WebkitLineClamp:  2,
                    WebkitBoxOrient:  'vertical',
                    overflow:         'hidden',
                  }}
                >
                  {m.description}
                </p>
              )}

              {/* CTA 行 — group-hover で矢印スライド */}
              <div
                className="mt-3 pt-3 flex items-center gap-2 font-mincho text-sm"
                style={{
                  borderTop: '1px solid var(--line-soft)',
                  color:     'var(--sumi-light)',
                }}
              >
                見てみる
                <ArrowRight
                  strokeWidth={1.25}
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>

            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}
