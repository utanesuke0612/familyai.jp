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
          {model.hotspots.length === 0
            ? '💡 このモデルにはまだ解説ポイントが設定されていません。指でぐるぐる回したり、ピンチで拡大／縮小できます。'
            : '💡 3D モデルの気になる部分をタップすると、右側の AI チャットで詳しく教えてくれるよ！'}
        </p>
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
