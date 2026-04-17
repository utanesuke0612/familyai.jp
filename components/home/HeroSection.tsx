'use client';

/**
 * components/home/HeroSection.tsx
 * familyai.jp — トップページ ヒーローセクション
 *
 * - 2カラムグリッド（テキスト左・ビジュアル右）
 * - blob 背景装飾（peach / sky グラデーション）
 * - 右カラム：中央 AI カード + 四隅に家族カード（float アニメーション）
 */

import Link from 'next/link';

// ── 家族カード データ ──────────────────────────────────────────
const FAMILY_CARDS = [
  {
    id:       'papa',
    emoji:    '👨',
    label:    'パパ',
    desc:     '仕事効率化',
    position: 'top-0 left-0 -translate-x-1/4 -translate-y-1/4',
    delay:    '0s',
    bg:       'var(--color-papa-bg)',
    border:   'var(--color-papa-border)',
  },
  {
    id:       'mama',
    emoji:    '👩',
    label:    'ママ',
    desc:     '家事・育児',
    position: 'top-0 right-0 translate-x-1/4 -translate-y-1/4',
    delay:    '0.8s',
    bg:       'var(--color-mama-bg)',
    border:   'var(--color-mama-border)',
  },
  {
    id:       'kids',
    emoji:    '🧒',
    label:    'こども',
    desc:     '勉強・創作',
    position: 'bottom-0 left-0 -translate-x-1/4 translate-y-1/4',
    delay:    '1.6s',
    bg:       'var(--color-kids-bg)',
    border:   'var(--color-kids-border)',
  },
  {
    id:       'senior',
    emoji:    '👴',
    label:    'シニア',
    desc:     'スマホ活用',
    position: 'bottom-0 right-0 translate-x-1/4 translate-y-1/4',
    delay:    '2.4s',
    bg:       'var(--color-senior-bg)',
    border:   'var(--color-senior-border)',
  },
] as const;

export function HeroSection() {
  return (
    <section
      className="hero-bg noise-bg relative overflow-hidden"
      style={{ minHeight: '92vh' }}
      aria-label="ヒーローセクション"
    >
      {/* ── Blob 背景装飾 ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-120px', right: '-120px',
          width: '600px', height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,212,178,0.55) 0%, transparent 70%)',
          animation: 'pulse-soft 7s ease-in-out infinite',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-80px', left: '-80px',
          width: '400px', height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,232,248,0.50) 0%, transparent 70%)',
          animation: 'pulse-soft 9s ease-in-out infinite reverse',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '40%', left: '40%',
          width: '300px', height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(184,237,216,0.30) 0%, transparent 70%)',
          animation: 'float 11s ease-in-out infinite',
        }}
        aria-hidden="true"
      />

      {/* ── メインコンテンツ ── */}
      <div
        className="relative max-w-container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        style={{
          paddingInline: 'var(--container-px)',
          paddingBlock:  'clamp(64px, 10vw, 112px)',
        }}
      >

        {/* ── 左カラム：テキスト ── */}
        <div className="flex flex-col gap-7 lg:pr-8">

          {/* バッジ */}
          <div
            className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full shadow-warm-sm animate-fade-in-up"
            style={{ background: 'white', border: '1px solid var(--color-beige-dark)' }}
          >
            <span
              className="w-2 h-2 rounded-full animate-blink shrink-0"
              style={{ background: 'var(--color-orange)' }}
              aria-hidden="true"
            />
            <span className="text-sm font-medium" style={{ color: 'var(--color-brown)' }}>
              AI = 愛 — 家族の幸せのために
            </span>
          </div>

          {/* タイトル */}
          <h1
            className="font-display font-bold leading-tight animate-fade-in-up delay-100 text-balance"
            style={{ fontSize: 'var(--text-hero)', color: 'var(--color-brown)' }}
          >
            AIは、家族を<br />
            {/* "もっと幸せに" ハイライト */}
            <span className="relative inline-block">
              <span className="relative z-10">もっと幸せに</span>
              <span
                className="absolute inset-x-0 bottom-1 h-4 rounded-sm -z-0"
                style={{
                  background: 'var(--color-yellow)',
                  opacity: 0.7,
                  transform: 'skewX(-3deg)',
                }}
                aria-hidden="true"
              />
            </span>
            <br />
            する道具。
          </h1>

          {/* サブコピー */}
          <p
            className="leading-relaxed animate-fade-in-up delay-200 text-pretty"
            style={{
              fontSize: 'var(--text-lead)',
              color:    'var(--color-brown-light)',
            }}
          >
            難しくない。怖くない。<br />
            パパも、ママも、お子さんも、シニアも。<br />
            家族みんなで使えるAI活用法をお届けします。
          </p>

          {/* CTA ボタン */}
          <div className="flex flex-wrap gap-4 animate-fade-in-up delay-300">
            <Link href="/learn" className="btn-primary animate-pulse-glow text-base px-7 py-3.5">
              🚀 まず読んでみる
            </Link>
            <Link href="#role-picker" className="btn-secondary text-base px-7 py-3.5">
              🎯 自分に合った使い方を探す
            </Link>
          </div>

          {/* 数字バッジ（信頼感） */}
          <div className="flex flex-wrap gap-5 pt-2 animate-fade-in-up delay-400">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col">
                <span
                  className="font-display font-bold text-2xl"
                  style={{ color: 'var(--color-orange)' }}
                >
                  {s.value}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 右カラム：ビジュアル ── */}
        <div
          className="relative hidden lg:flex items-center justify-center animate-fade-in-up delay-200"
          style={{ width: '100%', aspectRatio: '1 / 1', maxWidth: '420px', margin: '0 auto' }}
          aria-hidden="true"
        >
          {/* 中央 AI カード */}
          <div
            className="relative z-10 flex flex-col items-center justify-center gap-3 w-36 h-36 rounded-3xl shadow-orange animate-float"
            style={{
              background: 'linear-gradient(135deg, var(--color-peach) 0%, var(--color-orange) 100%)',
            }}
          >
            <span className="text-5xl">🤖</span>
            <span className="font-display font-bold text-white text-sm tracking-wide">
              AI = 愛
            </span>
          </div>

          {/* 四隅の家族カード */}
          {FAMILY_CARDS.map((card) => (
            <div
              key={card.id}
              className={`absolute ${card.position} flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl shadow-warm cursor-pointer`}
              style={{
                background:      card.bg,
                border:          `2px solid ${card.border}`,
                animationName:   'float',
                animationDuration: '6s',
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay:  card.delay,
                transition:      'transform 200ms var(--ease-bounce)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  `scale(1.06) rotate(-1deg) translateX(${card.position.includes('right') ? '25%' : '-25%'}) translateY(${card.position.includes('bottom') ? '25%' : '-25%'})`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
            >
              <span className="text-3xl">{card.emoji}</span>
              <span
                className="font-bold text-xs"
                style={{ color: 'var(--color-brown)' }}
              >
                {card.label}
              </span>
              <span
                className="text-xs"
                style={{ color: 'var(--color-brown-light)' }}
              >
                {card.desc}
              </span>
            </div>
          ))}

          {/* 装飾：背景の薄い円 */}
          <div
            className="absolute inset-0 rounded-full opacity-20 animate-morph"
            style={{ background: 'radial-gradient(circle, var(--color-peach-light) 0%, transparent 70%)' }}
          />
        </div>

      </div>

      {/* ── スクロール誘導 ── */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in-up delay-500"
        aria-hidden="true"
      >
        <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
          スクロール
        </span>
        <div
          className="w-5 h-8 rounded-full border-2 flex items-start justify-center pt-1.5"
          style={{ borderColor: 'var(--color-beige-dark)' }}
        >
          <div
            className="w-1 h-2 rounded-full animate-bounce"
            style={{ background: 'var(--color-orange)' }}
          />
        </div>
      </div>
    </section>
  );
}

// ── 統計データ ─────────────────────────────────────────────────
const STATS = [
  { value: '100+',  label: 'AI活用事例' },
  { value: '4',     label: '家族ロール対応' },
  { value: '無料',  label: '基本機能すべて' },
] as const;
