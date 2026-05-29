/**
 * app/(site)/tools/voaenglish/[course]/[lesson]/page.tsx
 * familyai.jp — VOA英語学習レッスンの動的ページ（Server Component）
 *
 * - content/voaenglish/*.md から frontmatter + 本文を読み、ArticleBody で描画
 * - generateStaticParams で全レッスンを SSG（Vercel Edge でキャッシュ）
 * - /tools/voaenglish/[course]/[lesson] にマッチ（例: /tools/voaenglish/anna/lesson-01）
 */

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const AIChatWidget         = dynamic(() => import('@/components/article/AIChatWidget').then(m => m.AIChatWidget),         { ssr: false, loading: () => <SkeletonBlock height="300px" /> });
const FloatingShareButtons = dynamic(() => import('@/components/article/FloatingShareButtons').then(m => m.FloatingShareButtons), { loading: () => <SkeletonBlock height="48px" /> });
import { BookOpen, Headphones, Pencil, Volume2, Wrench, ExternalLink } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MarkdownContent }      from '@/components/ui/MarkdownContent';
import { DictationPanel }       from '@/components/voaenglish/DictationPanel';
import { AIEchoPanel }          from '@/components/voaenglish/AIEchoPanel';
import { SITE } from '@/shared';
import {
  getAllLessons,
  getAdjacentLessons,
  getLesson,
  resolveLessonAudioUrl,
  type LessonLevel,
} from '@/lib/voaenglish/lessons';
import { getLessonSentences } from '@/lib/voaenglish/sentences';

type PageParams = {
  course: string;
  lesson: string;
};

// レベル別のアクセントカラー
// Rev40 Phase K: Mingei トークンへ統一。色相識別が必要だが washi 系トーンで揃え、
// レベル順に淡 → 中 → 深 のグラデーションで段階感を表現する。
const LEVEL_ACCENT: Record<LessonLevel, string> = {
  beginning:    'var(--washi-light)',
  intermediate: 'var(--washi-deep)',
  advanced:     'var(--shu-soft)',
};

const LEVEL_LABEL: Record<LessonLevel, string> = {
  beginning:    'Beginning',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

// Rev40 Phase I: LEVEL_ICON (絵文字) を撤廃（Mingei 統一）
// 必要になった時のために定義はコメントとして残置：
//   beginning '🌱' / intermediate '📰' / advanced '🎓'

const LEVEL_CEFR: Record<LessonLevel, string> = {
  beginning:    'A1–A2',
  intermediate: 'B1',
  advanced:     'B2+',
};

/** 遅延ロード中のスケルトンプレースホルダー */
function SkeletonBlock({ height }: { height: string }) {
  return (
    <div
      aria-busy="true"
      style={{
        height,
        background: 'var(--paper-2)',
        borderRadius: '12px',
        animation: 'pulse-soft 2s ease-in-out infinite',
      }}
    />
  );
}

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
  // Rev40 Phase I: levelIcon (絵文字) を撤廃したため削除（Mingei 統一）
  const cefr = LEVEL_CEFR[data.level];

  const headline = data.lessonNumber
    ? `Lesson ${data.lessonNumber}: ${data.title}`
    : data.title;

  // R3-機能3 Phase 4: SentencePlayer に渡すデータ（無ければ null → プレイヤー非表示）
  const audioUrl    = resolveLessonAudioUrl(data.audioPath);
  const sentences   = getLessonSentences(course, lesson);
  const canPlay     = audioUrl !== null && sentences !== null && sentences.length > 0;

  // R3-機能3 Phase 7: AI チャットボット（mode='aictation'）に渡す全文スクリプト。
  // sentences のテキスト部分のみ改行連結（タイムスタンプは AI には不要）。
  // これがないと AI が「3文要約」「重要単語」等のカテゴリ質問に答えられない。
  // 上限 8000 字（buildArticleSystemPrompt 側で再度 slice される）。
  const lessonScriptForAi: string =
    sentences && sentences.length > 0
      ? sentences.map((s) => s.text).join('\n').slice(0, 8000)
      : data.description ?? '';

  return (
    <main style={{ background: 'var(--washi)' }}>
      <header
        style={{
          background: 'var(--washi)',
          paddingBlock: 'clamp(16px, 2.5vw, 28px)',
        }}
      >
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          {/* Rev40 Phase I: Mingei 統一（矩形 4px + font-mincho・絵文字撤廃） */}
          <nav className="flex flex-wrap items-center gap-3 text-sm mb-5">
            <Link
              href={`/tools/voaenglish/${course}`}
              className="font-mincho inline-flex items-center px-4 transition-colors hover:text-[var(--shu)]"
              style={{
                minHeight:    '44px',
                background:   'var(--washi-light)',
                color:        'var(--sumi)',
                border:       '1px solid var(--line)',
                borderRadius: '4px',
              }}
            >
              ← {data.courseTitle || course} へ戻る
            </Link>
            <span
              className="font-mincho inline-flex items-center px-4"
              style={{
                minHeight:    '44px',
                background:   'var(--washi-deep)',
                color:        'var(--sumi)',
                border:       '1px solid var(--line)',
                borderRadius: '4px',
              }}
            >
              {levelLabel} Level
            </span>
            <span
              className="font-mincho inline-flex items-center px-4 text-xs"
              style={{
                minHeight:    '44px',
                background:   'var(--washi-light)',
                color:        'var(--sumi-light)',
                border:       '1px solid var(--line)',
                borderRadius: '4px',
              }}
            >
              CEFR {cefr}
            </span>
            <Link
              href="/mypage/bookmarks"
              className="font-mincho inline-flex items-center px-4 transition-colors hover:text-[var(--shu)]"
              style={{
                minHeight:    '44px',
                background:   'var(--washi-light)',
                color:        'var(--sumi)',
                border:       '1px solid var(--line)',
                borderRadius: '4px',
              }}
            >
              ブックマーク
            </Link>
          </nav>

          <h1
            className="font-mincho leading-tight"
            style={{ fontSize: 'clamp(22px, 4vw, 42px)', color: 'var(--sumi)', fontWeight: 500 }}
          >
            {headline}
          </h1>
        </div>
      </header>

      <section
        style={{
          background: 'var(--washi)',
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
                Icon={BookOpen}
                title="レッスン概要"
                accent={accent}
              >
                {data.description ? (
                  // Markdown でレンダリング（**太字** / 箇条書き / リンク等が効く）
                  <MarkdownContent
                    color="var(--sumi)"
                    fontSize="0.95rem"
                  >
                    {data.description}
                  </MarkdownContent>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--sumi-light)' }}>
                    （このレッスンの日本語概要は準備中です）
                  </p>
                )}
                {data.voaUrl && (
                  <a
                    href={data.voaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold"
                    style={{ color: 'var(--shu)' }}
                  >
                    <ExternalLink size={14} strokeWidth={1.25} aria-hidden="true" className="inline mr-1" />VOA 公式ページを開く ↗
                  </a>
                )}
              </SectionCard>

              {/* ─── ② 会話を聞いて、読んでみよう（動画のみ） ───── */}
              <SectionCard
                Icon={Headphones}
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
                  <p className="text-sm" style={{ color: 'var(--sumi-light)' }}>
                    （このレッスンの動画は準備中です）
                  </p>
                )}
              </SectionCard>

              {/* ─── ③ Dictation 練習 ─────────────────────────────── */}
              {/* subtitle は HandwritingNote に統合したのでここでは指定しない */}
              <SectionCard
                Icon={Pencil}
                title="Dictation 練習"
                accent={accent}
              >
                {canPlay ? (
                  // R3-機能3 Phase 6: SentencePlayer + 自己申告 + confetti + 進捗保存を統合
                  <DictationPanel
                    lessonKey={`${course}/${lesson}`}
                    lessonTitle={headline}
                    audioUrl={audioUrl!}
                    sentences={sentences!}
                  />
                ) : (
                  <div
                    className="rounded-xl p-4 mb-4 text-center"
                    style={{
                      background: 'var(--washi-light)',
                      border:     '1px dashed var(--line)',
                    }}
                  >
                    <Wrench size={28} strokeWidth={1.25} aria-hidden="true" className="block mx-auto mb-2" />
                    <p className="text-sm font-bold mb-1" style={{ color: 'var(--sumi)' }}>
                      このレッスンの音声は準備中です
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--sumi-light)' }}>
                      MP3 / SRT が準備でき次第、センテンス単位プレイヤーが表示されます。
                    </p>
                  </div>
                )}
              </SectionCard>

              {/* ─── ④ AI Echo（聴写プレイヤー直下・常時表示） ─────────── */}
              <SectionCard
                Icon={Volume2}
                title="AI Echo"
                subtitle="学んだことを、自分の言葉で。聴いて・書いて・自分の言葉で表現する 3 ステップで定着しよう。"
                accent={accent}
              >
                <AIEchoPanel
                  lessonKey={`${course}/${lesson}`}
                  lessonTitle={headline}
                  lessonScript={lessonScriptForAi}
                />
              </SectionCard>

            </div>

            {/* 右カラム: AI チャット（aictation mode）— 機能 1 で実装済
                lessonContext で sentences 全文を渡し、AI がカテゴリ質問に
                実コンテンツベースで回答できるようにする（Phase 7 追加）。 */}
            <aside className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--header-height)+24px)]">
              <AIChatWidget
                mode="aictation"
                articleTitle={headline}
                articleSlug={`tools/voaenglish/${course}/${lesson}`}
                articleExcerpt={`VOA Learning English のコース「${data.courseTitle}」の${headline}。CEFR ${cefr}。${data.voaUrl ? `公式: ${data.voaUrl}` : ''}`}
                lessonContext={lessonScriptForAi}
              />
            </aside>
          </div>
        </div>
      </section>

      <section
        style={{
          background: 'var(--washi)',
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
                    background: 'var(--washi-light)',
                    border: '1px solid var(--line)',
                    color: 'var(--sumi)',
                  }}
                >
                  <span className="shrink-0 text-xs font-semibold" style={{ color: 'var(--sumi-light)' }}>
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
                    background: 'var(--washi-light)',
                    border: '1px solid var(--line)',
                    color: 'var(--sumi)',
                  }}
                >
                  <span className="truncate text-sm font-bold">
                    {next.lessonNumber ? `Lesson ${next.lessonNumber}: ` : ''}{next.title}
                  </span>
                  <span className="shrink-0 text-xs font-semibold" style={{ color: 'var(--sumi-light)' }}>
                    次のレッスン →
                  </span>
                </Link>
              ) : <div />}
            </div>
            {/* VOA公式リンクは ① レッスン概要 カード内に表示しているため、ここでは出さない */}
          </div>
        </div>
      </section>

      {/* フローティングシェアボタン（X / LINE）— Desktop は左中央・Mobile は左下 */}
      <FloatingShareButtons
        title={`${headline} | ${data.courseTitle}`}
        url={`${SITE.url}/tools/voaenglish/${course}/${lesson}`}
      />
    </main>
  );
}

// ─── レッスン3セクション共通カード（R3-機能3 骨格）──────────────
// レッスン詳細ページの ① 概要 / ② 会話を聞いて / ③ Dictation の各セクションを
// 同じデザインの白カードに統一して表示する。
function SectionCard({
  Icon,
  title,
  subtitle,
  accent,
  children,
}: {
  Icon:      LucideIcon;
  title:    string;
  subtitle?: string;
  accent:   string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-3xl p-5 sm:p-7"
      style={{
        background: 'var(--washi-light)',
        border:     '1px solid var(--line)',
      }}
    >
      <header
        className="flex items-start gap-3 mb-4 pb-3"
        style={{ borderBottom: `2px solid ${accent}` }}
      >
        <Icon size={28} strokeWidth={1.25} aria-hidden="true" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2
            className="font-mincho leading-tight"
            style={{
              fontSize: 'clamp(18px, 2.5vw, 24px)',
              color:    'var(--sumi)',
              fontWeight: 500,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs" style={{ color: 'var(--sumi-light)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}
