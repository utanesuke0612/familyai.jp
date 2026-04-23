/**
 * app/(site)/tools/page.tsx
 * familyai.jp — AIツールページ
 */

import type { Metadata } from 'next';
import Link              from 'next/link';
import { SITE }          from '@/shared';

export const metadata: Metadata = {
  title:       `AIツール | ${SITE.name}`,
  description: 'すぐ使えるAIツールと導入ガイドをまとめています。',
  alternates:  { canonical: `${SITE.url}/tools` },
};

const GUIDES = [
  {
    emoji: '🤖',
    title: 'AIってなに？3分でわかるやさしい解説',
    desc:  '難しい言葉は一切なし。AIの仕組みと使い方をすぐ把握できる入門記事です。',
    level: 'はじめて',
    href:  '/learn?level=beginner',
  },
  {
    emoji: '💬',
    title: 'ChatGPTの始め方・使い方ガイド',
    desc:  'アカウント作成から最初の質問まで、スクリーンショット付きで丁寧に解説。',
    level: 'はじめて',
    href:  '/learn?cat=work&level=beginner&search=ChatGPT',
  },
  {
    emoji: '🎨',
    title: 'AI画像生成入門｜スマホで簡単に始める',
    desc:  '文章を入力するだけでイラストや写真を生成できるツールを紹介します。',
    level: 'はじめて',
    href:  '/learn?cat=creative',
  },
  {
    emoji: '🔒',
    title: 'AIを安全に使うための5つのルール',
    desc:  '個人情報の取り扱い、注意すべき点など、安心して使うための基礎知識。',
    level: 'はじめて',
    href:  '/learn?cat=lifestyle&level=beginner&search=安全',
  },
];

export default function ToolsPage() {
  return (
    <main style={{ background: 'var(--color-cream)' }}>
      <section
        className="py-6 px-6 text-center"
        style={{ background: 'linear-gradient(160deg, var(--color-beige) 0%, var(--color-cream) 100%)' }}
      >
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-5">
          <span className="text-5xl">🧰</span>
          <h1
            className="font-display font-bold"
            style={{ fontSize: 'clamp(26px, 5vw, 44px)', color: 'var(--color-brown)' }}
          >
            AIツール
          </h1>
          <p className="text-base leading-relaxed max-w-lg" style={{ color: 'var(--color-brown-light)' }}>
            すぐ試せるAIツールと、使い始める前に読みたいガイドをまとめています。
          </p>
        </div>
      </section>

      <section className="py-5 px-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <div>
            <p
              className="font-bold text-sm uppercase tracking-widest mb-2"
              style={{ color: 'var(--color-orange)' }}
            >
              はじめの一歩
            </p>
            <h2
              className="font-display font-bold text-2xl"
              style={{ color: 'var(--color-brown)' }}
            >
              まず読んでほしい記事 4選
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GUIDES.map((g) => (
              <Link
                key={g.title}
                href={g.href}
                className="rounded-2xl p-5 flex flex-col gap-3 transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg"
                style={{
                  background: 'white',
                  boxShadow:  'var(--shadow-warm-sm)',
                  border:     '1px solid var(--color-beige)',
                }}
              >
                <span className="text-3xl">{g.emoji}</span>
                <div>
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-bold mb-2"
                    style={{ background: 'var(--color-beige)', color: 'var(--color-brown)' }}
                  >
                    {g.level}
                  </span>
                  <h3
                    className="font-bold text-sm leading-snug mb-1"
                    style={{ color: 'var(--color-brown)' }}
                  >
                    {g.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
                    {g.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5 px-6 text-center">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-4">
          <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
            もっとたくさんの記事を読みたい方は
          </p>
          <Link href="/learn" className="btn-primary text-lg px-10 py-4">
            📚 全記事を見る →
          </Link>
        </div>
      </section>
    </main>
  );
}
