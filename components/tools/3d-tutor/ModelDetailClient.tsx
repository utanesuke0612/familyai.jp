/**
 * components/tools/3d-tutor/ModelDetailClient.tsx
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1)
 *
 * 個別モデル詳細ページの Client Component。
 * ModelViewer + HotspotPanel + メタ情報を統合し、Server Component から model を受け取る。
 */

'use client';

import { useState } from 'react';
import { ModelViewer } from './ModelViewer';
import { HotspotPanel } from './HotspotPanel';
import type { Tutor3dModel, Tutor3dHotspot } from '@/shared';

export interface ModelDetailClientProps {
  model: Tutor3dModel;
}

export function ModelDetailClient({ model }: ModelDetailClientProps) {
  const [activeHotspot, setActiveHotspot] = useState<Tutor3dHotspot | null>(null);

  if (model.slug === 'solar-system') {
    return (
      <div>
        <iframe
          title={model.title}
          src="/3d/solar/index.html"
          style={{
            width: '100%',
            height: 'min(72vh, 760px)',
            minHeight: 520,
            border: 'none',
            borderRadius: 16,
            background: '#050914',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
          }}
        />

        <p
          style={{
            margin: '16px 0 0',
            padding: '12px 14px',
            background: 'var(--washi-deep)',
            border: '1px solid var(--line)',
            borderRadius: 4,
            fontSize: 13,
            color: 'var(--sumi)',
            lineHeight: 1.6,
          }}
        >
          太陽系をドラッグで回転、ホイールやピンチで拡大・縮小できます。画面内のボタンでラベル、軌道、速度を調整できます。
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
      {/* ── 左：3D ビューア + ガイド ── */}
      <div className="min-w-0">
        <ModelViewer
          src={model.glbUrl}
          iosSrc={model.usdzUrl}
          poster={model.thumbnailUrl}
          alt={model.title}
          hotspots={model.hotspots}
          onHotspotClick={setActiveHotspot}
          autoRotate
          heightCss="min(60vh, 560px)"
        />

        {/* 操作ガイド */}
        <div
          style={{
            margin: '16px 0 0',
            padding: '12px 14px',
            background: 'var(--washi-deep)',
            border: '1px solid var(--line)',
            borderRadius: 4,
            fontSize: 13,
            color: 'var(--sumi)',
            lineHeight: 1.6,
          }}
        >
          {model.hotspots.length > 0 && (
            <p style={{ margin: '0 0 8px' }}>
              3D モデルの気になる部分をタップすると、右側の AI チャットで詳しく教えてくれるよ！
            </p>
          )}
          <p style={{ margin: 0, fontSize: 12, color: 'var(--sumi-light)' }}>
            <strong style={{ color: 'var(--sumi)' }}>操作方法：</strong>{' '}
            <span style={{ whiteSpace: 'nowrap' }}>📱 1本指ドラッグで回転</span>・
            <span style={{ whiteSpace: 'nowrap' }}>2本指ドラッグで左右上下に移動</span>・
            <span style={{ whiteSpace: 'nowrap' }}>ピンチで拡大／縮小</span>
            <br />
            <span style={{ whiteSpace: 'nowrap' }}>🖱️ 左クリックドラッグで回転</span>・
            <span style={{ whiteSpace: 'nowrap' }}>右クリックドラッグで移動</span>・
            <span style={{ whiteSpace: 'nowrap' }}>ホイールで拡大／縮小</span>
          </p>
        </div>
      </div>

      {/* ── 右：AI チャットサイドバー（Lesson と同じ sticky パターン） ── */}
      <aside className="lg:sticky lg:top-[calc(var(--header-height,72px)+24px)]">
        <HotspotPanel
          model={model}
          hotspot={activeHotspot}
          onClose={() => setActiveHotspot(null)}
        />
      </aside>
    </div>
  );
}
