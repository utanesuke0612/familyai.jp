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

import { and, ne, or, asc, desc, eq, sql, count, ilike } from 'drizzle-orm';
import { db, articles } from '@/lib/db';
import type { Article, NewArticle } from '@/lib/db/schema';

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

// ─── 管理画面用：記事1件取得（非公開含む） ──────────────────

/**
 * 管理画面用：公開・非公開を問わずスラッグから記事を1件取得する。
 * 記事が存在しない・DB エラー時は null を返す。
 */
export async function getArticleForAdmin(slug: string): Promise<ArticleRow | null> {
  try {
    const rows = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  } catch (err) {
    console.error('[articles.getArticleForAdmin] DB query failed:', err);
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

// ─── 管理画面用：全記事取得（非公開含む） ────────────────────

export type AdminArticleSort = 'latest' | 'oldest' | 'popular' | 'title';

/**
 * 管理画面用：公開・非公開を含む全記事を取得する。
 * タイトル検索とソートをサポート。
 */
export async function listAllArticles(opts: {
  search?: string;
  sort?:   AdminArticleSort;
} = {}): Promise<ArticleRow[]> {
  const { search, sort = 'latest' } = opts;

  try {
    // ILIKE メタ文字（% / _ / \）をエスケープして部分一致検索に使う
    const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');
    const conditions = search
      ? [ilike(articles.title, `%${escapeLike(search)}%`)]
      : [];

    const whereClause  = conditions.length > 0 ? and(...conditions) : undefined;
    const orderByClause = {
      latest:  desc(articles.createdAt),
      oldest:  asc(articles.createdAt),
      popular: desc(articles.viewCount),
      title:   asc(articles.title),
    }[sort];

    return await db
      .select()
      .from(articles)
      .where(whereClause)
      .orderBy(orderByClause);
  } catch (err) {
    console.error('[articles.listAllArticles] DB query failed:', err);
    return [];
  }
}

// ─── 管理画面用：記事作成 ─────────────────────────────────────

export type CreateArticleInput = Omit<NewArticle, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 記事を新規作成する。
 * slug 重複時は { error: 'SLUG_TAKEN' } を throw する。
 */
export async function createArticle(data: CreateArticleInput): Promise<ArticleRow> {
  const rows = await db
    .insert(articles)
    .values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const row = rows[0];
  if (!row) throw new Error('INSERT returned no rows');
  return row;
}

// ─── 管理画面用：記事更新 ─────────────────────────────────────

export type UpdateArticleInput = Partial<Omit<NewArticle, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * slug で記事を更新する。記事が存在しない場合は null を返す。
 */
export async function updateArticle(
  slug: string,
  data: UpdateArticleInput,
): Promise<ArticleRow | null> {
  try {
    const rows = await db
      .update(articles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(articles.slug, slug))
      .returning();
    return rows[0] ?? null;
  } catch (err) {
    console.error('[articles.updateArticle] DB query failed:', err);
    return null;
  }
}

// ─── 管理画面用：記事削除 ─────────────────────────────────────

/**
 * slug で記事を削除する。成功時は true、失敗時は false を返す。
 */
export async function deleteArticle(slug: string): Promise<boolean> {
  try {
    const rows = await db
      .delete(articles)
      .where(eq(articles.slug, slug))
      .returning({ slug: articles.slug });
    return rows.length > 0;
  } catch (err) {
    console.error('[articles.deleteArticle] DB query failed:', err);
    return false;
  }
}

// ─── 管理画面用：公開トグル ───────────────────────────────────

/**
 * 記事の published を反転する。
 * 公開に切り替えた際、publishedAt が未設定なら現在時刻をセット。
 * 更新後の { published } を返す。記事が存在しない場合は null。
 */
export async function togglePublished(
  slug: string,
): Promise<{ published: boolean } | null> {
  try {
    // 現在の状態を取得
    const current = await db
      .select({ published: articles.published, publishedAt: articles.publishedAt })
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);
    if (!current[0]) return null;

    const next = !current[0].published;
    const publishedAt = next && !current[0].publishedAt ? new Date() : undefined;

    const rows = await db
      .update(articles)
      .set({
        published:   next,
        updatedAt:   new Date(),
        ...(publishedAt ? { publishedAt } : {}),
      })
      .where(eq(articles.slug, slug))
      .returning({ published: articles.published });

    return rows[0] ?? null;
  } catch (err) {
    console.error('[articles.togglePublished] DB query failed:', err);
    return null;
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
