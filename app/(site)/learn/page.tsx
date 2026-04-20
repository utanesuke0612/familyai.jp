/**
 * app/(site)/learn/page.tsx
 * familyai.jp — 記事一覧ページ（Server Component）
 *
 * - searchParams でロール / カテゴリ / 難易度 / ソート / ページを受け取る
 * - getArticleList() (Repository) でフィルタリング・ページネーション
 * - RolePicker / CategoryFilter / SortLevelBar は Client Components
 * - DB 接続失敗時は空状態にフォールバック
 */

import type { Metadata } from 'next';
import { Suspense }      from 'react';

import { getArticleList }    from '@/lib/repositories/articles';
import { RolePicker }        from '@/components/home/RolePicker';
import { CategoryFilter }    from '@/components/home/CategoryFilter';
import { ArticleGrid }       from '@/components/article/ArticleGrid';
import { SortLevelBar }      from '@/components/learn/SortLevelBar';
import { LearnSearchBar }    from '@/components/learn/LearnSearchBar';

// ── 定数 ──────────────────────────────────────────────────────
const PAGE_SIZE = 12;

// ISR: 5分ごとに再検証（Rev23 #2・フィルタ組み合わせでも DB 負荷を抑える）
export const revalidate = 300;

// ── メタデータ ────────────────────────────────────────────────
export const metadata: Metadata = {
  title:       '記事一覧 | familyai.jp',
  description: 'パパ・ママ・子ども・シニアのためのAI活用ガイド。ChatGPT・Claude・Geminiなど、家族全員が使えるAI記事を厳選してお届けします。',
  openGraph: {
    title:       '記事一覧 | familyai.jp',
    description: 'パパ・ママ・子ども・シニアのためのAI活用ガイド。',
    url:         'https://familyai.jp/learn',
    images:      [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
};

// ── ページネーションリンク ─────────────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  searchParams,
}: {
  currentPage: number;
  totalPages:  number;
  searchParams: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  function buildUrl(page: number) {
    const params = new URLSearchParams(searchParams);
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    const qs = params.toString();
    return `/learn${qs ? `?${qs}` : ''}`;
  }

  // 表示するページ番号の範囲（最大7つ）
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3)       pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <nav
      className="flex items-center justify-center gap-2 mt-12"
      aria-label="ページネーション"
    >
      {/* 前へ */}
      {currentPage > 1 ? (
        <a
          href={buildUrl(currentPage - 1)}
          className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border transition-all hover:opacity-80 min-h-[44px]"
          style={{
            background:  'white',
            borderColor: 'var(--color-beige-dark)',
            color:       'var(--color-brown)',
          }}
          aria-label="前のページ"
        >
          ← 前へ
        </a>
      ) : (
        <span
          className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border min-h-[44px] opacity-30 cursor-not-allowed"
          style={{ background: 'white', borderColor: 'var(--color-beige-dark)', color: 'var(--color-brown)' }}
          aria-disabled="true"
        >
          ← 前へ
        </span>
      )}

      {/* ページ番号 */}
      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === '...' ? (
            <span
              key={`ellipsis-${i}`}
              className="w-9 h-9 flex items-center justify-center text-sm"
              style={{ color: 'var(--color-brown-light)' }}
            >
              …
            </span>
          ) : (
            <a
              key={p}
              href={buildUrl(p)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium border transition-all hover:opacity-80"
              style={{
                background:  p === currentPage ? 'var(--color-orange)' : 'white',
                borderColor: p === currentPage ? 'var(--color-orange)' : 'var(--color-beige-dark)',
                color:       p === currentPage ? 'white' : 'var(--color-brown)',
                boxShadow:   p === currentPage ? 'var(--shadow-orange)' : 'none',
              }}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </a>
          ),
        )}
      </div>

      {/* 次へ */}
      {currentPage < totalPages ? (
        <a
          href={buildUrl(currentPage + 1)}
          className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border transition-all hover:opacity-80 min-h-[44px]"
          style={{
            background:  'var(--color-orange)',
            borderColor: 'var(--color-orange)',
            color:       'white',
            boxShadow:   'var(--shadow-orange)',
          }}
          aria-label="次のページ"
        >
          次へ →
        </a>
      ) : (
        <span
          className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border min-h-[44px] opacity-30 cursor-not-allowed"
          style={{ background: 'var(--color-orange)', borderColor: 'var(--color-orange)', color: 'white' }}
          aria-disabled="true"
        >
          次へ →
        </span>
      )}
    </nav>
  );
}

// ── アクティブフィルターバナー ─────────────────────────────────
function ActiveFilterBanner({
  total,
  isFiltered,
}: {
  total:      number;
  isFiltered: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
        {isFiltered ? (
          <>
            フィルター結果：
            <span className="font-bold ml-1" style={{ color: 'var(--color-orange)' }}>
              {total.toLocaleString('ja-JP')} 件
            </span>
          </>
        ) : (
          <>
            全
            <span className="font-bold mx-1" style={{ color: 'var(--color-brown)' }}>
              {total.toLocaleString('ja-JP')}
            </span>
            件の記事
          </>
        )}
      </p>
    </div>
  );
}

// ── ページ本体 ────────────────────────────────────────────────
interface LearnPageProps {
  searchParams: {
    role?:   string;
    cat?:    string;
    level?:  string;
    sort?:   string;
    page?:   string;
    search?: string;
  };
}

export default async function LearnPage({ searchParams }: LearnPageProps) {
  // ── パラメータ解析 ──────────────────────────────────────────
  const role   = searchParams.role  || null;
  const cats   = searchParams.cat   ? searchParams.cat.split(',').filter(Boolean) : [];
  const level  = searchParams.level || null;
  const sort   = searchParams.sort === 'popular' ? 'popular' : 'latest';
  const page   = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  // Rev26 #2: 公開 search（100 文字・前後空白除去）
  const searchRaw = (searchParams.search ?? '').trim();
  const search    = searchRaw.length > 0 && searchRaw.length <= 100 ? searchRaw : null;

  const isFiltered = !!(role || cats.length || level || search);

  // ── Repository 経由でフィルタ + ページネーション取得 ────────
  const { items: articleRows, total: totalCount, totalPages } = await getArticleList(
    {
      role:       role       ?? undefined,
      categories: cats,
      level:      level      ?? undefined,
      sort,
      search:     search     ?? undefined,
    },
    { page, pageSize: PAGE_SIZE },
  );

  // searchParams を string のみのレコードに変換（Pagination コンポーネント用）
  const spRecord: Record<string, string> = Object.fromEntries(
    Object.entries(searchParams).filter((e): e is [string, string] => typeof e[1] === 'string'),
  );

  return (
    <>
      {/* ── ページヘッダー ── */}
      <section
        className="relative overflow-hidden"
        style={{
          background:   'var(--color-cream)',
          paddingBlock: 'clamp(40px, 6vw, 72px)',
        }}
      >
        {/* blob 装飾 */}
        <div
          className="blob blob-md"
          style={{
            background: 'radial-gradient(circle, var(--color-peach-light) 0%, transparent 70%)',
            top: '-60px', right: '-80px',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          {/* パンくずリスト */}
          <nav className="flex items-center gap-2 text-xs mb-6" aria-label="パンくずリスト">
            <a
              href="/"
              className="hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-brown-light)' }}
            >
              ホーム
            </a>
            <span style={{ color: 'var(--color-brown-light)' }} aria-hidden="true">/</span>
            <span style={{ color: 'var(--color-orange)' }} aria-current="page">記事一覧</span>
          </nav>

          {/* ページタイトル */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6">
            <div>
              <p
                className="text-sm font-medium mb-2"
                style={{ color: 'var(--color-orange)' }}
              >
                AI活用ガイド
              </p>
              <h1
                className="font-display font-bold leading-tight"
                style={{
                  fontSize: 'clamp(22px, 4vw, 40px)',
                  color:    'var(--color-brown)',
                }}
              >
                みんなの<span style={{ color: 'var(--color-orange)' }}>AI</span>活用術
              </h1>
              <p
                className="mt-2 text-sm leading-relaxed max-w-lg"
                style={{ color: 'var(--color-brown-light)' }}
              >
                パパ・ママ・子ども・シニア、家族全員が使えるAIガイドを厳選。
                <br className="hidden sm:inline" />
                初心者でも安心、今日から実践できる記事だけをお届けします。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── フィルターエリア ── */}
      <section
        style={{
          background:   'white',
          borderBottom: '1px solid var(--color-beige)',
          paddingBlock: 'clamp(20px, 3vw, 32px)',
        }}
      >
        <div
          className="max-w-container mx-auto flex flex-col gap-6"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          {/* 検索バー（Rev26 #2）*/}
          <Suspense fallback={<div className="h-14 rounded-full skeleton" />}>
            <LearnSearchBar />
          </Suspense>

          {/* ロールピッカー */}
          <Suspense fallback={
            <div className="h-20 rounded-2xl skeleton" />
          }>
            <RolePicker />
          </Suspense>

          {/* カテゴリフィルター */}
          <Suspense fallback={
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-24 rounded-full" />
              ))}
            </div>
          }>
            <CategoryFilter />
          </Suspense>

          {/* ソート・難易度バー */}
          <div
            className="pt-2 border-t"
            style={{ borderColor: 'var(--color-beige)' }}
          >
            <Suspense fallback={
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-9 w-20 rounded-full" />
                ))}
              </div>
            }>
              <SortLevelBar />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ── 記事グリッド ── */}
      <section
        style={{
          background:  'var(--color-cream)',
          paddingBlock: 'clamp(32px, 5vw, 64px)',
        }}
      >
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          {/* 件数表示 */}
          <ActiveFilterBanner total={totalCount} isFiltered={isFiltered} />

          {/* グリッド */}
          <ArticleGrid
            articles={articleRows.map((a) => ({
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
            firstFeatured={!isFiltered && page === 1}
          />

          {/* ページネーション */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            searchParams={spRecord}
          />

          {/* 記事がある場合のみ表示する「上部に戻る」リンク */}
          {totalCount > PAGE_SIZE && (
            <div className="text-center mt-8">
              <a
                href="#main-content"
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-brown-light)' }}
              >
                ↑ ページ上部に戻る
              </a>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
