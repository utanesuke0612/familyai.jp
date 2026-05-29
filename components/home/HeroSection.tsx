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
// 家族4人（父・母・子2人）がデバイスを囲む——「AI = 愛」の世界観を絵で伝える。
// 配置: 父（左奥・テラコッタ）母（右奥・ティール）
//       子1（前左・マスタード）子2（前右・オリーブ）
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

      {/* ── デバイス（中央）── */}
      <rect x="80" y="100" width="100" height="78" rx="7" fill="#2a1a12" opacity="0.88" />
      <rect x="86" y="106" width="88"  height="60" rx="4" fill="#1a2834" />
      <rect x="86" y="106" width="88"  height="60" rx="4" fill="url(#heroScreenGlow)" />
      {/* 画面中央の「愛」 */}
      <text
        x="130" y="143"
        textAnchor="middle"
        fontFamily="'Shippori Mincho','Noto Serif SC',serif"
        fontSize="28"
        fill="#d99a2b"
        opacity="0.95"
      >愛</text>
      {/* スタンド */}
      <rect x="121" y="178" width="18" height="4" rx="2"   fill="#2a1a12" opacity="0.50" />
      <rect x="109" y="182" width="42" height="3" rx="1.5" fill="#2a1a12" opacity="0.40" />

      {/* ── 父（左奥・テラコッタ）── */}
      <circle cx="60" cy="68" r="18" fill="#b8412a" opacity="0.86" />
      <path d="M42 88 Q60 78 78 88 L80 122 Q60 128 40 122 Z" fill="#b8412a" opacity="0.72" />
      {/* 腕 → デバイスへ */}
      <path
        d="M74 108 Q87 100 100 105"
        stroke="#b8412a" strokeWidth="6.5" strokeLinecap="round"
        fill="none" opacity="0.62"
      />

      {/* ── 母（右奥・ティール）── */}
      <circle cx="200" cy="68" r="18" fill="#1f5e62" opacity="0.86" />
      <path d="M182 88 Q200 78 218 88 L220 122 Q200 128 180 122 Z" fill="#1f5e62" opacity="0.72" />
      {/* 腕 → デバイスへ */}
      <path
        d="M186 108 Q173 100 160 105"
        stroke="#1f5e62" strokeWidth="6.5" strokeLinecap="round"
        fill="none" opacity="0.62"
      />

      {/* ── 子1（前左・マスタード）── */}
      <circle cx="88" cy="205" r="14" fill="#d99a2b" opacity="0.90" />
      <path d="M75 219 Q88 212 101 219 L101 250 Q88 254 75 250 Z" fill="#d99a2b" opacity="0.82" />
      {/* 画面を指さす小さな腕 */}
      <path
        d="M99 210 Q108 200 116 188"
        stroke="#d99a2b" strokeWidth="4.5" strokeLinecap="round"
        fill="none" opacity="0.50"
      />

      {/* ── 子2（前右・オリーブ）── */}
      <circle cx="172" cy="205" r="14" fill="#6f7a3a" opacity="0.88" />
      <path d="M159 219 Q172 212 185 219 L185 250 Q172 254 159 250 Z" fill="#6f7a3a" opacity="0.80" />
      {/* 画面を指さす小さな腕 */}
      <path
        d="M161 210 Q152 200 144 188"
        stroke="#6f7a3a" strokeWidth="4.5" strokeLinecap="round"
        fill="none" opacity="0.50"
      />

      {/* ── 画面の光の筋 ── */}
      <line x1="86"  y1="106" x2="52"  y2="76"  stroke="#d99a2b" strokeWidth="1" opacity="0.15" />
      <line x1="174" y1="106" x2="208" y2="76"  stroke="#d99a2b" strokeWidth="1" opacity="0.15" />
      <line x1="130" y1="106" x2="130" y2="68"  stroke="#d99a2b" strokeWidth="1" opacity="0.10" />

      {/* ── スパークル ── */}
      <text x="30"  y="50"  fontSize="13" fill="#d99a2b" opacity="0.60">✦</text>
      <text x="214" y="44"  fontSize="10" fill="#b8412a" opacity="0.48">✦</text>
      <text x="228" y="148" fontSize="9"  fill="#d99a2b" opacity="0.34">✦</text>
      <text x="20"  y="146" fontSize="9"  fill="#1f5e62" opacity="0.28">✦</text>
      <text x="126" y="36"  fontSize="8"  fill="#6f7a3a" opacity="0.32">✦</text>
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
