/**
 * app/(site)/tools/voaenglish/[course]/[lesson]/page.tsx
 * familyai.jp — VOA英語学習レッスンの動的ページ（Server Component）
 *
 * - content/voaenglish/*.md から frontmatter + 本文を読み、ArticleBody で描画
 * - generateStaticParams で全レッスンを SSG（Vercel Edge でキャッシュ）
 * - /tools/voaenglish/[course]/[lesson] にマッチ（例: /tools/voaenglish/anna/lesson-01）
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArticleBody }          from '@/components/article/ArticleBody';
import { AIChatWidget }         from '@/components/article/AIChatWidget';
import { FloatingShareButtons } from '@/components/article/FloatingShareButtons';
import { SITE } from '@/shared';
import {
  getAllLessons,
  getAdjacentLessons,
  getLesson,
  type LessonLevel,
} from '@/lib/voaenglish/lessons';

type PageParams = {
  course: string;
  lesson: string;
};

// レベル別のアクセントカラー
const LEVEL_ACCENT: Record<LessonLevel, string> = {
  beginning:    'var(--color-mint)',
  intermediate: 'var(--color-sky)',
  advanced:     'var(--color-yellow)',
};

const LEVEL_LABEL: Record<LessonLevel, string> = {
  beginning:    'Beginning',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

const LEVEL_ICON: Record<LessonLevel, string> = {
  beginning:    '🌱',
  intermediate: '📰',
  advanced:     '🎓',
};

const LEVEL_CEFR: Record<LessonLevel, string> = {
  beginning:    'A1–A2',
  intermediate: 'B1',
  advanced:     'B2+',
};

// ── generateStaticParams ──────────────────────────────────────────
export function generateStaticParams(): PageParams[] {
  return getAllLessons().map((l) => ({ course: l.course, lesson: l.slug }));
}

// ── generateMetadata ──────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { course, lesson } = await params;
  const data = getLesson(course, lesson);
  if (!data) return { title: `Lesson not found | ${SITE.name}` };

  const title = data.lessonNumber
    ? `Lesson ${data.lessonNumber}: ${data.title}`
    : data.title;

  return {
    title:       `${title} | ${data.courseTitle} | ${SITE.name}`,
    description: `${data.courseTitle} の ${title}。VOA Learning English を AI と組み合わせて学べるページです。`,
    alternates:  { canonical: `${SITE.url}/tools/voaenglish/${course}/${lesson}` },
    openGraph: {
      title,
      description: data.courseTitle,
      images: data.thumbnail ? [{ url: data.thumbnail }] : undefined,
    },
  };
}

// ── ページ ─────────────────────────────────────────────────────────
export default async function VoaLessonPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { course, lesson } = await params;
  const data = getLesson(course, lesson);
  if (!data) notFound();

  const { prev, next } = getAdjacentLessons(course, lesson);
  const accent = LEVEL_ACCENT[data.level];
  const levelLabel = LEVEL_LABEL[data.level];
  const levelIcon = LEVEL_ICON[data.level];
  const cefr = LEVEL_CEFR[data.level];

  const headline = data.lessonNumber
    ? `Lesson ${data.lessonNumber}: ${data.title}`
    : data.title;

  return (
    <main style={{ background: 'var(--color-cream)' }}>
      <header
        style={{
          background: `linear-gradient(160deg, ${accent} 0%, var(--color-cream) 100%)`,
          paddingBlock: 'clamp(16px, 2.5vw, 28px)',
        }}
      >
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold mb-5">
            <Link
              href={`/tools/voaenglish/${course}`}
              className="inline-flex items-center rounded-full px-4"
              style={{
                minHeight: '44px',
                background: 'rgba(255,255,255,0.9)',
                color: 'var(--color-brown)',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              ← {data.courseTitle || course} へ戻る
            </Link>
            <span
              className="inline-flex items-center rounded-full px-4"
              style={{
                minHeight: '44px',
                background: 'rgba(255,255,255,0.85)',
                color: 'var(--color-brown)',
              }}
            >
              {levelIcon} {levelLabel} Level
            </span>
            <span
              className="inline-flex items-center rounded-full px-3 text-xs"
              style={{
                minHeight: '44px',
                background: 'rgba(255,255,255,0.85)',
                color: 'var(--color-brown)',
                border: '1px solid rgba(120, 80, 40, 0.15)',
              }}
            >
              CEFR {cefr}
            </span>
            <Link
              href="/mypage/vocab"
              className="inline-flex items-center rounded-full px-4"
              style={{
                minHeight: '44px',
                background: 'var(--color-yellow)',
                color: 'var(--color-brown)',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              ⭐ 単語帳
            </Link>
          </nav>

          <h1
            className="font-display font-bold leading-tight"
            style={{ fontSize: 'clamp(22px, 4vw, 42px)', color: 'var(--color-brown)' }}
          >
            {headline}
          </h1>
        </div>
      </header>

      <section
        style={{
          background: 'var(--color-cream)',
          paddingBlock: 'clamp(8px, 1.25vw, 16px)',
        }}
      >
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
            <div className="min-w-0">
              <ArticleBody content={data.body} className="!max-w-none" />

              <FloatingShareButtons
                title={headline}
                url={`${SITE.url}/tools/voaenglish/${course}/${lesson}`}
              />
            </div>
            <aside className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--header-height)+24px)]">
              <AIChatWidget
                articleTitle={headline}
                articleSlug={`voa-${course}-${lesson}`}
                articleExcerpt={`VOA Learning English のコース「${data.courseTitle}」の${headline}。CEFR ${cefr}。${data.voaUrl ? `公式: ${data.voaUrl}` : ''}`}
                articleCategories={['education']}
                suggestedQuestions={[
                  'どんな場面で使う会話？',
                  '重要な単語と意味を5つ教えて',
                  '親子で使える例文を3つ作って',
                ]}
              />
            </aside>
          </div>
        </div>
      </section>

      <section
        style={{
          background: 'var(--color-cream)',
          paddingBlock: 'clamp(12px, 2vw, 20px)',
        }}
      >
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {prev ? (
                <Link
                  href={`/tools/voaenglish/${prev.course}/${prev.slug}`}
                  className="flex items-center gap-3 rounded-2xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    boxShadow: 'var(--shadow-warm-sm)',
                    color: 'var(--color-brown)',
                  }}
                >
                  <span className="shrink-0 text-xs font-semibold" style={{ color: 'var(--color-brown-light)' }}>
                    ← 前のレッスン
                  </span>
                  <span className="truncate text-sm font-bold">
                    {prev.lessonNumber ? `Lesson ${prev.lessonNumber}: ` : ''}{prev.title}
                  </span>
                </Link>
              ) : <div />}
              {next ? (
                <Link
                  href={`/tools/voaenglish/${next.course}/${next.slug}`}
                  className="flex items-center justify-end gap-3 rounded-2xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    boxShadow: 'var(--shadow-warm-sm)',
                    color: 'var(--color-brown)',
                  }}
                >
                  <span className="truncate text-sm font-bold">
                    {next.lessonNumber ? `Lesson ${next.lessonNumber}: ` : ''}{next.title}
                  </span>
                  <span className="shrink-0 text-xs font-semibold" style={{ color: 'var(--color-brown-light)' }}>
                    次のレッスン →
                  </span>
                </Link>
              ) : <div />}
            </div>

            {data.voaUrl ? (
              <a
                href={data.voaUrl}
                target="_blank"
                rel="noreferrer"
                className="self-start text-sm font-semibold"
                style={{ color: 'var(--color-orange)' }}
              >
                VOA公式ページを開く ↗
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
