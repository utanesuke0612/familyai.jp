'use client';

/**
 * components/pages/HtmlPageViewer.tsx
 * familyai.jp — HTML ページビューア
 */

import { useRef, useState, useEffect } from 'react';

interface Props {
  title:       string;
  slug:        string;
  htmlContent: string;
}

export function HtmlPageViewer({ title, slug, htmlContent }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      {/* 薄いサブヘッダー：タイトル + 全画面ボタン */}
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
        {/* タイトルのみ */}
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

        {/* 全画面ボタン */}
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
  );
}
