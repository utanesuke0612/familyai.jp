/**
 * components/tools/3d-tutor/ModelViewer.tsx
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1 / Rev36)
 *
 * Google `<model-viewer>` を Next.js Client Component でラップする。
 *
 * 🎯 ホットスポット検出（Rev36 — 2 段階フォールバック）
 *   1️⃣ **案 ③: マテリアル名識別**（優先・公式 API `materialFromPoint`）
 *      - hotspot.meshName と GLB 内マテリアル名を照合
 *      - Blender 規約「X_Material」のサフィックスは自動で除去（例: "Sun_Material" → "Sun"）
 *      - 命中精度: ◎（メッシュに直接ヒットしたか判定するため誤検知ゼロ）
 *
 *   2️⃣ **案 ②: 位置近似マッチング**（フォールバック）
 *      - `materialFromPoint` が null を返した場合 / hotspot.meshName 一致が無い場合
 *      - `positionAndNormalFromPoint` で 3D 座標を取得し最近接 hotspot を選択
 *      - 閾値 HOTSPOT_CLICK_THRESHOLD 以上離れていれば無反応
 *
 * 🛠️ 運用ルール:
 *   - 自前生成モデル（Blender Python）: meshName 必須・命中精度◎
 *   - Tripo 生成モデル: マテリアル名が一般化（"Material" 等）の場合があるので
 *     Blender で手動命名するか、meshName を省略して案 ② フォールバックに任せる
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
  const [ready,    setReady]    = useState(false);
  const [arAvail,  setArAvail]  = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);  // src 再読み込みトリガー

  // 1. Web Component を遅延ロード
  useEffect(() => {
    let active = true;
    ensureModelViewerLoaded().then(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []);

  // 2. AR 利用可否 + ロードエラー監視
  //    Codex Q1-9 対応: GLB 取得失敗時の UI を追加
  useEffect(() => {
    if (!ready) return;
    const el = viewerRef.current as (HTMLElement & { canActivateAR?: boolean }) | null;
    if (!el) return;

    const handleLoad = () => {
      setLoadError(null);
      setArAvail(Boolean(el.canActivateAR));
    };
    const handleError = (e: Event) => {
      const detail = (e as CustomEvent<{ sourceError?: { message?: string } }>).detail;
      setLoadError(detail?.sourceError?.message ?? 'モデルの読み込みに失敗しました。');
    };
    el.addEventListener('load', handleLoad);
    el.addEventListener('error', handleError);
    return () => {
      el.removeEventListener('load', handleLoad);
      el.removeEventListener('error', handleError);
    };
  }, [ready, src, retryKey]);

  // 3. クリック検出（案 ③ マテリアル名 → 案 ② 位置近似 の 2 段階フォールバック）
  const handleViewerClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!onHotspotClick || hotspots.length === 0) return;

    const el = viewerRef.current as (HTMLElement & {
      positionAndNormalFromPoint?: (x: number, y: number) => Hit | null;
      materialFromPoint?: (x: number, y: number) => { name?: string; index?: number } | null;
    }) | null;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // ── 1️⃣ 案 ③: マテリアル名識別（命中精度◎） ─────────────────
    if (typeof el.materialFromPoint === 'function') {
      const material = el.materialFromPoint(x, y);
      const matName = material?.name;
      if (matName) {
        // Blender 規約「X_Material」のサフィックスを除去して照合する
        const normalized = matName.replace(/_Material$/i, '');
        const matched = hotspots.find((h) => {
          if (!h.meshName) return false;
          // 完全一致 or サフィックス除去後の一致
          return h.meshName === matName ||
                 h.meshName === normalized ||
                 h.meshName.replace(/_Material$/i, '') === normalized;
        });
        if (matched) {
          onHotspotClick(matched);
          return;
        }
        // マテリアル名は取れたが対応 hotspot が無い → 位置近似フォールバックへ進む。
        // 旧実装は ここで return していたが、Tripo 等の汎用マテリアル名
        // （"Material" / "Material.001" 等）モデルで無反応になる Codex 指摘
        // (Q1-1 / Q2-2 / P1) に対応し、座標近似を試す方針に変更。
      }
    }

    // ── 2️⃣ 案 ②: 位置近似フォールバック ────────────────────────
    if (typeof el.positionAndNormalFromPoint !== 'function') return;
    const hit = el.positionAndNormalFromPoint(x, y);
    if (!hit) return;  // クリックが空間に当たっていない

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
          borderRadius: 4,
          border: '1px solid var(--line)',
          background: 'var(--washi-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--sumi-light)',
          fontSize: 14,
        }}
      >
        読み込み中…
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
        borderRadius: 4,
        overflow: 'hidden',
        background: 'var(--washi-deep)',
        border: '1px solid var(--line)',
        cursor: hotspots.length > 0 && !loadError ? 'pointer' : 'default',
      }}
    >
      {/* ── 読み込みエラー UI（Codex Q1-9 対応）── */}
      {loadError && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 16,
            background: 'rgba(247, 243, 233, 0.96)',
            zIndex: 5,
            textAlign: 'center',
          }}
        >
          <p style={{
            margin: 0, fontSize: 15, fontWeight: 500,
            fontFamily: "var(--font-mincho), 'Shippori Mincho', serif",
            color: 'var(--sumi)',
          }}>
            3D モデルの読み込みに失敗しました
          </p>
          <p style={{
            margin: 0, fontSize: 12, lineHeight: 1.6,
            color: 'var(--sumi-light)',
            maxWidth: 360,
          }}>
            通信状況やファイル URL を確認してください。<br />
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => { setLoadError(null); setRetryKey((k) => k + 1); }}
            style={{
              marginTop: 8,
              padding: '10px 18px',
              border: 'none',
              borderRadius: 4,
              background: 'var(--shu)',
              color: '#fff',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            もう一度読み込む
          </button>
        </div>
      )}
      <model-viewer
        key={retryKey}
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
              background: 'var(--shu)',
              color: '#fff',
              border: '1px solid var(--line)',
              borderRadius: 4,
              padding: '10px 16px',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
              minHeight: 44,
            }}
            aria-label="AR モードを起動"
          >
            AR で見る
          </button>
        )}
      </model-viewer>
    </div>
  );
}
