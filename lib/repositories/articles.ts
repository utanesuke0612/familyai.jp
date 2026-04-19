/**
 * lib/repositories/articles.ts
 * familyai.jp — 記事 Repository（DB アクセスの集約層）
 *
 * ページコンポーネント・API Route から直接 Drizzle を書かず、
 * ここに定義した関数を呼ぶことで：
 *  - ビジネスロジックが一箇所に集まる
 *  - ページ（UI）と DB（動作）が明確に分離される
 *  - Phase 4 の iOS 対応時にロジック流用が容易になる
 *
 * 全関数はサーバー側専用（Next.js Server Component / Route Handler のみ）。
 */

import { and, ne, or, desc, eq, sql, count } from 'drizzle-orm';
import { db, articles } from '@/lib/db';
import type { Article } from '@/lib/db/schema';

// ─── 共通型 ───────────────────────────────────────────────────

export type ArticleRow = Article;

export interface ArticleListFilter {
  role?:       string;
  categories?: string[];   // OR 条件で複数カテゴリに対応
  level?:      string;
  sort?:       'latest' | 'popular';
}

export interface ArticleListPagination {
  page:     number;
  pageSize: number;
}

export interface ArticleListResult {
  items:      ArticleRow[];
  total:      number;
  totalPages: number;
}

// ─── 記事1件取得 ──────────────────────────────────────────────

/**
 * スラッグから公開済み記事を1件取得する。
 * 記事が存在しない・非公開・DB エラー時は null を返す。
 */
export async function getArticle(slug: string): Promise<ArticleRow | null> {
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

// ─── 関連記事取得 ─────────────────────────────────────────────

/**
 * 指定記事に関連する公開済み記事を取得する。
 * roles または categories が重複するものをランダム順で返す。
 */
export async function getRelatedArticles(
  currentSlug: string,
  roles:       string[],
  categories:  string[],
  limit = 3,
): Promise<ArticleRow[]> {
  try {
    return await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.published, true),
          ne(articles.slug, currentSlug),
          sql`(
            ${articles.roles}       && ${roles}::text[]
            OR
            ${articles.categories} && ${categories}::text[]
          )`,
        ),
      )
      .orderBy(sql`random()`)
      .limit(limit);
  } catch {
    return [];
  }
}

// ─── 記事一覧取得（フィルタ + ページネーション） ─────────────

/**
 * フィルタ・ページネーションに対応した記事一覧を取得する。
 * DB エラー時は空リストを返す（ページが壊れないようにフォールバック）。
 */
export async function getArticleList(
  filter:     ArticleListFilter = {},
  pagination: ArticleListPagination = { page: 1, pageSize: 12 },
): Promise<ArticleListResult> {
  const { role, categories = [], level, sort = 'latest' } = filter;
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  try {
    // WHERE 句の組み立て
    const conditions = [eq(articles.published, true)];

    if (role) {
      conditions.push(sql`${articles.roles} @> ARRAY[${role}]::text[]`);
    }

    if (categories.length > 0) {
      const catConditions = categories.map(
        (c) => sql`${articles.categories} @> ARRAY[${c}]::text[]`,
      );
      conditions.push(
        catConditions.length === 1 ? catConditions[0]! : or(...catConditions)!,
      );
    }

    if (level) {
      conditions.push(eq(articles.level, level));
    }

    const whereClause  = and(...conditions);
    const orderByClause = sort === 'popular'
      ? desc(articles.viewCount)
      : desc(articles.publishedAt);

    // 件数 + データを並列取得
    const [items, countRows] = await Promise.all([
      db
        .select()
        .from(articles)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(articles)
        .where(whereClause),
    ]);

    const total      = Number(countRows[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return { items, total, totalPages };
  } catch (err) {
    console.error('[articles.getArticleList] DB query failed:', err);
    return { items: [], total: 0, totalPages: 1 };
  }
}

// ─── 最新記事取得（トップページ用） ──────────────────────────

/**
 * 公開済み記事を新着順で取得する（トップページ新着セクション用）。
 * description が null の場合は空文字列に変換して返す。
 */
export async function getLatestArticles(limit = 6): Promise<
  (Omit<ArticleRow, 'description'> & { description: string })[]
> {
  try {
    const rows = await db
      .select()
      .from(articles)
      .where(eq(articles.published, true))
      .orderBy(desc(articles.publishedAt))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      description: row.description ?? '',
    }));
  } catch (err) {
    console.error('[articles.getLatestArticles] DB query failed:', err);
    return [];
  }
}

// ─── 閲覧数インクリメント（fire-and-forget） ──────────────────

/**
 * 記事の閲覧数を +1 する。
 * 失敗しても例外を投げない（UX に影響させない）。
 * await せずに呼び出すこと。
 */
export function incrementViewCount(slug: string): void {
  void db
    .update(articles)
    .set({ viewCount: sql`${articles.viewCount} + 1` })
    .where(eq(articles.slug, slug))
    .catch(() => {/* 失敗しても無視 */});
}
