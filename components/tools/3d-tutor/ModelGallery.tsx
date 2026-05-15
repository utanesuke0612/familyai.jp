/**
 * components/tools/3d-tutor/ModelGallery.tsx
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1)
 *
 * カタログ一覧のカード表示（Server Component から呼ばれる前提）。
 * モバイル縦 1 列 / タブレット 2 列 / PC 3 列のグリッド。
 */

import Link from 'next/link';
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
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--sumi-light)',
          background: 'var(--washi-deep)',
          border: '1px solid var(--line)',
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
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}
    >
      {models.map((m) => (
        <Link
          key={m.id}
          href={`/tools/ai-kyoshitsu/${m.slug}`}
          className="group"
          style={{
            display: 'block',
            background: '#fff',
            borderRadius: 4,
            overflow: 'hidden',
            textDecoration: 'none',
            color: 'inherit',
            border: '1px solid var(--line)',
            transition: 'transform 0.18s',
          }}
        >
          {/* サムネ */}
          <div
            style={{
              width: '100%',
              aspectRatio: '4/3',
              background: m.thumbnailUrl
                ? `var(--washi-deep) url("${m.thumbnailUrl}") center/cover no-repeat`
                : 'var(--washi-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
              color: 'var(--sumi-light)',
            }}
            aria-hidden
          >
            {!m.thumbnailUrl && <span>3D</span>}
          </div>

          {/* メタ */}
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 4,
                  background: 'var(--washi-deep)',
                  color: 'var(--sumi)',
                  border: '1px solid var(--line)',
                }}
              >
                {TUTOR3D_SUBJECT_LABEL[m.subject]}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 4,
                  background: 'var(--washi-deep)',
                  color: 'var(--sumi-light)',
                  border: '1px solid var(--line)',
                }}
              >
                {TUTOR3D_GRADE_LABEL[m.grade]}
              </span>
              {m.isFeatured && (
                <span
                  style={{
                    fontSize: 11,
                    padding: '3px 10px',
                    borderRadius: 4,
                    background: 'var(--shu)',
                    color: '#fff',
                    fontWeight: 500,
                  }}
                >
                  おすすめ
                </span>
              )}
            </div>
            <h3
              className="font-mincho"
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 500,
                color: 'var(--sumi)',
                lineHeight: 1.4,
              }}
            >
              {m.title}
            </h3>
            {m.description && (
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 13,
                  color: 'var(--sumi-light)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {m.description}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
