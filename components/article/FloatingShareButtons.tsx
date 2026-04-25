'use client';

/**
 * components/article/FloatingShareButtons.tsx
 * familyai.jp — 記事ページ フローティングシェアボタン
 *
 * - 画面右下に fixed 配置、スクロール中も常時表示
 * - X（Twitter）と LINE を縦に並べる
 * - スクロール量が一定以上になってから表示（UX 配慮）
 */

import { useEffect, useState } from 'react';

interface FloatingShareButtonsProps {
  title: string;
  url:   string;
}

export function FloatingShareButtons({ title, url }: FloatingShareButtonsProps) {
  const [visible, setVisible] = useState(false);

  // 200px スクロールしたら表示
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const xUrl   = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&via=familyaijp`;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(title + '\n' + url)}`;

  return (
    <div
      className="fixed z-40 flex flex-col gap-2 transition-all duration-300"
      style={{
        right:   '16px',
        bottom:  '100px',
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(12px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      aria-label="シェアボタン"
    >
      {/* X でシェア */}
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold shadow-lg transition-transform hover:scale-105 active:scale-95 min-h-[44px]"
        style={{ background: '#1DA1F2', color: 'white', whiteSpace: 'nowrap' }}
        aria-label="X（Twitter）でシェア"
      >
        <span aria-hidden="true" style={{ fontSize: '15px' }}>𝕏</span>
        <span>でシェア</span>
      </a>

      {/* LINE でシェア */}
      <a
        href={lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold shadow-lg transition-transform hover:scale-105 active:scale-95 min-h-[44px]"
        style={{ background: '#06C755', color: 'white', whiteSpace: 'nowrap' }}
        aria-label="LINEでシェア"
      >
        <span aria-hidden="true" style={{ fontSize: '15px' }}>💬</span>
        <span>LINE でシェア</span>
      </a>
    </div>
  );
}
