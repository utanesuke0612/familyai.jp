/**
 * components/tools/3d-tutor/ModelDetailClient.tsx
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1 / Rev40)
 *
 * 個別モデル詳細ページの Client Component。
 * ModelViewer + HotspotPanel + メタ情報を統合し、Server Component から model を受け取る。
 *
 * 太陽系 (slug='solar-system') は WebGL/HTML 実装 (public/3d/solar/) を iframe で
 * 埋め込み、postMessage 経由で以下を双方向に同期する:
 *   ・iframe → 親: 天体選択 ('solar:select') → HotspotPanel が AI チャット起動
 *   ・親 → iframe: 背景色変更 ('solar:setBg')   → gl.clearColor を更新
 * フルスクリーン化は親側のラッパー div で Fullscreen API を直接呼ぶ。
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ModelViewer } from './ModelViewer';
import { HotspotPanel } from './HotspotPanel';
import type { Tutor3dModel, Tutor3dHotspot } from '@/shared';

export interface ModelDetailClientProps {
  model: Tutor3dModel;
}

/** iframe (太陽系) から飛んでくる postMessage の payload */
type SolarSelectMessage = {
  type: 'solar:select';
  body: {
    key:     string;
    name:    string;
    english: string;
    copy:    string;
  };
};

/** 天体データを HotspotPanel の Tutor3dHotspot 形式に変換 */
function solarBodyToHotspot(body: SolarSelectMessage['body']): Tutor3dHotspot {
  return {
    id:                 `solar:${body.key}`,
    partName:           body.name,
    position:           [0, 0, 0],
    defaultExplanation: body.copy,
    promptHint:         `${body.name}（${body.english}）について`,
  };
}

/** 太陽系専用の背景色プリセット（宇宙トーンを基本に、明るい色も提供） */
const SOLAR_BG_PRESETS = [
  { id: 'cosmic', label: '宇宙 (デフォルト)', color: '#050914' },
  { id: 'black',  label: '黒',                color: '#000000' },
  { id: 'dark',   label: '墨',                color: '#2b2b2b' },
  { id: 'gray',   label: '灰',                color: '#5a5a5a' },
  { id: 'washi',  label: '砂',                color: '#EFE5D4' },
  { id: 'white',  label: '白',                color: '#FFFFFF' },
] as const;

// ── 太陽系専用のサブコンポーネント ─────────────────────────────
function SolarViewer({
  model,
  setActiveHotspot,
}: {
  model:            Tutor3dModel;
  setActiveHotspot: (h: Tutor3dHotspot | null) => void;
}) {
  const wrapperRef  = useRef<HTMLDivElement   | null>(null);
  const iframeRef   = useRef<HTMLIFrameElement | null>(null);
  const [bgIndex,      setBgIndex]      = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cssFullscreen, setCssFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const currentBg = SOLAR_BG_PRESETS[bgIndex]!;
  const isAnyFullscreen = isFullscreen || cssFullscreen;

  // iframe → 親: 天体選択を受信
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as Partial<SolarSelectMessage> | null;
      if (!data || data.type !== 'solar:select' || !data.body) return;
      setActiveHotspot(solarBodyToHotspot(data.body));
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setActiveHotspot]);

  // Fullscreen API 状態同期 (ESC や OS UI での退出にも追従)
  useEffect(() => {
    type ExtDoc = Document & { webkitFullscreenElement?: Element };
    const docExt = document as ExtDoc;
    const onChange = () => {
      const active = !!(docExt.fullscreenElement || docExt.webkitFullscreenElement);
      setIsFullscreen(active);
      if (active) setCssFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // CSS 擬似フルスクリーン中の ESC 退出
  useEffect(() => {
    if (!cssFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCssFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [cssFullscreen]);

  // 親 → iframe: 背景色を送信
  const sendBg = useCallback((color: string) => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    try {
      w.postMessage({ type: 'solar:setBg', color }, window.location.origin);
    } catch { /* ignore */ }
  }, []);

  // bgIndex / iframeLoaded の変化に応じて送信
  useEffect(() => {
    if (!iframeLoaded) return;
    sendBg(currentBg.color);
  }, [iframeLoaded, currentBg.color, sendBg]);

  const onIframeLoad = useCallback(() => {
    setIframeLoaded(true);
  }, []);

  const cycleBg = useCallback(() => {
    setBgIndex((i) => (i + 1) % SOLAR_BG_PRESETS.length);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = wrapperRef.current;
    if (!el) return;
    type ExtEl  = HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> };
    type ExtDoc = Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?:    () => Promise<void>;
    };
    const elExt  = el       as ExtEl;
    const docExt = document as ExtDoc;
    const inRealFs = !!(docExt.fullscreenElement || docExt.webkitFullscreenElement);
    if (inRealFs) {
      try {
        if (docExt.exitFullscreen)            await docExt.exitFullscreen();
        else if (docExt.webkitExitFullscreen) await docExt.webkitExitFullscreen();
      } catch { /* ignore */ }
      return;
    }
    if (cssFullscreen) { setCssFullscreen(false); return; }
    try {
      if (elExt.requestFullscreen)             { await elExt.requestFullscreen(); return; }
      if (elExt.webkitRequestFullscreen)       { await elExt.webkitRequestFullscreen(); return; }
    } catch { /* fallback */ }
    setCssFullscreen(true);
  }, [cssFullscreen]);

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
      }
    : {
        position:   'relative',
        width:      '100%',
        height:     'min(72vh, 760px)',
        minHeight:  520,
        borderRadius: 16,
        overflow:   'hidden',
        background: currentBg.color,
      };

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      <iframe
        ref={iframeRef}
        title={model.title}
        src="/3d/solar/index.html"
        onLoad={onIframeLoad}
        style={{
          width:  '100%',
          height: '100%',
          border: 'none',
          background: 'transparent',
          display: 'block',
        }}
      />

      {/* 右上コントロール群 */}
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
        {/* 背景色切替 */}
        <button
          type="button"
          onClick={cycleBg}
          aria-label={`背景色を変更（現在: ${currentBg.label}）`}
          title={`背景色: ${currentBg.label}（クリックで切替）`}
          style={{
            width: 40, height: 40,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            // Rev40: iframe を跨いだ backdrop-filter は Chrome / Safari で
            // グレーで塗りつぶされる不具合 (合成バグ) があるため、
            // 不透明な washi-light に固定して回避する。
            background: 'var(--washi-light, #f7f3e9)',
            color: 'var(--sumi)',
            border: '1px solid var(--line)',
            borderRadius: 4,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: currentBg.color,
              border: '1px solid var(--line)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.6) inset',
              display: 'block',
            }}
          />
        </button>

        {/* フルスクリーン */}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isAnyFullscreen ? 'フルスクリーンを終了' : 'フルスクリーンで表示'}
          title={isAnyFullscreen ? 'フルスクリーンを終了 (Esc)' : 'フルスクリーンで表示'}
          style={{
            width: 40, height: 40,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            // Rev40: iframe を跨いだ backdrop-filter は Chrome / Safari で
            // グレーで塗りつぶされる不具合 (合成バグ) があるため、
            // 不透明な washi-light に固定して回避する。
            background: 'var(--washi-light, #f7f3e9)',
            color: 'var(--sumi)',
            border: '1px solid var(--line)',
            borderRadius: 4,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
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
    </div>
  );
}

export function ModelDetailClient({ model }: ModelDetailClientProps) {
  const [activeHotspot, setActiveHotspot] = useState<Tutor3dHotspot | null>(null);

  // ── 太陽系: iframe + AI チャット連動 ──────────────────────
  if (model.slug === 'solar-system') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="min-w-0">
          <SolarViewer
            model={model}
            setActiveHotspot={setActiveHotspot}
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
