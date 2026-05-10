/**
 * app/(site)/tools/voaenglish/level-1/page.tsx
 * familyai.jp — Let's Learn English - Level 1 コース Top ページ
 *
 * VOA 公式 (https://learningenglish.voanews.com/p/5644.html) を雛形に、
 * 全 52 レッスンの一覧を表示する。Anna コースと同じレイアウト。
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/shared';
import { auth } from '@/lib/auth';
import { listUserProgressByPrefix } from '@/lib/repositories/lessons-progress';
import { getLessonsByCourse } from '@/lib/voaenglish/lessons';

export const metadata: Metadata = {
  title:       `Let's Learn English - Level 1 | VOA × AI ディクテーション教室 | ${SITE.name}`,
  description: 'VOAの初級英語コース「Let\'s Learn English - Level 1」を、AIと組み合わせて学ぶ52週分のレッスンページです。CEFR A1。',
  alternates:  { canonical: `${SITE.url}/tools/voaenglish/level-1` },
};

export default async function Level1TopPage() {
  // ログイン中ならコース内の全 lesson の進捗（attempts）を一括取得
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const progressMap: Record<string, number> = {};
  if (isLoggedIn) {
    const rows = await listUserProgressByPrefix(session!.user!.id, 'level-1/');
    for (const r of rows) {
      progressMap[r.lessonKey] = r.attempts;
    }
  }

  // .md frontmatter から lesson 一覧取得（lessonNumber 順）
  const lessons = getLessonsByCourse('level-1')
    .filter((l) => l.published)
    .sort((a, b) => (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0));

  return (
    <main style={{ background: 'var(--color-cream)' }}>
      <section
        className="px-6 py-8 sm:py-10"
        style={{ background: 'linear-gradient(160deg, var(--color-mint) 0%, var(--color-cream) 100%)' }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            <Link
              href="/tools/voaenglish"
              className="rounded-full px-4 py-2"
              style={{
                background: 'rgba(255,255,255,0.9)',
                color: 'var(--color-brown)',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              ← VOA × AI ディクテーション教室へ戻る
            </Link>
            <span
              className="rounded-full px-4 py-2"
              style={{ background: 'var(--color-yellow)', color: 'var(--color-brown)' }}
            >
              🌱 Beginning Level
            </span>
            <span
              className="rounded-full px-3 py-2 text-xs"
              style={{
                background: 'rgba(255,255,255,0.85)',
                color: 'var(--color-brown)',
                border: '1px solid rgba(120, 80, 40, 0.15)',
              }}
            >
              CEFR A1
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <h1
              className="font-display font-bold leading-tight"
              style={{ fontSize: 'clamp(28px, 4.6vw, 48px)', color: 'var(--color-brown)' }}
            >
              Let&apos;s Learn English - Level 1
            </h1>
            <p
              className="text-base leading-relaxed sm:text-lg"
              style={{ color: 'var(--color-brown-light)' }}
            >
              <strong>52 週分</strong>のステップアップ式レッスン。挨拶や自己紹介から始まり、
              日常会話・買い物・天気・趣味など、生活に身近なテーマで初級英語を着実に身につけられます。
              アメリカ英語に初めて触れる方にも最適です。
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 sm:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <span
                className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: 'var(--color-mint)', color: 'var(--color-brown)' }}
              >
                📚 全{lessons.length}レッスン
              </span>
              <h2 className="font-display text-2xl font-bold sm:text-3xl" style={{ color: 'var(--color-brown)' }}>
                Lessons
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/mypage/bookmarks"
                className="text-sm font-semibold"
                style={{ color: 'var(--color-orange)' }}
              >
                🔖 マイブックマークを開く →
              </Link>
              <a
                href="https://learningenglish.voanews.com/p/5644.html"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold"
                style={{ color: 'var(--color-orange)' }}
              >
                VOA公式で全レッスンを見る ↗
              </a>
            </div>
          </div>

          {/* 未ログイン誘導バナー */}
          {!isLoggedIn && (
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap"
              style={{
                background: 'linear-gradient(135deg, #FFF7EB, #FDF6ED)',
                border:     '1px solid #E8CFA8',
              }}
            >
              <span className="text-xl">💡</span>
              <p className="flex-1 text-sm" style={{ color: 'var(--color-brown)' }}>
                ログインすると、各レッスンの<strong>挑戦回数</strong>を記録・表示できます。
              </p>
              <Link
                href="/api/auth/signin"
                className="rounded-full px-4 py-1.5 text-xs font-bold transition-opacity hover:opacity-80"
                style={{
                  background: 'var(--color-orange)',
                  color:      '#fff',
                  boxShadow:  '0 2px 6px rgba(255,140,66,0.3)',
                }}
              >
                ログインする →
              </Link>
            </div>
          )}

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {lessons.map((lesson) => {
              const lessonKey = `level-1/${lesson.slug}`;
              const attempts  = progressMap[lessonKey] ?? 0;
              return (
                <li key={lesson.slug}>
                  <Link
                    href={`/tools/voaenglish/level-1/${lesson.slug}`}
                    className="group block overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-200 hover:-translate-y-1"
                    style={{
                      background: 'rgba(255,255,255,0.92)',
                      boxShadow: 'var(--shadow-warm-sm)',
                    }}
                  >
                    <div
                      className="relative w-full overflow-hidden"
                      style={{ aspectRatio: '16 / 9', background: 'var(--color-beige)' }}
                    >
                      {lesson.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={lesson.thumbnail}
                          alt={`Lesson ${lesson.lessonNumber}: ${lesson.title}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                      {/* 挑戦回数バッジ（0 回時は非表示） */}
                      {attempts > 0 && (
                        <span
                          className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold"
                          style={{
                            background: 'rgba(255, 140, 66, 0.95)',
                            color:      '#fff',
                            boxShadow:  '0 2px 6px rgba(0,0,0,0.15)',
                          }}
                          title={`${attempts} 回挑戦しました`}
                        >
                          ✨ {attempts}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 p-3">
                      <span className="text-xs font-bold" style={{ color: 'var(--color-orange)' }}>
                        Lesson {lesson.lessonNumber}
                      </span>
                      <span className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-brown)' }}>
                        {lesson.title}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div>
            <Link
              href="/tools/voaenglish?level=beginning"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                background: 'rgba(255,255,255,0.9)',
                color: 'var(--color-brown)',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              <span>←</span>
              <span>Beginning Level の他のコースを見る</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
