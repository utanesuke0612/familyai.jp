/**
 * components/tools/3d-tutor/ModelViewer.tsx
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1 / Rev36)
 *
 * Google `<model-viewer>` を Next.js Client Component でラップする。
 *
 * 🎯 ホットスポット検出（Rev36 案 ②: クリック近似マッチング）
 *   - 視覚的なドットは非表示（クリーンな UX）
 *   - ユーザーが 3D モデルの任意の場所をタップすると、その 3D 座標を取得し、
 *     hotspots 配列の中で最も近い hotspot を `onHotspotClick` で発火する。
 *   - 閾値（HOTSPOT_CLICK_THRESHOLD）以上離れていれば無反応（空間クリック等）。
 *
 * 🔮 Phase 2 移行プラン（案 ③: メッシュ名識別）
 *   `hotspot.meshName` が指定されている場合、まず内部の Three.js scene を
 *   traverse して GLB の glTF Node 名と一致するものを優先選択する。
 *   現在は位置近似のみで動作するため、`meshName` フィールドは未参照。
 *
 * - SSR 無効化（Web Component なので window 必須）
 * - AR ボタンは <model-viewer> 標準の slot="ar-button" を活用
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tutor3dHotspot } from '@/shared';

// <model-viewer> Web Component の登録（クライアント側のみ）
let _viewerLoaded = false;
async function ensureModelViewerLoaded(): Promise<void> {
  if (_viewerLoaded) return;
  if (typeof window === 'undefined') return;
  await import('@google/model-viewer');
  _viewerLoaded = true;
}

/**
 * クリック近似マッチングの閾値（3D world unit）。
 * - 1.5 は太陽系モデル（半径 0.05〜1.0、配置距離 0〜8）に最適化された値。
 * - DNA / 振り子のような小スケールモデルでは「過剰マッチ」になる可能性があるが、
 *   その場合は hotspot 位置を実体に合わせて精緻化（hotspot-picker.html で再採取）すれば解決。
 * - 将来モデル別に閾値を持たせる場合は tutor3d_models に `clickThreshold` を追加可能。
 */
const HOTSPOT_CLICK_THRESHOLD = 1.5;

/** 2 点間ユークリッド距離（3D）。 */
function distance3D(
  a: { x: number; y: number; z: number },
  b: readonly [number, number, number],
): number {
  const dx = a.x - b[0];
  const dy = a.y - b[1];
  const dz = a.z - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** model-viewer の `positionAndNormalFromPoint` の戻り値の型。 */
type Hit = {
  position: { x: number; y: number; z: number };
  normal:   { x: number; y: number; z: number };
};

export interface ModelViewerProps {
  src:         string;                 // GLB URL
  iosSrc?:     string | null;          // USDZ URL（iOS AR 用・任意）
  poster?:     string | null;          // ローディング中の画像
  alt?:        string;                 // a11y 用テキスト説明
  hotspots?:   Tutor3dHotspot[];
  /** クリック→近接 hotspot 発火時のコールバック */
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

  // 3. クリック近似マッチング（案 ②）
  //    任意の位置クリック → 3D 座標を取得 → 最も近い hotspot を発火。
  const handleViewerClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!onHotspotClick || hotspots.length === 0) return;

    const el = viewerRef.current as (HTMLElement & {
      positionAndNormalFromPoint?: (x: number, y: number) => Hit | null;
    }) | null;
    if (!el || typeof el.positionAndNormalFromPoint !== 'function') return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = el.positionAndNormalFromPoint(x, y);
    if (!hit) return;  // クリックが空間に当たっていない

    // TODO(Phase 2 / 案 ③): hotspot.meshName が指定されていれば、
    //   el.model.scene を Three.js raycaster で traverse して Node 名一致を優先。
    //   現在は位置近似のみ。

    // 位置近似マッチング
    let nearest: Tutor3dHotspot | null = null;
    let minDist = Infinity;
    for (const h of hotspots) {
      const d = distance3D(hit.position, h.position);
      if (d < minDist) {
        minDist = d;
        nearest = h;
      }
    }

    if (nearest && minDist < HOTSPOT_CLICK_THRESHOLD) {
      onHotspotClick(nearest);
    }
    // else: 何もない空間 or hotspot 無しの領域 → 無反応で自然
  }, [hotspots, onHotspotClick]);

  if (!ready) {
    // Web Component ロード前のフォールバック
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
        cursor: hotspots.length > 0 ? 'pointer' : 'default',
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
        onClick={handleViewerClick}
        style={{
          width:  '100%',
          height: '100%',
          background: 'transparent',
        }}
      >
        {/* AR ボタン（標準 slot・iOS / Android 実機のみ表示） */}
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
