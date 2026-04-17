/**
 * app/(site)/page.tsx
 * familyai.jp — トップページ
 */

import { Suspense } from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { StatsRow }    from '@/components/home/StatsRow';
import { RolePicker }  from '@/components/home/RolePicker';
import { ArticleGrid } from '@/components/article/ArticleGrid';

// ── ダミー記事データ（Step 13b で DB 取得に差し替え） ──────────
const DUMMY_ARTICLES = [
  {
    slug:        'chatgpt-meal-planning',
    title:       'ChatGPT で毎日の献立を10秒で決める方法',
    description: '冷蔵庫の残り物を入力するだけで、栄養バランスの取れた献立を提案してくれます。',
    roles:       ['mama'],
    categories:  ['chatgpt', 'housework'],
    level:       'beginner',
    audioUrl:    null,
    publishedAt: '2026-04-10T00:00:00Z',
    viewCount:   342,
    body:        'a'.repeat(1200),
  },
  {
    slug:        'claude-work-email',
    title:       'Claude でビジネスメールを3倍速く書く実践ガイド',
    description: '件名・本文・締めの言葉まで、プロンプト1つで完成させるテクニックを紹介。',
    roles:       ['papa'],
    categories:  ['claude'],
    level:       'intermediate',
    audioUrl:    '/audio/sample.mp3',
    publishedAt: '2026-04-12T00:00:00Z',
    viewCount:   189,
    body:        'a'.repeat(2000),
  },
  {
    slug:        'ai-kids-study',
    title:       'こどもの宿題をAIと一緒に楽しく解く方法',
    description: '答えを教えてもらうのではなく、考え方を一緒に学ぶAIの使い方です。',
    roles:       ['kids'],
    categories:  ['education'],
    level:       'beginner',
    audioUrl:    null,
    publishedAt: '2026-04-14T00:00:00Z',
    viewCount:   521,
    body:        'a'.repeat(900),
  },
  {
    slug:        'gemini-senior-health',
    title:       'シニアのためのAI健康管理入門 — Geminiを使ってみよう',
    description: '薬の飲み忘れ防止や、症状を伝えるときの言い方など実用的な活用例を紹介。',
    roles:       ['senior'],
    categories:  ['gemini', 'health'],
    level:       'beginner',
    audioUrl:    null,
    publishedAt: '2026-04-15T00:00:00Z',
    viewCount:   276,
    body:        'a'.repeat(1500),
  },
  {
    slug:        'image-gen-family-photo',
    title:       '家族の思い出を AI イラストにする — 画像生成入門',
    description: '写真をもとにオリジナルのイラストを作る方法。年賀状やプロフィール画像にも。',
    roles:       ['common'],
    categories:  ['image-gen'],
    level:       'beginner',
    audioUrl:    null,
    publishedAt: '2026-04-16T00:00:00Z',
    viewCount:   408,
    body:        'a'.repeat(1100),
  },
  {
    slug:        'english-learning-voice-ai',
    title:       '音声AIで毎日10分の英語練習を習慣にする方法',
    description: 'AIと会話することで発音・リスニング・スピーキングを同時に鍛えられます。',
    roles:       ['papa', 'mama'],
    categories:  ['voice', 'education'],
    level:       'intermediate',
    audioUrl:    '/audio/english-sample.mp3',
    publishedAt: '2026-04-17T00:00:00Z',
    viewCount:   134,
    body:        'a'.repeat(1800),
  },
] as const;

// ── 新着セクション ────────────────────────────────────────────
function NewArticlesSection() {
  return (
    <section
      style={{
        paddingBlock: 'var(--section-py)',
        background:   'var(--color-cream)',
      }}
    >
      <div
        className="max-w-container mx-auto"
        style={{ paddingInline: 'var(--container-px)' }}
      >
        <div className="flex items-end justify-between mb-8">
          <div>
            <p
              className="text-sm font-medium mb-1"
              style={{ color: 'var(--color-orange)' }}
            >
              新着コンテンツ
            </p>
            <h2
              className="font-display font-bold"
              style={{ fontSize: 'var(--text-title)', color: 'var(--color-brown)' }}
            >
              みんなのAI活用ガイド
            </h2>
          </div>
          <a
            href="/learn"
            className="text-sm font-medium hover:opacity-70 transition-opacity hidden sm:block"
            style={{ color: 'var(--color-orange)' }}
          >
            すべて見る →
          </a>
        </div>

        <ArticleGrid
          articles={DUMMY_ARTICLES as unknown as Parameters<typeof ArticleGrid>[0]['articles']}
          firstFeatured
        />

        <div className="text-center mt-8 sm:hidden">
          <a
            href="/learn"
            className="btn-secondary inline-flex"
          >
            すべての記事を見る →
          </a>
        </div>
      </div>
    </section>
  );
}

// ── ページ本体 ────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsRow />
      <Suspense fallback={<div style={{ height: '320px', background: 'var(--color-beige)' }} />}>
        <RolePicker />
      </Suspense>
      <NewArticlesSection />
    </>
  );
}
