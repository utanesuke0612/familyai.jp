/**
 * app/(site)/tools/voaenglish/page.tsx
 * familyai.jp — VOA英語学習ツールページ
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/shared';

export const metadata: Metadata = {
  title:       `VOA × AI ディクテーション教室 | AIツール | ${SITE.name}`,
  description: 'VOA Learning English の Beginning / Intermediate / Advanced を、AIと組み合わせて使いやすく整理した英語学習ツールです。',
  alternates:  { canonical: `${SITE.url}/tools/voaenglish` },
};

type LevelSection = {
  key: 'beginning' | 'intermediate' | 'advanced';
  level: string;
  cefr: string;
  description: string;
  accent: string;
  chipText: string;
  icon: string;
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
    cefr: 'A1–A2',
    description: 'アメリカ人の英語教師が初心者向けに作った新しいコースです。Let\'s Learn English Level 1 と Level 2 を中心に、動画・語彙・スピーキング・ワークシートを使って基礎から学べます。',
    accent: 'var(--color-mint)',
    chipText: '基礎から始める',
    icon: '🌱',
    modules: [
      {
        title: "Let's Learn English with Anna",
        summary: '8歳から12歳向けに作られた、質問と会話中心のやさしい英語コースです。全40レッスン。',
        href: '/tools/voaenglish/anna',
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
    cefr: 'B1',
    description: 'アメリカ英語にまだ慣れていない方のための中級レベルです。500〜1,000語程度のニュース記事が中心で、ニュースメーカー本人の音声を含む場合もあります。',
    accent: 'var(--color-sky)',
    chipText: 'ニュースで学ぶ',
    icon: '📰',
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
    cefr: 'B2 以上',
    description: 'すでにアメリカ英語を学んできた方が、読解力とリスニング力をさらに伸ばすための上級レベルです。500語を超える記事が中心で、ニュースメーカー本人の音声を含む場合もあります。',
    accent: 'var(--color-yellow)',
    chipText: '表現を深める',
    icon: '🎓',
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

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div className="flex flex-col gap-4">
              <h1
                className="font-display font-bold leading-tight"
                style={{ fontSize: 'clamp(26px, 4vw, 44px)', color: 'var(--color-brown)' }}
              >
                VOA × AI ディクテーション教室
              </h1>
              <p
                className="max-w-2xl text-base leading-relaxed sm:text-lg font-bold"
                style={{ color: 'var(--color-brown)' }}
              >
                <strong>聴いて、書いて、声に出す。繰り返すほど、英語は身につく。</strong>
              </p>
              <p
                className="max-w-2xl text-base leading-relaxed sm:text-lg"
                style={{ color: 'var(--color-brown-light)' }}
              >
                <strong>ディクテーション</strong>は、五感をフル活用する学習法。<br />
                最も効果的な英語学習法のひとつです。<br />
                教材は <strong>VOA</strong>（Voice of America）の公式素材。<br />
                <strong>AIサポート</strong>で、いつでもどこでも自分のペースで。<br />
                疑問はその場で AI に質問できます。
              </p>

            </div>

            <aside
              className="rounded-[28px] p-6"
              style={{
                background: 'rgba(255,255,255,0.86)',
                boxShadow: 'var(--shadow-warm)',
              }}
            >
              <p
                className="mb-4 text-center font-display text-base font-bold sm:text-lg"
                style={{ color: 'var(--color-brown)' }}
              >
                Haste Makes Waste
              </p>
              <div className="grid grid-cols-3 gap-3 text-center lg:grid-cols-1 lg:gap-2">
                {LEVELS.map((level, index) => (
                  <Link
                    key={level.key}
                    href={selectedLevel === level.key ? '/tools/voaenglish' : `/tools/voaenglish?level=${level.key}`}
                    /* lg 以上ではカード内を水平レイアウト化（高さを左説明エリアに揃えるため） */
                    /* 絵文字・数字・ラベルが3カードで縦に揃うよう、左寄せ + 絵文字スロットを固定幅に */
                    className="rounded-2xl px-3 py-4 transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-1 lg:flex lg:items-center lg:justify-start lg:gap-3 lg:py-2.5 lg:pl-5"
                    style={{
                      background: level.accent,
                      boxShadow: selectedLevel === level.key ? 'var(--shadow-warm-sm)' : 'none',
                      opacity: selectedLevel && selectedLevel !== level.key ? 0.55 : 1,
                    }}
                    aria-pressed={selectedLevel === level.key}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-2xl lg:text-xl lg:gap-2 lg:flex-shrink-0">
                      <span aria-hidden="true" className="lg:inline-block lg:w-8 lg:text-center">{level.icon}</span>
                      <span>{index + 1}</span>
                    </div>
                    <div className="mt-1 text-xs font-semibold lg:mt-0" style={{ color: 'var(--color-brown)' }}>
                      {level.level.replace(' Level', '')}
                    </div>
                  </Link>
                ))}
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
                    className="mt-3 flex flex-wrap items-center gap-3 font-display text-3xl font-bold"
                    style={{ color: 'var(--color-brown)' }}
                  >
                    <span>{section.level}</span>
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-sm font-semibold"
                      style={{
                        background: 'var(--color-cream)',
                        color: 'var(--color-brown)',
                        border: '1px solid rgba(120, 80, 40, 0.15)',
                      }}
                    >
                      CEFR {section.cefr}
                    </span>
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
                {section.modules.map((module) => {
                  const isInternal = module.href.startsWith('/');
                  const cardClassName = 'block rounded-3xl p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1';
                  const cardStyle = {
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,250,245,0.92) 100%)',
                    boxShadow: 'var(--shadow-warm-sm)',
                  } as const;
                  const cardInner = (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex rounded-full px-3 py-1 text-xs font-bold" style={{ background: section.accent, color: 'var(--color-brown)' }}>
                          {isInternal ? 'VOA × AI' : 'VOA'}
                        </div>
                        {!isInternal && (
                          <span
                            className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold"
                            style={{
                              background: '#fff3cd',
                              color:      '#8a6d1d',
                              border:     '1px solid #ffd54f',
                            }}
                            aria-label="準備中"
                          >
                            🚧 準備中
                          </span>
                        )}
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
                        {isInternal ? 'コースを開く →' : 'VOAで開く ↗'}
                      </div>
                    </>
                  );
                  return isInternal ? (
                    <Link
                      key={module.title}
                      href={module.href}
                      className={cardClassName}
                      style={cardStyle}
                    >
                      {cardInner}
                    </Link>
                  ) : (
                    <a
                      key={module.title}
                      href={module.href}
                      target="_blank"
                      rel="noreferrer"
                      className={cardClassName}
                      style={cardStyle}
                    >
                      {cardInner}
                    </a>
                  );
                })}
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

          <aside
            className="rounded-[28px] p-6 sm:p-7"
            style={{
              background: 'rgba(255,255,255,0.86)',
              boxShadow: 'var(--shadow-warm-sm)',
            }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: 'var(--color-mint)', color: 'var(--color-brown)' }}
                >
                  📝 コンテンツの再利用について
                </span>
              </div>
              <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--color-brown)' }}>
                VOA Learning English のテキスト・MP3・写真・動画はパブリックドメインで公開されており、
                <strong>教育目的でも商用目的でも再利用することができます。</strong>
              </p>
              <div>
                <a
                  href="https://learningenglish.voanews.com/p/6861.html"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: 'var(--color-orange)' }}
                >
                  VOA公式ポリシーを読む ↗
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
