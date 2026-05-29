'use client';

/**
 * components/article/FloatingShareButtons.tsx
 * familyai.jp — 記事ページ フローティングシェアボタン
 *
 * Desktop (lg+): 画面左側・縦中央に固定
 * Mobile:        左下コーナーに固定
 *
 * ボタン:
 *   1. X シェア
 *   2. LINE シェア
 *   3. ブックマーク（ログイン必須・楽観的トグル）
 */

import { useRouter } from 'next/navigation';
import { useArticleBookmark } from '@/lib/article-bookmark-store';

interface Props {
  title:          string;
  url:            string;
  /** 記事スラッグ。指定時はブックマークボタンを表示する。 */
  slug?:          string;
  /** サーバー側で取得したブックマーク総件数（slug 指定時のみ有効）。 */
  bookmarkCount?: number;
}

export function FloatingShareButtons({ title, url, slug, bookmarkCount = 0 }: Props) {
  const router  = useRouter();
  const xUrl    = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&via=familyaijp`;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(title + '\n' + url)}`;

  const { saved, toggle, loading, isLoggedIn } = useArticleBookmark(slug ?? '', title);

  // Rev40 Phase G: 円形＋彩色から、矩形＋墨／朱の民藝ボタンへ
  const btnBase = 'flex items-center justify-center transition-colors duration-200';

  return (
    <div
      className={[
        'fixed z-40 flex flex-col gap-3',
        'left-4 bottom-8',
        'lg:left-[72px] lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2',
      ].join(' ')}
      aria-label="記事アクションボタン"
    >
      {/* X（Twitter） */}
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="X（Twitter）でシェア"
        aria-label="X（Twitter）でシェア"
        className={btnBase}
        style={{
          width:        '44px',
          height:       '44px',
          background:   'var(--washi-light)',
          color:        'var(--sumi)',
          border:       '1px solid var(--line)',
          borderRadius: '4px',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
          width:        '44px',
          height:       '44px',
          background:   'var(--washi-light)',
          color:        '#06C755',
          border:       '1px solid var(--line)',
          borderRadius: '4px',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
      </a>

      {/* ブックマーク（slug が指定されている場合のみ表示） */}
      {slug && (
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={() => {
              if (!isLoggedIn) { router.push('/auth/signin'); return; }
              toggle();
            }}
            disabled={loading}
            title={saved ? 'ブックマーク済み' : 'ブックマークに追加'}
            aria-label={saved ? 'ブックマーク済み' : 'ブックマークに追加'}
            aria-pressed={saved}
            className={btnBase}
            style={{
              width:        '44px',
              height:       '44px',
              background:   saved ? 'var(--shu-soft)' : 'var(--washi-light)',
              color:        saved ? 'var(--shu)'      : 'var(--sumi)',
              border:       `1px solid ${saved ? 'var(--shu)' : 'var(--line)'}`,
              borderRadius: '4px',
              cursor:       loading ? 'wait' : 'pointer',
              opacity:      loading ? 0.7 : 1,
              transition:   'background 0.15s, color 0.15s, border-color 0.15s',
            }}
          >
            {saved ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            )}
          </button>
          {/* ブックマーク総件数 */}
          {bookmarkCount > 0 && (
            <span
              style={{
                fontSize:   '10px',
                color:      saved ? 'var(--shu)' : 'var(--sumi-light)',
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {bookmarkCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
