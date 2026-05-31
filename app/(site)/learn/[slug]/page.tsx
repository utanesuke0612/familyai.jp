/**
 * app/(site)/learn/[slug]/page.tsx
 * familyai.jp — 記事詳細ページ（Server Component）
 *
 * - generateMetadata で OGP / Twitter Card を動的生成
 * - JSON-LD（Article スキーマ）を head に埋め込む
 * - Drizzle + Neon HTTP で記事を取得
 * - ArticleBody（Markdown レンダラー）
 * - AIChatWidget（AIチャット）
 * - 閲覧数をバックグラウンドでインクリメント
 * - 記事が存在しない場合は notFound() で 404 を返す
 */

import type { Metadata }    from 'next';
import dynamic               from 'next/dynamic';
import { notFound }         from 'next/navigation';
import { cache }            from 'react';

import {
  getArticle,
  getRelatedArticles,
  getAllPublishedSlugs,
  incrementViewCount,
} from '@/lib/repositories/articles';

/**
 * React.cache() で同一リクエスト中の重複 DB 呼び出しを排除する（Rev23 #1）。
 * Next.js は Server Component の fetch() のみ自動 dedup するため、
 * Drizzle 直接呼び出しでは自前で cache() を噛ませる必要がある。
 * → generateMetadata と ArticlePage で同じ slug を2回叩かないようにする。
 */
const getArticleCached = cache(getArticle);

// ── 遅延ロード（初期バンドル削減） ─────────────────────────────
const ArticleBody           = dynamic(() => import('@/components/article/ArticleBody').then(m => m.ArticleBody),           { loading: () => <SkeletonBlock height="60vh" /> });
const AIChatWidget          = dynamic(() => import('@/components/article/AIChatWidget').then(m => m.AIChatWidget),         { ssr: false, loading: () => <SkeletonBlock height="300px" /> });
const ArticleComments       = dynamic(() => import('@/components/article/ArticleComments').then(m => m.ArticleComments),       { loading: () => <SkeletonBlock height="200px" /> });
const FloatingShareButtons  = dynamic(() => import('@/components/article/FloatingShareButtons').then(m => m.FloatingShareButtons),  { loading: () => <SkeletonBlock height="48px" /> });
import { ArticleTableOfContents } from '@/components/article/ArticleTableOfContents';
import { ArticleGrid }           from '@/components/article/ArticleGrid';
import { getArticleBookmarkCount } from '@/lib/repositories/article-bookmarks';
import { collectArticleHeadings } from '@/lib/articles/toc';
import {
  SITE,
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  formatDateJa,
} from '@/shared';
import type { ContentCategory } from '@/shared';

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

// ISR: 1時間ごとに再検証（generateStaticParams に含まれない新規記事も対応）
export const dynamic = 'force-dynamic'; // 一時的に全キャッシュ無効化

// ビルド時に公開済み全記事の静的HTMLを生成。未知の slug も ISR で動的対応。
export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

// ── 難易度バッジ色 ────────────────────────────────────────────
// Rev40 Phase K: Mingei トークンへ統一。難易度の段階感は washi 系の濃淡で表現。
const LEVEL_BG: Record<string, string> = {
  beginner:     'var(--washi-light)',
  intermediate: 'var(--washi-deep)',
  advanced:     'var(--shu-soft)',
};
const LEVEL_TEXT: Record<string, string> = {
  beginner:     'var(--sumi)',
  intermediate: 'var(--sumi)',
  advanced:     'var(--sumi)',
};
// ── generateMetadata ──────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticleCached(params.slug);

  if (!article) {
    return {
      title:       '記事が見つかりません | familyai.jp',
      description: 'お探しの記事は存在しないか、削除された可能性があります。',
    };
  }

  const title       = `${article.title} | familyai.jp`;
  const description = article.description ?? article.title;
  const url         = `${SITE.url}/learn/${article.slug}`;

  // OGP: サムネイルがあればそれを使い、なければ静的デフォルト画像を使用
  // ※ /api/og の動的生成は Twitter の robots.txt チェックでブロックされる場合があるため
  //   サムネイルなし記事は /og-default.png をフォールバックとする
  const ogImage = article.thumbnailUrl ?? `${SITE.url}/og-default.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type:   'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
      // Rev40 (Deepening #3): article は DTO のため既に ISO 文字列
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime:  article.updatedAt,
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [ogImage],
    },
    alternates: { canonical: url },
  };
}

// ── JSON-LD コンポーネント ────────────────────────────────────
function JsonLd({ article }: { article: NonNullable<Awaited<ReturnType<typeof getArticle>>> }) {
  const articleUrl = `${SITE.url}/learn/${article.slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'Article',
    headline:   article.title,
    description: article.description ?? article.title,
    // Rev27 #3: /og-default.png は存在しないため、Next.js 14 の動的 OGP
    // エンドポイント（app/opengraph-image.tsx → /opengraph-image）を使用する
    image:      article.thumbnailUrl ?? `${SITE.url}/opengraph-image`,
    // Rev40 (Deepening #3): DTO は ISO 文字列のためそのまま使う
    datePublished: article.publishedAt,
    dateModified:  article.updatedAt ?? article.publishedAt,
    url:        articleUrl,
    inLanguage: 'ja',
    publisher: {
      '@type': 'Organization',
      name:    SITE.name,
      url:     SITE.url,
      logo: {
        '@type': 'ImageObject',
        url:     `${SITE.url}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id':   articleUrl,
    },
    keywords: [...article.categories, ...article.tags, 'AI', '人工知能', '家族'].join(', '),
  };

  // `</script>` 抜け出し・`<!--` 早期終了を防ぐため、`<` を U+003C のエスケープに置換
  const safeJson = JSON.stringify(schema).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}

// ── ページ本体 ────────────────────────────────────────────────
export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticleCached(params.slug);

  if (!article) {
    notFound();
  }

  // バックグラウンドで閲覧数インクリメント（await しない）
  incrementViewCount(params.slug);

  // 関連記事 + ブックマーク件数（並列取得）
  const [relatedArticles, bookmarkCount] = await Promise.all([
    getRelatedArticles(article.slug, article.categories),
    getArticleBookmarkCount(article.slug),
  ]);

  // 計算済みメタ
  // Rev40 (Deepening #3): article は DTO (Article) — level は narrow 済み、
  // publishedAt は ISO 文字列、readingMin はマッパーで事前計算済み
  const level           = article.level;
  const readingMin      = article.readingMin;
  const dateStr         = article.publishedAt ? formatDateJa(article.publishedAt) : null;
  const tocItems        = collectArticleHeadings(article.body);

  return (
    <>
      <JsonLd article={article} />

      {/* ── 記事ヘッダー ── */}
      <header
        style={{
          background:   'var(--washi)',
          paddingBlock: 'clamp(7px, 1vw, 12px)',
        }}
      >
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          {/* パンくず */}
          <nav
            className="flex items-center gap-2 text-xs mb-3 flex-wrap"
            aria-label="パンくずリスト"
          >
            <a href="/" className="inline-flex items-center hover:opacity-70 transition-opacity" style={{ color: 'var(--sumi-light)' }}>
              ホーム
            </a>
            <span style={{ color: 'var(--sumi-light)' }} aria-hidden="true">/</span>
            <a href="/learn" className="inline-flex items-center hover:opacity-70 transition-opacity" style={{ color: 'var(--sumi-light)' }}>
              記事一覧
            </a>
            <span style={{ color: 'var(--sumi-light)' }} aria-hidden="true">/</span>
            <span
              className="truncate"
              style={{ color: 'var(--shu)', maxWidth: '240px' }}
              aria-current="page"
            >
              {article.title}
            </span>
          </nav>

          {/* カテゴリバッジ */}
          <div className="flex flex-wrap gap-2 mb-4">
            {article.categories.slice(0, 2).map((c) => (
              <a
                key={c}
                href={`/learn?cat=${c}`}
                className="inline-flex items-center gap-1 px-3 py-1 font-mincho text-xs border transition-opacity hover:opacity-70"
                style={{
                  background:   'white',
                  borderColor:  'var(--line)',
                  color:        'var(--sumi-light)',
                  borderRadius: '4px',
                  minHeight:    'auto',
                }}
              >
                {CATEGORY_LABEL[c as ContentCategory] ?? c}
              </a>
            ))}
            <span
              className="inline-flex items-center px-3 py-1 font-mincho text-xs"
              style={{
                background:   LEVEL_BG[level] ?? 'var(--washi-deep)',
                color:        LEVEL_TEXT[level] ?? 'var(--sumi)',
                border:       '1px solid var(--line)',
                borderRadius: '4px',
              }}
            >
              {DIFFICULTY_LABEL[level] ?? level}
            </span>
            {article.tags.map((tag) => (
              <a
                key={tag}
                href={`/learn?tag=${encodeURIComponent(tag)}`}
                className="inline-flex items-center px-3 py-1 font-mincho text-xs border transition-opacity hover:opacity-70"
                style={{
                  background:   'var(--washi-light)',
                  borderColor:  'var(--line-soft)',
                  color:        'var(--sumi-light)',
                  borderRadius: '4px',
                  minHeight:    'auto',
                }}
              >
                #{tag}
              </a>
            ))}
          </div>

          {/* タイトル */}
          <h1
            className="font-mincho leading-tight mb-4"
            style={{
              fontSize: 'clamp(22px, 4vw, 42px)',
              color:    'var(--sumi)',
              fontWeight: 500,
            }}
          >
            {article.title}
          </h1>

          {/* 説明文 */}
          {article.description && (
            <p
              className="mb-6 max-w-2xl leading-relaxed"
              style={{
                fontSize: 'clamp(14px, 2vw, 17px)',
                color:    'var(--sumi-light)',
              }}
            >
              {article.description}
            </p>
          )}

          {/* メタ情報バー */}
          <div
            className="flex flex-wrap items-center gap-4 text-sm pt-4 border-t"
            style={{ borderColor: 'var(--line)', color: 'var(--sumi-light)' }}
          >
            {dateStr && (
              <span className="flex items-center gap-1.5">
                📅 {dateStr}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              ⏱️ 約{readingMin}分で読める
            </span>
            {article.viewCount > 0 && (
              <span className="flex items-center gap-1.5">
                👀 {article.viewCount.toLocaleString('ja-JP')} 回読まれました
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── 本文エリア ── */}
      <section
        style={{
          background:   'var(--washi)',
          paddingBlock: 'clamp(8px, 1.25vw, 16px)',
        }}
      >
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 items-start">

            {/* ── 左：記事本文 ── */}
            <div className="min-w-0">
              {/* モバイル専用 TOC（lg 以上では非表示） */}
              {tocItems.length > 0 && (
                <div className="lg:hidden mb-6">
                  <ArticleTableOfContents items={tocItems} />
                </div>
              )}

              <ArticleBody content={article.body} />

              {/* 記事一覧に戻る */}
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/learn"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all hover:opacity-80 min-h-[44px]"
                  style={{
                    background:  'var(--washi-light)',
                    borderColor: 'var(--line)',
                    color:       'var(--sumi-light)',
                  }}
                >
                  ← 記事一覧に戻る
                </a>
              </div>

              {/* フローティングアクションボタン（いいね・ブックマーク・X・LINE） */}
              <FloatingShareButtons
                title={article.title}
                url={`${SITE.url}/learn/${article.slug}`}
                slug={article.slug}
                bookmarkCount={bookmarkCount}
              />

              {/* ── コメントセクション ── */}
              <ArticleComments articleSlug={article.slug} />
            </div>

            {/* ── 右：スティッキーサイドバー ── */}
            <aside className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--header-height)+24px)]">
              {/* デスクトップ専用 TOC（モバイルでは上の lg:hidden 版を使用） */}
              <div className="hidden lg:block">
                <ArticleTableOfContents items={tocItems} />
              </div>

              {/* AIチャットウィジェット */}
              <AIChatWidget
                articleTitle={article.title}
                articleSlug={article.slug}
                articleExcerpt={article.description ?? undefined}
                articleCategories={article.categories}
              />

            </aside>
          </div>
        </div>
      </section>

      {/* ── 関連記事セクション ── */}
      {relatedArticles.length > 0 && (
        <section
          style={{
            background:   'var(--washi-deep)',
            paddingBlock: 'clamp(16px, 3vw, 28px)',
          }}
        >
          <div
            className="max-w-container mx-auto"
            style={{ paddingInline: 'var(--container-px)' }}
          >
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--shu)' }}>
                  あわせて読みたい
                </p>
                <h2
                  className="font-mincho"
                  style={{ fontSize: 'var(--text-title)', color: 'var(--sumi)', fontWeight: 500 }}
                >
                  関連記事
                </h2>
              </div>
              <a
                href="/learn"
                className="text-sm font-medium hover:opacity-70 transition-opacity hidden sm:block"
                style={{ color: 'var(--shu)' }}
              >
                すべて見る →
              </a>
            </div>

            <ArticleGrid
              articles={relatedArticles.map((a) => ({
                slug:         a.slug,
                title:        a.title,
                description:  a.description ?? '',
                categories:   a.categories,
                tags:         a.tags,
                level:        a.level,
                thumbnailUrl: a.thumbnailUrl ?? null,
                publishedAt:  a.publishedAt ? new Date(a.publishedAt).toISOString() : null,
                viewCount:    a.viewCount,
                body:         a.body,
              }))}
            />
          </div>
        </section>
      )}
    </>
  );
}
