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

/**
 * 背景色プリセット。クリックで順に切り替える。
 * モデルが背景と同色で見えなくなる場合の対比調整用（例: 太陽は washi-deep に
 * 溶け込みやすい）。Mingei トーンの「砂」を基本に、白／灰／墨／黒を用意する。
 */
const BG_PRESETS = [
  { id: 'washi', label: '砂 (デフォルト)', color: 'var(--washi-deep)', swatch: '#EFE5D4' },
  { id: 'white', label: '白',              color: '#ffffff',           swatch: '#ffffff' },
  { id: 'gray',  label: '灰',              color: '#999999',           swatch: '#999999' },
  { id: 'dark',  label: '墨',              color: '#2b2b2b',           swatch: '#2b2b2b' },
  { id: 'black', label: '黒（宇宙）',       color: '#000000',           swatch: '#000000' },
] as const;

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
  const viewerRef  = useRef<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [ready,    setReady]    = useState(false);
  const [arAvail,  setArAvail]  = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);  // src 再読み込みトリガー
  const [isFullscreen, setIsFullscreen] = useState(false);
  // CSS 擬似フルスクリーン (Fullscreen API 非対応端末の fallback。主に古い iOS 等)
  const [cssFullscreen, setCssFullscreen] = useState(false);
  // 背景色プリセットの index
  const [bgIndex, setBgIndex] = useState(0);
  const currentBg = BG_PRESETS[bgIndex]!;

  const cycleBg = useCallback(() => {
    setBgIndex((i) => (i + 1) % BG_PRESETS.length);
  }, []);

  // 1. Web Component を遅延ロード
  useEffect(() => {
    let active = true;
    ensureModelViewerLoaded().then(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []);

  // 2-bis. Fullscreen API の状態を監視
  //   - ESC や OS UI で退出した場合も isFullscreen を同期する
  //   - webkit prefix（Safari）にも対応
  useEffect(() => {
    type ExtDoc = Document & { webkitFullscreenElement?: Element };
    const docExt = document as ExtDoc;
    const onChange = () => {
      const active = !!(docExt.fullscreenElement || docExt.webkitFullscreenElement);
      setIsFullscreen(active);
      // 真の Fullscreen 復帰時は CSS 擬似モードも解除
      if (active) setCssFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // 2-ter. CSS 擬似フルスクリーン中の ESC で退出可能にする
  useEffect(() => {
    if (!cssFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCssFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cssFullscreen]);

  // フルスクリーン切り替え（真の Fullscreen API 優先・失敗時は CSS 擬似モードへ）
  const toggleFullscreen = useCallback(async () => {
    const el = wrapperRef.current;
    if (!el) return;
    type ExtEl = HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> };
    type ExtDoc = Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const elExt  = el as ExtEl;
    const docExt = document as ExtDoc;

    const inRealFs = !!(docExt.fullscreenElement || docExt.webkitFullscreenElement);

    // 退出
    if (inRealFs) {
      try {
        if (docExt.exitFullscreen)              await docExt.exitFullscreen();
        else if (docExt.webkitExitFullscreen)   await docExt.webkitExitFullscreen();
      } catch { /* ignore */ }
      return;
    }
    if (cssFullscreen) {
      setCssFullscreen(false);
      return;
    }

    // 入場: 真の Fullscreen API を試す
    try {
      if (elExt.requestFullscreen)             { await elExt.requestFullscreen(); return; }
      if (elExt.webkitRequestFullscreen)       { await elExt.webkitRequestFullscreen(); return; }
    } catch { /* 権限拒否等は CSS fallback へ落とす */ }

    // フォールバック: CSS 擬似フルスクリーン
    setCssFullscreen(true);
  }, [cssFullscreen]);

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

  // フルスクリーン中（真 or CSS 擬似）はビューポート一杯にする
  const isAnyFullscreen = isFullscreen || cssFullscreen;
  const wrapperStyle: React.CSSProperties = isAnyFullscreen
    ? {
        position:   cssFullscreen ? 'fixed' : 'relative',
        ...(cssFullscreen ? { inset: 0, zIndex: 9999 } : null),
        width:      '100%',
        height:     '100%',
        minHeight:  cssFullscreen ? '100vh' : 0,
        borderRadius: 0,
        overflow:   'hidden',
        background: currentBg.color,
        border:     'none',
        cursor:     hotspots.length > 0 && !loadError ? 'pointer' : 'default',
      }
    : {
        position:   'relative',
        width:      '100%',
        height:     heightCss ?? '60vh',
        minHeight:  360,
        borderRadius: 4,
        overflow:   'hidden',
        background: currentBg.color,
        border:     '1px solid var(--line)',
        cursor:     hotspots.length > 0 && !loadError ? 'pointer' : 'default',
      };

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={wrapperStyle}
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
      {/* コントロール群（右上・<model-viewer> の外側 = light DOM ではなく通常子要素） */}
      {!loadError && (
        <div
          style={{
            position: 'absolute',
            top:      12,
            right:    12,
            display:  'flex',
            gap:      8,
            zIndex:   4,
          }}
        >
          {/* 背景色切替ボタン（クリックで次のプリセット） */}
          <button
            type="button"
            onClick={cycleBg}
            aria-label={`背景色を変更（現在: ${currentBg.label}）`}
            title={`背景色: ${currentBg.label}（クリックで切替）`}
            style={{
              width:          40,
              height:         40,
              display:        'inline-flex',
              alignItems:     'center',
              justifyContent: 'center',
              background:     'rgba(255, 255, 255, 0.88)',
              color:          'var(--sumi)',
              border:         '1px solid var(--line)',
              borderRadius:   4,
              cursor:         'pointer',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          >
            {/* 現在の背景色を示す丸スウォッチ */}
            <span
              aria-hidden="true"
              style={{
                width:        18,
                height:       18,
                borderRadius: '50%',
                background:   currentBg.swatch,
                border:       '1px solid var(--line)',
                boxShadow:    '0 0 0 1px rgba(255,255,255,0.6) inset',
                display:      'block',
              }}
            />
          </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isAnyFullscreen ? 'フルスクリーンを終了' : 'フルスクリーンで表示'}
          title={isAnyFullscreen ? 'フルスクリーンを終了 (Esc)' : 'フルスクリーンで表示'}
          style={{
            width:          40,
            height:         40,
            display:        'inline-flex',
            alignItems:     'center',
            justifyContent: 'center',
            background:     'rgba(255, 255, 255, 0.88)',
            color:          'var(--sumi)',
            border:         '1px solid var(--line)',
            borderRadius:   4,
            cursor:         'pointer',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          {isAnyFullscreen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                 aria-hidden="true">
              <path d="M9 3v3a2 2 0 0 1-2 2H4M15 3v3a2 2 0 0 0 2 2h3M15 21v-3a2 2 0 0 1 2-2h3M9 21v-3a2 2 0 0 0-2-2H4" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                 aria-hidden="true">
              <path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M21 15v4a2 2 0 0 1-2 2h-4M3 15v4a2 2 0 0 0 2 2h4" />
            </svg>
          )}
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
        /* Rev40: ズーム制限を緩和して "無限拡大" 体感を実現
           - radius 0% で限界近くまで寄れる（モデル内部直前）
           - radius 1000% でデフォルトの 10 倍まで離れる
           - theta / phi は auto のままなので回転は標準どおり */
        min-camera-orbit="auto auto 0%"
        max-camera-orbit="auto auto 1000%"
        /* Rev40: パン (左右上下移動) は <model-viewer> v4.x の camera-controls に
           デフォルトで含まれている（disable-pan を指定しない限り有効）。
           - Desktop : 右クリック + ドラッグ
           - Touch   : 2 本指ドラッグ */
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
