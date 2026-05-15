'use client';

/**
 * app/(site)/mypage/ai-echo/AiEchoList.tsx
 * AI Echo 履歴一覧（Client Component）
 *
 * Server Component から items を渡されて表示。
 * 各エントリは折りたたみ可能で、クリックで全文展開。
 * 削除ボタンで本人のみ削除可能（DELETE /api/user/ai-echo/:id）。
 */

import Link from 'next/link';
import { useState } from 'react';

export type AiEchoListItem = {
  id:          string;
  lessonKey:   string;
  lessonTitle: string;
  level:       1 | 2 | 3;
  userInput:   string;
  aiFeedback:  string;
  createdAt:   string;   // ISO 8601
};

const LEVEL_META: Record<1 | 2 | 3, { emoji: string; label: string; color: string }> = {
  1: { emoji: '🌱', label: 'Level 1 (3文)',     color: '#86c46d' },
  2: { emoji: '🌿', label: 'Level 2 (くわしく)', color: '#4caf50' },
  3: { emoji: '🌳', label: 'Level 3 (意見)',    color: '#2e7d32' },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}/${m}/${day} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

export default function AiEchoList({ items }: { items: AiEchoListItem[] }) {
  const [list,        setList]        = useState<AiEchoListItem[]>(items);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [confirmId,   setConfirmId]   = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/user/ai-echo/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setList((prev) => prev.filter((it) => it.id !== id));
        setConfirmId(null);
        if (expandedId === id) setExpandedId(null);
      } else {
        alert('削除に失敗しました。もう一度お試しください。');
      }
    } catch {
      alert('通信エラーが発生しました。');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ul className="flex flex-col gap-3">
      {list.map((it) => {
        const meta = LEVEL_META[it.level];
        const isExpanded = expandedId === it.id;
        const isConfirming = confirmId === it.id;
        const isDeleting = deletingId === it.id;
        return (
          <li
            key={it.id}
            className="overflow-hidden"
            style={{
              background:   'rgba(255,255,255,0.95)',
              border:       '1px solid var(--line)',
              borderRadius: '4px',
            }}
          >
            {/* ── ヘッダー（クリックで展開） ── */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : it.id)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-[var(--washi-light)]"
            >
              <span
                className="px-2 py-0.5 text-xs font-bold shrink-0"
                style={{ background: meta.color, color: '#fff', borderRadius: '4px' }}
                title={meta.label}
              >
                {meta.emoji} L{it.level}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mincho truncate" style={{ fontWeight: 500, color: 'var(--sumi)' }}>
                  {it.lessonTitle}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'var(--sumi-light)' }}>
                  {formatDate(it.createdAt)} ・ {it.lessonKey}
                </p>
              </div>
              <span
                className="shrink-0 text-sm"
                style={{ color: 'var(--shu)' }}
                aria-hidden
              >
                {isExpanded ? '▲' : '▼'}
              </span>
            </button>

            {/* ── 展開時のコンテンツ ── */}
            {isExpanded && (
              <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: '1px solid var(--line)' }}>
                {/* ユーザー入力 */}
                <div className="pt-3">
                  <p className="text-[11px] font-bold mb-1" style={{ color: 'var(--sumi-light)' }}>
                    自分の英文
                  </p>
                  <p
                    className="text-sm leading-relaxed px-3 py-2"
                    style={{
                      background:   'var(--washi-light)',
                      borderRadius: '4px',
                      color:        'var(--sumi)',
                      whiteSpace:   'pre-wrap',
                    }}
                  >
                    {it.userInput}
                  </p>
                </div>

                {/* AI フィードバック */}
                <div>
                  <p className="text-[11px] font-bold mb-1" style={{ color: 'var(--sumi-light)' }}>
                    AI Echo からのフィードバック
                  </p>
                  <p
                    className="text-sm leading-relaxed px-3 py-2"
                    style={{
                      background:   'var(--washi-deep)',
                      border:       '1px solid var(--line)',
                      borderRadius: '4px',
                      color:        'var(--sumi)',
                      whiteSpace:   'pre-wrap',
                    }}
                  >
                    {it.aiFeedback}
                  </p>
                </div>

                {/* アクション */}
                <div className="flex items-center justify-between gap-2 flex-wrap mt-1">
                  <Link
                    href={`/tools/voaenglish/${it.lessonKey}`}
                    className="text-xs font-semibold px-3 py-1.5 transition-opacity hover:opacity-80"
                    style={{
                      background:   'var(--shu)',
                      color:        '#fff',
                      borderRadius: '4px',
                    }}
                  >
                    レッスンへ戻る →
                  </Link>

                  {!isConfirming ? (
                    <button
                      type="button"
                      onClick={() => setConfirmId(it.id)}
                      disabled={isDeleting}
                      className="text-xs font-semibold px-3 py-1.5 transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{
                        background:   '#fff',
                        color:        '#c0392b',
                        border:       '1px solid #ffb3b3',
                        borderRadius: '4px',
                      }}
                    >
                      削除
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--sumi-light)' }}>
                        本当に削除しますか？
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(it.id)}
                        disabled={isDeleting}
                        className="text-xs font-bold px-3 py-1.5 disabled:opacity-50"
                        style={{ background: '#e74c3c', color: '#fff', borderRadius: '4px' }}
                      >
                        {isDeleting ? '削除中…' : '削除する'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={isDeleting}
                        className="text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
                        style={{ background: '#fff', color: 'var(--sumi)', border: '1px solid var(--line)', borderRadius: '4px' }}
                      >
                        やめる
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
