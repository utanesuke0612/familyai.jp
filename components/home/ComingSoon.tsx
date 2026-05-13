'use client';

/**
 * components/home/ComingSoon.tsx
 * familyai.jp — Coming Soon ページ（本番環境のみ表示）
 * index-commingsoon.html を Next.js コンポーネントに移植
 */

import { useEffect } from 'react';

export function ComingSoon() {
  // ── カウントダウンタイマー ──────────────────────────────────
  useEffect(() => {
    const target = new Date('2026-05-08T00:00:00+09:00');

    function pad(n: number) { return String(n).padStart(2, '0'); }

    function tick() {
      const now  = new Date();
      const diff = target.getTime() - now.getTime();

      const ids = ['cd-d', 'cd-h', 'cd-m', 'cd-s'];

      if (diff <= 0) {
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.textContent = '00';
        });
        return;
      }

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000)  / 60000);
      const s = Math.floor((diff % 60000)    / 1000);

      const vals = [d, h, m, s];
      ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = pad(vals[i]);
      });
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* ── CSS ── */}
      <style>{`
        /* Coming Soon 表示中はページ全体のリンクをクリック無効化 */
        a {
          pointer-events: none !important;
          cursor: default !important;
        }

        .cs-body {
          font-family: 'Shippori Mincho', 'Zen Maru Gothic', serif;
          background: var(--washi, #F5EDDE);
          color: var(--sumi, #2A1A12);
          min-height: 100dvh;
          overflow-x: hidden;
          position: relative;
          -webkit-font-smoothing: antialiased;
        }
        .cs-body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        @keyframes cs-float     { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-10px)} }
        @keyframes cs-pulse     { 0%,100%{transform:scale(1);opacity:.5}  50%{transform:scale(1.1);opacity:.75} }
        @keyframes cs-pulseR    { 0%,100%{transform:scale(1);opacity:.4}  50%{transform:scale(1.08);opacity:.65} }
        @keyframes cs-blink     { 0%,100%{opacity:1} 50%{opacity:.2} }
        @keyframes cs-heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.18)} 28%{transform:scale(1)} 42%{transform:scale(1.12)} 70%{transform:scale(1)} }
        @keyframes cs-fadeUp    { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cs-ticker    { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

        .cs-blob { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; }
        .cs-blob1 {
          width: min(520px,90vw); height: min(520px,90vw);
          background: radial-gradient(circle, var(--washi-deep, #ECDFC9) 0%, transparent 70%);
          top: -15%; right: -10%;
          animation: cs-pulse 6s ease-in-out infinite;
        }
        .cs-blob2 {
          width: min(380px,70vw); height: min(380px,70vw);
          background: radial-gradient(circle, var(--washi-light, #FBF5E8) 0%, transparent 70%);
          bottom: -8%; left: -8%;
          animation: cs-pulseR 7s ease-in-out infinite 1s;
        }
        .cs-blob3 {
          width: min(240px,50vw); height: min(240px,50vw);
          background: radial-gradient(circle, var(--washi-deep, #ECDFC9) 0%, transparent 70%);
          top: 38%; left: 5%;
          animation: cs-pulse 8s ease-in-out infinite 2s;
        }

        .cs-page {
          position: relative; z-index: 1;
          min-height: 100dvh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: clamp(40px,8vw,72px) clamp(16px,5vw,40px) clamp(48px,8vw,72px);
        }

        .cs-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--washi-light, #FBF5E8); border: 1px solid var(--line, #C9B393); border-radius: 4px;
          padding: 6px 16px;
          font-size: clamp(11px,3vw,13px); font-weight: 400; color: var(--sumi-light, #6B5843);
          margin-bottom: clamp(20px,4vw,32px);
          animation: cs-fadeUp .5s ease both;
          white-space: nowrap;
          font-family: 'Shippori Mincho', serif;
          letter-spacing: .06em;
        }
        .cs-badge-dot {
          width: 6px; height: 6px; background: var(--shu, #D04A2E);
          border-radius: 50%; flex-shrink: 0;
          animation: cs-blink 1.5s ease-in-out infinite;
        }

        .cs-logo-wrap {
          display: flex; align-items: center; gap: clamp(10px,3vw,16px);
          margin-bottom: clamp(16px,4vw,28px);
          animation: cs-fadeUp .6s .08s ease both;
        }
        .cs-logo-icon {
          width: clamp(44px,10vw,64px); height: clamp(44px,10vw,64px);
          background: var(--shu, #D04A2E);
          border: 1px solid var(--shu-deep, #A8341F);
          border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          font-size: clamp(22px,5vw,32px);
          color: var(--washi, #F5EDDE);
          flex-shrink: 0;
        }
        .cs-logo-text {
          font-family: 'Shippori Mincho', serif;
          font-size: clamp(24px,6vw,44px); font-weight: 600;
          color: var(--sumi, #2A1A12); letter-spacing: .02em; white-space: nowrap;
        }
        .cs-logo-text span { color: var(--shu, #D04A2E); }

        .cs-tagline {
          font-family: 'Shippori Mincho', serif;
          font-size: clamp(12px,3.2vw,16px); font-weight: 400;
          color: var(--sumi-light, #6B5843); letter-spacing: .08em; text-align: center;
          margin-bottom: clamp(24px,5vw,40px);
          animation: cs-fadeUp .6s .15s ease both;
        }

        .cs-main-title {
          font-family: 'Shippori Mincho', serif;
          font-size: clamp(28px,7.5vw,64px); font-weight: 600; line-height: 1.4;
          color: var(--sumi, #2A1A12); text-align: center;
          margin-bottom: clamp(16px,3vw,24px);
          letter-spacing: .04em;
          animation: cs-fadeUp .6s .22s ease both;
        }
        .cs-highlight {
          color: var(--shu, #D04A2E); position: relative; display: inline-block;
        }
        .cs-highlight::after {
          content: ''; position: absolute;
          bottom: -4px; left: 0; right: 0;
          height: 1px;
          background: var(--shu, #D04A2E); z-index: -1;
          opacity: .6;
        }

        .cs-sub-msg {
          font-size: clamp(13px,3.5vw,18px); line-height: 2;
          color: var(--sumi-light, #6B5843); text-align: center;
          max-width: 520px; width: 100%;
          margin-bottom: clamp(32px,6vw,52px);
          font-family: 'Shippori Mincho', serif;
          animation: cs-fadeUp .6s .3s ease both;
        }

        .cs-release-card {
          background: var(--washi-light, #FBF5E8); border: 1px solid var(--line, #C9B393);
          border-radius: 4px;
          padding: clamp(24px,6vw,44px) clamp(20px,8vw,56px);
          text-align: center;
          margin-top: 0;
          margin-bottom: clamp(28px,5vw,44px);
          animation: cs-fadeUp .6s .1s ease both;
          max-width: 480px; width: 100%;
        }
        .cs-release-label {
          font-size: clamp(10px,2.5vw,12px); font-weight: 500;
          letter-spacing: .18em; color: var(--shu, #D04A2E); text-transform: uppercase;
          margin-bottom: 10px;
          font-family: 'Shippori Mincho', serif;
        }
        .cs-release-date {
          font-family: 'Shippori Mincho', serif;
          font-size: clamp(22px,6vw,40px); font-weight: 600;
          color: var(--sumi, #2A1A12); margin-bottom: 6px; line-height: 1.25;
          letter-spacing: .04em;
        }
        .cs-release-divider {
          width: 44px; height: 1px; background: var(--line, #C9B393);
          margin: 14px auto;
        }
        .cs-release-msg {
          font-size: clamp(13px,3.5vw,16px); color: var(--sumi-light, #6B5843); line-height: 1.9;
          font-family: 'Shippori Mincho', serif;
        }
        .cs-heart {
          display: inline-block; color: var(--shu, #D04A2E);
          font-size: clamp(14px,3.5vw,18px);
          animation: cs-heartbeat 2s ease-in-out infinite;
        }

        .cs-countdown {
          display: flex; gap: clamp(8px,2vw,16px);
          justify-content: center; flex-wrap: wrap;
          margin-top: clamp(18px,4vw,28px);
        }
        .cs-count-box {
          background: var(--washi, #F5EDDE); border: 1px solid var(--line, #C9B393);
          border-radius: 4px;
          padding: clamp(10px,2.5vw,16px) clamp(12px,3vw,22px);
          min-width: clamp(56px,14vw,76px); text-align: center;
          flex: 1; max-width: 90px;
        }
        .cs-count-num {
          font-family: 'Shippori Mincho', serif;
          font-size: clamp(22px,6vw,32px); font-weight: 600;
          color: var(--sumi, #2A1A12); line-height: 1; display: block;
        }
        .cs-count-label {
          font-size: clamp(9px,2.2vw,11px); color: var(--sumi-soft, #9A8470);
          font-weight: 400; margin-top: 4px; display: block; letter-spacing: .12em;
          font-family: 'Shippori Mincho', serif;
        }

        .cs-family-row {
          display: flex; gap: clamp(8px,2vw,14px); flex-wrap: wrap;
          justify-content: center;
          margin-bottom: clamp(32px,6vw,52px);
          animation: cs-fadeUp .6s .46s ease both;
          max-width: 560px; width: 100%;
        }
        .cs-fam-chip {
          background: var(--washi-light, #FBF5E8); border: 1px solid var(--line, #C9B393); border-radius: 4px;
          padding: clamp(7px,2vw,10px) clamp(12px,3vw,20px);
          display: flex; align-items: center; gap: clamp(5px,1.5vw,8px);
          font-size: clamp(12px,3vw,14px); font-weight: 400; color: var(--sumi, #2A1A12);
          font-family: 'Shippori Mincho', serif;
          transition: border-color .2s, background-color .2s;
          cursor: default;
        }
        .cs-fam-chip:hover {
          border-color: var(--shu, #D04A2E);
          background: var(--washi, #F5EDDE);
        }
        .cs-fam-chip .cs-icon { font-size: clamp(16px,4vw,20px); }

        .cs-ticker-wrap {
          width: 100%; overflow: hidden;
          margin-bottom: clamp(28px,5vw,44px);
          animation: cs-fadeUp .6s .62s ease both;
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
        .cs-ticker-inner {
          display: flex; width: max-content;
          animation: cs-ticker 24s linear infinite;
        }
        .cs-ticker-item {
          display: flex; align-items: center; gap: 10px;
          padding: 0 28px;
          font-size: clamp(12px,3vw,14px); font-weight: 400;
          color: var(--sumi-light, #6B5843); white-space: nowrap;
          font-family: 'Shippori Mincho', serif;
        }
        .cs-ticker-dot {
          width: 4px; height: 4px; background: var(--shu, #D04A2E);
          border-radius: 50%; opacity: .6; flex-shrink: 0;
        }

        .cs-preview-label {
          font-size: clamp(11px,3vw,13px); font-weight: 400; color: var(--sumi-light, #6B5843);
          margin-bottom: clamp(14px,3vw,20px); text-align: center;
          animation: cs-fadeUp .6s .52s ease both; letter-spacing: .08em;
          font-family: 'Shippori Mincho', serif;
        }
        .cs-sneak-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: clamp(8px,2vw,14px);
          max-width: 540px; width: 100%;
          margin-bottom: clamp(36px,7vw,56px);
          animation: cs-fadeUp .6s .58s ease both;
        }
        .cs-sneak-card {
          background: var(--washi-light, #FBF5E8); border: 1px solid var(--line, #C9B393);
          border-radius: 4px;
          padding: clamp(14px,4vw,22px) clamp(8px,2vw,14px);
          text-align: center;
          transition: border-color .2s, background-color .2s;
          cursor: default;
        }
        .cs-sneak-card:hover {
          border-color: var(--shu, #D04A2E);
          background: var(--washi, #F5EDDE);
        }
        .cs-sneak-card .cs-s-icon {
          font-size: clamp(22px,5.5vw,30px); display: block;
          margin-bottom: clamp(6px,1.5vw,10px);
        }
        .cs-sneak-card .cs-s-title {
          font-size: clamp(10px,2.5vw,12px); font-weight: 500;
          color: var(--sumi, #2A1A12); line-height: 1.4;
          font-family: 'Shippori Mincho', serif;
        }
        .cs-sneak-card .cs-s-tag {
          display: inline-block; margin-top: clamp(4px,1vw,6px);
          font-size: clamp(9px,2vw,11px); font-weight: 400;
          background: var(--washi-deep, #ECDFC9); color: var(--sumi-soft, #9A8470);
          padding: 2px 8px; border-radius: 4px;
          font-family: 'Shippori Mincho', serif;
        }

        .cs-footer-note {
          font-size: clamp(11px,2.8vw,13px); color: var(--sumi-soft, #9A8470);
          text-align: center; opacity: .9; line-height: 1.9;
          animation: cs-fadeUp .6s .68s ease both;
          font-family: 'Shippori Mincho', serif;
          letter-spacing: .06em;
        }

        @media (max-width: 480px) {
          .cs-sneak-grid { grid-template-columns: repeat(2, 1fr); }
          .cs-badge { white-space: normal; text-align: center; justify-content: center; }
        }
        @media (max-width: 360px) {
          .cs-logo-text { font-size: 20px; }
          .cs-countdown { gap: 6px; }
          .cs-count-box { min-width: 48px; padding: 8px 6px; }
        }
        @media (hover: none) {
          .cs-fam-chip:hover   { border-color: var(--line, #C9B393); background: var(--washi-light, #FBF5E8); }
          .cs-sneak-card:hover { border-color: var(--line, #C9B393); background: var(--washi-light, #FBF5E8); }
          .cs-fam-chip:active   { border-color: var(--shu, #D04A2E); }
          .cs-sneak-card:active { border-color: var(--shu, #D04A2E); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cs-blob1, .cs-blob2, .cs-blob3,
          .cs-logo-icon, .cs-heart, .cs-badge-dot,
          .cs-ticker-inner { animation: none; }
        }
      `}</style>

      <div className="cs-body">
        {/* 背景ブロブ */}
        <div className="cs-blob cs-blob1" aria-hidden="true" />
        <div className="cs-blob cs-blob2" aria-hidden="true" />
        <div className="cs-blob cs-blob3" aria-hidden="true" />

        <main className="cs-page">

          {/* リリースカード（最上部） */}
          <div className="cs-release-card">
            <div className="cs-release-label">🗓 Release Date</div>
            <div className="cs-release-date">2026年 5月 8日</div>
            <div className="cs-release-divider" />
            <div className="cs-release-msg">
              ただいま準備中です。<br />
              もうしばらくお待ちください <span className="cs-heart">♥</span>
            </div>
            <div className="cs-countdown" aria-label="リリースまでのカウントダウン">
              <div className="cs-count-box">
                <span className="cs-count-num" id="cd-d">--</span>
                <span className="cs-count-label">日</span>
              </div>
              <div className="cs-count-box">
                <span className="cs-count-num" id="cd-h">--</span>
                <span className="cs-count-label">時間</span>
              </div>
              <div className="cs-count-box">
                <span className="cs-count-num" id="cd-m">--</span>
                <span className="cs-count-label">分</span>
              </div>
              <div className="cs-count-box">
                <span className="cs-count-num" id="cd-s">--</span>
                <span className="cs-count-label">秒</span>
              </div>
            </div>
          </div>

          {/* バッジ */}
          <div className="cs-badge">
            <div className="cs-badge-dot" />
            AI = 愛 &mdash; 家族の幸せのために
          </div>

          {/* ロゴ */}
          <div className="cs-logo-wrap">
            <div className="cs-logo-icon" aria-hidden="true">🏠</div>
            <div className="cs-logo-text">family<span>ai</span>.jp</div>
          </div>

          <p className="cs-tagline">AI活用事例とAIツールのメディア</p>

          {/* メインタイトル */}
          <h1 className="cs-main-title">
            AIで、家族が<br />
            <span className="cs-highlight">もっと笑顔に</span>。
          </h1>

          <p className="cs-sub-msg">
            難しくない。怖くない。<br />
            日常にも仕事にも学習にも。<br />
            すぐ使えるAI活用法をお届けします。
          </p>

          {/* テーマチップ */}
          <div className="cs-family-row" role="list" aria-label="対応テーマ一覧">
            {[
              { icon: '📝', label: 'AI活用事例' },
              { icon: '🧰', label: 'AIツール' },
              { icon: '💼', label: '仕事効率化' },
              { icon: '📚', label: '学習サポート' },
              { icon: '🎨', label: '画像・音声' },
            ].map((item) => (
              <div key={item.label} className="cs-fam-chip" role="listitem">
                <span className="cs-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>

          {/* ティッカー */}
          <div className="cs-ticker-wrap" aria-hidden="true">
            <div className="cs-ticker-inner">
              {/* 2コピーでシームレスループ */}
              {[0, 1].map((copy) => (
                <div key={copy} style={{ display: 'contents' }}>
                  {['AI入門ガイド','Excel自動化','語学学習','献立提案','画像生成','議事録作成','宿題サポート','スマホ活用','健康相談','家計管理'].map((t) => (
                    <div key={`${copy}-${t}`} className="cs-ticker-item">
                      <div className="cs-ticker-dot" />
                      {t}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <p className="cs-preview-label">✨ こんなコンテンツをご用意しています</p>

          {/* スニークプレビュー */}
          <div className="cs-sneak-grid" role="list" aria-label="コンテンツ一覧">
            {[
              { icon: '💼', title: '仕事効率化',  tag: 'AI活用事例' },
              { icon: '🧰', title: 'おすすめAIツール', tag: 'AIツール' },
              { icon: '📚', title: '勉強・学習',  tag: 'AI活用事例' },
              { icon: '📱', title: 'スマホ活用',  tag: 'AI活用事例' },
              { icon: '🌏', title: '語学学習',    tag: 'AI活用事例' },
              { icon: '🎨', title: 'AI画像生成',  tag: 'AIツール' },
            ].map((item) => (
              <div key={item.title} className="cs-sneak-card" role="listitem">
                <span className="cs-s-icon" aria-hidden="true">{item.icon}</span>
                <div className="cs-s-title">{item.title}</div>
                <span className="cs-s-tag">{item.tag}</span>
              </div>
            ))}
          </div>

          {/* フッター */}
          <p className="cs-footer-note">
            &copy; 2026 familyai.jp &nbsp;&mdash;&nbsp; AI = 愛<br />
            家族の幸せのために、テクノロジーを人間の言葉で語る
          </p>

        </main>
      </div>
    </>
  );
}
