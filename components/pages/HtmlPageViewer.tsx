'use client';

/**
 * components/pages/HtmlPageViewer.tsx
 * familyai.jp — HTML ページビューア
 *
 * PC（lg+）: 左 iframe / 右 AIChatWidget の2カラムレイアウト
 * モバイル: 一番上に AIChatWidget / その下に iframe
 *
 * 単一の AIChatWidget インスタンスを CSS Grid の order で
 * モバイル/PC 間で位置を切り替える（状態が保持される）。
 */

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AIChatWidget } from '@/components/article/AIChatWidget';
import { useArticleBookmark } from '@/lib/article-bookmark-store';

interface Props {
  title:       string;
  slug:        string;
  htmlContent: string;
  /** AI チャット用：HTML から抽出したテキスト（先頭 6000 字） */
  pageContent: string;
}

const PAGE_SUGGESTED_QUESTIONS = [
  'このページの内容を要約して',
  '重要なポイントを3つ教えて',
  '初心者向けにわかりやすく説明して',
];

export function HtmlPageViewer({ title, slug, htmlContent, pageContent }: Props) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { saved, toggle: toggleBookmark, loading: bookmarkLoading, isLoggedIn } = useArticleBookmark(
    `pages/${slug}`,
    title,
  );

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!iframeRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await iframeRef.current.requestFullscreen();
      }
    } catch {
      window.open(`/pages/${slug}`, '_blank');
    }
  };

  return (
    <div style={{ width: '100%', height: 'calc(100vh - var(--header-height, 60px))', display: 'flex', flexDirection: 'column' }}>
      {/* ── 単一グリッド: order でモバイル/PC の位置を切替 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_304px]" style={{ flex: 1, minHeight: 0 }}>
        {/* AI チャット — モバイル: row 1 (order-1), PC: column 2 (order-2) */}
        <div className="order-1 lg:order-2" style={{ minHeight: 0 }}>
          <div className="lg:sticky" style={{ top: 'calc(var(--header-height, 60px) + 8px)' }}>
            <AIChatWidget
              articleTitle={title}
              articleSlug={slug}
              pageContent={pageContent}
              suggestedQuestions={PAGE_SUGGESTED_QUESTIONS}
              mode="simple"
            />
          </div>
        </div>

        {/* iframe カラム — モバイル: row 2 (order-2), PC: column 1 (order-1) */}
        <div className="order-2 lg:order-1" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          {/* サブヘッダー：タイトル + ブックマーク + 全画面ボタン */}
          <div
            style={{
              display:        'flex',
              flexDirection:  'row',
              alignItems:     'center',
              justifyContent: 'space-between',
              flexWrap:       'nowrap',
              padding:        '0 16px',
              height:         '36px',
              minHeight:      '36px',
              background:     'var(--washi-light)',
              borderBottom:   '1px solid var(--line)',
              flexShrink:     0,
            }}
          >
            {/* 左: タイトル + ブックマーク */}
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
              <span style={{
                fontSize:     '13px',
                fontWeight:   500,
                color:        'var(--sumi)',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}>
                {title}
              </span>

              {/* ブックマークボタン */}
              <button
                type="button"
                onClick={() => {
                  if (!isLoggedIn) { router.push('/auth/signin'); return; }
                  toggleBookmark();
                }}
                disabled={bookmarkLoading}
                title={saved ? 'ブックマークから外す' : 'ページをブックマーク'}
                aria-label={saved ? 'ブックマークから外す' : 'ページをブックマーク'}
                aria-pressed={saved}
                style={{
                  flexShrink:   0,
                  display:      'inline-flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  marginLeft:   '8px',
                  width:        '28px',
                  height:       '28px',
                  background:   saved ? 'var(--shu-soft)' : 'var(--washi)',
                  border:       `1px solid ${saved ? 'var(--shu)' : 'var(--line)'}`,
                  borderRadius: '6px',
                  color:        saved ? 'var(--shu)' : 'var(--sumi-soft)',
                  cursor:       bookmarkLoading ? 'wait' : 'pointer',
                  opacity:      bookmarkLoading ? 0.7 : 1,
                  transition:   'background 0.15s, color 0.15s, border-color 0.15s',
                  padding:      0,
                }}
              >
                {saved ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                )}
              </button>
            </div>

            {/* 右: 全画面ボタン */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? '全画面を終了' : '全画面表示'}
              style={{
                flexShrink:   0,
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '4px',
                marginLeft:   '12px',
                padding:      '4px 10px',
                fontSize:     '12px',
                background:   'var(--washi)',
                border:       '1px solid var(--line)',
                borderRadius: '6px',
                color:        'var(--sumi)',
                cursor:       'pointer',
                whiteSpace:   'nowrap',
              }}
            >
              {isFullscreen ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              )}
              {isFullscreen ? '終了' : '全画面'}
            </button>
          </div>

          {/* HTML 本体 */}
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title={title}
            sandbox="allow-scripts allow-forms allow-popups"
            style={{ flex: 1, width: '100%', border: 'none', minHeight: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
