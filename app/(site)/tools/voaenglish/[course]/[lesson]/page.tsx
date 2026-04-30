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
import { MarkdownContent }      from '@/components/ui/MarkdownContent';
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
            <div className="min-w-0 flex flex-col gap-6">

              {/* ─── ① レッスン概要（日本語）─────────────────────── */}
              <SectionCard
                emoji="📖"
                title="レッスン概要"
                accent={accent}
              >
                {data.description ? (
                  // Markdown でレンダリング（**太字** / 箇条書き / リンク等が効く）
                  <MarkdownContent
                    color="var(--color-brown)"
                    fontSize="0.95rem"
                  >
                    {data.description}
                  </MarkdownContent>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
                    （このレッスンの日本語概要は準備中です）
                  </p>
                )}
                {data.voaUrl && (
                  <a
                    href={data.voaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold"
                    style={{ color: 'var(--color-orange)' }}
                  >
                    📰 VOA 公式ページを開く ↗
                  </a>
                )}
              </SectionCard>

              {/* ─── ② 会話を聞いて、読んでみよう（動画のみ） ───── */}
              <SectionCard
                emoji="🎧"
                title="会話を聞いて、読んでみよう"
                subtitle="まずは VOA 公式動画でストーリー全体をつかみましょう"
                accent={accent}
              >
                {data.videoUrl ? (
                  <div
                    className="relative w-full rounded-xl overflow-hidden"
                    style={{ paddingBottom: '56.25%' /* 16:9 */, background: '#000' }}
                  >
                    <iframe
                      src={data.videoUrl}
                      title={`${headline} — VOA video`}
                      className="absolute inset-0 w-full h-full"
                      allowFullScreen
                      loading="lazy"
                      // sandbox は VOA 側のスクリプトが必要なので付けない
                      style={{ border: 0 }}
                    />
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
                    （このレッスンの動画は準備中です）
                  </p>
                )}
              </SectionCard>

              {/* ─── ③ Dictation 練習 ─────────────────────────────── */}
              <SectionCard
                emoji="✍️"
                title="Dictation 練習"
                subtitle="紙とペンを用意して、聴いた英語を書き取ってみよう"
                accent={accent}
              >
                {/* TODO Phase 4: ここに SentencePlayer（センテンス単位プレイヤー）と
                    自己申告ボタン（😓💪🌟）+ confetti + 進捗管理を実装する。
                    現状は骨格として、既存スクリプト本文を「参考スクリプト」として表示。 */}
                <div
                  className="rounded-xl p-4 mb-4 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.7)',
                    border:     '1px dashed var(--color-beige-dark)',
                  }}
                >
                  <span className="text-3xl block mb-2" aria-hidden="true">🚧</span>
                  <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-brown)' }}>
                    センテンス単位プレイヤー実装中
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
                    タイムスタンプ付き音声 + 自己申告（😓💪🌟）が近日公開予定です。
                    完璧（🌟）になるまで次のレッスンには進めない設計です。
                  </p>
                </div>

                {/* 参考スクリプト（既存の vocab annotation 付き本文）。
                    Phase 4 完成後はセンテンス単位プレイヤーに統合される予定。 */}
                <details className="rounded-xl">
                  <summary
                    className="cursor-pointer text-sm font-semibold py-2 px-3 rounded-xl"
                    style={{
                      background: 'var(--color-cream)',
                      color:      'var(--color-brown)',
                      border:     '1px solid var(--color-beige-dark)',
                    }}
                  >
                    📜 参考スクリプトを開く（クリックで展開）
                  </summary>
                  <div className="mt-4">
                    <ArticleBody content={data.body} className="!max-w-none" />
                    <FloatingShareButtons
                      title={headline}
                      url={`${SITE.url}/tools/voaenglish/${course}/${lesson}`}
                    />
                  </div>
                </details>
              </SectionCard>

            </div>

            {/* 右カラム: AI チャット（aictation mode）— 機能 1 で実装済 */}
            <aside className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--header-height)+24px)]">
              <AIChatWidget
                mode="aictation"
                articleTitle={headline}
                articleSlug={`tools/voaenglish/${course}/${lesson}`}
                articleExcerpt={`VOA Learning English のコース「${data.courseTitle}」の${headline}。CEFR ${cefr}。${data.voaUrl ? `公式: ${data.voaUrl}` : ''}`}
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
            {/* VOA公式リンクは ① レッスン概要 カード内に表示しているため、ここでは出さない */}
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── レッスン3セクション共通カード（R3-機能3 骨格）──────────────
// レッスン詳細ページの ① 概要 / ② 会話を聞いて / ③ Dictation の各セクションを
// 同じデザインの白カードに統一して表示する。
function SectionCard({
  emoji,
  title,
  subtitle,
  accent,
  children,
}: {
  emoji:    string;
  title:    string;
  subtitle?: string;
  accent:   string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-3xl p-5 sm:p-7"
      style={{
        background: 'rgba(255,255,255,0.94)',
        boxShadow:  'var(--shadow-warm-sm)',
        border:     '1px solid rgba(120,80,40,0.1)',
      }}
    >
      <header
        className="flex items-start gap-3 mb-4 pb-3"
        style={{ borderBottom: `2px solid ${accent}55` }}
      >
        <span aria-hidden="true" style={{ fontSize: 28, lineHeight: 1 }}>
          {emoji}
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2
            className="font-display font-bold leading-tight"
            style={{
              fontSize: 'clamp(18px, 2.5vw, 24px)',
              color:    'var(--color-brown)',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}
