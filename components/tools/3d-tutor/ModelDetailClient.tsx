/**
 * components/tools/3d-tutor/ModelDetailClient.tsx
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1)
 *
 * 個別モデル詳細ページの Client Component。
 * ModelViewer + HotspotPanel + メタ情報を統合し、Server Component から model を受け取る。
 *
 * 太陽系 (slug='solar-system') は WebGL/HTML 実装 (public/3d/solar/) を iframe で
 * 埋め込み、postMessage 経由で天体選択イベントを親に伝えて HotspotPanel に
 * 接続する (Rev40 ユーザー要望)。
 */

'use client';

import { useEffect, useState } from 'react';
import { ModelViewer } from './ModelViewer';
import { HotspotPanel } from './HotspotPanel';
import type { Tutor3dModel, Tutor3dHotspot } from '@/shared';

export interface ModelDetailClientProps {
  model: Tutor3dModel;
}

/** iframe (太陽系) から飛んでくる postMessage の payload の型 */
type SolarSelectMessage = {
  type: 'solar:select';
  body: {
    key:     string;
    name:    string;
    english: string;
    copy:    string;
  };
};

/** 天体データから HotspotPanel が要求する Tutor3dHotspot 形式へ変換 */
function solarBodyToHotspot(body: SolarSelectMessage['body']): Tutor3dHotspot {
  return {
    id:                 `solar:${body.key}`,
    partName:           body.name,
    position:           [0, 0, 0],
    defaultExplanation: body.copy,
    promptHint:         `${body.name}（${body.english}）について`,
  };
}

export function ModelDetailClient({ model }: ModelDetailClientProps) {
  const [activeHotspot, setActiveHotspot] = useState<Tutor3dHotspot | null>(null);

  // 太陽系 iframe からの postMessage を受信して HotspotPanel に流す
  useEffect(() => {
    if (model.slug !== 'solar-system') return;

    const handleMessage = (event: MessageEvent) => {
      // セキュリティ: 同一オリジンの message のみ受信する
      if (event.origin !== window.location.origin) return;
      const data = event.data as Partial<SolarSelectMessage> | null;
      if (!data || data.type !== 'solar:select' || !data.body) return;
      setActiveHotspot(solarBodyToHotspot(data.body));
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [model.slug]);

  // ── 太陽系: iframe + AI チャット連動 ──────────────────────
  if (model.slug === 'solar-system') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* ── 左：iframe (WebGL 太陽系) + ガイド ── */}
        <div className="min-w-0">
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
            <p style={{ margin: '0 0 8px' }}>
              気になる天体（太陽・地球・木星など）をタップすると、右側の AI チャットで詳しく教えてくれるよ！
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--sumi-light)' }}>
              太陽系をドラッグで回転、ホイールやピンチで拡大・縮小できます。画面内のボタンでラベル、軌道、速度を調整できます。
            </p>
          </div>
        </div>

        {/* ── 右：AI チャットサイドバー（GLB モデルと同じレイアウト） ── */}
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

  // ── GLB モデル: <ModelViewer> + AI チャット ──────────────────
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
