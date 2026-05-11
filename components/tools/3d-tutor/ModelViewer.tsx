/**
 * components/tools/3d-tutor/ModelViewer.tsx
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1)
 *
 * Google `<model-viewer>` を Next.js Client Component でラップする。
 * - SSR 無効化（Web Component なので window 必須）
 * - 親コンポーネントから src / hotspots / onHotspotClick を受け取る
 * - AR ボタンは <model-viewer> 標準の slot="ar-button" を活用
 *
 * 「ぬくもりキャビネット」UI: cream→peach の柔らかい円形スポットライト風背景
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { Tutor3dHotspot } from '@/shared';

// <model-viewer> Web Component の登録（クライアント側のみ）
// 動的 import で SSR を回避し、初回 mount 時にロード
let _viewerLoaded = false;
async function ensureModelViewerLoaded(): Promise<void> {
  if (_viewerLoaded) return;
  if (typeof window === 'undefined') return;
  await import('@google/model-viewer');
  _viewerLoaded = true;
}

export interface ModelViewerProps {
  src:         string;                 // GLB URL
  iosSrc?:     string | null;          // USDZ URL（iOS AR 用・任意）
  poster?:     string | null;          // ローディング中の画像
  alt?:        string;                 // a11y 用テキスト説明
  hotspots?:   Tutor3dHotspot[];
  /** ホットスポットがタップされた時のコールバック */
  onHotspotClick?: (hotspot: Tutor3dHotspot) => void;
  autoRotate?: boolean;
  className?:  string;
  /** 高さ。CSS で aspect-ratio を持たせるなら未指定でも OK */
  heightCss?:  string;
}

export function ModelViewer({
  src,
  iosSrc,
  poster,
  alt = '3D モデル',
  hotspots = [],
  onHotspotClick,
  autoRotate = true,
  className,
  heightCss,
}: ModelViewerProps) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const [ready,   setReady] = useState(false);
  const [arAvail, setArAvail] = useState(false);

  // 1. Web Component を遅延ロード
  useEffect(() => {
    let active = true;
    ensureModelViewerLoaded().then(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []);

  // 2. AR 利用可否を監視（load 後に canActivateAR を見る）
  useEffect(() => {
    if (!ready) return;
    const el = viewerRef.current as (HTMLElement & { canActivateAR?: boolean }) | null;
    if (!el) return;

    const handleLoad = () => setArAvail(Boolean(el.canActivateAR));
    el.addEventListener('load', handleLoad);
    return () => el.removeEventListener('load', handleLoad);
  }, [ready, src]);

  if (!ready) {
    // Web Component ロード前のフォールバック（cream の柔らかい spinner）
    return (
      <div
        className={className}
        style={{
          width:  '100%',
          height: heightCss ?? '60vh',
          minHeight: 360,
          borderRadius: 24,
          background: 'radial-gradient(ellipse at center, var(--color-peach-light) 0%, var(--color-cream) 80%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-brown-muted)',
          fontSize: 14,
        }}
      >
        🌀 読み込み中…
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: heightCss ?? '60vh',
        minHeight: 360,
        borderRadius: 24,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, var(--color-peach-light) 0%, var(--color-cream) 80%)',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      <model-viewer
        ref={(el: HTMLElement | null) => { viewerRef.current = el; }}
        src={src}
        ios-src={iosSrc ?? undefined}
        poster={poster ?? undefined}
        alt={alt}
        ar
        ar-modes="webxr scene-viewer quick-look"
        camera-controls
        auto-rotate={autoRotate ? '' : undefined}
        rotation-per-second="20deg"
        interaction-prompt="none"
        shadow-intensity="0.6"
        environment-image="neutral"
        exposure="1.0"
        loading="eager"
        style={{
          width:  '100%',
          height: '100%',
          background: 'transparent',
        }}
      >
        {hotspots.map((h) => (
          <button
            key={h.id}
            slot={`hotspot-${h.id}`}
            data-position={h.position.join(' ')}
            data-normal={h.normal?.join(' ')}
            data-visibility-attribute="visible"
            onClick={(e) => {
              e.preventDefault();
              onHotspotClick?.(h);
            }}
            aria-label={`${h.partName} について解説を見る`}
            style={{
              all: 'unset',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--color-orange, #F39C5F)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.9)',
              cursor: 'pointer',
              animation: 'pulse-soft 1.6s ease-in-out infinite',
            }}
            title={h.partName}
          />
        ))}

        {/* AR ボタン（標準 slot） */}
        {arAvail && (
          <button
            slot="ar-button"
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              background: 'var(--color-orange, #F39C5F)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              minHeight: 44,
            }}
            aria-label="AR モードを起動"
          >
            🌐 AR で見る
          </button>
        )}
      </model-viewer>
    </div>
  );
}
