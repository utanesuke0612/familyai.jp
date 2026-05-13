/**
 * components/home/HeroSection.tsx
 * familyai.jp — トップページ ヒーローセクション（Rev40 Phase C: Mingei リファクタ）
 *
 * - 出版風メタバンド（VOL.01 — 二〇二六年五月 等）
 * - センター揃え縦組タイトル（Shippori Mincho・朱色アクセント1単語）
 * - btn-mingei 2 CTA（通し番号 + ArrowRight）
 * - 目次セクション（No.01-04 のカテゴリリンク）
 * - 奥付風 stat row
 *
 * 中央+4隅クラスター・floating blob・絵文字・黄色マーカーアンダーラインを撤廃。
 * 'use client' は不要（CSS のみで hover 制御）。
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// ── 目次データ（旧 USE_CASE_CARDS の置換）─────────────────
const TOC_ITEMS = [
  { id: 'work',      no: '01', label: '仕事・効率化', desc: '業務をすばやく進める', href: '/learn?cat=work' },
  { id: 'lifestyle', no: '02', label: '家事・暮らし', desc: '毎日のタスクを軽くする', href: '/learn?cat=lifestyle' },
  { id: 'education', no: '03', label: '学習・教育',   desc: '調べる・理解を深める', href: '/learn?cat=education' },
  { id: 'creative',  no: '04', label: '創作・表現',   desc: '画像や文章を形にする', href: '/learn?cat=creative' },
] as const;

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
        <span className="serial">FAMILYAI.JP — AI = 愛</span>
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

        {/* 飾り罫（2 重・太い + 細い） */}
        <div className="flex justify-center mt-20 mb-10">
          <div className="w-full max-w-2xl">
            <div style={{ height: '1px', background: 'var(--line)' }} />
            <div style={{ height: '1px', background: 'var(--line-soft)', marginTop: '3px' }} />
          </div>
        </div>

        {/* ─── 目次セクション（旧 4 隅カードの置換）── */}
        <div className="max-w-2xl mx-auto animate-fade-in-up delay-400">
          <h2
            className="serial text-center mb-6 flex items-center justify-center gap-2"
            style={{ color: 'var(--sumi-light)' }}
          >
            <span className="ornament" aria-hidden="true">✦</span>
            目次 — TABLE OF CONTENTS
            <span className="ornament" aria-hidden="true">✦</span>
          </h2>

          <ul className="space-y-0">
            {TOC_ITEMS.map((item, i) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex items-baseline gap-4 py-4 transition-colors"
                  style={{
                    borderTop:    i === 0 ? '1px solid var(--line)' : 'none',
                    borderBottom: i === TOC_ITEMS.length - 1
                      ? '1px solid var(--line)'
                      : '1px solid var(--line-soft)',
                  }}
                >
                  <span className="serial shrink-0" style={{ width: '3.5em' }}>
                    No.{item.no}
                  </span>
                  <span
                    className="font-mincho group-hover:text-[var(--shu)] transition-colors"
                    style={{
                      fontSize:   '18px',
                      fontWeight: 500,
                      color:      'var(--sumi)',
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="flex-1 self-center mx-2"
                    style={{ height: '1px', background: 'var(--line-soft)' }}
                    aria-hidden="true"
                  />
                  <span
                    className="text-xs hidden sm:inline shrink-0"
                    style={{ color: 'var(--sumi-light)' }}
                  >
                    {item.desc}
                  </span>
                  <ArrowRight
                    strokeWidth={1}
                    size={16}
                    className="shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                    style={{ color: 'var(--sumi-soft)' }}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ─── 奥付風 stat row（旧 STATS の置換）── */}
        <div
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-16 pt-8 font-mincho text-xs"
          style={{
            borderTop: '1px solid var(--line-soft)',
            color:     'var(--sumi-light)',
          }}
        >
          <span>連載中 — AI ツール 2 種</span>
          <span style={{ color: 'var(--line)' }} aria-hidden="true">│</span>
          <span>収録 — AI 活用事例 100+</span>
          <span style={{ color: 'var(--line)' }} aria-hidden="true">│</span>
          <span>購読料 — 無料</span>
        </div>

      </div>
    </section>
  );
}
