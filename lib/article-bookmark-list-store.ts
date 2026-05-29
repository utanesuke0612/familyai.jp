'use client';

/**
 * lib/article-bookmark-list-store.ts
 * familyai.jp — 記事ブックマーク一覧フック（マイページ用）
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession }                        from 'next-auth/react';
import type { ArticleBookmarkItem }          from '@/shared/types';

export function useArticleBookmarkList() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  const [items,   setItems]   = useState<ArticleBookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!isLoggedIn) { setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    fetch('/api/user/article-bookmarks?pageSize=200', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setItems(data.data ?? []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [isLoggedIn, status]);

  const remove = useCallback(async (slug: string) => {
    setItems((prev) => prev.filter((i) => i.slug !== slug)); // 楽観的削除
    try {
      await fetch(`/api/user/article-bookmarks?slug=${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
    } catch {
      // 失敗時は再取得
      fetch('/api/user/article-bookmarks?pageSize=200', { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => setItems(data.data ?? []))
        .catch(() => {});
    }
  }, []);

  return { items, loading, isLoggedIn, remove };
}
