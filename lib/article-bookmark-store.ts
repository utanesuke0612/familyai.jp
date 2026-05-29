'use client';

/**
 * lib/article-bookmark-store.ts
 * familyai.jp — 記事ブックマーク クライアントストア
 *
 * シンプル実装: useState + useEffect + 直接 API 呼び出し
 * - ログインユーザー専用（localStorage フォールバックなし）
 * - 楽観的トグル（即座に色変更 → API 失敗時ロールバック）
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession }                                from 'next-auth/react';

export function useArticleBookmark(slug: string, title: string) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);
  const inflightRef           = useRef(false);

  // ─── 初期状態をAPIから取得 ────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !slug) {
      setSaved(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/user/article-bookmarks?pageSize=200`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const slugs: string[] = (data.data ?? []).map((i: { slug: string }) => i.slug);
        setSaved(slugs.includes(slug));
      })
      .catch(() => {/* サイレント */});

    return () => { cancelled = true; };
  }, [isLoggedIn, slug]);

  // ─── トグル ──────────────────────────────────────────────
  const toggle = useCallback(async () => {
    if (!isLoggedIn || inflightRef.current) return;

    inflightRef.current = true;
    setLoading(true);

    const nextSaved = !saved;
    setSaved(nextSaved); // 楽観的更新

    try {
      if (nextSaved) {
        const res = await fetch('/api/user/article-bookmarks', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ slug, title }),
        });
        if (!res.ok) throw new Error('add failed');
      } else {
        const res = await fetch(
          `/api/user/article-bookmarks?slug=${encodeURIComponent(slug)}`,
          { method: 'DELETE' },
        );
        if (!res.ok) throw new Error('remove failed');
      }
    } catch {
      setSaved(!nextSaved); // ロールバック
    } finally {
      inflightRef.current = false;
      setLoading(false);
    }
  }, [isLoggedIn, saved, slug, title]);

  return { saved, toggle, loading, isLoggedIn };
}
