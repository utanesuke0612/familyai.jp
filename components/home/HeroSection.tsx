/**
 * components/home/HeroSection.tsx
 * familyai.jp — トップページ ヒーローセクション（Rev40 Phase C/H: Mingei リファクタ）
 *
 * - 出版風メタバンド（VOL.01 — 二〇二六年五月 等）
 * - センター揃え縦組タイトル（Shippori Mincho・朱色アクセント1単語）
 * - btn-mingei 2 CTA（通し番号 + ArrowRight）
 *
 * Rev40 Phase H で目次セクション + 奥付風 stat row を撤廃（重複情報削減）。
 * カテゴリ一覧は /learn 側、ツール一覧は ToolsListSection 側で提供。
 *
 * 中央+4隅クラスター・floating blob・絵文字・黄色マーカーアンダーラインを撤廃。
 * 'use client' は不要（CSS のみで hover 制御）。
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// ── 西暦 → 漢数字（出版風メタ用）─────────────────────────
const KANJI_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;
function toKanjiNumber(n: number): string {
  return String(n)
    .split('')
    .map((d) => KANJI_DIGITS[parseInt(d, 10)] ?? d)
    .join('');
}

export function HeroSection() {
  const today  = new Date();
  const yearK  = toKanjiNumber(today.getFullYear());
  const monthK = toKanjiNumber(today.getMonth() + 1);

  return (
    <section aria-label="ヒーローセクション" className="relative">

      {/* ─── 出版風メタバンド（上下罫線で囲む薄帯）── */}
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

      {/* ─── メインヒーロー本体 ── */}
      <div
        className="relative max-w-container mx-auto"
        style={{
          paddingInline: 'var(--container-px)',
          paddingBlock:  'clamp(56px, 8vw, 96px)',
        }}
      >

        {/* タイトル — Shippori Mincho・センター揃え・朱色1単語 */}
        <h1
          className="font-mincho leading-[1.3] text-center mx-auto max-w-3xl animate-fade-in-up"
          style={{
            fontSize:   'clamp(36px, 6vw, 64px)',
            fontWeight: 500,
            color:      'var(--sumi)',
          }}
        >
          AIは、家族を<br />
          <span style={{ color: 'var(--shu)' }}>もっと幸せに</span><br />
          する道具。
        </h1>

        {/* 飾り罫（波線・絵本風） + 装飾アスタリスク */}
        <div
          className="flex items-center justify-center gap-4 my-10 animate-fade-in-up delay-100"
          aria-hidden="true"
        >
          <span className="rule-wavy rule-wavy-shu" />
          <span className="ornament ornament-shu" style={{ fontSize: '18px' }}>⁂</span>
          <span className="rule-wavy rule-wavy-shu" />
        </div>

        {/* サブコピー */}
        <p
          className="text-center max-w-xl mx-auto leading-relaxed animate-fade-in-up delay-200"
          style={{
            fontSize: 'var(--text-lead)',
            color:    'var(--sumi-light)',
          }}
        >
          難しくない。怖くない。<br />
          仕事にも、暮らしにも、学習にも。<br />
          今日から使えるAI活用法をお届けします。
        </p>

        {/* CTA 2 個（btn-mingei） */}
        <div className="flex flex-wrap justify-center gap-3 mt-10 animate-fade-in-up delay-300">
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
    </section>
  );
}
