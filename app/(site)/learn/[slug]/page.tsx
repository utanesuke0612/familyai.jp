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
import { notFound }         from 'next/navigation';
import { cache }            from 'react';

import {
  getArticle,
  getRelatedArticles,
  incrementViewCount,
} from '@/lib/repositories/articles';

/**
 * React.cache() で同一リクエスト中の重複 DB 呼び出しを排除する（Rev23 #1）。
 * Next.js は Server Component の fetch() のみ自動 dedup するため、
 * Drizzle 直接呼び出しでは自前で cache() を噛ませる必要がある。
 * → generateMetadata と ArticlePage で同じ slug を2回叩かないようにする。
 */
const getArticleCached = cache(getArticle);
import { ArticleBody }  from '@/components/article/ArticleBody';
import { AIChatWidget } from '@/components/article/AIChatWidget';
import { AudioPlayer }  from '@/components/article/AudioPlayer';
import { ArticleGrid }  from '@/components/article/ArticleGrid';
import {
  SITE,
  FAMILY_ROLE_LABEL,
  ROLE_EMOJI,
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  DIFFICULTY_LABEL,
  formatDateJa,
  estimateReadingMin,
} from '@/shared';
import type { FamilyRole, ContentCategory, DifficultyLevel } from '@/shared';

// ISR: 1時間ごとに再検証
export const revalidate = 3600;

// ── 難易度バッジ色 ────────────────────────────────────────────
const LEVEL_BG: Record<string, string> = {
  beginner:     'var(--color-mint)',
  intermediate: 'var(--color-yellow)',
  advanced:     'var(--color-peach)',
};
const LEVEL_TEXT: Record<string, string> = {
  beginner:     '#145c38',
  intermediate: '#7a5000',
  advanced:     'var(--color-brown)',
};
const ROLE_BG: Record<string, string> = {
  papa:   'var(--color-papa-bg)',
  mama:   'var(--color-mama-bg)',
  kids:   'var(--color-kids-bg)',
  senior: 'var(--color-senior-bg)',
  common: 'var(--color-common-bg)',
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

  // 動的OGP: サムネイルがあればそれを使い、なければ /api/og で生成
  const primaryRole  = article.roles?.[0] ?? 'common';
  const primaryLevel = article.level ?? '';
  const ogApiUrl     = `${SITE.url}/api/og?${new URLSearchParams({
    title: article.title,
    role:  primaryRole,
    ...(primaryLevel ? { level: primaryLevel } : {}),
  }).toString()}`;
  const ogImage      = article.thumbnailUrl ?? ogApiUrl;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type:   'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime:  article.updatedAt?.toISOString(),
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

  // AudioObject スキーマ（音声付き記事のみ）
  const audioObject = article.audioUrl
    ? {
        '@type':      'AudioObject',
        contentUrl:   article.audioUrl,
        name:         `${article.title}（音声版）`,
        inLanguage:   article.audioLanguage ?? 'ja',
        ...(article.audioDurationSec != null && {
          duration: `PT${Math.floor(article.audioDurationSec / 60)}M${article.audioDurationSec % 60}S`,
        }),
        ...(article.audioTranscript && {
          transcript: article.audioTranscript,
        }),
      }
    : undefined;

  const schema = {
    '@context': 'https://schema.org',
    '@type':    'Article',
    headline:   article.title,
    description: article.description ?? article.title,
    // Rev27 #3: /og-default.png は存在しないため、Next.js 14 の動的 OGP
    // エンドポイント（app/opengraph-image.tsx → /opengraph-image）を使用する
    image:      article.thumbnailUrl ?? `${SITE.url}/opengraph-image`,
    datePublished: article.publishedAt?.toISOString(),
    dateModified:  article.updatedAt?.toISOString() ?? article.publishedAt?.toISOString(),
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
    keywords: [...article.roles, ...article.categories, 'AI', '人工知能', '家族'].join(', '),
    // 音声コンテンツ SEO（audioUrl がある記事のみ）
    ...(audioObject && { audio: audioObject }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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

  // 関連記事
  const relatedArticles = await getRelatedArticles(
    article.slug,
    article.roles,
    article.categories,
  );

  // 計算済みメタ
  const level           = article.level as DifficultyLevel;
  const readingMin      = estimateReadingMin(article.body);
  const dateStr         = article.publishedAt
    ? formatDateJa(article.publishedAt.toISOString())
    : null;

  return (
    <>
      <JsonLd article={article} />

      {/* ── 記事ヘッダー ── */}
      <header
        style={{
          background:   'var(--color-cream)',
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
            <a href="/" className="inline-flex items-center hover:opacity-70 transition-opacity" style={{ color: 'var(--color-brown-light)' }}>
              ホーム
            </a>
            <span style={{ color: 'var(--color-brown-light)' }} aria-hidden="true">/</span>
            <a href="/learn" className="inline-flex items-center hover:opacity-70 transition-opacity" style={{ color: 'var(--color-brown-light)' }}>
              記事一覧
            </a>
            <span style={{ color: 'var(--color-brown-light)' }} aria-hidden="true">/</span>
            <span
              className="truncate"
              style={{ color: 'var(--color-orange)', maxWidth: '240px' }}
              aria-current="page"
            >
              {article.title}
            </span>
          </nav>

          {/* ロール + カテゴリバッジ */}
          <div className="flex flex-wrap gap-2 mb-4">
            {article.roles.map((r) => (
              <a
                key={r}
                href={`/learn?role=${r}`}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-opacity hover:opacity-70"
                style={{
                  background:  ROLE_BG[r] ?? 'var(--color-beige)',
                  borderColor: 'transparent',
                  color:       'var(--color-brown)',
                  minHeight:   'auto',
                }}
              >
                {ROLE_EMOJI[r as FamilyRole]} {FAMILY_ROLE_LABEL[r as FamilyRole] ?? r}
              </a>
            ))}
            {article.categories.slice(0, 2).map((c) => (
              <a
                key={c}
                href={`/learn?cat=${c}`}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-opacity hover:opacity-70"
                style={{
                  background:  'white',
                  borderColor: 'var(--color-beige-dark)',
                  color:       'var(--color-brown-light)',
                  minHeight:   'auto',
                }}
              >
                {CATEGORY_EMOJI[c as ContentCategory]}
                {CATEGORY_LABEL[c as ContentCategory] ?? c}
              </a>
            ))}
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: LEVEL_BG[level] ?? 'var(--color-beige)',
                color:      LEVEL_TEXT[level] ?? 'var(--color-brown)',
              }}
            >
              {DIFFICULTY_LABEL[level] ?? level}
            </span>
          </div>

          {/* タイトル */}
          <h1
            className="font-display font-bold leading-tight mb-4"
            style={{
              fontSize: 'clamp(22px, 4vw, 42px)',
              color:    'var(--color-brown)',
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
                color:    'var(--color-brown-light)',
              }}
            >
              {article.description}
            </p>
          )}

          {/* メタ情報バー */}
          <div
            className="flex flex-wrap items-center gap-4 text-sm pt-4 border-t"
            style={{ borderColor: 'var(--color-beige)', color: 'var(--color-brown-light)' }}
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
            {article.audioUrl && (
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: 'var(--color-peach-light)', color: 'var(--color-brown)' }}
              >
                🎵 音声コンテンツあり
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── 音声プレーヤー（audioUrl がある場合のみ）── */}
      {article.audioUrl && (
        <section
          style={{
            background:   'var(--color-cream)',
            paddingBlock: 'clamp(12px, 2vw, 20px)',
          }}
        >
          <div
            className="max-w-container mx-auto"
            style={{ paddingInline: 'var(--container-px)' }}
          >
            <AudioPlayer
              src={article.audioUrl}
              title={article.title}
              transcript={article.audioTranscript ?? null}
              language={article.audioLanguage ?? null}
              durationSec={article.audioDurationSec ?? null}
              articleId={article.id}
            />
          </div>
        </section>
      )}

      {/* ── 本文エリア ── */}
      <section
        style={{
          background:   'var(--color-cream)',
          paddingBlock: 'clamp(8px, 1.25vw, 16px)',
        }}
      >
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">

            {/* ── 左：記事本文 ── */}
            <div className="min-w-0">
              <ArticleBody content={article.body} />

              {/* SNS シェアボタン */}
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`${SITE.url}/learn/${article.slug}`)}&via=familyaijp`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all hover:opacity-80 min-h-[44px]"
                  style={{ background: '#1DA1F2', color: 'white', border: 'none' }}
                >
                  𝕏 でシェア
                </a>
                <a
                  href={`https://line.me/R/msg/text/?${encodeURIComponent(article.title + '\n' + `${SITE.url}/learn/${article.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all hover:opacity-80 min-h-[44px]"
                  style={{ background: '#06C755', color: 'white', border: 'none' }}
                >
                  LINE でシェア
                </a>
                <a
                  href="/learn"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all hover:opacity-80 min-h-[44px]"
                  style={{
                    background:  'white',
                    borderColor: 'var(--color-beige-dark)',
                    color:       'var(--color-brown-light)',
                  }}
                >
                  ← 記事一覧に戻る
                </a>
              </div>
            </div>

            {/* ── 右：スティッキーサイドバー ── */}
            <aside className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--header-height)+24px)]">
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
            background:   'var(--color-beige)',
            paddingBlock: 'clamp(16px, 3vw, 28px)',
          }}
        >
          <div
            className="max-w-container mx-auto"
            style={{ paddingInline: 'var(--container-px)' }}
          >
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-orange)' }}>
                  あわせて読みたい
                </p>
                <h2
                  className="font-display font-bold"
                  style={{ fontSize: 'var(--text-title)', color: 'var(--color-brown)' }}
                >
                  関連記事
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
              articles={relatedArticles.map((a) => ({
                slug:         a.slug,
                title:        a.title,
                description:  a.description ?? '',
                roles:        a.roles,
                categories:   a.categories,
                level:        a.level,
                audioUrl:     a.audioUrl ?? null,
                thumbnailUrl: a.thumbnailUrl ?? null,
                publishedAt:  a.publishedAt?.toISOString() ?? null,
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
