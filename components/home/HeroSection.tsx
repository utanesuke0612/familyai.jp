/**
 * components/home/HeroSection.tsx
 * familyai.jp — トップページ ヒーローセクション
 *
 * Rev41: familyaidesign casual 完成 — polaroid イラスト追加
 * - デスクトップ: 2 カラム（テキスト左 | polaroid 右）
 * - モバイル: 1 カラム（テキスト → polaroid）
 * - FamilyAIIllustration: 家族3人がデバイスを囲む SVG（素材ゼロのためインライン生成）
 * - 'use client' 不要（CSS のみで hover 制御）
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// ── 西暦 → 漢数字（出版風メタ用）────────────────────────────
const KANJI_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;
function toKanjiNumber(n: number): string {
  return String(n)
    .split('')
    .map((d) => KANJI_DIGITS[parseInt(d, 10)] ?? d)
    .join('');
}

// ── polaroid に入れるイラスト ──────────────────────────────
// 家族3人（テラコッタ・ティール・マスタード）がデバイスを囲み、
// 画面に「愛」と輝く——「AI = 愛」の世界観を絵で伝える。
function FamilyAIIllustration() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 260 260"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="heroScreenGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#d99a2b" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1a2a3a" stopOpacity="0"    />
        </radialGradient>
        <radialGradient id="heroBgWarm" cx="30%" cy="20%" r="70%">
          <stop offset="0%"   stopColor="#fdf6e8" stopOpacity="1" />
          <stop offset="100%" stopColor="#f0e4cc" stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* 背景 */}
      <rect width="260" height="260" fill="url(#heroBgWarm)" />

      {/* コーナーマーク（製図風） */}
      <rect x="14" y="14" width="14" height="1.5" fill="#c9b393" />
      <rect x="14" y="14" width="1.5" height="14" fill="#c9b393" />
      <rect x="232" y="14" width="14" height="1.5" fill="#c9b393" />
      <rect x="244.5" y="14" width="1.5" height="14" fill="#c9b393" />
      <rect x="14"   y="244.5" width="14" height="1.5" fill="#c9b393" />
      <rect x="14"   y="232"   width="1.5" height="14" fill="#c9b393" />
      <rect x="232" y="244.5" width="14" height="1.5" fill="#c9b393" />
      <rect x="244.5" y="232" width="1.5" height="14" fill="#c9b393" />

      {/* デバイス本体 */}
      <rect x="74" y="108" width="112" height="82" rx="7" fill="#2a1a12" opacity="0.88" />
      {/* スクリーン */}
      <rect x="80" y="114" width="100" height="64" rx="4" fill="#1a2834" />
      <rect x="80" y="114" width="100" height="64" rx="4" fill="url(#heroScreenGlow)" />
      {/* 画面中央の「愛」— テラコッタ × マスタードの輝き */}
      <text
        x="130" y="154"
        textAnchor="middle"
        fontFamily="'Shippori Mincho','Noto Serif SC',serif"
        fontSize="30"
        fill="#d99a2b"
        opacity="0.95"
      >愛</text>
      {/* スタンド */}
      <rect x="119" y="190" width="22" height="5"  rx="2.5" fill="#2a1a12" opacity="0.5"  />
      <rect x="106" y="195" width="48" height="4"  rx="2"   fill="#2a1a12" opacity="0.4"  />

      {/* 人物 左（テラコッタ＝情熱・ぬくもり） */}
      <circle cx="72"  cy="75" r="20" fill="#b8412a" opacity="0.85" />
      <path d="M51 97 Q72 87 93 97 L95 134 Q72 140 49 134 Z" fill="#b8412a" opacity="0.70" />
      {/* 腕 → デバイスへ */}
      <path
        d="M88 118 Q102 110 114 114"
        stroke="#b8412a" strokeWidth="7" strokeLinecap="round"
        fill="none" opacity="0.60"
      />

      {/* 人物 右（ティール＝信頼・冷静） */}
      <circle cx="188" cy="75" r="20" fill="#1f5e62" opacity="0.85" />
      <path d="M167 97 Q188 87 209 97 L211 134 Q188 140 165 134 Z" fill="#1f5e62" opacity="0.70" />
      {/* 腕 → デバイスへ */}
      <path
        d="M172 118 Q158 110 146 114"
        stroke="#1f5e62" strokeWidth="7" strokeLinecap="round"
        fill="none" opacity="0.60"
      />

      {/* 人物 中央（マスタード＝子ども・好奇心・未来） */}
      <circle cx="130" cy="208" r="16" fill="#d99a2b" opacity="0.90" />
      <path d="M116 224 Q130 216 144 224 L144 252 Q130 256 116 252 Z" fill="#d99a2b" opacity="0.82" />

      {/* 画面の光の筋（アンビエント感） */}
      <line x1="80"  y1="114" x2="50"  y2="82"  stroke="#d99a2b" strokeWidth="1" opacity="0.16" />
      <line x1="180" y1="114" x2="210" y2="82"  stroke="#d99a2b" strokeWidth="1" opacity="0.16" />
      <line x1="130" y1="114" x2="130" y2="72"  stroke="#d99a2b" strokeWidth="1" opacity="0.12" />

      {/* スパークル（casual 必須装飾） */}
      <text x="36"  y="52"  fontSize="14" fill="#d99a2b" opacity="0.62">✦</text>
      <text x="208" y="46"  fontSize="11" fill="#b8412a" opacity="0.50">✦</text>
      <text x="226" y="152" fontSize="9"  fill="#d99a2b" opacity="0.36">✦</text>
      <text x="22"  y="150" fontSize="9"  fill="#1f5e62" opacity="0.30">✦</text>
      <text x="124" y="38"  fontSize="8"  fill="#b8412a" opacity="0.28">✦</text>
    </svg>
  );
}

// ── メインコンポーネント ───────────────────────────────────
export function HeroSection() {
  const today  = new Date();
  const yearK  = toKanjiNumber(today.getFullYear());
  const monthK = toKanjiNumber(today.getMonth() + 1);

  return (
    <section aria-label="ヒーローセクション" className="relative">

      {/* ── 出版風メタバンド ── */}
      <div
        className="flex items-center justify-between py-3"
        style={{
          borderTop:     '1px solid var(--line)',
          borderBottom:  '1px solid var(--line-soft)',
          paddingInline: 'var(--container-px)',
        }}
      >
        <span className="serial">
          <span style={{ color: 'var(--sumi-light)' }}>FAMILY</span>
          <span style={{ color: 'var(--shu)' }}>AI</span>
          <span style={{ color: 'var(--sumi-light)' }}>.JP — AI = 愛</span>
        </span>
        <span className="serial">VOL.01 — {yearK}年{monthK}月</span>
      </div>

      {/* ── メインヒーロー ── */}
      <div
        className="relative max-w-container mx-auto"
        style={{
          paddingInline: 'var(--container-px)',
          paddingBlock:  'clamp(48px, 7vw, 88px)',
        }}
      >
        {/*
         * 2 カラムグリッド
         * - md 以上: [テキスト列 1fr] [polaroid auto]
         * - sm 以下: 1 列（テキスト → polaroid）
         */}
        <div className="grid md:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">

          {/* ─ 左カラム: テキスト + CTA ─ */}
          <div>
            {/* タイトル */}
            <h1
              className="font-mincho leading-[1.3] text-center md:text-left animate-fade-in-up"
              style={{
                fontSize:   'clamp(34px, 5.5vw, 60px)',
                fontWeight: 500,
                color:      'var(--sumi)',
              }}
            >
              AIは、家族を<br />
              <span style={{ color: 'var(--terracotta)' }}>
                もっと<span className="hl">幸せ</span>に
              </span><br />
              する道具。
            </h1>

            {/* 飾り罫（波線 + ⁂） */}
            <div
              className="flex items-center gap-4 my-8 animate-fade-in-up delay-100 justify-center md:justify-start"
              aria-hidden="true"
            >
              <span className="rule-wavy rule-wavy-shu" />
              <span className="ornament ornament-shu" style={{ fontSize: '18px' }}>⁂</span>
              <span className="rule-wavy rule-wavy-shu" />
            </div>

            {/* サブコピー */}
            <p
              className="leading-relaxed animate-fade-in-up delay-200 text-center md:text-left"
              style={{
                fontSize: 'var(--text-lead)',
                color:    'var(--sumi-light)',
              }}
            >
              難しくない。怖くない。<br />
              仕事にも、暮らしにも、学習にも。<br />
              今日から使えるAI活用法をお届けします。
            </p>

            {/* CTA 2 個 */}
            <div className="flex flex-wrap gap-3 mt-8 animate-fade-in-up delay-300 justify-center md:justify-start">
              <Link href="/tools" className="btn-mingei group">
                <span className="serial" style={{ opacity: 0.6 }}>01.</span>
                <span>AIツールを開く</span>
                <ArrowRight
                  strokeWidth={1.5}
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link href="/learn" className="btn-mingei btn-mingei-outline group">
                <span className="serial" style={{ opacity: 0.6 }}>02.</span>
                <span>記事を読む</span>
                <ArrowRight
                  strokeWidth={1.5}
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          {/* ─ 右カラム: polaroid ─ */}
          {/* aria-hidden: 装飾イラストのためスクリーンリーダーから除外 */}
          <div
            className="flex justify-center mt-10 md:mt-0 animate-fade-in-up delay-200"
            aria-hidden="true"
          >
            <div
              className="polaroid"
              style={{
                transform: 'rotate(-3deg)',
                width:     'min(240px, 68vw)',
                flexShrink: 0,
              }}
            >
              {/* マスキングテープ */}
              <div className="tape" />
              {/* 正方形フレーム */}
              <div
                className="frame"
                style={{ aspectRatio: '1 / 1', width: '100%' }}
              >
                <FamilyAIIllustration />
              </div>
              {/* 手書きキャプション */}
              <div className="cap">AI = 愛</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
