/**
 * app/(site)/tools/page.tsx
 * familyai.jp — AIツールページ
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORY_EMOJI, CATEGORY_LABEL, SITE } from '@/shared';
import type { ContentCategory } from '@/shared';

export const metadata: Metadata = {
  title:       `AIツール | ${SITE.name}`,
  description: 'カテゴリー別に使えるAIツールをまとめています。',
  alternates:  { canonical: `${SITE.url}/tools` },
};

type ToolItem = {
  name: string;
  summary: string;
  href: string;
  status: string;
  cta: string;
  accent: string;
};

const TOOLS_BY_CATEGORY: Array<{
  category: ContentCategory;
  lead: string;
  tools: ToolItem[];
}> = [
  {
    category: 'education',
    lead: '学習の習慣化、英語、宿題サポートに使えるツールです。',
    tools: [
      {
        name: 'VOA × AI英語学習',
        summary: 'VOA Learning English の音声と動画を AI と組み合わせて、毎日10分の英語学習を続けるためのツールです。',
        href: '/tools/voaenglish',
        status: '公開中',
        cta: '使ってみる',
        accent: 'var(--color-mint)',
      },
    ],
  },
  {
    category: 'lifestyle',
    lead: '家事や暮らしの判断を軽くするためのツール枠です。',
    tools: [
      {
        name: '献立サポートAI',
        summary: '冷蔵庫にある食材から、平日向けの献立をすばやく提案するダミーツールです。',
        href: '/tools',
        status: '準備中',
        cta: '近日公開',
        accent: 'var(--color-peach-light)',
      },
    ],
  },
  {
    category: 'work',
    lead: '仕事の整理、文章作成、下調べを効率化するためのツール枠です。',
    tools: [
      {
        name: '議事録整理AI',
        summary: '会話メモから要点・TODO・次回アクションをまとめるダミーツールです。',
        href: '/tools',
        status: '準備中',
        cta: '近日公開',
        accent: 'var(--color-sky)',
      },
    ],
  },
  {
    category: 'creative',
    lead: '画像や文章のアイデア出し、表現づくりに使うためのツール枠です。',
    tools: [
      {
        name: 'アイデアスケッチAI',
        summary: 'テーマを入れると、画像や文章の方向性を一緒に広げるダミーツールです。',
        href: '/tools',
        status: '準備中',
        cta: '近日公開',
        accent: 'var(--color-yellow)',
      },
    ],
  },
];

const CATEGORY_BG: Record<ContentCategory, string> = {
  education: 'var(--color-mint)',
  lifestyle: 'var(--color-peach-light)',
  work: 'var(--color-sky)',
  creative: 'var(--color-yellow)',
};

type ToolsPageProps = {
  searchParams?: {
    cat?: string;
  };
};

export default function ToolsPage({ searchParams }: ToolsPageProps) {
  const selectedCategory = TOOLS_BY_CATEGORY.some(({ category }) => category === searchParams?.cat)
    ? (searchParams?.cat as ContentCategory)
    : null;

  const visibleSections = selectedCategory
    ? TOOLS_BY_CATEGORY.filter(({ category }) => category === selectedCategory)
    : TOOLS_BY_CATEGORY;

  return (
    <main style={{ background: 'var(--color-cream)' }}>
      <section
        className="px-6 py-8 sm:py-10"
        style={{ background: 'linear-gradient(160deg, var(--color-beige) 0%, var(--color-cream) 100%)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <span
            className="inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              background: 'rgba(255,255,255,0.78)',
              color: 'var(--color-brown)',
              boxShadow: 'var(--shadow-warm-sm)',
            }}
          >
            🧰 カテゴリー別ツール一覧
          </span>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:items-end">
            <div className="flex flex-col gap-3">
              <h1
                className="font-display font-bold leading-tight"
                style={{ fontSize: 'clamp(30px, 5vw, 54px)', color: 'var(--color-brown)' }}
              >
                AIツールを
                <br />
                4つのカテゴリーで探す
              </h1>
              <p
                className="max-w-2xl text-base leading-relaxed sm:text-lg"
                style={{ color: 'var(--color-brown-light)' }}
              >
                学習・教育、家事・暮らし、仕事・効率化、創作・表現ごとに、使えるツールを整理しています。
                現在は「VOA × AI英語学習」を公開中です。
              </p>
            </div>

            <div
              className="rounded-[28px] p-5 sm:p-6"
              style={{
                background: 'rgba(255,255,255,0.82)',
                boxShadow: 'var(--shadow-warm)',
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                {TOOLS_BY_CATEGORY.map(({ category }) => (
                  <Link
                    key={category}
                    href={selectedCategory === category ? '/tools' : `/tools?cat=${category}`}
                    className="rounded-2xl px-4 py-4 text-center transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-1"
                    style={{
                      background: CATEGORY_BG[category],
                      boxShadow: selectedCategory === category ? 'var(--shadow-warm)' : 'none',
                      opacity: selectedCategory && selectedCategory !== category ? 0.55 : 1,
                    }}
                    aria-pressed={selectedCategory === category}
                  >
                    <div className="text-3xl">{CATEGORY_EMOJI[category]}</div>
                    <div className="mt-2 text-sm font-bold" style={{ color: 'var(--color-brown)' }}>
                      {CATEGORY_LABEL[category]}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
          {visibleSections.flatMap(({ category, tools }) =>
            tools.map((tool) => {
              const isReady = tool.status === '公開中';
              const card = (
                <article
                  className="rounded-3xl p-5 transition-[transform,box-shadow] duration-200"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,250,245,0.92) 100%)',
                    boxShadow: 'var(--shadow-warm-sm)',
                  }}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        background: tool.accent,
                        color: 'var(--color-brown)',
                      }}
                    >
                      {tool.status}
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--color-brown-light)' }}>
                      {CATEGORY_LABEL[category]}
                    </span>
                  </div>

                  <h2
                    className="font-display text-2xl font-bold leading-tight"
                    style={{ color: 'var(--color-brown)' }}
                  >
                    {tool.name}
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
                    {tool.summary}
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-orange)' }}>
                    <span>{tool.cta}</span>
                    <span aria-hidden="true">{isReady ? '→' : '·'}</span>
                  </div>
                </article>
              );

              if (isReady) {
                return (
                  <Link key={`${category}-${tool.name}`} href={tool.href} className="block hover:-translate-y-1">
                    {card}
                  </Link>
                );
              }

              return (
                <div key={`${category}-${tool.name}`} aria-disabled="true">
                  {card}
                </div>
              );
            }),
          )}
        </div>

        {selectedCategory ? (
          <div className="mx-auto mt-6 max-w-5xl">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                background: 'rgba(255,255,255,0.9)',
                color: 'var(--color-brown)',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              <span>←</span>
              <span>すべてのカテゴリーを表示</span>
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
