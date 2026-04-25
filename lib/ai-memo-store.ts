'use client';

/**
 * lib/ai-memo-store.ts
 * familyai.jp — AIメモ帳（DB クラウドストレージ）
 *
 * ■ ログイン会員のみ使用可能
 * ■ 非ログインユーザーは isLoggedIn=false が返るので、UI 側でログイン案内を表示する
 *
 * 設計:
 *   - useAiMemoList()      : 全メモを DB から取得して一覧表示
 *   - useAiMemoBookmark()  : チャットバブル単位の保存状態（楽観的 UI）
 *
 * Race condition 対策:
 *   toggle() は apiSave/apiDelete の完了を待ち、失敗時はロールバックする。
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession }                        from 'next-auth/react';

export type AiMemoItem = {
  /** crypto.randomUUID() */
  id:           string;
  /** 保存した AI の回答テキスト */
  answer:       string;
  /** 対応するユーザーの質問 */
  question:     string;
  /** 記事タイトル */
  articleTitle: string;
  /** 記事スラッグ（あれば） */
  articleSlug?: string;
  /** エポックミリ秒 */
  savedAt:      number;
};

// ── API ヘルパー ──────────────────────────────────────────────────
async function apiSave(items: AiMemoItem[]): Promise<boolean> {
  try {
    const res = await fetch('/api/user/ai-memos', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items }),
    });
    if (!res.ok) {
      console.error('[ai-memo-store] apiSave failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[ai-memo-store] apiSave error:', err);
    return false;
  }
}

async function apiDelete(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/user/ai-memos?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      console.error('[ai-memo-store] apiDelete failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[ai-memo-store] apiDelete error:', err);
    return false;
  }
}

// ── React フック ──────────────────────────────────────────────────

/**
 * 全メモ一覧 + 削除操作を提供するフック。
 * ログイン状態に応じて DB から取得する。
 */
export function useAiMemoList(): {
  items:       AiMemoItem[];
  loading:     boolean;
  isLoggedIn:  boolean;
  remove:      (id: string) => Promise<void>;
} {
  const { data: session, status } = useSession();
  const userId     = session?.user?.id ?? null;
  const isLoggedIn = status === 'authenticated';
  const [items, setItems]     = useState<AiMemoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!isLoggedIn || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch('/api/user/ai-memos')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: unknown) => {
        if (
          json !== null &&
          typeof json === 'object' &&
          'ok' in json &&
          (json as { ok: unknown }).ok === true &&
          'data' in json &&
          Array.isArray((json as { data: unknown }).data)
        ) {
          const data = (json as { data: AiMemoItem[] }).data;
          setItems([...data].sort((a, b) => b.savedAt - a.savedAt));
        } else {
          setItems([]);
        }
      })
      .catch((err) => {
        console.error('[ai-memo-store] useAiMemoList fetch error:', err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn, status, userId]);

  const remove = useCallback(async (id: string) => {
    // 楽観的 UI: 即座に一覧から消す
    setItems((prev) => prev.filter((i) => i.id !== id));
    const ok = await apiDelete(id);
    if (!ok) {
      // 失敗時は再フェッチして正しい状態に戻す
      fetch('/api/user/ai-memos')
        .then((r) => r.json())
        .then((json: unknown) => {
          if (
            json !== null &&
            typeof json === 'object' &&
            'ok' in json &&
            (json as { ok: unknown }).ok === true &&
            'data' in json &&
            Array.isArray((json as { data: unknown }).data)
          ) {
            const data = (json as { data: AiMemoItem[] }).data;
            setItems([...data].sort((a, b) => b.savedAt - a.savedAt));
          }
        })
        .catch(() => {/* keep optimistic state */});
    }
  }, []);

  return { items, loading, isLoggedIn, remove };
}

/**
 * 単一チャットバブルの保存状態を管理するフック。
 * - ページロード時は常に saved=false（チャット履歴は永続化しないため）
 * - toggle で楽観的に saved を更新し、API 失敗時はロールバック
 * - 非ログインユーザーは isLoggedIn=false → 呼び出し側でログイン案内を表示
 */
export function useAiMemoBookmark(id: string): {
  saved:      boolean;
  toggle:     (item: Omit<AiMemoItem, 'savedAt'>) => void;
  isLoggedIn: boolean;
} {
  const { status } = useSession();
  const isLoggedIn = status === 'authenticated';
  const [saved, setSaved] = useState(false);

  const toggle = useCallback(
    (item: Omit<AiMemoItem, 'savedAt'>) => {
      if (!isLoggedIn) return; // 非ログイン時は何もしない（UI 側で案内）
      if (saved) {
        // 楽観的削除
        setSaved(false);
        apiDelete(item.id).then((ok) => {
          if (!ok) {
            // ロールバック
            setSaved(true);
          }
        });
      } else {
        // 楽観的追加
        const full = { ...item, savedAt: Date.now() };
        setSaved(true);
        apiSave([full]).then((ok) => {
          if (!ok) {
            // ロールバック
            setSaved(false);
          }
        });
      }
    },
    [isLoggedIn, saved],
  );

  // id が変わった場合（別のバブル）はリセット
  useEffect(() => { setSaved(false); }, [id]);

  return { saved, toggle, isLoggedIn };
}
