'use client';

/**
 * lib/voaenglish/sentence-bookmark-store.ts
 * familyai.jp — VOA ディクテーション センテンスブックマーク（Rev34）
 *
 * `lib/voaenglish/vocab-store.ts` のパターンを基に、以下を追加：
 *   ✅ ゲスト（未ログイン）も localStorage で保存可能
 *   ✅ ログイン会員は DB（/api/user/sentence-bookmarks）と同期
 *   ✅ モジュールレベルキャッシュで API フェッチを 1回/ユーザーに限定
 *
 * 使い方：
 *   import { useSentenceBookmark } from '@/lib/voaenglish/sentence-bookmark-store';
 *   const { bookmarked, toggle } = useSentenceBookmark(buildSentenceId(...));
 *   <button onClick={() => toggle(item)}>🔖</button>
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession }                        from 'next-auth/react';
import type { SentenceBookmarkItem }         from '@/shared/types';
import { fetchAllPages }                     from '@/lib/fetch-all-pages';

export type { SentenceBookmarkItem } from '@/shared/types';

const CHANGE_EVENT = 'familyai:sentence-cloud-changed';
const LOCAL_KEY    = 'familyai:sentence-bookmarks';

// ── モジュールレベルキャッシュ ──────────────────────────────────
interface Cache {
  items:  SentenceBookmarkItem[];
  ids:    Set<string>;
  loaded: boolean;
}

let _cache: Cache = { items: [], ids: new Set(), loaded: false };
/** null = ゲストモード（localStorage）／文字列 = ログイン中（DB） */
let _cachedUserId: string | null | 'guest' = null;
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

// ── localStorage ヘルパー（ゲスト用） ────────────────────────────
function readLocal(): SentenceBookmarkItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as SentenceBookmarkItem[] : [];
  } catch {
    return [];
  }
}

function writeLocal(items: SentenceBookmarkItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch (err) {
    // ストレージ枯渇等は黙って無視（保存数 300 上限なので通常は溢れない）
    console.warn('[sentence-bookmark-store] writeLocal failed:', err);
  }
}

// ── DB API ヘルパー ─────────────────────────────────────────────
async function apiSave(items: SentenceBookmarkItem[]): Promise<boolean> {
  try {
    const res = await fetch('/api/user/sentence-bookmarks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items }),
    });
    if (!res.ok) {
      console.error('[sentence-bookmark-store] apiSave failed:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[sentence-bookmark-store] apiSave error:', err);
    return false;
  }
}

async function apiDelete(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/user/sentence-bookmarks?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      console.error('[sentence-bookmark-store] apiDelete failed:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[sentence-bookmark-store] apiDelete error:', err);
    return false;
  }
}

// ── キャッシュロード（ログイン: DB / ゲスト: localStorage） ──────
async function loadCache(userId: string | 'guest'): Promise<void> {
  if (_cachedUserId === userId && _cache.loaded) return;
  if (_cachedUserId !== userId) resetCache();
  _cachedUserId = userId;
  if (_loadPromise) return _loadPromise;

  if (userId === 'guest') {
    // ゲスト: localStorage から同期的に読み込む
    const data = readLocal();
    _cache.items  = [...data].sort((a, b) => b.addedAt - a.addedAt);
    _cache.ids    = new Set(data.map((s) => s.id));
    _cache.loaded = true;
    notifyChange();
    return Promise.resolve();
  }

  // ログイン会員: DB から全件取得（Codex P2 #8: fetchAllPages で 201 件目以降も拾う）
  _loadPromise = fetchAllPages<SentenceBookmarkItem>('/api/user/sentence-bookmarks')
    .then((data) => {
      _cache.items  = data.slice().sort((a, b) => b.addedAt - a.addedAt);
      _cache.ids    = new Set(data.map((s) => s.id));
      _cache.loaded = true;
      notifyChange();
    })
    .catch((err) => {
      console.error('[sentence-bookmark-store] loadCache error:', err);
      _cache.loaded = true;
    })
    .finally(() => {
      _loadPromise = null;
    });

  return _loadPromise;
}

function invalidateCache() {
  _cache.loaded = false;
  _loadPromise  = null;
}

// ── 公開ユーティリティ ──────────────────────────────────────────
/**
 * 一意 sentence_id を生成。
 *   buildSentenceId('01_03_Level2', 'lesson-05', 12) → '01_03_Level2/lesson-05/12'
 */
export function buildSentenceId(course: string, lesson: string, index: number): string {
  return `${course}/${lesson}/${index}`;
}

/**
 * 注釈付き本文から平文（検索用）を抽出。
 *   - `**Speaker:** text` / `Speaker: text` の prefix を剥がす
 *   - `{word|reading}` 注釈を `word` のみに展開
 *   - `**bold**` の `**` を除去
 */
export function plainifySentence(annotated: string): string {
  let s = annotated;
  // **Speaker:** rest  /  **Speaker**: rest
  s = s.replace(/^\*\*([A-Za-z][A-Za-z0-9_ ]*?)\s*:?\s*\*\*\s*:?\s*/, '');
  // Speaker: rest（旧形式）
  s = s.replace(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*/, '');
  // {word|reading} → word
  s = s.replace(/\{([^|{}\n]+)\|[^{}\n]+\}/g, '$1');
  // **bold** → bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  return s.trim();
}

// ── React フック ────────────────────────────────────────────────

/**
 * 全ブックマーク一覧 + 削除操作を提供するフック（/mypage/bookmarks 用）。
 */
export function useSentenceBookmarkList(): {
  items:      SentenceBookmarkItem[];
  loading:    boolean;
  isLoggedIn: boolean;
  remove:     (id: string) => Promise<void>;
} {
  const { data: session, status } = useSession();
  const userId     = session?.user?.id ?? null;
  const isLoggedIn = status === 'authenticated';
  const [items, setItems]     = useState<SentenceBookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = () => setItems([..._cache.items]);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    setLoading(true);
    const target: string | 'guest' = isLoggedIn && userId ? userId : 'guest';
    loadCache(target).then(() => {
      setItems([..._cache.items]);
      setLoading(false);
    });
  }, [isLoggedIn, status, userId]);

  const remove = useCallback(async (id: string) => {
    // 楽観的削除
    _cache.items = _cache.items.filter((i) => i.id !== id);
    _cache.ids.delete(id);
    notifyChange();

    if (isLoggedIn && userId) {
      const ok = await apiDelete(id);
      if (!ok) {
        invalidateCache();
        await loadCache(userId);
      }
    } else {
      writeLocal(_cache.items);
    }
  }, [isLoggedIn, userId]);

  return { items, loading, isLoggedIn, remove };
}

/**
 * 個別センテンスのブックマーク状態を管理するフック（SentenceList 用）。
 * ゲスト = localStorage 直接更新／ログイン中 = DB と同期。
 */
export function useSentenceBookmark(id: string): {
  bookmarked: boolean;
  toggle:     (item: Omit<SentenceBookmarkItem, 'addedAt'>) => void;
  isLoggedIn: boolean;
} {
  const { data: session, status } = useSession();
  const userId     = session?.user?.id ?? null;
  const isLoggedIn = status === 'authenticated';
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const sync = () => setBookmarked(_cache.ids.has(id));
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [id]);

  // ログイン状態が決まったらキャッシュをロード
  useEffect(() => {
    if (status === 'loading') return;
    const target: string | 'guest' = isLoggedIn && userId ? userId : 'guest';
    loadCache(target).then(() => {
      setBookmarked(_cache.ids.has(id));
    });
  }, [id, isLoggedIn, status, userId]);

  const toggle = useCallback(
    (item: Omit<SentenceBookmarkItem, 'addedAt'>) => {
      const target: string | 'guest' = isLoggedIn && userId ? userId : 'guest';

      const exec = () => {
        if (_cache.ids.has(item.id)) {
          // 削除（楽観的）
          _cache.items = _cache.items.filter((i) => i.id !== item.id);
          _cache.ids.delete(item.id);
          setBookmarked(false);
          notifyChange();

          if (target === 'guest') {
            writeLocal(_cache.items);
          } else {
            apiDelete(item.id).then((ok) => {
              if (!ok) {
                invalidateCache();
                loadCache(target).then(() => setBookmarked(_cache.ids.has(item.id)));
              }
            });
          }
        } else {
          // 追加（楽観的）
          const full: SentenceBookmarkItem = { ...item, addedAt: Date.now() };
          _cache.items = [full, ..._cache.items];
          _cache.ids.add(item.id);
          setBookmarked(true);
          notifyChange();

          if (target === 'guest') {
            writeLocal(_cache.items);
          } else {
            apiSave([full]).then((ok) => {
              if (!ok) {
                invalidateCache();
                loadCache(target).then(() => setBookmarked(_cache.ids.has(item.id)));
              }
            });
          }
        }
      };

      if (!_cache.loaded || _cachedUserId !== target) {
        loadCache(target).then(exec);
      } else {
        exec();
      }
    },
    [isLoggedIn, userId],
  );

  return { bookmarked, toggle, isLoggedIn };
}
