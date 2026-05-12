'use client';

/**
 * components/admin/3d-models/BlobUploadInput.tsx
 * familyai.jp / 管理画面 — Vercel Blob 直接アップロード入力
 *
 * - ドラッグ&ドロップ または クリックでファイル選択
 * - クライアント直接アップロード（@vercel/blob/client の `upload()`）
 * - 進捗バー表示
 * - パス命名規則: 3d-models/{slug}-{hash8}.{ext}
 *   - 同一ファイル内容なら同じ hash → cache 効率◎
 *   - 内容変更時は別 hash → cache-busting（Codex Q1-8 対応）
 *
 * 使い方:
 *   <BlobUploadInput
 *     slug="solar-system"
 *     kind="glb"
 *     value={url}
 *     onChange={(url) => ...}
 *   />
 */

import { useCallback, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

type UploadKind = 'glb' | 'usdz' | 'thumbnail';

interface KindConfig {
  label:    string;
  emoji:    string;
  accept:   string;
  ext:      string;
  maxBytes: number;
  /**
   * upload() の contentType に強制セットする MIME。
   * .glb / .usdz はブラウザによっては file.type が空文字や
   * application/octet-stream になり、Vercel Blob の
   * allowedContentTypes と不一致で 400 を返すため、正準 MIME を渡す。
   */
  forceContentType?: string;
}

const KIND_CONFIG: Record<UploadKind, KindConfig> = {
  glb: {
    label:    'GLB（3D モデル本体）',
    emoji:    '📦',
    accept:   '.glb,model/gltf-binary',
    ext:      'glb',
    maxBytes: 30 * 1024 * 1024,
    forceContentType: 'model/gltf-binary',
  },
  usdz: {
    label:    'USDZ（iOS AR・任意）',
    emoji:    '🍎',
    accept:   '.usdz,model/vnd.usdz+zip',
    ext:      'usdz',
    maxBytes: 30 * 1024 * 1024,
    forceContentType: 'model/vnd.usdz+zip',
  },
  thumbnail: {
    label:    'サムネ画像（任意）',
    emoji:    '🖼️',
    accept:   '.webp,.png,.jpg,.jpeg,image/webp,image/png,image/jpeg',
    ext:      'auto',
    maxBytes:  2 * 1024 * 1024,
    // 画像系は file.type が信頼できるのでそれを使う
  },
};

/** SHA-256 の先頭 8 文字（cache-busting・短くて衝突確率も実用上問題ない） */
async function shortHash(file: File): Promise<string> {
  const buf  = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .slice(0, 4)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** ファイル拡張子（thumbnail 用・元ファイルから取得） */
function extOf(file: File): string {
  const name = file.name.toLowerCase();
  const idx  = name.lastIndexOf('.');
  return idx < 0 ? 'bin' : name.slice(idx + 1);
}

export interface BlobUploadInputProps {
  /** 保存先のキーになる slug（モデル ID）。必須・無いとアップロードできない */
  slug:     string;
  /** ファイル種別 */
  kind:     UploadKind;
  /** 現在の URL（既にアップロード済みなら）。差し替え時に上書きされる */
  value:    string | null;
  /** 新しい URL（または null = 解除）に変更されたとき */
  onChange: (url: string | null) => void;
  /** 任意 ラベル上書き */
  labelOverride?: string;
  /** disabled */
  disabled?: boolean;
}

export function BlobUploadInput({
  slug,
  kind,
  value,
  onChange,
  labelOverride,
  disabled,
}: BlobUploadInputProps) {
  const cfg = KIND_CONFIG[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!slug) {
      setError('先に slug を入力してください');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError('slug が不正です（英小文字・数字・ハイフンのみ）');
      return;
    }
    if (file.size > cfg.maxBytes) {
      setError(`ファイルサイズが大きすぎます（最大 ${Math.round(cfg.maxBytes / 1024 / 1024)}MB）`);
      return;
    }

    setProgress(0);
    try {
      const hash      = await shortHash(file);
      const ext       = cfg.ext === 'auto' ? extOf(file) : cfg.ext;
      const pathname  = `3d-models/${slug}-${hash}.${ext}`;
      // .glb / .usdz は file.type を信用せず強制値・thumbnail は file.type を優先
      const contentType = cfg.forceContentType ?? (file.type || 'application/octet-stream');

      // デバッグ用ログ（問題切り分け中・本番では削除）
      console.log('[BlobUpload] start', { pathname, size: file.size, fileType: file.type, contentType });

      const blob = await upload(pathname, file, {
        access: 'private',
        handleUploadUrl: '/api/admin/3d-models/upload-token',
        contentType,
        // multipart=false で 単一 PUT 強制（30MB までなら十分）。
        // multipart upload は onUploadCompleted (callbackUrl) を要求するが、
        // localhost 開発では Vercel Blob からの callback が届かないため
        // multipart=true だと PUT が 400 で失敗する。
        multipart: false,
        onUploadProgress: (e) => {
          const pct = Math.round(e.percentage);
          setProgress(pct);
          if (pct % 20 === 0 || pct === 100) {
            console.log('[BlobUpload] progress', pct, '%');
          }
        },
      });

      const assetUrl = `/api/3d-models/assets/${blob.pathname}`;
      console.log('[BlobUpload] success', { blobUrl: blob.url, assetUrl });
      onChange(assetUrl);
      setProgress(100);
      setTimeout(() => setProgress(null), 800);
    } catch (err) {
      // 詳細なエラー情報を Console とユーザー UI 両方に出す
      console.error('[BlobUpload] failed:', err);
      const msg = err instanceof Error
        ? `${err.name}: ${err.message}`
        : `アップロードに失敗しました: ${JSON.stringify(err)}`;
      setError(msg);
      setProgress(null);
    }
  }, [slug, cfg, onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {cfg.emoji} {labelOverride ?? cfg.label}
        <span style={{ marginLeft: 6, fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>
          （最大 {Math.round(cfg.maxBytes / 1024 / 1024)}MB）
        </span>
      </label>

      {/* 現在の URL */}
      {value && progress === null && (
        <div style={currentUrlStyle}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            ✅ {value
              .replace(/^.*\/3d-models\//, '3d-models/')
              .replace(/^.*\/tutor3d\//, 'tutor3d/')
              .replace(/^\/api\/3d-models\/assets\//, '')}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            style={clearBtnStyle}
            aria-label="このファイルを解除"
          >
            ✕
          </button>
        </div>
      )}

      {/* ドロップゾーン */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        style={dropzoneStyle(dragOver, !!disabled)}
      >
        {progress !== null ? (
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>
              アップロード中… {progress}%
            </div>
            <div style={progressBarOuterStyle}>
              <div style={{ ...progressBarInnerStyle, width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: '#6B7280' }}>
            ファイルをドラッグ &amp; ドロップ or クリックして選択
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={cfg.accept}
          disabled={disabled || progress !== null}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';  // 同じファイルの再選択を許可
          }}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <p role="alert" style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

// ── スタイル ──────────────────────────────────────────────
const currentUrlStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 12px',
  background: '#ECFDF5', border: '1px solid #6EE7B7',
  borderRadius: 8, fontSize: 12, fontFamily: 'monospace', color: '#065F46',
  marginBottom: 8,
};
const clearBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: '#065F46', fontSize: 14, padding: '0 4px',
};
const dropzoneStyle = (dragOver: boolean, disabled: boolean): React.CSSProperties => ({
  border: `2px dashed ${dragOver ? '#3B82F6' : '#D1D5DB'}`,
  borderRadius: 8,
  padding: '20px 16px',
  textAlign: 'center',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: dragOver ? '#EFF6FF' : '#F9FAFB',
  opacity: disabled ? 0.5 : 1,
  transition: 'background 0.15s, border-color 0.15s',
});
const progressBarOuterStyle: React.CSSProperties = {
  width: '100%', height: 6, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden',
};
const progressBarInnerStyle: React.CSSProperties = {
  height: '100%', background: '#3B82F6', transition: 'width 0.2s',
};
