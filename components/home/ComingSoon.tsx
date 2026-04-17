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
          font-family: 'Zen Maru Gothic', sans-serif;
          background: var(--color-cream, #FDF6ED);
          color: #8B5E3C;
          min-height: 100dvh;
          overflow-x: hidden;
          position: relative;
          -webkit-font-smoothing: antialiased;
        }
        .cs-body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.032'/%3E%3C/svg%3E");
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
          background: radial-gradient(circle, #FFD4B2 0%, transparent 70%);
          top: -15%; right: -10%;
          animation: cs-pulse 6s ease-in-out infinite;
        }
        .cs-blob2 {
          width: min(380px,70vw); height: min(380px,70vw);
          background: radial-gradient(circle, #C8E8F8 0%, transparent 70%);
          bottom: -8%; left: -8%;
          animation: cs-pulseR 7s ease-in-out infinite 1s;
        }
        .cs-blob3 {
          width: min(240px,50vw); height: min(240px,50vw);
          background: radial-gradient(circle, #B8EDD8 0%, transparent 70%);
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
          background: #fff; border: 2px solid #E8CFA8; border-radius: 999px;
          padding: 6px 16px;
          font-size: clamp(11px,3vw,13px); font-weight: 500; color: #B5896A;
          margin-bottom: clamp(20px,4vw,32px);
          animation: cs-fadeUp .5s ease both;
          box-shadow: 0 2px 12px rgba(139,94,60,.08);
          white-space: nowrap;
        }
        .cs-badge-dot {
          width: 8px; height: 8px; background: #FF8C42;
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
          background: linear-gradient(135deg, #FFAD80, #FF8C42);
          border-radius: clamp(12px,3vw,20px);
          display: flex; align-items: center; justify-content: center;
          font-size: clamp(22px,5vw,32px);
          box-shadow: 0 6px 20px rgba(255,140,66,.38);
          animation: cs-float 3.5s ease-in-out infinite;
          flex-shrink: 0;
        }
        .cs-logo-text {
          font-family: 'Kaisei Opti', serif;
          font-size: clamp(24px,6vw,44px); font-weight: 700;
          color: #8B5E3C; letter-spacing: -.5px; white-space: nowrap;
        }
        .cs-logo-text span { color: #FF8C42; }

        .cs-tagline {
          font-family: 'Kaisei Opti', serif;
          font-size: clamp(12px,3.2vw,16px); font-weight: 400;
          color: #B5896A; letter-spacing: .04em; text-align: center;
          margin-bottom: clamp(24px,5vw,40px);
          animation: cs-fadeUp .6s .15s ease both;
        }

        .cs-main-title {
          font-family: 'Kaisei Opti', serif;
          font-size: clamp(28px,7.5vw,64px); font-weight: 700; line-height: 1.25;
          color: #8B5E3C; text-align: center;
          margin-bottom: clamp(16px,3vw,24px);
          animation: cs-fadeUp .6s .22s ease both;
        }
        .cs-highlight {
          color: #FF8C42; position: relative; display: inline-block;
        }
        .cs-highlight::after {
          content: ''; position: absolute;
          bottom: 2px; left: 0; right: 0;
          height: clamp(6px,1.5vw,11px);
          background: #FFE066; z-index: -1;
          border-radius: 4px; opacity: .55;
        }

        .cs-sub-msg {
          font-size: clamp(13px,3.5vw,18px); line-height: 1.9;
          color: #B5896A; text-align: center;
          max-width: 520px; width: 100%;
          margin-bottom: clamp(32px,6vw,52px);
          animation: cs-fadeUp .6s .3s ease both;
        }

        .cs-release-card {
          background: #fff; border: 2px solid #E8CFA8;
          border-radius: clamp(20px,5vw,32px);
          padding: clamp(24px,6vw,44px) clamp(20px,8vw,56px);
          text-align: center; box-shadow: 0 8px 40px rgba(139,94,60,.09);
          /* 最上部に移動したため上マージンを追加、下マージンは既存維持 */
          margin-top: 0;
          margin-bottom: clamp(28px,5vw,44px);
          animation: cs-fadeUp .6s .1s ease both;
          max-width: 480px; width: 100%;
        }
        .cs-release-label {
          font-size: clamp(10px,2.5vw,12px); font-weight: 700;
          letter-spacing: .12em; color: #FF8C42; text-transform: uppercase;
          margin-bottom: 10px;
        }
        .cs-release-date {
          font-family: 'Kaisei Opti', serif;
          font-size: clamp(22px,6vw,40px); font-weight: 700;
          color: #8B5E3C; margin-bottom: 6px; line-height: 1.15;
        }
        .cs-release-divider {
          width: 44px; height: 3px; background: #FF8C42;
          border-radius: 2px; margin: 14px auto; opacity: .5;
        }
        .cs-release-msg {
          font-size: clamp(13px,3.5vw,16px); color: #B5896A; line-height: 1.8;
        }
        .cs-heart {
          display: inline-block; color: #FF8C42;
          font-size: clamp(14px,3.5vw,18px);
          animation: cs-heartbeat 2s ease-in-out infinite;
        }

        .cs-countdown {
          display: flex; gap: clamp(8px,2vw,16px);
          justify-content: center; flex-wrap: wrap;
          margin-top: clamp(18px,4vw,28px);
        }
        .cs-count-box {
          background: #F5E6D0; border-radius: clamp(10px,3vw,16px);
          padding: clamp(10px,2.5vw,16px) clamp(12px,3vw,22px);
          min-width: clamp(56px,14vw,76px); text-align: center;
          flex: 1; max-width: 90px;
        }
        .cs-count-num {
          font-family: 'Kaisei Opti', serif;
          font-size: clamp(22px,6vw,32px); font-weight: 700;
          color: #FF8C42; line-height: 1; display: block;
        }
        .cs-count-label {
          font-size: clamp(9px,2.2vw,11px); color: #B5896A;
          font-weight: 500; margin-top: 4px; display: block; letter-spacing: .06em;
        }

        .cs-family-row {
          display: flex; gap: clamp(8px,2vw,14px); flex-wrap: wrap;
          justify-content: center;
          margin-bottom: clamp(32px,6vw,52px);
          animation: cs-fadeUp .6s .46s ease both;
          max-width: 560px; width: 100%;
        }
        .cs-fam-chip {
          background: #fff; border: 2px solid #E8CFA8; border-radius: 999px;
          padding: clamp(7px,2vw,10px) clamp(12px,3vw,20px);
          display: flex; align-items: center; gap: clamp(5px,1.5vw,8px);
          font-size: clamp(12px,3vw,14px); font-weight: 500; color: #8B5E3C;
          box-shadow: 0 2px 10px rgba(139,94,60,.07);
          transition: transform .2s, box-shadow .2s, border-color .2s;
          cursor: default;
        }
        .cs-fam-chip:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(255,140,66,.2);
          border-color: #FF8C42;
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
          font-size: clamp(12px,3vw,14px); font-weight: 500;
          color: #B5896A; white-space: nowrap;
        }
        .cs-ticker-dot {
          width: 5px; height: 5px; background: #FF8C42;
          border-radius: 50%; opacity: .6; flex-shrink: 0;
        }

        .cs-preview-label {
          font-size: clamp(11px,3vw,13px); font-weight: 500; color: #B5896A;
          margin-bottom: clamp(14px,3vw,20px); text-align: center;
          animation: cs-fadeUp .6s .52s ease both; letter-spacing: .04em;
        }
        .cs-sneak-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: clamp(8px,2vw,14px);
          max-width: 540px; width: 100%;
          margin-bottom: clamp(36px,7vw,56px);
          animation: cs-fadeUp .6s .58s ease both;
        }
        .cs-sneak-card {
          background: #fff; border: 2px solid #E8CFA8;
          border-radius: clamp(14px,4vw,22px);
          padding: clamp(14px,4vw,22px) clamp(8px,2vw,14px);
          text-align: center;
          transition: transform .2s, box-shadow .2s, border-color .2s;
          cursor: default;
        }
        .cs-sneak-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(255,140,66,.18);
          border-color: #FFAD80;
        }
        .cs-sneak-card .cs-s-icon {
          font-size: clamp(22px,5.5vw,30px); display: block;
          margin-bottom: clamp(6px,1.5vw,10px);
        }
        .cs-sneak-card .cs-s-title {
          font-size: clamp(10px,2.5vw,12px); font-weight: 700;
          color: #8B5E3C; line-height: 1.4;
        }
        .cs-sneak-card .cs-s-tag {
          display: inline-block; margin-top: clamp(4px,1vw,6px);
          font-size: clamp(9px,2vw,11px); font-weight: 500;
          background: #F5E6D0; color: #B5896A;
          padding: 2px 8px; border-radius: 999px;
        }

        .cs-footer-note {
          font-size: clamp(11px,2.8vw,13px); color: #B5896A;
          text-align: center; opacity: .75; line-height: 1.8;
          animation: cs-fadeUp .6s .68s ease both;
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
          .cs-fam-chip:hover   { transform: none; box-shadow: 0 2px 10px rgba(139,94,60,.07); border-color: #E8CFA8; }
          .cs-sneak-card:hover { transform: none; box-shadow: none; border-color: #E8CFA8; }
          .cs-fam-chip:active   { transform: translateY(-2px); border-color: #FF8C42; }
          .cs-sneak-card:active { transform: translateY(-2px); border-color: #FFAD80; }
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

          <p className="cs-tagline">家族みんなのAI活用メディア</p>

          {/* メインタイトル */}
          <h1 className="cs-main-title">
            AIで、家族が<br />
            <span className="cs-highlight">もっと笑顔に</span>。
          </h1>

          <p className="cs-sub-msg">
            難しくない。怖くない。<br />
            パパも、ママも、子どもも、シニアも。<br />
            家族全員が使えるAI活用法をお届けします。
          </p>

          {/* ファミリーチップ */}
          <div className="cs-family-row" role="list" aria-label="対応ロール一覧">
            {[
              { icon: '👨', label: 'パパ向け' },
              { icon: '👩', label: 'ママ向け' },
              { icon: '🧒', label: '子ども向け' },
              { icon: '👴', label: 'シニア向け' },
              { icon: '🏠', label: '共通ガイド' },
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
              { icon: '💼', title: '仕事効率化',  tag: 'パパ向け' },
              { icon: '🍳', title: '家事・育児',  tag: 'ママ向け' },
              { icon: '📚', title: '勉強・学習',  tag: '子ども向け' },
              { icon: '📱', title: 'スマホ活用',  tag: 'シニア向け' },
              { icon: '🌏', title: '語学学習',    tag: '全員向け' },
              { icon: '🎨', title: 'AI画像生成',  tag: '全員向け' },
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
