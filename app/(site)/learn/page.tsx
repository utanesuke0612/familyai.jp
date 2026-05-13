/**
 * app/(site)/learn/page.tsx
 * familyai.jp — 記事一覧ページ（Server Component）
 *
 * - searchParams でカテゴリ / 難易度 / ソート / ページを受け取る
 * - getArticleList() (Repository) でフィルタリング・ページネーション
 * - CategoryFilter / SortLevelBar は Client Components
 * - DB 接続失敗時は空状態にフォールバック
 */

import type { Metadata } from 'next';
import { Suspense }      from 'react';
import { redirect }      from 'next/navigation';

import { getArticleList }    from '@/lib/repositories/articles';
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
  description: '仕事・学習・日常に役立つAI活用事例をまとめた記事一覧です。ChatGPT・Claude・Geminiなどの使い方をわかりやすく紹介します。',
  openGraph: {
    title:       '記事一覧 | familyai.jp',
    description: '仕事・学習・日常に役立つAI活用事例をまとめた記事一覧です。',
    url:         'https://familyai.jp/learn',
    // images は指定しない → ルート `app/opengraph-image.tsx` が自動継承される（Next.js 14 規約・Rev27 #3）
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
          className="flex items-center gap-1 px-4 py-2 font-mincho text-sm border transition-all hover:opacity-80 min-h-[44px]"
          style={{
            background:   'white',
            borderColor:  'var(--line)',
            color:        'var(--sumi)',
            borderRadius: '4px',
          }}
          aria-label="前のページ"
        >
          ← 前へ
        </a>
      ) : (
        <span
          className="flex items-center gap-1 px-4 py-2 font-mincho text-sm border min-h-[44px] opacity-30 cursor-not-allowed"
          style={{ background: 'white', borderColor: 'var(--line)', color: 'var(--sumi)', borderRadius: '4px' }}
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
              style={{ color: 'var(--sumi-light)' }}
            >
              …
            </span>
          ) : (
            <a
              key={p}
              href={buildUrl(p)}
              className="w-9 h-9 flex items-center justify-center font-mincho text-sm border transition-all hover:opacity-80"
              style={{
                background:   'white',
                borderColor:  p === currentPage ? 'var(--shu)' : 'var(--line)',
                color:        p === currentPage ? 'var(--shu)' : 'var(--sumi)',
                borderRadius: '4px',
                fontWeight:   p === currentPage ? 500 : 400,
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
          className="flex items-center gap-1 px-4 py-2 font-mincho text-sm border transition-all hover:opacity-80 min-h-[44px]"
          style={{
            background:   'var(--shu)',
            borderColor:  'var(--shu)',
            color:        'white',
            borderRadius: '4px',
          }}
          aria-label="次のページ"
        >
          次へ →
        </a>
      ) : (
        <span
          className="flex items-center gap-1 px-4 py-2 font-mincho text-sm border min-h-[44px] opacity-30 cursor-not-allowed"
          style={{ background: 'var(--shu)', borderColor: 'var(--shu)', color: 'white', borderRadius: '4px' }}
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
      <p className="text-sm" style={{ color: 'var(--sumi-light)' }}>
        {isFiltered ? (
          <>
            フィルター結果：
            <span className="font-mincho ml-1" style={{ fontWeight: 500, color: 'var(--shu)' }}>
              {total.toLocaleString('ja-JP')} 件
            </span>
          </>
        ) : (
          <>
            全
            <span className="font-mincho mx-1" style={{ fontWeight: 500, color: 'var(--sumi)' }}>
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
    [key: string]: string | undefined;
    cat?:    string;
    level?:  string;
    sort?:   string;
    page?:   string;
    search?: string;
  };
}

export default async function LearnPage({ searchParams }: LearnPageProps) {
  if (searchParams.role) {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
    params.delete('role');
    const qs = params.toString();
    redirect(`/learn${qs ? `?${qs}` : ''}`);
  }

  // ── パラメータ解析 ──────────────────────────────────────────
  const cats   = searchParams.cat   ? searchParams.cat.split(',').filter(Boolean) : [];
  const level  = searchParams.level || null;
  const sort   = searchParams.sort === 'popular' ? 'popular' : 'latest';
  const page   = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  // Rev26 #2: 公開 search（100 文字・前後空白除去）
  const searchRaw = (searchParams.search ?? '').trim();
  const search    = searchRaw.length > 0 && searchRaw.length <= 100 ? searchRaw : null;

  const isFiltered = !!(cats.length || level || search);

  // ── Repository 経由でフィルタ + ページネーション取得 ────────
  const { items: articleRows, total: totalCount, totalPages } = await getArticleList(
    {
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
        className="px-6 py-8 sm:py-10"
        style={{ background: 'var(--washi)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:items-start">

            {/* 左カラム: タイトル + 説明 */}
            <div className="flex flex-col gap-3">
              <h1
                className="font-mincho leading-tight"
                style={{ fontSize: 'clamp(30px, 5vw, 54px)', fontWeight: 500, color: 'var(--sumi)' }}
              >
                みんなの<span style={{ color: 'var(--shu)' }}>AI</span>活用術
              </h1>
              <p
                className="max-w-2xl text-base leading-relaxed sm:text-lg"
                style={{ color: 'var(--sumi-light)' }}
              >
                仕事・学習・日常ですぐ使えるAI活用事例を厳選。
                初心者でも安心、今日から実践できる記事だけをお届けします。
              </p>
            </div>

            {/* 右カラム: カテゴリピッカー（/tools と同じ位置・統一レイアウト） */}
            <div
              className="box-ehon p-5 sm:p-6"
              style={{
                background: 'rgba(255,255,255,0.82)',
              }}
            >
              <Suspense fallback={
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '4px' }} />
                  ))}
                </div>
              }>
                <CategoryFilter />
              </Suspense>
            </div>

          </div>
        </div>
      </section>

      {/* ── フィルターエリア（検索 + ソート/難易度のみ） ── */}
      <section
        style={{
          background:   'white',
          borderBottom: '1px solid var(--color-beige)',
          paddingBlock: 'clamp(12px, 2vw, 20px)',
        }}
      >
        <div
          className="max-w-container mx-auto flex flex-col gap-4"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          {/* 検索バー（Rev26 #2）*/}
          <Suspense fallback={<div className="h-14 rounded-full skeleton" />}>
            <LearnSearchBar />
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
          paddingBlock: 'clamp(16px, 3vw, 28px)',
        }}
      >
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          {/* 件数表示 */}
          <ActiveFilterBanner total={totalCount} isFiltered={isFiltered} />

          {/* グリッド */}
          {/* Rev40: 図録的な均一感のため firstFeatured を撤廃。全カード同サイズ。 */}
          <ArticleGrid
            articles={articleRows.map((a) => ({
              slug:         a.slug,
              title:        a.title,
              description:  a.description ?? '',
              categories:   a.categories,
              level:        a.level,
              thumbnailUrl: a.thumbnailUrl ?? null,
              publishedAt:  a.publishedAt?.toISOString() ?? null,
              viewCount:    a.viewCount,
              body:         a.body,
            }))}
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
