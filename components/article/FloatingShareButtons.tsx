'use client';

/**
 * components/article/FloatingShareButtons.tsx
 * familyai.jp — 記事ページ フローティングアクションボタン
 *
 * Desktop (lg+): 画面左側・縦中央に固定
 * Mobile:        左下コーナーに固定
 *
 * ボタン: ❤️いいね（匿名OK）/ 🔖ブックマーク（ログイン必須）/ X シェア / LINE シェア
 */

import { useEffect, useState, useCallback } from 'react';

interface Props {
  slug:  string;
  title: string;
  url:   string;
}

export function FloatingShareButtons({ slug, title, url }: Props) {
  const [likeCount,   setLikeCount]   = useState(0);
  const [liked,       setLiked]       = useState(false);
  const [bookmarked,  setBookmarked]  = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [bmLoading,   setBmLoading]   = useState(false);

  // 初期状態取得
  useEffect(() => {
    fetch(`/api/articles/${slug}/like`)
      .then((r) => r.json())
      .then((d) => { setLikeCount(d.likeCount ?? 0); setLiked(!!d.liked); })
      .catch(() => {});

    fetch(`/api/articles/${slug}/bookmark`)
      .then((r) => r.json())
      .then((d) => { setBookmarked(!!d.bookmarked); })
      .catch(() => {});
  }, [slug]);

  // いいねトグル
  const handleLike = useCallback(async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    // オプティミスティック更新
    setLiked((prev) => !prev);
    setLikeCount((prev) => liked ? prev - 1 : prev + 1);
    try {
      const res  = await fetch(`/api/articles/${slug}/like`, { method: 'POST' });
      const data = await res.json();
      setLikeCount(data.likeCount);
      setLiked(data.liked);
    } catch {
      // ロールバック
      setLiked((prev) => !prev);
      setLikeCount((prev) => liked ? prev + 1 : prev - 1);
    } finally {
      setLikeLoading(false);
    }
  }, [slug, liked, likeLoading]);

  // ブックマークトグル
  const handleBookmark = useCallback(async () => {
    if (bmLoading) return;
    setBmLoading(true);
    setBookmarked((prev) => !prev);
    try {
      const res  = await fetch(`/api/articles/${slug}/bookmark`, { method: 'POST' });
      const data = await res.json();
      if (data.requiresLogin) {
        setBookmarked(false);
        window.location.href = '/auth/signin';
        return;
      }
      setBookmarked(data.bookmarked);
    } catch {
      setBookmarked((prev) => !prev);
    } finally {
      setBmLoading(false);
    }
  }, [slug, bmLoading]);

  const xUrl    = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&via=familyaijp`;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(title + '\n' + url)}`;

  const btnBase = 'flex flex-col items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95';

  return (
    <div
      className={[
        'fixed z-40 flex flex-col gap-3',
        'left-4 bottom-8',
        'lg:left-[72px] lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2',
      ].join(' ')}
      aria-label="記事アクションボタン"
    >
      {/* ❤️ いいね */}
      <button
        onClick={handleLike}
        disabled={likeLoading}
        title={liked ? 'いいねを取り消す' : 'いいね'}
        aria-label={liked ? 'いいねを取り消す' : 'いいね'}
        className={btnBase}
        style={{
          width:      '44px',
          height:     '44px',
          background: liked ? '#FF6B6B' : 'white',
          boxShadow:  '0 2px 8px rgba(0,0,0,0.14)',
          border:     liked ? 'none' : '1px solid #e5e7eb',
          gap:        '1px',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
          fill={liked ? 'white' : 'none'}
          stroke={liked ? 'white' : '#6b7280'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        {likeCount > 0 && (
          <span style={{ fontSize: '9px', color: liked ? 'white' : '#6b7280', lineHeight: 1, fontWeight: 600 }}>
            {likeCount}
          </span>
        )}
      </button>

      {/* 🔖 ブックマーク */}
      <button
        onClick={handleBookmark}
        disabled={bmLoading}
        title={bookmarked ? 'ブックマーク解除' : 'ブックマーク'}
        aria-label={bookmarked ? 'ブックマーク解除' : 'ブックマーク'}
        className={btnBase}
        style={{
          width:      '44px',
          height:     '44px',
          background: bookmarked ? '#FF8C42' : 'white',
          boxShadow:  '0 2px 8px rgba(0,0,0,0.14)',
          border:     bookmarked ? 'none' : '1px solid #e5e7eb',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
          fill={bookmarked ? 'white' : 'none'}
          stroke={bookmarked ? 'white' : '#6b7280'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {/* X（Twitter） */}
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="X（Twitter）でシェア"
        aria-label="X（Twitter）でシェア"
        className={btnBase}
        style={{
          width:      '44px',
          height:     '44px',
          background: 'white',
          boxShadow:  '0 2px 8px rgba(0,0,0,0.14)',
          border:     '1px solid #e5e7eb',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.258 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
        </svg>
      </a>

      {/* LINE */}
      <a
        href={lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="LINEでシェア"
        aria-label="LINEでシェア"
        className={btnBase}
        style={{
          width:      '44px',
          height:     '44px',
          background: '#06C755',
          boxShadow:  '0 2px 8px rgba(0,0,0,0.14)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
      </a>
    </div>
  );
}
