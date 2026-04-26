/**
 * app/(site)/mypage/ai-kyoshitsu/page.tsx
 * AI教室履歴ページ — 生成したアニメーションの一覧・プレビュー・削除
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ── 型定義 ───────────────────────────────────────────────────────
interface AnimationItem {
  id:        string;
  theme:     string;
  grade:     'elem-low' | 'elem-high' | 'middle';
  subject:   'science' | 'math' | 'social';
  prompt:    string;
  createdAt: string;
}

// ── 定数 ─────────────────────────────────────────────────────────
const SUBJECT_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  science: { bg: '#e8f5e9', border: '#52b788', text: '#2d6a4f' },
  math:    { bg: '#e3f2fd', border: '#4e9af1', text: '#1565c0' },
  social:  { bg: '#fff3e0', border: '#ff8c42', text: '#e65100' },
};
const SUBJECT_LABEL: Record<string, string> = {
  science: '理科',
  math:    '算数・数学',
  social:  '社会',
};
const GRADE_LABEL: Record<string, string> = {
  'elem-low':  '小3・4年生',
  'elem-high': '小5・6年生',
  'middle':    '中学生',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// ── プレビューモーダル ────────────────────────────────────────────
function PreviewModal({
  item,
  onClose,
}: {
  item: AnimationItem;
  onClose: () => void;
}) {
  const [iframeHeight, setIframeHeight] = useState(560);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const col = SUBJECT_COLOR[item.subject] ?? SUBJECT_COLOR.science;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && typeof e.data.iframeHeight === 'number') {
        setIframeHeight(Math.max(400, e.data.iframeHeight));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // ESCキーで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.55)', padding: '24px 16px 40px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-[24px] overflow-hidden"
        style={{
          maxWidth: 860,
          background: 'white',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* モーダルヘッダー */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{
            background: `linear-gradient(135deg, ${col.border}22, ${col.bg})`,
            borderBottom: `1px solid ${col.border}33`,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl" aria-hidden="true">🎬</span>
            <div className="min-w-0">
              <p
                className="font-bold leading-tight truncate"
                style={{ color: 'var(--color-brown)', fontSize: 16 }}
              >
                {item.theme}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}
                >
                  {SUBJECT_LABEL[item.subject]}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
                  {GRADE_LABEL[item.grade]}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full px-4 text-sm font-semibold"
            style={{
              minHeight: 36,
              background: 'rgba(255,255,255,0.8)',
              color: 'var(--color-brown)',
              border: '1px solid var(--color-beige-dark)',
            }}
          >
            ✕ 閉じる
          </button>
        </div>

        {/* iframe */}
        <div style={{ background: '#fdf6ee' }}>
          <iframe
            ref={iframeRef}
            src={`/api/animations/${item.id}`}
            width="100%"
            height={iframeHeight}
            style={{ display: 'block', border: 'none' }}
            title={item.theme}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

// ── 削除確認ダイアログ ────────────────────────────────────────────
function DeleteConfirmDialog({
  theme,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  theme:      string;
  onCancel:   () => void;
  onConfirm:  () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', padding: 16 }}
    >
      <div
        className="w-full max-w-sm rounded-[20px] p-6"
        style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
      >
        <p className="font-bold text-lg" style={{ color: 'var(--color-brown)' }}>
          削除しますか？
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-brown-light)' }}>
          「{theme}」を削除します。この操作は取り消せません。
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-full text-sm font-semibold"
            style={{
              minHeight: 44,
              background: 'var(--color-cream)',
              color: 'var(--color-brown)',
              border: '1px solid var(--color-beige-dark)',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-full text-sm font-semibold"
            style={{
              minHeight: 44,
              background: isDeleting ? '#ccc' : '#e53935',
              color: 'white',
            }}
          >
            {isDeleting ? '削除中…' : '削除する'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── カード ────────────────────────────────────────────────────────
function AnimationCard({
  item,
  onPreview,
  onDeleteRequest,
}: {
  item:            AnimationItem;
  onPreview:       (item: AnimationItem) => void;
  onDeleteRequest: (item: AnimationItem) => void;
}) {
  const col = SUBJECT_COLOR[item.subject] ?? SUBJECT_COLOR.science;

  return (
    <article
      className="rounded-[20px] overflow-hidden flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.95)',
        boxShadow: 'var(--shadow-warm-sm)',
        border: `1px solid ${col.border}33`,
      }}
    >
      {/* カラーバー */}
      <div style={{ height: 4, background: `linear-gradient(to right, ${col.border}, ${col.border}88)` }} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* バッジ行 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}
          >
            {SUBJECT_LABEL[item.subject]}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs"
            style={{
              background: 'var(--color-cream)',
              color: 'var(--color-brown-light)',
              border: '1px solid var(--color-beige-dark)',
            }}
          >
            {GRADE_LABEL[item.grade]}
          </span>
        </div>

        {/* テーマ名 */}
        <p
          className="font-bold leading-snug line-clamp-2"
          style={{ color: 'var(--color-brown)', fontSize: 15 }}
        >
          {item.theme}
        </p>

        {/* 日付 */}
        <p className="text-xs mt-auto" style={{ color: 'var(--color-brown-light)' }}>
          {formatDate(item.createdAt)}
        </p>

        {/* ボタン行 */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onPreview(item)}
            className="flex-1 rounded-full text-sm font-semibold"
            style={{
              minHeight: 40,
              background: col.border,
              color: 'white',
            }}
          >
            ▶ プレビュー
          </button>
          <button
            onClick={() => onDeleteRequest(item)}
            className="rounded-full px-3 text-sm"
            style={{
              minHeight: 40,
              background: 'var(--color-cream)',
              color: '#e53935',
              border: '1px solid #ffcdd2',
            }}
            aria-label="削除"
          >
            🗑
          </button>
        </div>
      </div>
    </article>
  );
}

// ── メインページ ──────────────────────────────────────────────────
export default function AiKyoshitsuHistoryPage() {
  const [items,         setItems]         = useState<AnimationItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [previewItem,   setPreviewItem]   = useState<AnimationItem | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<AnimationItem | null>(null);
  const [isDeleting,    setIsDeleting]    = useState(false);

  // ── データ取得 ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch('/api/user/animations');
        const json = await res.json() as { ok: boolean; items?: AnimationItem[]; error?: string };
        if (!json.ok) {
          setError(json.error ?? 'エラーが発生しました。');
        } else {
          setItems(json.items ?? []);
        }
      } catch {
        setError('データの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── 削除 ──────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // CSRF は Origin ヘッダーで検証するため、ブラウザの fetch で自動付与される
      const res  = await fetch('/api/user/animations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
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

  // ── レンダリング ──────────────────────────────────────────────
  return (
    <>
      <main style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>

        {/* ヘッダー */}
        <section
          className="px-6 py-8 sm:py-10"
          style={{
            background: 'linear-gradient(160deg, #fff3e0 0%, var(--color-cream) 100%)',
          }}
        >
          <div className="mx-auto max-w-5xl">
            {/* パンくず */}
            <div className="flex items-center gap-2 text-sm mb-5" style={{ color: 'var(--color-brown-light)' }}>
              <Link href="/mypage" style={{ color: 'var(--color-orange)' }}>
                マイページ
              </Link>
              <span>›</span>
              <span>AI教室履歴</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1
                  className="font-display font-bold"
                  style={{ fontSize: 'clamp(22px, 3vw + 12px, 32px)', color: 'var(--color-brown)' }}
                >
                  🎬 AI教室履歴
                </h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-brown-light)' }}>
                  生成したアニメーション一覧
                </p>
              </div>
              <Link
                href="/tools/ai-kyoshitsu"
                className="inline-flex items-center rounded-full px-5 text-sm font-semibold"
                style={{
                  minHeight: 44,
                  background: '#ff8c42',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(255,140,66,0.35)',
                }}
              >
                ✨ 新しく作る →
              </Link>
            </div>
          </div>
        </section>

        {/* コンテンツ */}
        <section className="px-6 py-8">
          <div className="mx-auto max-w-5xl">

            {/* ローディング */}
            {loading && (
              <div className="flex flex-col items-center gap-4 py-20">
                <div
                  className="rounded-full"
                  style={{
                    width: 48, height: 48,
                    border: '4px solid #ffe0b2',
                    borderTopColor: '#ff8c42',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <p style={{ color: 'var(--color-brown-light)' }}>読み込み中…</p>
              </div>
            )}

            {/* エラー */}
            {!loading && error && (
              <div
                className="rounded-[20px] p-6 text-center"
                style={{ background: '#fff3e0', border: '1px solid #ff8c4244' }}
              >
                <p className="text-2xl mb-2">⚠️</p>
                <p style={{ color: 'var(--color-brown)' }}>{error}</p>
                {error.includes('ログイン') && (
                  <Link
                    href="/api/auth/signin"
                    className="mt-4 inline-flex items-center rounded-full px-5 text-sm font-semibold"
                    style={{ minHeight: 44, background: '#ff8c42', color: 'white' }}
                  >
                    ログインする →
                  </Link>
                )}
              </div>
            )}

            {/* 空状態 */}
            {!loading && !error && items.length === 0 && (
              <div
                className="rounded-[20px] p-10 flex flex-col items-center gap-4 text-center"
                style={{ background: 'rgba(255,255,255,0.8)', boxShadow: 'var(--shadow-warm-sm)' }}
              >
                <span className="text-5xl">🎬</span>
                <p className="font-bold text-lg" style={{ color: 'var(--color-brown)' }}>
                  まだアニメーションがありません
                </p>
                <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
                  AI教室でテーマを選んで、最初のアニメーションを作ってみましょう！
                </p>
                <Link
                  href="/tools/ai-kyoshitsu"
                  className="inline-flex items-center rounded-full px-6 text-sm font-semibold"
                  style={{ minHeight: 44, background: '#ff8c42', color: 'white' }}
                >
                  ✨ AI教室へ →
                </Link>
              </div>
            )}

            {/* グリッド */}
            {!loading && !error && items.length > 0 && (
              <>
                <p className="mb-5 text-sm" style={{ color: 'var(--color-brown-light)' }}>
                  {items.length}件の生成履歴
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(item => (
                    <AnimationCard
                      key={item.id}
                      item={item}
                      onPreview={setPreviewItem}
                      onDeleteRequest={setDeleteTarget}
                    />
                  ))}
                </div>
              </>
            )}

          </div>
        </section>
      </main>

      {/* スピナー用CSS */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* プレビューモーダル */}
      {previewItem && (
        <PreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* 削除確認 */}
      {deleteTarget && (
        <DeleteConfirmDialog
          theme={deleteTarget.theme}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
