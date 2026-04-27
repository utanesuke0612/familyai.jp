/**
 * app/(site)/share/[id]/ShareButtons.tsx
 * うごくAI教室 — シェアボタン群（Client Component）
 *
 * X(Twitter)・LINE・リンクコピーで動画をシェアできる。
 */

'use client';

import { useState } from 'react';

export default function ShareButtons({
  shareUrl, theme, subjectColor,
}: {
  shareUrl:     string;
  theme:        string;
  subjectColor: string;
}) {
  const [copied, setCopied] = useState(false);

  // X(Twitter)シェア
  function shareToX() {
    const text = `「${theme}」をfamilyai.jp AI教室で学んでみた！🎬`;
    const url  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}&hashtags=familyai,AI教室`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  }

  // LINEシェア
  function shareToLine() {
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(`「${theme}」のアニメーション解説 ${shareUrl}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // リンクコピー
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック: input要素経由でコピー
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className="mt-6 rounded-3xl p-5 flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.85)', boxShadow: 'var(--shadow-warm-sm)' }}
    >
      <p className="text-sm font-bold" style={{ color: 'var(--color-brown)' }}>
        📤 友達にシェアする
      </p>
      <p className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
        URLを知っている人のみが見られます。検索エンジンには載りません。
      </p>
      <div className="flex flex-wrap gap-2">
        {/* X (Twitter) */}
        <button
          onClick={shareToX}
          className="rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
          style={{ background: '#000', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
        >
          𝕏 でシェア
        </button>

        {/* LINE */}
        <button
          onClick={shareToLine}
          className="rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
          style={{ background: '#06c755', color: '#fff', boxShadow: '0 2px 8px rgba(6,199,85,0.3)' }}
        >
          💬 LINE でシェア
        </button>

        {/* リンクコピー */}
        <button
          onClick={copyLink}
          className="rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
          style={{
            background: copied ? '#22c55e' : subjectColor,
            color:      '#fff',
            boxShadow:  '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {copied ? '✓ コピーしました!' : '🔗 リンクコピー'}
        </button>
      </div>
    </div>
  );
}
