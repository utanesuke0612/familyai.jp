'use client';

/**
 * lib/voaenglish/vocab-store.ts
 * familyai.jp — VOA 単語ブックマーク（DB クラウドストレージ）
 *
 * ■ ログイン会員のみ使用可能
 * ■ モジュールレベルキャッシュで API フェッチは 1回/ユーザー に限定
 *
 * Race condition 対策:
 *   toggle() は loadCache() の完了を待ってからキャッシュを操作する。
 *   これにより「DB fetch 完了がキャッシュを上書きして楽観的更新が消える」問題を防ぐ。
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession }                        from 'next-auth/react';

// 型は shared/types に統合済み。後方互換のため re-export。
export type { VocabItem } from '@/shared/types';
import type { VocabItem } from '@/shared/types';

const CHANGE_EVENT = 'familyai:vocab-cloud-changed';

// ── モジュールレベルキャッシュ ─────────────────────────────────────
interface Cache {
  items:  VocabItem[];
  ids:    Set<string>;
  loaded: boolean;
}

let _cache: Cache = { items: [], ids: new Set(), loaded: false };
let _cachedUserId: string | null = null;
let _loadPromise: Promise<void> | null = null;

function resetCache() {
  _cache        = { items: [], ids: new Set(), loaded: false };
  _cachedUserId = null;
  _loadPromise  = null;
}

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

/**
 * DB から全件を1回だけフェッチしてキャッシュに格納する。
 * 並列呼び出し時は同一 Promise を共有する（N+1 防止）。
 */
async function loadCache(userId: string): Promise<void> {
  if (_cachedUserId === userId && _cache.loaded) return;
  if (_cachedUserId !== userId) resetCache();
  _cachedUserId = userId;
  if (_loadPromise) return _loadPromise;

  _loadPromise = fetch('/api/user/vocab-bookmarks')
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
        const data = (json as { data: VocabItem[] }).data;
        _cache.items  = [...data].sort((a, b) => b.addedAt - a.addedAt);
        _cache.ids    = new Set(data.map((v) => v.id));
        _cache.loaded = true;
        notifyChange();
      } else {
        _cache.loaded = true;
      }
    })
    .catch((err) => {
      console.error('[vocab-store] loadCache error:', err);
      _cache.loaded = true;
    })
    .finally(() => {
      _loadPromise = null;
    });

  return _loadPromise;
}

/** キャッシュを無効化して次回アクセス時に再フェッチさせる */
function invalidateCache() {
  _cache.loaded = false;
  _loadPromise  = null;
}

// ── API ヘルパー ──────────────────────────────────────────────────
async function apiSave(items: VocabItem[]): Promise<boolean> {
  try {
    const res = await fetch('/api/user/vocab-bookmarks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items }),
    });
    if (!res.ok) {
      console.error('[vocab-store] apiSave failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[vocab-store] apiSave error:', err);
    return false;
  }
}

async function apiDelete(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/user/vocab-bookmarks?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      console.error('[vocab-store] apiDelete failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[vocab-store] apiDelete error:', err);
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
 */
export function useVocabList(): {
  items:      VocabItem[];
  loading:    boolean;
  isLoggedIn: boolean;
  remove:     (id: string) => Promise<void>;
} {
  const { data: session, status } = useSession();
  const userId    = session?.user?.id ?? null;
  const isLoggedIn = status === 'authenticated';
  const [items, setItems]     = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);

  // キャッシュ変更イベントを購読して再描画
  useEffect(() => {
    const sync = () => setItems([..._cache.items]);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  // ログイン確認後にキャッシュをロード（またはキャッシュから即表示）
  useEffect(() => {
    if (status === 'loading') return;
    if (!isLoggedIn || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadCache(userId).then(() => {
      setItems([..._cache.items]);
      setLoading(false);
    });
  }, [isLoggedIn, status, userId]);

  const remove = useCallback(async (id: string) => {
    // 楽観的削除
    _cache.items = _cache.items.filter((i) => i.id !== id);
    _cache.ids.delete(id);
    notifyChange();
    const ok = await apiDelete(id);
    if (!ok) {
      // 失敗時はキャッシュ無効化して再フェッチ
      if (userId) {
        invalidateCache();
        await loadCache(userId);
      }
    }
  }, [userId]);

  return { items, loading, isLoggedIn, remove };
}

/**
 * 単語ごとのブックマーク状態を管理するフック。
 * loadCache() の完了を待ってから操作するため race condition が発生しない。
 */
export function useVocabBookmark(id: string): {
  bookmarked: boolean;
  toggle:     (item: Omit<VocabItem, 'addedAt'>) => void;
  isLoggedIn: boolean;
} {
  const { data: session, status } = useSession();
  const userId    = session?.user?.id ?? null;
  const isLoggedIn = status === 'authenticated';
  const [bookmarked, setBookmarked] = useState(false);

  // キャッシュ変更イベントを購読（loadCache完了 / toggle後の notifyChange に反応）
  useEffect(() => {
    const sync = () => setBookmarked(_cache.ids.has(id));
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [id]);

  // ログイン後にキャッシュをロードして初期状態を設定
  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    loadCache(userId).then(() => {
      setBookmarked(_cache.ids.has(id));
    });
  }, [id, isLoggedIn, userId]);

  const toggle = useCallback(
    (item: Omit<VocabItem, 'addedAt'>) => {
      if (!isLoggedIn) return;
      // userId が未解決の場合は API のセッション Cookie に任せ、キャッシュをスキップ
      const uid = userId;

      // ── キャッシュのロード完了を確認してから操作（race condition 防止）──
      const exec = () => {
        if (_cache.ids.has(item.id)) {
          // 楽観的削除
          _cache.items = _cache.items.filter((i) => i.id !== item.id);
          _cache.ids.delete(item.id);
          setBookmarked(false);
          notifyChange();
          apiDelete(item.id).then((ok) => {
            if (!ok) {
              // 失敗時はロールバック
              if (uid) {
                invalidateCache();
                loadCache(uid).then(() => setBookmarked(_cache.ids.has(item.id)));
              } else {
                setBookmarked(true);
              }
            }
          });
        } else {
          // 楽観的追加
          const full = { ...item, addedAt: Date.now() };
          _cache.items = [full, ..._cache.items];
          _cache.ids.add(item.id);
          setBookmarked(true);
          notifyChange();
          apiSave([full]).then((ok) => {
            if (!ok) {
              // 失敗時はロールバック
              if (uid) {
                invalidateCache();
                loadCache(uid).then(() => setBookmarked(_cache.ids.has(item.id)));
              } else {
                _cache.items = _cache.items.filter((i) => i.id !== item.id);
                _cache.ids.delete(item.id);
                setBookmarked(false);
                notifyChange();
              }
            }
          });
        }
      };

      if (!uid || !_cache.loaded) {
        // userId 未解決 or キャッシュ未ロード → キャッシュ経由でロードしてから実行
        if (uid) {
          loadCache(uid).then(exec);
        } else {
          // userId なし（稀）: キャッシュをバイパスして直接実行
          exec();
        }
      } else {
        exec();
      }
    },
    [isLoggedIn, userId],
  );

  return { bookmarked, toggle, isLoggedIn };
}
