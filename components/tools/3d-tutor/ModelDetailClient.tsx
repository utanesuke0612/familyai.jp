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

  return (
    <>
      <ModelViewer
        src={model.glbUrl}
        iosSrc={model.usdzUrl}
        poster={model.thumbnailUrl}
        alt={model.title}
        hotspots={model.hotspots}
        onHotspotClick={setActiveHotspot}
        autoRotate
        heightCss="min(70vh, 640px)"
      />

      {/* ホットスポットの説明: hotspot が無いモデルでもガイドだけ表示 */}
      {model.hotspots.length === 0 ? (
        <p
          style={{
            margin: '16px 0 0',
            padding: '12px 14px',
            background: 'var(--color-peach-light)',
            borderRadius: 12,
            fontSize: 13,
            color: 'var(--color-brown)',
            lineHeight: 1.6,
          }}
        >
          💡 このモデルにはまだホットスポットが設定されていません。
          指でぐるぐる回したり、ピンチで拡大／縮小できます。
        </p>
      ) : (
        <p
          style={{
            margin: '16px 0 0',
            padding: '12px 14px',
            background: 'var(--color-peach-light)',
            borderRadius: 12,
            fontSize: 13,
            color: 'var(--color-brown)',
            lineHeight: 1.6,
          }}
        >
          💡 オレンジの光っている点をタップすると、あいちゃんが詳しく教えてくれるよ！
        </p>
      )}

      {/* ホットスポットパネル（タップで現れる） */}
      <HotspotPanel
        model={model}
        hotspot={activeHotspot}
        onClose={() => setActiveHotspot(null)}
      />
    </>
  );
}
