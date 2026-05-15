'use client';

/**
 * components/admin/3d-models/HotspotEditor.tsx
 * familyai.jp / 管理画面 — Hotspot 編集 UI（段階 D-1）
 *
 * GLB がアップロード済みなら 3D プレビューを表示し、クリックで hotspot を採取。
 *
 * 動作:
 * - 3D 上をクリック → materialFromPoint でマテリアル名取得 + positionAndNormalFromPoint で 3D 座標取得
 *   → 新しい hotspot として配列末尾に追加（meshName は サフィックス `_Material` を除去）
 * - リスト側で partName / defaultExplanation / promptHint を編集可
 * - id / position / meshName / normal は採取時に自動入力（手動編集不可）
 * - 削除ボタンで配列から除外
 * - 既存 hotspot は <model-viewer> のドットとして 3D 上に表示
 *
 * 既存 ModelViewer.tsx のクリック検出ロジックを admin 専用に拡張:
 * - 既存：マテリアル名一致 hotspot を発火 / 位置近似 fallback
 * - admin：マテリアル名 + 座標を **必ず採取して新規追加**（既存一致でも追加）
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tutor3dHotspot } from '@/shared';

let _viewerLoaded = false;
async function ensureModelViewerLoaded(): Promise<void> {
  if (_viewerLoaded) return;
  if (typeof window === 'undefined') return;
  await import('@google/model-viewer');
  _viewerLoaded = true;
}

interface Hit {
  position: { x: number; y: number; z: number };
  normal:   { x: number; y: number; z: number };
}

export interface HotspotEditorProps {
  /** プレビュー対象の GLB URL（未指定なら採取不可・ガイダンスのみ表示） */
  glbUrl?: string;
  /** 現在の hotspot 配列 */
  hotspots: Tutor3dHotspot[];
  /** 配列変更時に親 (ModelForm) へ通知 */
  onChange: (next: Tutor3dHotspot[]) => void;
}

export function HotspotEditor({ glbUrl, hotspots, onChange }: HotspotEditorProps) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    ensureModelViewerLoaded().then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  // 3D 上クリック → hotspot 新規追加
  const handleViewerClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = viewerRef.current as (HTMLElement & {
      positionAndNormalFromPoint?: (x: number, y: number) => Hit | null;
      materialFromPoint?: (x: number, y: number) => { name?: string } | null;
    }) | null;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = el.positionAndNormalFromPoint?.(x, y);
    if (!hit) return;  // 空間クリック → 無反応

    // マテリアル名（あれば）
    const matName = el.materialFromPoint?.(x, y)?.name ?? '';
    const meshName = matName.replace(/_Material$/i, '');

    // 既存と同じ id がぶつからないようインクリメント
    const baseId = meshName ? meshName.toLowerCase().replace(/[^a-z0-9-]/g, '-') : 'spot';
    let id = baseId;
    let suffix = 1;
    while (hotspots.some((h) => h.id === id)) {
      id = `${baseId}-${++suffix}`;
    }

    const newHotspot: Tutor3dHotspot = {
      id,
      partName:           meshName || `スポット ${hotspots.length + 1}`,
      meshName:           meshName || undefined,
      position:           [
        Number(hit.position.x.toFixed(4)),
        Number(hit.position.y.toFixed(4)),
        Number(hit.position.z.toFixed(4)),
      ],
      normal: hit.normal ? [
        Number(hit.normal.x.toFixed(3)),
        Number(hit.normal.y.toFixed(3)),
        Number(hit.normal.z.toFixed(3)),
      ] : undefined,
      defaultExplanation: '',
      promptHint:         '',
    };

    onChange([...hotspots, newHotspot]);
    setActiveId(id);
  }, [hotspots, onChange]);

  // 個別フィールド更新
  function updateHotspot(id: string, patch: Partial<Tutor3dHotspot>) {
    onChange(hotspots.map((h) => h.id === id ? { ...h, ...patch } : h));
  }

  function removeHotspot(id: string) {
    onChange(hotspots.filter((h) => h.id !== id));
    if (activeId === id) setActiveId(null);
  }

  // GLB が無い → ガイダンスのみ
  if (!glbUrl) {
    return (
      <div style={emptyBoxStyle}>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
          まず <strong>GLB ファイルをアップロード</strong>してください。<br />
          アップロード後、ここで 3D 上をクリックして hotspot を追加できます。
        </p>
        {hotspots.length > 0 && (
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '8px 0 0' }}>
            （現在 {hotspots.length} 件保持中・GLB 配置後に表示）
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      {/* 3D ビューア（クリック採取エリア） */}
      <div style={viewerWrapStyle}>
        {!ready ? (
          <div style={loadingStyle}>3D ビューア読み込み中…</div>
        ) : (
          <model-viewer
            ref={(el: HTMLElement | null) => { viewerRef.current = el; }}
            src={glbUrl}
            alt="hotspot エディタ"
            camera-controls
            auto-rotate-delay="3000"
            interaction-prompt="none"
            shadow-intensity="0.5"
            environment-image="neutral"
            exposure="1.0"
            loading="eager"
            onClick={handleViewerClick}
            style={{ width: '100%', height: '100%', background: 'transparent', cursor: 'crosshair' }}
          >
            {hotspots.map((h, i) => (
              <div
                key={h.id}
                slot={`hotspot-${h.id}`}
                data-position={h.position.join(' ')}
                data-normal={h.normal?.join(' ')}
                data-visibility-attribute="visible"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveId(h.id);
                }}
                style={{
                  ...dotStyle(h.id === activeId),
                  cursor: 'pointer',
                }}
                title={`${i + 1}. ${h.partName}`}
              >
                <span style={dotLabelStyle}>{i + 1}</span>
              </div>
            ))}
          </model-viewer>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
        3D モデルの<strong>気になる場所をクリック</strong>すると、その位置に hotspot が追加されます。
        マテリアル名が取れた場合は <strong>meshName</strong> に自動セットされ、公開ページでの命中精度が上がります。
      </p>

      {/* hotspot リスト */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {hotspots.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '20px 0', margin: 0 }}>
            まだ hotspot がありません。上の 3D をクリックして追加してください。
          </p>
        ) : hotspots.map((h, i) => (
          <HotspotListItem
            key={h.id}
            index={i + 1}
            hotspot={h}
            active={h.id === activeId}
            onSelect={() => setActiveId(h.id)}
            onChange={(patch) => updateHotspot(h.id, patch)}
            onRemove={() => removeHotspot(h.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── 個別 hotspot 行 ─────────────────────────────────────────
interface HotspotListItemProps {
  index:    number;
  hotspot:  Tutor3dHotspot;
  active:   boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Tutor3dHotspot>) => void;
  onRemove: () => void;
}

function HotspotListItem({ index, hotspot, active, onSelect, onChange, onRemove }: HotspotListItemProps) {
  return (
    <div
      style={{
        ...rowStyle,
        borderColor: active ? '#3B82F6' : '#E5E7EB',
        boxShadow:   active ? '0 0 0 2px #DBEAFE' : 'none',
      }}
      onClick={onSelect}
    >
      <div style={rowHeaderStyle}>
        <span style={rowIndexStyle}>{index}</span>
        <input
          type="text"
          value={hotspot.partName}
          onChange={(e) => { e.stopPropagation(); onChange({ partName: e.target.value }); }}
          onClick={(e) => e.stopPropagation()}
          placeholder="パーツ名（例：太陽 / 心臓）"
          style={partNameInputStyle}
          maxLength={80}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={removeBtnStyle}
          aria-label={`${hotspot.partName} を削除`}
          title="削除"
        >
          削除
        </button>
      </div>

      <div style={metaRowStyle}>
        <code style={metaCodeStyle}>
          pos: [{hotspot.position.map((n) => n.toFixed(2)).join(', ')}]
        </code>
        {hotspot.meshName && (
          <code style={{ ...metaCodeStyle, background: '#ECFDF5', color: '#065F46' }}>
            mesh: {hotspot.meshName}
          </code>
        )}
      </div>

      <textarea
        value={hotspot.defaultExplanation}
        onChange={(e) => { e.stopPropagation(); onChange({ defaultExplanation: e.target.value }); }}
        onClick={(e) => e.stopPropagation()}
        placeholder="既定説明（子ども向けに 1〜2 文・タップ時に即表示）"
        rows={2}
        maxLength={400}
        style={textareaStyle}
      />

      <textarea
        value={hotspot.promptHint}
        onChange={(e) => { e.stopPropagation(); onChange({ promptHint: e.target.value }); }}
        onClick={(e) => e.stopPropagation()}
        placeholder="AI ヒント（深掘り質問時に AI へ渡す背景情報・詳しい知識を書く）"
        rows={2}
        maxLength={800}
        style={textareaStyle}
      />
    </div>
  );
}

// ── スタイル ──────────────────────────────────────────────
const emptyBoxStyle: React.CSSProperties = {
  padding: 16, background: '#F9FAFB', border: '1px dashed #D1D5DB',
  borderRadius: 8, textAlign: 'center' as const,
};
const viewerWrapStyle: React.CSSProperties = {
  position: 'relative', width: '100%', height: 'min(50vh, 480px)',
  minHeight: 320, borderRadius: 4, overflow: 'hidden',
  background: 'var(--washi-deep)',
  border: '1px solid var(--line)',
};
const loadingStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', height: '100%', color: 'var(--sumi-light)', fontSize: 14,
};
const rowStyle: React.CSSProperties = {
  padding: 12, background: '#fff', border: '1px solid #E5E7EB',
  borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8,
  cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
};
const rowHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
};
const rowIndexStyle: React.CSSProperties = {
  width: 24, height: 24, borderRadius: '50%',
  background: 'var(--shu)', color: '#fff', fontSize: 12, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
const partNameInputStyle: React.CSSProperties = {
  flex: 1, padding: '6px 10px',
  border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14,
};
const removeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 16, padding: '4px 8px', color: '#DC2626',
};
const metaRowStyle: React.CSSProperties = {
  display: 'flex', gap: 6, flexWrap: 'wrap',
};
const metaCodeStyle: React.CSSProperties = {
  fontSize: 11, padding: '2px 8px',
  background: '#F3F4F6', color: '#6B7280',
  borderRadius: 4, fontFamily: 'ui-monospace, monospace',
};
const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  border: '1px solid #D1D5DB', borderRadius: 6,
  fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
};
function dotStyle(active: boolean): React.CSSProperties {
  return {
    width: 28, height: 28, borderRadius: '50%',
    background: active ? '#3B82F6' : 'var(--shu)',
    boxShadow: active
      ? '0 0 0 4px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.3)'
      : '0 2px 8px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: 12,
    pointerEvents: 'auto', zIndex: 10, touchAction: 'manipulation',
  };
}
const dotLabelStyle: React.CSSProperties = {
  pointerEvents: 'none',
};
