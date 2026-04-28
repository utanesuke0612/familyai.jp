/**
 * app/(site)/tools/voaenglish/anna/page.tsx
 * familyai.jp — Let's Learn English with Anna コースTopページ
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/shared';

export const metadata: Metadata = {
  title:       `Let's Learn English with Anna | VOA × AI ディクテーション教室 | ${SITE.name}`,
  description: 'VOAの子ども向け英語コース「Let\'s Learn English with Anna」を、AIと組み合わせて家族で学ぶための入り口です。全40レッスン、CEFR A1–A2。',
  alternates:  { canonical: `${SITE.url}/tools/voaenglish/anna` },
};

type AnnaLesson = {
  number: number;
  title: string;
  href: string;
  thumbnail: string;
};

const ANNA_LESSONS: AnnaLesson[] = [
  { number: 1, title: "Who Are You?", href: 'https://learningenglish.voanews.com/a/6654462.html', thumbnail: 'https://gdb.voanews.com/09690000-0a00-0242-53a7-08da69e707f7_w400_r1.png' },
  { number: 2, title: "What Do You Like to Eat?", href: 'https://learningenglish.voanews.com/a/6657652.html', thumbnail: 'https://gdb.voanews.com/09690000-0a00-0242-3432-08da6a5ff662_w400_r1.png' },
  { number: 3, title: "How Do You Feel?", href: 'https://learningenglish.voanews.com/a/6658207.html', thumbnail: 'https://gdb.voanews.com/01460000-0aff-0242-4fb7-08da6a5ff663_w400_r1.png' },
  { number: 4, title: "How Old Are You?", href: 'https://learningenglish.voanews.com/a/6659179.html', thumbnail: 'https://gdb.voanews.com/09680000-0a00-0242-bd47-08da6a5ff666_w400_r1.png' },
  { number: 5, title: "What Can You Do?", href: 'https://learningenglish.voanews.com/a/6666377.html', thumbnail: 'https://gdb.voanews.com/01460000-0aff-0242-e665-08da6a5ff66d_w400_r1.png' },
  { number: 6, title: "Where Do You Live?", href: 'https://learningenglish.voanews.com/a/6727123.html', thumbnail: 'https://gdb.voanews.com/09690000-0a00-0242-5bae-08da69e70ee9_w400_r1.png' },
  { number: 7, title: "Where Do You Want to Visit?", href: 'https://learningenglish.voanews.com/a/6727229.html', thumbnail: 'https://gdb.voanews.com/01460000-0aff-0242-91ef-08da69e70eef_w400_r1.png' },
  { number: 8, title: "What Day Is It?", href: 'https://learningenglish.voanews.com/a/6729056.html', thumbnail: 'https://gdb.voanews.com/01460000-0aff-0242-c9a6-08da69e70f17_w400_r1.png' },
  { number: 9, title: "What Are You Doing?", href: 'https://learningenglish.voanews.com/a/6729065.html', thumbnail: 'https://gdb.voanews.com/09690000-0a00-0242-ce54-08da69e715fb_w400_r1.png' },
  { number: 10, title: "What Time Is It?", href: 'https://learningenglish.voanews.com/a/6729066.html', thumbnail: 'https://gdb.voanews.com/09680000-0a00-0242-f3b1-08da69e715fd_w400_r1.png' },
  { number: 11, title: "What Do You Do at the Beach?", href: 'https://learningenglish.voanews.com/a/6833894.html', thumbnail: 'https://gdb.voanews.com/09410000-0a00-0242-ca47-08dadedf9338_w400_r1.png' },
  { number: 12, title: "How Does a Garden Grow?", href: 'https://learningenglish.voanews.com/a/6878350.html', thumbnail: 'https://gdb.voanews.com/03370000-0aff-0242-c4fa-08dadedf8a20_w400_r1.png' },
  { number: 13, title: "What Is at a Farmers' Market?", href: 'https://learningenglish.voanews.com/a/6878354.html', thumbnail: 'https://gdb.voanews.com/09410000-0a00-0242-80d6-08dadedf8a14_w400_r1.png' },
  { number: 14, title: "What Is Your Favorite Bug?", href: 'https://learningenglish.voanews.com/a/6878360.html', thumbnail: 'https://gdb.voanews.com/03370000-0aff-0242-df22-08dadedf8a1c_w400_r1.png' },
  { number: 15, title: "What Is Camping?", href: 'https://learningenglish.voanews.com/a/6878365.html', thumbnail: 'https://gdb.voanews.com/03370000-0aff-0242-e524-08dadedf8a12_w400_r1.png' },
  { number: 16, title: "What Can Pets Do?", href: 'https://learningenglish.voanews.com/a/6983016.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-0247-08db0ec58fcc_w400_r1.png' },
  { number: 17, title: "Who Is in Your Family?", href: 'https://learningenglish.voanews.com/a/7005450.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-40b8-08db0ec587bf_w400_r1.png' },
  { number: 18, title: "When Is Your Birthday?", href: 'https://learningenglish.voanews.com/a/lesson-18-when-is-your-birthday-/7005451.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-1405-08db0ec587d0_w400_r1.png' },
  { number: 19, title: "What Do You Do at a Playground?", href: 'https://learningenglish.voanews.com/a/7005452.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-6679-08db0ec587a8_w400_r1.png' },
  { number: 20, title: "What Hurts?", href: 'https://learningenglish.voanews.com/a/7005457.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-16d3-08db0ec587a9_w400_r1.png' },
  { number: 21, title: "What Places Are in Your Town?", href: 'https://learningenglish.voanews.com/a/lesson-21-what-places-are-in-your-town-/7130314.html', thumbnail: 'https://gdb.voanews.com/01000000-0a00-0242-9549-08db68ea0b2a_w400_r1.png' },
  { number: 22, title: "What Rooms Are in a Home?", href: 'https://learningenglish.voanews.com/a/7227613.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-bbc0-08db9e689703_w400_r1.png' },
  { number: 23, title: "Where Do Wild Animals Live?", href: 'https://learningenglish.voanews.com/a/7227617.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-a919-08db9e6896bc_w400_r1.png' },
  { number: 24, title: "What Is the Weather Today?", href: 'https://learningenglish.voanews.com/a/lesson-24-what-is-the-weather-today-/7227624.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-272a-08db9e6896ee_w400_r1.png' },
  { number: 25, title: "What Games Do You Play?", href: 'https://learningenglish.voanews.com/a/lesson-25-what-games-do-you-play-/7227629.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-4095-08db9e6896f1_w400_r1.png' },
  { number: 26, title: "What Do You Do in a Day?", href: 'https://learningenglish.voanews.com/a/lesson-26-what-do-you-do-in-a-day-/7248892.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-371e-08dba9ce5697_w400_r1.png' },
  { number: 27, title: "What Are You Wearing Today?", href: 'https://learningenglish.voanews.com/a/lesson-27-what-are-you-wearing-today-/7248904.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-38a7-08dba9ce56b8_w400_r1.png' },
  { number: 28, title: "How Do You Go to School?", href: 'https://learningenglish.voanews.com/a/lesson-28-how-do-you-go-to-school-/7248920.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-532d-08dba9cfa570_w400_r1.png' },
  { number: 29, title: "What Do You Do in School?", href: 'https://learningenglish.voanews.com/a/lesson-29-what-do-you-do-in-school-/7248921.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-f78c-08dba9ce56db_w400_r1.png' },
  { number: 30, title: "What Food Can You Make?", href: 'https://learningenglish.voanews.com/a/lesson-30-what-food-can-you-make-/7248927.html', thumbnail: 'https://gdb.voanews.com/01000000-0aff-0242-bbab-08dba9cfa570_w400_r1.png' },
  { number: 31, title: "What Do Friends Do Together?", href: 'https://learningenglish.voanews.com/a/7379164.html', thumbnail: 'https://gdb.voanews.com/01000000-c0a8-0242-91b0-08dbf1e53a7f_w400_r1.png' },
  { number: 32, title: "What Is Your Hobby?", href: 'https://learningenglish.voanews.com/a/7379172.html', thumbnail: 'https://gdb.voanews.com/01000000-c0a8-0242-2113-08dbf1c67578_w400_r1.png' },
  { number: 33, title: "How Do You Like to Exercise?", href: 'https://learningenglish.voanews.com/a/7379176.html', thumbnail: 'https://gdb.voanews.com/01000000-c0a8-0242-bb7c-08dbf1c67582_w400_r1.png' },
  { number: 34, title: "What Music Do You Like?", href: 'https://learningenglish.voanews.com/a/7379181.html', thumbnail: 'https://gdb.voanews.com/01000000-c0a8-0242-02f5-08dbf1c67583_w400_r1.png' },
  { number: 35, title: "How Do You Use Computers?", href: 'https://learningenglish.voanews.com/a/7379193.html', thumbnail: 'https://gdb.voanews.com/01000000-0a00-0242-571d-08dbf1c67d57_w400_r1.png' },
  { number: 36, title: "What Is in Our Solar System?", href: 'https://learningenglish.voanews.com/a/lesson-36-what-is-in-our-solar-system-/7490627.html', thumbnail: 'https://gdb.voanews.com/01000000-0a00-0242-970c-08dc2f26577a_w400_r1.png' },
  { number: 37, title: "What Country Are You from?", href: 'https://learningenglish.voanews.com/a/lesson-37-what-country-are-you-from-/7490968.html', thumbnail: 'https://gdb.voanews.com/01000000-0a00-0242-4a8e-08dc2f26577c_w400_r1.png' },
  { number: 38, title: "How Can You Help the Environment?", href: 'https://learningenglish.voanews.com/a/lesson-38-how-can-you-help-the-environment-/7490973.html', thumbnail: 'https://gdb.voanews.com/01000000-0a00-0242-a7f1-08dc2f265788_w400_r1.png' },
  { number: 39, title: "Where Are the Dinosaurs?", href: 'https://learningenglish.voanews.com/a/lesson-39-where-are-the-dinosaurs-/7490988.html', thumbnail: 'https://gdb.voanews.com/01000000-0a00-0242-3ebf-08dc2f26577b_w400_r1.png' },
  { number: 40, title: "What Job Do You Want in the Future?", href: 'https://learningenglish.voanews.com/a/lesson-40-what-job-do-you-want-in-the-future-/7490992.html', thumbnail: 'https://gdb.voanews.com/01000000-0a00-0242-e750-08dc2f265e3e_w400_r1.png' },
];

export default function AnnaTopPage() {
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
              CEFR A1–A2
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <h1
              className="font-display font-bold leading-tight"
              style={{ fontSize: 'clamp(28px, 4.6vw, 48px)', color: 'var(--color-brown)' }}
            >
              Let&apos;s Learn English with Anna
            </h1>
            <p
              className="text-base leading-relaxed sm:text-lg"
              style={{ color: 'var(--color-brown-light)' }}
            >
              ワシントンD.C.に引っ越してきた主人公 <strong>Anna</strong> と一緒に、
              <strong>質問と会話</strong>を中心にアメリカ英語を学べる VOA の入門コースです。
              8〜12歳の子ども向けに作られていますが、家族で一緒に観ても楽しめます。
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
                📚 全40レッスン
              </span>
              <h2 className="font-display text-2xl font-bold sm:text-3xl" style={{ color: 'var(--color-brown)' }}>
                Lessons
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/mypage/vocab"
                className="text-sm font-semibold"
                style={{ color: 'var(--color-orange)' }}
              >
                ⭐ わたしの単語帳を開く →
              </Link>
              <a
                href="https://learningenglish.voanews.com/p/8322.html"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold"
                style={{ color: 'var(--color-orange)' }}
              >
                VOA公式で全レッスンを見る ↗
              </a>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ANNA_LESSONS.map((lesson) => (
              <li key={lesson.number}>
                <Link
                  href={`/tools/voaenglish/anna/lesson-${String(lesson.number).padStart(2, '0')}`}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lesson.thumbnail}
                      alt={`Lesson ${lesson.number}: ${lesson.title}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <span className="text-xs font-bold" style={{ color: 'var(--color-orange)' }}>
                      Lesson {lesson.number}
                    </span>
                    <span className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-brown)' }}>
                      {lesson.title}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
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
