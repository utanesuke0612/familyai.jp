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
import { eq, sql, ne, and } from 'drizzle-orm';

import { db, articles }   from '@/lib/db';
import { ArticleBody }    from '@/components/article/ArticleBody';
import { AIChatWidget }   from '@/components/article/AIChatWidget';
import { AudioPlayer }    from '@/components/article/AudioPlayer';
import { ArticleGrid }    from '@/components/article/ArticleGrid';
import {
  SITE,
  FAMILY_ROLE_LABEL,
  ROLE_EMOJI,
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  DIFFICULTY_LABEL,
} from '@/shared';
import type { FamilyRole, ContentCategory, DifficultyLevel } from '@/shared';
import { formatDateJa, estimateReadingMin } from '@/shared';

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

// ── 記事取得ヘルパー ──────────────────────────────────────────
async function getArticle(slug: string) {
  try {
    const rows = await db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.published, true)))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// ── 関連記事取得 ─────────────────────────────────────────────
async function getRelatedArticles(
  currentSlug: string,
  roles:       string[],
  categories:  string[],
) {
  try {
    const rows = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.published, true),
          ne(articles.slug, currentSlug),
          // roles が一致するものを優先（配列に共通要素があれば）
          sql`(${articles.roles} && ${roles}::text[] OR ${articles.categories} && ${categories}::text[])`,
        ),
      )
      .orderBy(sql`random()`)
      .limit(3);
    return rows;
  } catch {
    return [];
  }
}

// ── generateMetadata ──────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticle(params.slug);

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
    image:      article.thumbnailUrl ?? `${SITE.url}/og-default.png`,
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
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  // バックグラウンドで閲覧数インクリメント（await しない）
  void db
    .update(articles)
    .set({ viewCount: sql`${articles.viewCount} + 1` })
    .where(eq(articles.slug, params.slug))
    .catch(() => {/* 失敗しても無視 */});

  // 関連記事
  const relatedArticles = await getRelatedArticles(
    article.slug,
    article.roles,
    article.categories,
  );

  // 計算済みメタ
  const primaryRole     = (article.roles[0] ?? 'common') as FamilyRole;
  const primaryCategory = (article.categories[0] ?? 'other') as ContentCategory;
  const level           = article.level as DifficultyLevel;
  const readingMin      = estimateReadingMin(article.body);
  const dateStr         = article.publishedAt
    ? formatDateJa(article.publishedAt.toISOString())
    : null;
  const thumbBg         = ROLE_BG[primaryRole] ?? ROLE_BG['common']!;

  return (
    <>
      <JsonLd article={article} />

      {/* ── 記事ヘッダー ── */}
      <header
        style={{
          background:   'var(--color-cream)',
          paddingBlock: 'clamp(32px, 5vw, 64px)',
        }}
      >
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          {/* パンくず */}
          <nav
            className="flex items-center gap-2 text-xs mb-6 flex-wrap"
            aria-label="パンくずリスト"
          >
            <a href="/" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--color-brown-light)' }}>
              ホーム
            </a>
            <span style={{ color: 'var(--color-brown-light)' }} aria-hidden="true">/</span>
            <a href="/learn" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--color-brown-light)' }}>
              記事一覧
            </a>
            <span style={{ color: 'var(--color-brown-light)' }} aria-hidden="true">/</span>
            <span
              className="line-clamp-1"
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

      {/* ── サムネイル（ロールカラー背景） ── */}
      <div
        className="w-full flex items-center justify-center"
        style={{
          background: thumbBg,
          height:     'clamp(100px, 18vw, 200px)',
        }}
        aria-hidden="true"
      >
        <span
          style={{
            fontSize: 'clamp(56px, 10vw, 96px)',
            filter:   'drop-shadow(0 4px 12px rgba(0,0,0,0.12))',
          }}
        >
          {CATEGORY_EMOJI[primaryCategory]}
        </span>
      </div>

      {/* ── 音声プレーヤー（audioUrl がある場合のみ）── */}
      {article.audioUrl && (
        <section
          style={{
            background:   'var(--color-cream)',
            paddingBlock: 'clamp(20px, 3vw, 32px)',
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
          paddingBlock: 'clamp(32px, 5vw, 64px)',
        }}
      >
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">

            {/* ── 左：記事本文 ── */}
            <div className="min-w-0">
              <ArticleBody content={article.body} />

              {/* 記事末尾：タグ一覧 */}
              <div
                className="mt-12 pt-6 border-t flex flex-wrap gap-2"
                style={{ borderColor: 'var(--color-beige)' }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--color-brown-light)' }}>
                  タグ：
                </span>
                {/* ロールタグ: ?role= でフィルタ */}
                {article.roles.map((role) => (
                  <a
                    key={`role-${role}`}
                    href={`/learn?role=${role}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border hover:opacity-70 transition-opacity"
                    style={{
                      background:  'white',
                      borderColor: 'var(--color-beige-dark)',
                      color:       'var(--color-brown-light)',
                    }}
                  >
                    {ROLE_EMOJI[role as FamilyRole] ?? ''}{' '}
                    {FAMILY_ROLE_LABEL[role as FamilyRole] ?? role}
                  </a>
                ))}
                {/* カテゴリタグ: ?cat= でフィルタ */}
                {article.categories.map((cat) => (
                  <a
                    key={`cat-${cat}`}
                    href={`/learn?cat=${cat}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border hover:opacity-70 transition-opacity"
                    style={{
                      background:  'white',
                      borderColor: 'var(--color-beige-dark)',
                      color:       'var(--color-brown-light)',
                    }}
                  >
                    {CATEGORY_EMOJI[cat as ContentCategory] ?? ''}{' '}
                    {CATEGORY_LABEL[cat as ContentCategory] ?? cat}
                  </a>
                ))}
              </div>

              {/* SNS シェアボタン */}
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`${SITE.url}/learn/${article.slug}`)}&via=familyai_jp`}
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

              {/* 記事情報カード */}
              <div
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: 'white', boxShadow: 'var(--shadow-warm-sm)', border: '1px solid var(--color-beige)' }}
              >
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-brown-light)' }}>
                  この記事について
                </p>
                <dl className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt style={{ color: 'var(--color-brown-light)' }}>対象</dt>
                    <dd className="font-medium" style={{ color: 'var(--color-brown)' }}>
                      {article.roles.map((r) => FAMILY_ROLE_LABEL[r as FamilyRole] ?? r).join('・')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ color: 'var(--color-brown-light)' }}>難易度</dt>
                    <dd>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: LEVEL_BG[level] ?? 'var(--color-beige)',
                          color:      LEVEL_TEXT[level] ?? 'var(--color-brown)',
                        }}
                      >
                        {DIFFICULTY_LABEL[level] ?? level}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ color: 'var(--color-brown-light)' }}>読了時間</dt>
                    <dd className="font-medium" style={{ color: 'var(--color-brown)' }}>
                      約{readingMin}分
                    </dd>
                  </div>
                  {dateStr && (
                    <div className="flex justify-between">
                      <dt style={{ color: 'var(--color-brown-light)' }}>公開日</dt>
                      <dd className="font-medium" style={{ color: 'var(--color-brown)' }}>
                        {dateStr}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── 関連記事セクション ── */}
      {relatedArticles.length > 0 && (
        <section
          style={{
            background:   'var(--color-beige)',
            paddingBlock: 'clamp(32px, 5vw, 64px)',
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
