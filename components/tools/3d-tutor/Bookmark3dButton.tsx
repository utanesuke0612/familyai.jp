'use client';

/**
 * components/tools/3d-tutor/Bookmark3dButton.tsx
 * familyai.jp — 3D図鑑 ブックマークボタン（Rev41）
 *
 * 3D モデル詳細ページに設置するお気に入りボタン。
 * ログイン済み → API 経由でブックマークトグル
 * 未ログイン → サインインページにリダイレクト
 *
 * 【接続先】POST/DELETE /api/user/3d-bookmarks（本Revで新設）
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';

interface Props {
  /** 3D モデルの DB id（UUID）。bookmark add/remove に使用 */
  modelId: string;
  /** モデルのスラッグ（パンくず・リダイレクト用） */
  slug: string;
  /** サーバー側で取得したブックマーク済みフラグ */
  initialBookmarked?: boolean;
  /** ログイン済みかどうか（サーバー側 session から渡す） */
  isLoggedIn?: boolean;
}

export function Bookmark3dButton({
  modelId,
  slug: _slug,
  initialBookmarked = false,
  isLoggedIn = false,
}: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (!isLoggedIn) {
      router.push('/auth/signin');
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      if (saved) {
        const res = await fetch(`/api/user/3d-bookmarks?modelId=${encodeURIComponent(modelId)}`, {
          method:  'DELETE',
          headers: { 'x-csrf-token': '1' },
        });
        if (res.ok) setSaved(false);
      } else {
        const res = await fetch('/api/user/3d-bookmarks', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': '1' },
          body:    JSON.stringify({ modelId }),
        });
        if (res.ok) setSaved(true);
      }
    } catch {
      // ネットワークエラーは無視（次のクリックで再試行）
    } finally {
      setLoading(false);
    }
  }, [saved, loading, modelId, isLoggedIn, router]);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={saved ? 'ブックマークから外す' : '3Dモデルをブックマーク'}
      aria-label={saved ? 'ブックマークから外す' : '3Dモデルをブックマーク'}
      aria-pressed={saved}
      style={{
        display:         'inline-flex',
        alignItems:      'center',
        gap:             6,
        padding:         '6px 14px',
        background:      saved ? 'var(--shu-soft)' : 'var(--washi)',
        border:          `1.5px solid ${saved ? 'var(--shu)' : 'var(--line)'}`,
        borderRadius:    999,
        color:           saved ? 'var(--shu)' : 'var(--sumi-light)',
        fontSize:        13,
        fontWeight:      saved ? 600 : 500,
        cursor:          loading ? 'wait' : 'pointer',
        opacity:         loading ? 0.7 : 1,
        transition:      'background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s',
        fontFamily:      'var(--font-body)',
      }}
    >
      <Star
        size={15}
        fill={saved ? 'currentColor' : 'none'}
        strokeWidth={saved ? 0 : 1.5}
        aria-hidden="true"
      />
      {saved ? 'お気に入り登録済み' : 'お気に入りに追加'}
    </button>
  );
}
