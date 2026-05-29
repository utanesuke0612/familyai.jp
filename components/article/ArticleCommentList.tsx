'use client';

/**
 * components/article/ArticleCommentList.tsx
 * familyai.jp — 記事コメント一覧
 *
 * - MarkdownContent で本文をレンダリング
 * - 自分のコメントに編集・削除ボタンを表示
 * - インライン編集フォーム
 */

import { useState, useEffect }  from 'react';
import Image                     from 'next/image';
import { useSession }            from 'next-auth/react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { MarkdownContent }       from '@/components/ui/MarkdownContent';
import { formatDateJa }          from '@/shared';

// ─── 型 ───────────────────────────────────────────────────────
interface CommentItem {
  id:        string;
  body:      string;
  createdAt: string;
  author: {
    name:  string | null;
    image: string | null;
  };
  userId?: string;  // 所有者チェック用（API が返す場合）
}

interface ArticleCommentListProps {
  articleSlug:    string;
  reloadTrigger?: number;
}

const PAGE_SIZE = 20;

// ─── コンポーネント ───────────────────────────────────────────
export function ArticleCommentList({ articleSlug, reloadTrigger }: ArticleCommentListProps) {
  const { data: session } = useSession();
  const myId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const [comments,  setComments]  = useState<CommentItem[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [page,      setPage]      = useState(1);

  // 編集状態
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editBody,    setEditBody]    = useState('');
  const [editSaving,  setEditSaving]  = useState(false);
  const [editError,   setEditError]   = useState<string | null>(null);

  // ─── コメント一覧取得 ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(
          `/api/articles/${articleSlug}/comments?page=${page}&pageSize=${PAGE_SIZE}`,
          { cache: 'no-store' },
        );
        if (!res.ok) throw new Error('コメントの取得に失敗しました');
        const json = await res.json();
        if (!cancelled) {
          setComments(json.data.items ?? []);
          setTotal(json.data.total ?? 0);
        }
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [articleSlug, page, reloadTrigger]);

  // ─── 編集開始 ─────────────────────────────────────────────
  const startEdit = (comment: CommentItem) => {
    setEditingId(comment.id);
    setEditBody(comment.body);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBody('');
    setEditError(null);
  };

  // ─── 編集保存 ─────────────────────────────────────────────
  const saveEdit = async (id: string) => {
    const trimmed = editBody.trim();
    if (!trimmed) { setEditError('コメントを入力してください'); return; }

    setEditSaving(true);
    setEditError(null);
    try {
      const res  = await fetch(`/api/articles/${articleSlug}/comments/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? '更新に失敗しました'); return; }

      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, body: data.data.body } : c)),
      );
      cancelEdit();
    } catch {
      setEditError('ネットワークエラーが発生しました');
    } finally {
      setEditSaving(false);
    }
  };

  // ─── 削除 ─────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('このコメントを削除してもよいですか？')) return;

    try {
      const res = await fetch(`/api/articles/${articleSlug}/comments/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? '削除に失敗しました');
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      alert('ネットワークエラーが発生しました');
    }
  };

  // ─── レンダリング ──────────────────────────────────────────
  const maxPage = Math.ceil(total / PAGE_SIZE);

  if (loading) {
    return (
      <p className="text-sm text-center py-6" style={{ color: 'var(--sumi-light)' }}>
        読み込み中...
      </p>
    );
  }

  if (fetchError) {
    return (
      <p className="text-sm text-center py-4" style={{ color: '#d32f2f' }}>
        {fetchError}
      </p>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: 'var(--sumi-light)' }}>
        まだコメントはありません。最初のコメントを投稿してみましょう。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const isOwner   = !!myId && myId === comment.userId;
        const isEditing = editingId === comment.id;

        return (
          <div
            key={comment.id}
            className="p-4 rounded-lg border"
            style={{ background: 'white', borderColor: 'var(--line-soft)' }}
          >
            {/* ── ヘッダー ── */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                {comment.author.image ? (
                  <Image
                    src={comment.author.image}
                    alt={comment.author.name ?? 'User'}
                    width={28}
                    height={28}
                    className="rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium"
                    style={{ background: 'var(--washi-deep)', color: 'var(--sumi-light)' }}
                  >
                    {(comment.author.name ?? 'U')[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium leading-tight" style={{ color: 'var(--sumi)' }}>
                    {comment.author.name ?? 'Anonymous'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--sumi-light)' }}>
                    {formatDateJa(comment.createdAt)}
                  </p>
                </div>
              </div>

              {/* 編集・削除ボタン（本人のみ） */}
              {isOwner && !isEditing && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(comment)}
                    className="p-1.5 rounded hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--sumi-light)' }}
                    title="編集"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-1.5 rounded hover:opacity-70 transition-opacity"
                    style={{ color: '#d32f2f' }}
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* ── 本文 or 編集フォーム ── */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={4}
                  className="w-full p-2 rounded border text-sm resize-none"
                  style={{ borderColor: 'var(--shu)', fontFamily: 'inherit', outline: 'none' }}
                  autoFocus
                />
                {editError && (
                  <p className="text-xs" style={{ color: '#d32f2f' }}>{editError}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-opacity hover:opacity-70"
                    style={{ borderColor: 'var(--line-soft)', color: 'var(--sumi-light)' }}
                  >
                    <X size={12} /> キャンセル
                  </button>
                  <button
                    onClick={() => saveEdit(comment.id)}
                    disabled={editSaving}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ background: 'var(--shu)', color: 'white' }}
                  >
                    <Check size={12} /> {editSaving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm" style={{ color: 'var(--sumi)' }}>
                <MarkdownContent fontSize="14px">{comment.body}</MarkdownContent>
              </div>
            )}
          </div>
        );
      })}

      {/* ── ページネーション ── */}
      {maxPage > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded text-sm border disabled:opacity-40 hover:opacity-70 transition-opacity"
            style={{ borderColor: 'var(--line-soft)', color: 'var(--sumi)' }}
          >
            前へ
          </button>
          <span className="text-sm" style={{ color: 'var(--sumi-light)' }}>
            {page} / {maxPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={page === maxPage}
            className="px-3 py-1 rounded text-sm border disabled:opacity-40 hover:opacity-70 transition-opacity"
            style={{ borderColor: 'var(--line-soft)', color: 'var(--sumi)' }}
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
