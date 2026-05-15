/**
 * app/(site)/tools/voaenglish/level-2/page.tsx
 * familyai.jp — Let's Learn English - Level 2 コース Top ページ
 *
 * VOA 公式 (https://learningenglish.voanews.com/p/6765.html) を雛形に、
 * 全 30 レッスンの一覧を表示する。Level 1 / Anna と同じレイアウト。
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/shared';
import { auth } from '@/lib/auth';
import { listUserProgressByPrefix } from '@/lib/repositories/lessons-progress';
import { getLessonsByCourse } from '@/lib/voaenglish/lessons';

export const metadata: Metadata = {
  title:       `Let's Learn English - Level 2 | VOA × AI ディクテーション教室 | ${SITE.name}`,
  description: 'VOAの初級〜中級英語コース「Let\'s Learn English - Level 2」を、AIと組み合わせて学ぶ30週分のレッスンページです。CEFR A2。',
  alternates:  { canonical: `${SITE.url}/tools/voaenglish/level-2` },
};

export default async function Level2TopPage() {
  // ログイン中ならコース内の全 lesson の進捗（attempts）を一括取得
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const progressMap: Record<string, number> = {};
  if (isLoggedIn) {
    const rows = await listUserProgressByPrefix(session!.user!.id, 'level-2/');
    for (const r of rows) {
      progressMap[r.lessonKey] = r.attempts;
    }
  }

  // .md frontmatter から lesson 一覧取得（lessonNumber 順）
  const lessons = getLessonsByCourse('level-2')
    .filter((l) => l.published)
    .sort((a, b) => (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0));

  return (
    <main style={{ background: 'var(--washi)' }}>
      <section
        className="px-6 py-8 sm:py-10"
        style={{ background: 'var(--washi)' }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {/* Rev40 Phase I: Mingei 統一（矩形 4px + font-mincho・絵文字撤廃） */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/tools/voaenglish"
              className="font-mincho px-4 py-2 transition-colors hover:text-[var(--shu)] min-h-[44px] inline-flex items-center"
              style={{
                background:   'var(--washi-light)',
                color:        'var(--sumi)',
                border:       '1px solid var(--line)',
                borderRadius: '4px',
              }}
            >
              ← VOA × AI ディクテーション教室へ戻る
            </Link>
            <span
              className="font-mincho px-4 py-2 inline-flex items-center"
              style={{
                background:   'var(--washi-deep)',
                color:        'var(--sumi)',
                border:       '1px solid var(--line)',
                borderRadius: '4px',
              }}
            >
              Beginning Level
            </span>
            <span
              className="font-mincho px-4 py-2 text-xs inline-flex items-center"
              style={{
                background:   'var(--washi-light)',
                color:        'var(--sumi-light)',
                border:       '1px solid var(--line)',
                borderRadius: '4px',
              }}
            >
              CEFR A2
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <h1
              className="font-mincho leading-tight"
              style={{ fontSize: 'clamp(28px, 4.6vw, 48px)', color: 'var(--sumi)', fontWeight: 500 }}
            >
              Let&apos;s Learn English - Level 2
            </h1>
            <p
              className="text-base leading-relaxed sm:text-lg"
              style={{ color: 'var(--sumi-light)' }}
            >
              <strong>30 週分</strong>のステップアップ式レッスン。Anna と仲間たちが繰り広げる
              職場・友人・家族のストーリーを通して、Level 1 の基礎を活かしながら
              <strong>より自然な日常英会話</strong>を身につけられます。
              ビジネスや人間関係のテーマも増え、表現力の幅が広がります。
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
                style={{ background: 'var(--washi-deep)', color: 'var(--sumi)' }}
              >
                📚 全{lessons.length}レッスン
              </span>
              <h2 className="font-mincho text-2xl sm:text-3xl" style={{ color: 'var(--sumi)', fontWeight: 500 }}>
                Lessons
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/mypage/bookmarks"
                className="text-sm font-semibold"
                style={{ color: 'var(--shu)' }}
              >
                🔖 マイブックマークを開く →
              </Link>
              <a
                href="https://learningenglish.voanews.com/p/6765.html"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold"
                style={{ color: 'var(--shu)' }}
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
                background: 'var(--washi-light)',
                border:     '1px solid var(--line)',
              }}
            >
              <span className="text-xl">💡</span>
              <p className="flex-1 text-sm" style={{ color: 'var(--sumi)' }}>
                ログインすると、各レッスンの<strong>挑戦回数</strong>を記録・表示できます。
              </p>
              <Link
                href="/api/auth/signin"
                className="rounded-full px-4 py-1.5 text-xs font-bold transition-opacity hover:opacity-80"
                style={{
                  background: 'var(--shu)',
                  color:      '#fff',
                }}
              >
                ログインする →
              </Link>
            </div>
          )}

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {lessons.map((lesson) => {
              const lessonKey = `level-2/${lesson.slug}`;
              const attempts  = progressMap[lessonKey] ?? 0;
              return (
                <li key={lesson.slug}>
                  <Link
                    href={`/tools/voaenglish/level-2/${lesson.slug}`}
                    className="group block overflow-hidden rounded-2xl transition-transform duration-200 hover:-translate-y-1"
                    style={{
                      background: 'var(--washi-light)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div
                      className="relative w-full overflow-hidden"
                      style={{ aspectRatio: '16 / 9', background: 'var(--washi-deep)' }}
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
                      <span className="text-xs font-bold" style={{ color: 'var(--shu)' }}>
                        Lesson {lesson.lessonNumber}
                      </span>
                      <span className="text-sm font-semibold leading-snug" style={{ color: 'var(--sumi)' }}>
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
                background: 'var(--washi-light)',
                color: 'var(--sumi)',
                border: '1px solid var(--line)',
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
