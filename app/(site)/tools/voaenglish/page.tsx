/**
 * app/(site)/tools/voaenglish/page.tsx
 * familyai.jp — VOA英語学習ツールページ
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/shared';

export const metadata: Metadata = {
  title:       `VOA英語学習 | AIツール | ${SITE.name}`,
  description: 'VOA Learning English の Beginning / Intermediate / Advanced を見やすく整理した英語学習ツールです。',
  alternates:  { canonical: `${SITE.url}/tools/voaenglish` },
};

type LevelSection = {
  key: 'beginning' | 'intermediate' | 'advanced';
  level: string;
  description: string;
  accent: string;
  chipText: string;
  modules: Array<{
    title: string;
    summary: string;
    href: string;
  }>;
};

const LEVELS: LevelSection[] = [
  {
    key: 'beginning',
    level: 'Beginning Level',
    description: 'まずは聞く・まねする・短く話す練習から始めるための入口です。',
    accent: 'var(--color-mint)',
    chipText: '基礎から始める',
    modules: [
      {
        title: "Let's Learn English with Anna",
        summary: '8歳から12歳向けに作られた、質問と会話中心のやさしい英語コースです。',
        href: 'https://learningenglish.voanews.com/p/8322.html',
      },
      {
        title: "Let's Learn English - Level 1",
        summary: '初心者向けの52週コースです。動画、語彙、スピーキング、ワークシートが揃っています。',
        href: 'https://learningenglish.voanews.com/p/5644.html',
      },
      {
        title: "Let's Learn English - Level 2",
        summary: '初級から次の段階に進むためのコースで、週ごとのレッスン形式で学べます。',
        href: 'https://learningenglish.voanews.com/p/6765.html',
      },
    ],
  },
  {
    key: 'intermediate',
    level: 'Intermediate Level',
    description: '実際のニュースやトピックを使って、語彙と理解力を広げるための中級者向けです。',
    accent: 'var(--color-sky)',
    chipText: 'ニュースで学ぶ',
    modules: [
      {
        title: 'Health & Lifestyle',
        summary: '健康、生活習慣、暮らしの話題を通じて、日常で使える表現を増やします。',
        href: 'https://learningenglish.voanews.com/z/955',
      },
      {
        title: 'Science & Technology',
        summary: '科学、宇宙、環境、テクノロジーの話題を英語で追いながら読む力を鍛えます。',
        href: 'https://learningenglish.voanews.com/z/1579',
      },
      {
        title: 'Arts & Culture',
        summary: '音楽、ポップカルチャー、社会、ライフスタイルを扱う読み物と音声です。',
        href: 'https://learningenglish.voanews.com/z/986',
      },
    ],
  },
  {
    key: 'advanced',
    level: 'Advanced Level',
    description: '表現の幅、文法理解、読解の深さを伸ばすための上級者向けシリーズです。',
    accent: 'var(--color-yellow)',
    chipText: '表現を深める',
    modules: [
      {
        title: 'Education Tips',
        summary: '英語学習の進め方、語彙、書き方、学習戦略を扱う実践的なシリーズです。',
        href: 'https://learningenglish.voanews.com/z/7468',
      },
      {
        title: 'Everyday Grammar',
        summary: '日常英語の中で文法がどう使われるかを、具体例つきで整理できます。',
        href: 'https://learningenglish.voanews.com/p/9392.html',
      },
      {
        title: 'American Stories',
        summary: 'アメリカ文学や短編を、英語学習者向けの速度と表現で読んで聞けます。',
        href: 'https://learningenglish.voanews.com/z/1581',
      },
      {
        title: 'Words & Their Stories',
        summary: 'イディオムや言い回しを、短い音声と例文で学べるシリーズです。',
        href: 'https://learningenglish.voanews.com/z/987',
      },
    ],
  },
];

type VoaEnglishToolPageProps = {
  searchParams?: {
    level?: string;
  };
};

export default function VoaEnglishToolPage({ searchParams }: VoaEnglishToolPageProps) {
  const selectedLevel = LEVELS.some(({ key }) => key === searchParams?.level)
    ? (searchParams?.level as LevelSection['key'])
    : null;

  const visibleLevels = selectedLevel
    ? LEVELS.filter(({ key }) => key === selectedLevel)
    : LEVELS;

  return (
    <main style={{ background: 'var(--color-cream)' }}>
      <section
        className="px-6 py-8 sm:py-10"
        style={{ background: 'linear-gradient(160deg, var(--color-beige) 0%, var(--color-cream) 100%)' }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            <Link
              href="/tools"
              className="rounded-full px-4 py-2"
              style={{
                background: 'rgba(255,255,255,0.88)',
                color: 'var(--color-brown)',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              ← AIツール一覧へ戻る
            </Link>
            <span
              className="rounded-full px-4 py-2"
              style={{
                background: 'var(--color-mint)',
                color: 'var(--color-brown)',
              }}
            >
              📚 学習・教育
            </span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-start">
            <div className="flex flex-col gap-4">
              <h1
                className="font-display font-bold leading-tight"
                style={{ fontSize: 'clamp(32px, 5vw, 56px)', color: 'var(--color-brown)' }}
              >
                VOA英語学習
              </h1>
              <p
                className="max-w-2xl text-base leading-relaxed sm:text-lg"
                style={{ color: 'var(--color-brown-light)' }}
              >
                VOA Learning English の公開コンテンツを、Beginning / Intermediate / Advanced の3段階で使いやすく整理した学習ページです。
                音声、動画、ニュース、文法、読み物をまとめて辿れます。
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://learningenglish.voanews.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                >
                  VOA公式を開く ↗
                </a>
                <Link href="/learn/english-learning-voice-ai" className="btn-secondary">
                  関連記事を見る
                </Link>
              </div>
            </div>

            <aside
              className="rounded-[28px] p-6"
              style={{
                background: 'rgba(255,255,255,0.86)',
                boxShadow: 'var(--shadow-warm)',
              }}
            >
              <div className="grid grid-cols-3 gap-3 text-center">
                {LEVELS.map((level, index) => (
                  <Link
                    key={level.key}
                    href={selectedLevel === level.key ? '/tools/voaenglish' : `/tools/voaenglish?level=${level.key}`}
                    className="rounded-2xl px-3 py-4 transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-1"
                    style={{
                      background: level.accent,
                      boxShadow: selectedLevel === level.key ? 'var(--shadow-warm-sm)' : 'none',
                      opacity: selectedLevel && selectedLevel !== level.key ? 0.55 : 1,
                    }}
                    aria-pressed={selectedLevel === level.key}
                  >
                    <div className="text-2xl">{index + 1}</div>
                    <div className="mt-1 text-xs font-semibold" style={{ color: 'var(--color-brown)' }}>
                      {level.level.replace(' Level', '')}
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-5 space-y-3 text-sm leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
                <p>まずは Beginning から入り、聞き取りと短い会話に慣れます。</p>
                <p>次に Intermediate でニュース系の表現に触れます。</p>
                <p>最後に Advanced で文法、読解、表現の幅を広げます。</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 sm:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          {visibleLevels.map((section) => (
            <section
              key={section.level}
              className="rounded-[30px] p-6 sm:p-8"
              style={{
                background: 'rgba(255,255,255,0.9)',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <span
                    className="inline-flex rounded-full px-3 py-1 text-sm font-semibold"
                    style={{
                      background: section.accent,
                      color: 'var(--color-brown)',
                    }}
                  >
                    {section.chipText}
                  </span>
                  <h2
                    className="mt-3 font-display text-3xl font-bold"
                    style={{ color: 'var(--color-brown)' }}
                  >
                    {section.level}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--color-brown-light)' }}>
                    {section.description}
                  </p>
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-brown-light)' }}>
                  {section.modules.length} modules
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {section.modules.map((module) => (
                  <a
                    key={module.title}
                    href={module.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-3xl p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,250,245,0.92) 100%)',
                      boxShadow: 'var(--shadow-warm-sm)',
                    }}
                  >
                    <div className="inline-flex rounded-full px-3 py-1 text-xs font-bold" style={{ background: section.accent, color: 'var(--color-brown)' }}>
                      VOA
                    </div>
                    <h3
                      className="mt-4 text-xl font-bold leading-tight"
                      style={{ color: 'var(--color-brown)' }}
                    >
                      {module.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
                      {module.summary}
                    </p>
                    <div className="mt-5 text-sm font-semibold" style={{ color: 'var(--color-orange)' }}>
                      VOAで開く ↗
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}

          {selectedLevel ? (
            <div>
              <Link
                href="/tools/voaenglish"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  color: 'var(--color-brown)',
                  boxShadow: 'var(--shadow-warm-sm)',
                }}
              >
                <span>←</span>
                <span>すべてのレベルを表示</span>
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
