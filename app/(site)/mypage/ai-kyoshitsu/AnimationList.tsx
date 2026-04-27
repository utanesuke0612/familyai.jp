/**
 * app/(site)/mypage/ai-kyoshitsu/AnimationList.tsx
 * AI教室履歴 — インタラクティブ部分（Client Component）
 * プレビューモーダル・削除確認ダイアログを担当
 */

'use client';

import { useRef, useState, useEffect } from 'react';
import type { AnimationSummary } from '@/shared/types';

/**
 * 旧 `AnimationItem` ローカル型は `shared/types` の `AnimationSummary` に統合済み。
 * 既存の import 互換のため type alias として再エクスポートする。
 */
export type AnimationItem = AnimationSummary;

// ── 定数 ─────────────────────────────────────────────────────────
const SUBJECT_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  science: { bg: '#e8f5e9', border: '#52b788', text: '#2d6a4f' },
  math:    { bg: '#e3f2fd', border: '#4e9af1', text: '#1565c0' },
  social:  { bg: '#fff3e0', border: '#ff8c42', text: '#e65100' },
};
const SUBJECT_LABEL: Record<string, string> = {
  science: '理科', math: '算数・数学', social: '社会',
};
const GRADE_LABEL: Record<string, string> = {
  'elem-low': '小3・4年生', 'elem-high': '小5・6年生', 'middle': '中学生',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/** HTMLをBlobダウンロードする共通ユーティリティ */
async function downloadAnimationHtml(id: string, filename: string) {
  const res  = await fetch(`/api/animations/${id}`);
  const html = await res.text();
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename.replace(/[\\/:*?"<>|]/g, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── プレビューモーダル ────────────────────────────────────────────
function PreviewModal({ item, onClose }: { item: AnimationItem; onClose: () => void }) {
  const [iframeHeight, setIframeHeight] = useState(560);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [copied,       setCopied]       = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const col = SUBJECT_COLOR[item.subject] ?? SUBJECT_COLOR.science;

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      // 自分の iframe からのメッセージのみ受け付ける（他フレームからの偽装を防ぐ）
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      if (e.data && typeof e.data.iframeHeight === 'number')
        setIframeHeight(Math.max(400, e.data.iframeHeight));
    };
    const onFs  = () => setIsFullscreen(!!document.fullscreenElement);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.fullscreenElement) onClose(); };
    window.addEventListener('message', onMsg);
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('message', onMsg);
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  function handleFullscreen() {
    const t = wrapRef.current ?? iframeRef.current;
    if (!t) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      t.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try { await downloadAnimationHtml(item.id, item.theme); }
    finally { setIsSaving(false); }
  }

  function shareToX() {
    const shareUrl = `${window.location.origin}/share/${item.id}`;
    const text = `「${item.theme}」をfamilyai.jp AI教室で学んでみた！🎬`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}&hashtags=familyai,AI教室`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  }

  function shareToLine() {
    const shareUrl = `${window.location.origin}/share/${item.id}`;
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(`「${item.theme}」のアニメーション解説 ${shareUrl}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function copyShareLink() {
    const shareUrl = `${window.location.origin}/share/${item.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.55)', padding: '24px 16px 40px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full rounded-[24px] overflow-hidden"
        style={{ maxWidth: 860, background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ background: `linear-gradient(135deg, ${col.border}22, ${col.bg})`, borderBottom: `1px solid ${col.border}33` }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">🎬</span>
            <div className="min-w-0">
              <p className="font-bold leading-tight truncate" style={{ color: 'var(--color-brown)', fontSize: 16 }}>
                {item.theme}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
                  {SUBJECT_LABEL[item.subject] ?? item.subject}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
                  {GRADE_LABEL[item.grade] ?? item.grade}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {/* シェアボタン群 */}
            <button onClick={shareToX}
              className="rounded-full px-4 text-xs font-semibold"
              style={{ minHeight: 36, background: '#000', color: '#fff' }}
              title="Xでシェア">
              𝕏 シェア
            </button>
            <button onClick={shareToLine}
              className="rounded-full px-4 text-xs font-semibold"
              style={{ minHeight: 36, background: '#06c755', color: '#fff' }}
              title="LINEでシェア">
              💬 LINE
            </button>
            <button onClick={copyShareLink}
              className="rounded-full px-4 text-xs font-semibold transition-all"
              style={{
                minHeight: 36,
                background: copied ? '#22c55e' : 'rgba(255,255,255,0.8)',
                color:      copied ? '#fff'    : 'var(--color-brown)',
                border:     copied ? 'none'    : '1px solid var(--color-beige-dark)',
              }}
              title="リンクコピー">
              {copied ? '✓ コピー済' : '🔗 コピー'}
            </button>

            {/* 区切り線（シェア vs 操作系の区別） */}
            <span
              aria-hidden="true"
              className="mx-1 w-px"
              style={{ height: 28, background: 'rgba(0,0,0,0.18)' }}
            />

            {/* 操作ボタン群 */}
            <button onClick={handleSave} disabled={isSaving}
              className="rounded-full px-4 text-xs font-semibold disabled:opacity-50"
              style={{ minHeight: 36, background: col.border, color: '#fff' }}>
              {isSaving ? '⏳ 保存中…' : '💾 保存'}
            </button>
            <button onClick={handleFullscreen}
              className="rounded-full px-4 text-xs font-semibold"
              style={{ minHeight: 36, background: 'rgba(255,255,255,0.8)', color: 'var(--color-brown)', border: '1px solid var(--color-beige-dark)' }}>
              {isFullscreen ? '⊠ 戻る' : '⛶ 全画面'}
            </button>
            <button onClick={onClose}
              className="rounded-full px-4 text-xs font-semibold"
              style={{ minHeight: 36, background: 'rgba(255,255,255,0.8)', color: 'var(--color-brown)', border: '1px solid var(--color-beige-dark)' }}>
              ✕ 閉じる
            </button>
          </div>
        </div>

        {/* iframe */}
        <div
          ref={wrapRef}
          style={{
            background: '#fdf6ee',
            position: 'relative',
            ...(isFullscreen ? { height: '100vh', overflow: 'hidden' } : {}),
          }}
        >
          {/* 全画面時の閉じるボタン（スマホ用 — ESC キーが無いため必須） */}
          {isFullscreen && <FullscreenCloseButton onClick={handleFullscreen} />}
          <iframe
            ref={iframeRef}
            src={`/api/animations/${item.id}`}
            width="100%"
            height={isFullscreen ? undefined : iframeHeight}
            style={{
              display: 'block',
              border:  'none',
              ...(isFullscreen ? { height: '100vh', width: '100%' } : {}),
            }}
            title={item.theme}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

// ── 全画面表示時の閉じるボタン ─────────────────────────────────
/**
 * 全画面表示時の閉じるボタン（フローティング）
 * - スマホには ESC キーが無いため、必ず押せる UI が必要
 * - position: fixed で iframe の上に固定表示
 * - タップ領域 48x48（モバイル UX ガイドライン準拠）
 */
function FullscreenCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="全画面表示を閉じる"
      className="rounded-full transition-opacity hover:opacity-80 active:opacity-60"
      style={{
        position:  'fixed',
        top:       'max(16px, env(safe-area-inset-top, 16px))',
        right:     'max(16px, env(safe-area-inset-right, 16px))',
        zIndex:    2147483647,
        width:     48,
        height:    48,
        background:'rgba(0,0,0,0.65)',
        color:     '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        border:    'none',
        fontSize:  20,
        fontWeight:700,
        lineHeight:'48px',
        textAlign: 'center',
        cursor:    'pointer',
      }}
    >
      ✕
    </button>
  );
}

// ── 削除確認ダイアログ ────────────────────────────────────────────
function DeleteDialog({ theme, onCancel, onConfirm, isDeleting }: {
  theme: string; onCancel: () => void; onConfirm: () => void; isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', padding: 16 }}>
      <div className="w-full max-w-sm rounded-[20px] p-6" style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <p className="font-bold text-lg" style={{ color: 'var(--color-brown)' }}>削除しますか？</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-brown-light)' }}>
          「{theme}」を削除します。この操作は取り消せません。
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} disabled={isDeleting} className="flex-1 rounded-full text-sm font-semibold"
            style={{ minHeight: 44, background: 'var(--color-cream)', color: 'var(--color-brown)', border: '1px solid var(--color-beige-dark)' }}>
            キャンセル
          </button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 rounded-full text-sm font-semibold"
            style={{ minHeight: 44, background: isDeleting ? '#ccc' : '#e53935', color: 'white' }}>
            {isDeleting ? '削除中…' : '削除する'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── カード ────────────────────────────────────────────────────────
function AnimationCard({ item, onPreview, onDeleteRequest }: {
  item: AnimationItem;
  onPreview:       (item: AnimationItem) => void;
  onDeleteRequest: (item: AnimationItem) => void;
}) {
  const col = SUBJECT_COLOR[item.subject] ?? SUBJECT_COLOR.science;
  return (
    <article className="rounded-[20px] overflow-hidden flex flex-col"
      style={{ background: 'rgba(255,255,255,0.95)', boxShadow: 'var(--shadow-warm-sm)', border: `1px solid ${col.border}33` }}>
      <div style={{ height: 4, background: `linear-gradient(to right, ${col.border}, ${col.border}88)` }} />
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
            {SUBJECT_LABEL[item.subject] ?? item.subject}
          </span>
          <span className="rounded-full px-2.5 py-0.5 text-xs"
            style={{ background: 'var(--color-cream)', color: 'var(--color-brown-light)', border: '1px solid var(--color-beige-dark)' }}>
            {GRADE_LABEL[item.grade] ?? item.grade}
          </span>
        </div>
        <p className="font-bold leading-snug line-clamp-2" style={{ color: 'var(--color-brown)', fontSize: 15 }}>
          {item.theme}
        </p>
        <p className="text-xs mt-auto" style={{ color: 'var(--color-brown-light)' }}>
          {formatDate(item.createdAt)}
        </p>
        <div className="flex gap-2 mt-1">
          <button onClick={() => onPreview(item)} className="flex-1 rounded-full text-sm font-semibold"
            style={{ minHeight: 40, background: col.border, color: 'white' }}>
            ▶ プレビュー
          </button>
          <button onClick={() => onDeleteRequest(item)}
            className="rounded-full px-3 text-sm"
            style={{ minHeight: 40, background: 'var(--color-cream)', color: '#e53935', border: '1px solid #ffcdd2' }}
            aria-label="削除">
            🗑
          </button>
        </div>
      </div>
    </article>
  );
}

// ── メインのClient Component ──────────────────────────────────────
export default function AnimationList({ initialItems }: { initialItems: AnimationItem[] }) {
  const [items,        setItems]        = useState<AnimationItem[]>(initialItems);
  const [previewItem,  setPreviewItem]  = useState<AnimationItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnimationItem | null>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res  = await fetch('/api/user/animations', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        alert(json.error ?? '削除に失敗しました。');
      }
    } catch {
      alert('削除に失敗しました。');
    } finally {
      setIsDeleting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[20px] p-10 flex flex-col items-center gap-4 text-center"
        style={{ background: 'rgba(255,255,255,0.8)', boxShadow: 'var(--shadow-warm-sm)' }}>
        <span className="text-5xl">🎬</span>
        <p className="font-bold text-lg" style={{ color: 'var(--color-brown)' }}>まだアニメーションがありません</p>
        <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
          AI教室でテーマを選んで、最初のアニメーションを作ってみましょう！
        </p>
        <a href="/tools/ai-kyoshitsu"
          className="inline-flex items-center rounded-full px-6 text-sm font-semibold"
          style={{ minHeight: 44, background: '#ff8c42', color: 'white' }}>
          ✨ AI教室へ →
        </a>
      </div>
    );
  }

  return (
    <>
      <p className="mb-5 text-sm" style={{ color: 'var(--color-brown-light)' }}>
        {items.length}件の生成履歴
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(item => (
          <AnimationCard key={item.id} item={item}
            onPreview={setPreviewItem}
            onDeleteRequest={setDeleteTarget} />
        ))}
      </div>

      {previewItem && (
        <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
      {deleteTarget && (
        <DeleteDialog
          theme={deleteTarget.theme}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
