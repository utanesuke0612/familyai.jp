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
          color: 'var(--color-brown-muted, #A48B72)',
          background: 'rgba(255,255,255,0.6)',
          borderRadius: 24,
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 12, opacity: 0.5 }}>🪐</div>
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
            borderRadius: 20,
            overflow: 'hidden',
            textDecoration: 'none',
            color: 'inherit',
            boxShadow: '0 2px 10px rgba(107, 79, 58, 0.08)',
            transition: 'transform 0.18s, box-shadow 0.18s',
          }}
        >
          {/* サムネ */}
          <div
            style={{
              width: '100%',
              aspectRatio: '4/3',
              background: m.thumbnailUrl
                ? `var(--color-peach-light) url("${m.thumbnailUrl}") center/cover no-repeat`
                : 'radial-gradient(ellipse at center, var(--color-peach-light) 0%, var(--color-cream) 80%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
              color: 'var(--color-brown-muted)',
            }}
            aria-hidden
          >
            {!m.thumbnailUrl && <span>🧊</span>}
          </div>

          {/* メタ */}
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'var(--color-peach-light)',
                  color: 'var(--color-brown)',
                }}
              >
                {TUTOR3D_SUBJECT_LABEL[m.subject]}
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'var(--color-cream)',
                  color: 'var(--color-brown-muted)',
                }}
              >
                {TUTOR3D_GRADE_LABEL[m.grade]}
              </span>
              {m.isFeatured && (
                <span
                  style={{
                    fontSize: 11,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'var(--color-orange, #F39C5F)',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  ⭐ おすすめ
                </span>
              )}
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--color-brown)',
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
                  color: 'var(--color-brown-muted)',
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
