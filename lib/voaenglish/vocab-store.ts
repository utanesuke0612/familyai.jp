'use client';

/**
 * lib/voaenglish/vocab-store.ts
 * familyai.jp — VOA 単語ブックマーク（DB クラウドストレージ）
 *
 * ■ ログイン会員のみ使用可能
 * ■ 非ログインユーザーは isLoggedIn=false が返るので、UI 側でログイン案内を表示する
 *
 * 設計:
 *   - useVocabList()      : 全ブックマークを DB から取得して一覧表示
 *   - useVocabBookmark()  : 単語ごとの保存状態（楽観的 UI）
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession }                                from 'next-auth/react';

export type VocabItem = {
  /** course/lesson/word をスラッシュでつないだ一意キー（小文字化） */
  id:           string;
  word:         string;
  meaning:      string;
  pron?:        string;
  example?:     string;
  course?:      string;
  lesson?:      string;
  lessonTitle?: string;
  /** エポックミリ秒 */
  addedAt:      number;
};

// ── API ヘルパー ──────────────────────────────────────────────────
async function apiSave(items: VocabItem[]): Promise<boolean> {
  try {
    const res = await fetch('/api/user/vocab-bookmarks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function apiDelete(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/user/vocab-bookmarks?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 一意キー生成 */
export function buildVocabId(course: string, lesson: string, word: string): string {
  return `${course}/${lesson}/${word.toLowerCase()}`;
}

// ── React フック ──────────────────────────────────────────────────

/**
 * 全ブックマーク一覧 + 削除操作を提供するフック。
 * ログイン状態に応じて DB から取得する。
 */
export function useVocabList(): {
  items:      VocabItem[];
  loading:    boolean;
  isLoggedIn: boolean;
  remove:     (id: string) => Promise<void>;
} {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated';
  const [items, setItems]     = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch('/api/user/vocab-bookmarks')
      .then((r) => r.json())
      .then((json: { ok: boolean; data: VocabItem[] }) => {
        setItems(json.ok ? [...json.data].sort((a, b) => b.addedAt - a.addedAt) : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [isLoggedIn, status, session?.user?.id]);

  const remove = useCallback(async (id: string) => {
    // 楽観的 UI: 即座に一覧から消す
    setItems((prev) => prev.filter((i) => i.id !== id));
    await apiDelete(id);
  }, []);

  return { items, loading, isLoggedIn, remove };
}

/**
 * 単語ごとのブックマーク状態を管理するフック。
 * - マウント時に DB から保存状態を確認する（ページ間で状態を保持するため）
 * - toggle で楽観的に状態を更新し、同時に API を呼ぶ
 * - 非ログインユーザーは isLoggedIn=false → 呼び出し側でログイン案内を表示
 */
export function useVocabBookmark(id: string): {
  bookmarked: boolean;
  toggle:     (item: Omit<VocabItem, 'addedAt'>) => void;
  isLoggedIn: boolean;
} {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated';
  const [bookmarked, setBookmarked] = useState(false);
  const checkedRef = useRef<string | null>(null); // チェック済みの id を記録

  // マウント時 or id 変化時に DB から保存状態を確認
  useEffect(() => {
    if (!isLoggedIn || checkedRef.current === id) return;
    checkedRef.current = id;

    fetch('/api/user/vocab-bookmarks')
      .then((r) => r.json())
      .then((json: { ok: boolean; data: VocabItem[] }) => {
        if (json.ok) {
          setBookmarked(json.data.some((v) => v.id === id));
        }
      })
      .catch(() => { /* ネットワーク失敗時は false のまま */ });
  }, [id, isLoggedIn]);

  const toggle = useCallback(
    (item: Omit<VocabItem, 'addedAt'>) => {
      if (!isLoggedIn) return; // 非ログイン時は何もしない（UI 側で案内）
      if (bookmarked) {
        setBookmarked(false);
        apiDelete(item.id);
      } else {
        const full = { ...item, addedAt: Date.now() };
        setBookmarked(true);
        apiSave([full]);
      }
    },
    [isLoggedIn, bookmarked],
  );

  return { bookmarked, toggle, isLoggedIn };
}
