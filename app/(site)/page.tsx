/**
 * app/(site)/page.tsx
 * familyai.jp — トップページ
 *
 * ── Coming Soon / 本番公開 スイッチ ──────────────────────────────
 * Vercel 環境変数 COMING_SOON=true  → Coming Soon ページを表示
 * Vercel 環境変数 COMING_SOON を削除 or false → 実際のホームページを表示
 *
 * ローカル（.env.local に COMING_SOON を設定しない）→ 常に実際のホームページ
 * ─────────────────────────────────────────────────────────────────
 */

import { Suspense } from 'react';
import { desc, eq }  from 'drizzle-orm';
import { HeroSection } from '@/components/home/HeroSection';
import { StatsRow }    from '@/components/home/StatsRow';
import { RolePicker }  from '@/components/home/RolePicker';
import { ArticleGrid } from '@/components/article/ArticleGrid';
import { ComingSoon }  from '@/components/home/ComingSoon';
import { db }          from '@/lib/db';
import { articles }    from '@/lib/db/schema';

// ── 新着セクション（Server Component · DB直接取得） ──────────
async function NewArticlesSection() {
  // 公開済み記事を新着順で最大6件取得
  const rows = await db
    .select({
      slug:        articles.slug,
      title:       articles.title,
      description: articles.description,
      roles:       articles.roles,
      categories:  articles.categories,
      level:       articles.level,
      audioUrl:    articles.audioUrl,
      thumbnailUrl: articles.thumbnailUrl,
      publishedAt: articles.publishedAt,
      viewCount:   articles.viewCount,
      body:        articles.body,
    })
    .from(articles)
    .where(eq(articles.published, true))
    .orderBy(desc(articles.publishedAt))
    .limit(6);

  // ArticleCard が期待する shape に整形
  const articleItems = rows.map((row) => ({
    ...row,
    description: row.description ?? '',
  }));

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
          articles={articleItems}
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
  // COMING_SOON=true の場合は Coming Soon ページを表示
  // 公開時は Vercel 環境変数から COMING_SOON を削除するだけでOK（コード変更不要）
  if (process.env.COMING_SOON === 'true') {
    return <ComingSoon />;
  }

  // 実際のホームページを表示
  return (
    <>
      <HeroSection />
      <StatsRow />
      <Suspense fallback={<div style={{ height: '320px', background: 'var(--color-beige)' }} />}>
        <RolePicker />
      </Suspense>
      <Suspense fallback={<div style={{ height: '320px', background: 'var(--color-cream)' }} />}>
        <NewArticlesSection />
      </Suspense>
    </>
  );
}
