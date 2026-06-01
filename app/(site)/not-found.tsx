/**
 * app/(site)/not-found.tsx
 * familyai.jp — 404 ページ（Rev41 刷新）
 *
 * 旧: 2ボタンのみ → 新: 検索窓 + カテゴリリンク + 人気記事
 * 404 を「死にページ」から「回遊の起点」に。
 */

import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { desc, eq } from 'drizzle-orm';
import { db, articles } from '@/lib/db';
import { SearchPopover } from '@/components/layout/SearchPopover';
import {
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  formatDateJa,
} from '@/shared';
import type { ContentCategory, DifficultyLevel } from '@/shared';

const CATEGORY_LINKS: { key: ContentCategory; label: string }[] = [
  { key: 'education', label: '学習・教育' },
  { key: 'lifestyle',  label: '家事・暮らし' },
  { key: 'work',       label: '仕事・効率化' },
  { key: 'creative',   label: '創作・表現' },
];

/** 公開済みの人気記事を取得（404 表示用） */
async function getPopularArticles(limit = 3) {
  try {
    const rows = await db
      .select({
        slug:        articles.slug,
        title:       articles.title,
        categories:  articles.categories,
        level:       articles.level,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(eq(articles.published, true))
      .orderBy(desc(articles.viewCount))
      .limit(limit);
    return rows;
  } catch {
    return [];
  }
}

export default async function NotFound() {
  const popular = await getPopularArticles(3);

  return (
    <main
      className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-16"
      style={{ background: 'var(--washi)' }}
    >
      <div className="flex flex-col items-center gap-8 max-w-lg w-full">

        {/* ── アイコン ── */}
        <div
          className="w-24 h-24 flex items-center justify-center"
          style={{
            background:   'var(--washi-deep)',
            border:       '1px solid var(--line)',
            borderRadius: '4px',
            color:        'var(--shu)',
          }}
        >
          <SearchX size={44} strokeWidth={1.5} />
        </div>

        {/* ── テキスト ── */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p
            className="serial text-sm tracking-widest uppercase"
            style={{ color: 'var(--shu)' }}
          >
            404 Not Found
          </p>
          <h1
            className="font-mincho"
            style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 500, color: 'var(--sumi)' }}
          >
            このページは見つかりませんでした
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--sumi-light)' }}
          >
            お探しのページは移動または削除された可能性があります。
            記事を検索するか、以下から探してみてください。
          </p>
        </div>

        {/* ── 検索窓（Rev41 追加）── */}
        <SearchPopover embed />

        {/* ── カテゴリフィルター（Rev41 追加）── */}
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORY_LINKS.map((cat) => (
            <Link
              key={cat.key}
              href={`/learn?category=${cat.key}`}
              className="chip text-xs"
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* ── 人気記事（Rev41 追加）── */}
        {popular.length > 0 && (
          <div className="w-full">
            <p
              className="serial text-center mb-3"
              style={{ color: 'var(--sumi-soft)', fontSize: '10px' }}
            >
              よく読まれている記事
            </p>
            <div className="flex flex-col gap-2">
              {popular.map((article) => (
                <Link
                  key={article.slug}
                  href={`/learn/${article.slug}`}
                  className="box-ehon group block"
                  style={{ padding: '12px 16px' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        className="font-mincho text-sm font-medium truncate group-hover:text-[var(--shu)] transition-colors"
                        style={{ color: 'var(--sumi)' }}
                      >
                        {article.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {article.categories.map((c) => (
                          <span key={c} className="serial" style={{ fontSize: '10px', color: 'var(--sumi-soft)' }}>
                            {CATEGORY_LABEL[c as ContentCategory] ?? c}
                          </span>
                        ))}
                        <span className="serial" style={{ fontSize: '10px', color: 'var(--sumi-soft)' }}>
                          {DIFFICULTY_LABEL[article.level as DifficultyLevel] ?? article.level}
                        </span>
                      </div>
                    </div>
                    {article.publishedAt && (
                      <span className="serial shrink-0" style={{ fontSize: '10px', color: 'var(--sumi-soft)' }}>
                        {formatDateJa(article.publishedAt.toISOString())}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
          <Link
            href="/learn"
            className="btn-mingei flex-1 text-center inline-flex items-center justify-center gap-2"
          >
            記事一覧を見る
          </Link>
          <Link
            href="/"
            className="btn-mingei btn-mingei-outline flex-1 text-center inline-flex items-center justify-center gap-2"
          >
            ホームへ戻る
          </Link>
        </div>

      </div>
    </main>
  );
}
