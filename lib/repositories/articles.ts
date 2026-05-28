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
import type { Article as ArticleDto, ArticleSummary } from '@/shared/types';
import { toArticleDetail, toArticleSummary } from '@/lib/mappers/articles';
import { logger } from '@/lib/log';

// ─── 共通型 ───────────────────────────────────────────────────

export type ArticleRow = Article;

// ─── SQL ユーティリティ ────────────────────────────────────────

/**
 * ILIKE のメタ文字（% / _ / \）をエスケープ。
 * ユーザー入力の `%` を「任意文字列にマッチ」ではなく
 * リテラル `%` として ILIKE に渡すために使う。
 */
export const escapeLike = (s: string): string => s.replace(/[\\%_]/g, '\\$&');

export interface ArticleListFilter {
  categories?: string[];   // OR 条件で複数カテゴリに対応
  tags?:       string[];   // OR 条件で自由タグに対応
  level?:      string;
  sort?:       'latest' | 'popular';
  /** タイトル・description 部分一致検索（Rev26 #2・ILIKE、ユーザー入力は escapeLike 適用）*/
  search?:     string;
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
 *
 * Rev40 (Deepening #3): mapper を内部に内包し、DTO (Article) を返す。
 * 旧版は ArticleRow を返していたため caller 側で `toArticleDetail()` が必要だった。
 */
export async function getArticle(slug: string): Promise<ArticleDto | null> {
  try {
    const rows = await db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.published, true)))
      .limit(1);
    const row = rows[0];
    return row ? toArticleDetail(row) : null;
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
    logger.error('articles.getArticleForAdmin', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

// ─── 関連記事取得 ─────────────────────────────────────────────

/**
 * 指定記事に関連する公開済み記事を取得する。
 * categories が重複するものを最新順で候補を絞り、アプリ側で軽くシャッフルして返す。
 *
 * P2 #6: 旧実装は `ORDER BY random()` で候補行全体にランダムソートをかけていたが、
 *        記事数が増えると articles テーブルにフルスキャン + sort が走る。
 *        現在は `publishedAt DESC` で index を効かせ、上位 `limit * 4` 件から
 *        Fisher–Yates でアプリ側シャッフルする。多少のバラつきは保ちつつ DB 負荷を抑える。
 */
export async function getRelatedArticles(
  currentSlug: string,
  categories:  string[],
  limit = 3,
): Promise<ArticleRow[]> {
  try {
    const candidates = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.published, true),
          ne(articles.slug, currentSlug),
          sql`${articles.categories} && ${categories}::text[]`,
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(Math.max(limit, limit * 4));  // limit * 4 件から抽選（最低 limit 件）

    // Fisher–Yates で上位候補をシャッフルして先頭 limit 件を返す
    const a = candidates.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a.slice(0, limit);
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
  const { categories = [], tags = [], level, sort = 'latest', search } = filter;
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  try {
    // WHERE 句の組み立て
    const conditions = [eq(articles.published, true)];

    if (categories.length > 0) {
      const catConditions = categories.map(
        (c) => sql`${articles.categories} @> ARRAY[${c}]::text[]`,
      );
      conditions.push(
        catConditions.length === 1 ? catConditions[0]! : or(...catConditions)!,
      );
    }

    if (tags.length > 0) {
      const tagConditions = tags.map(
        (tag) => sql`${articles.tags} @> ARRAY[${tag}]::text[]`,
      );
      conditions.push(
        tagConditions.length === 1 ? tagConditions[0]! : or(...tagConditions)!,
      );
    }

    if (level) {
      conditions.push(eq(articles.level, level));
    }

    if (search && search.trim()) {
      const pattern = `%${escapeLike(search.trim())}%`;
      conditions.push(
        or(
          ilike(articles.title, pattern),
          ilike(articles.description, pattern),
        )!,
      );
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
    logger.error('articles.getArticleList', { error: err instanceof Error ? err.message : String(err) });
    return { items: [], total: 0, totalPages: 1 };
  }
}

// ─── 最新記事取得（トップページ用） ──────────────────────────

/**
 * 公開済み記事を新着順で取得する（トップページ新着セクション用）。
 *
 * Rev40 (Deepening #3): mapper を内部に内包し、DTO (ArticleSummary[]) を返す。
 * 旧版は ArticleRow に独自フィールド付与した中間型を返していたが、
 * caller (API route) はすぐに toArticleSummary でラップしていたため統合した。
 */
export async function getLatestArticles(limit = 6): Promise<ArticleSummary[]> {
  try {
    const rows = await db
      .select()
      .from(articles)
      .where(eq(articles.published, true))
      .orderBy(desc(articles.publishedAt))
      .limit(limit);

    return rows.map(toArticleSummary);
  } catch (err) {
    logger.error('articles.getLatestArticles', { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/**
 * 公開済み記事に付与されている自由タグ一覧を返す。
 * /learn のタグフィルター候補として使うため、空文字は除外して重複を排除する。
 */
export async function getArticleTags(limit = 80): Promise<string[]> {
  try {
    const rows = await db
      .select({ tags: articles.tags })
      .from(articles)
      .where(eq(articles.published, true))
      .orderBy(desc(articles.publishedAt))
      .limit(300);

    return Array.from(
      new Set(rows.flatMap((row) => row.tags.map((tag) => tag.trim()).filter(Boolean))),
    )
      .sort((a, b) => a.localeCompare(b, 'ja-JP'))
      .slice(0, limit);
  } catch (err) {
    logger.error('articles.getArticleTags', { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

// ─── 管理画面用：全記事取得（非公開含む） ────────────────────

export type AdminArticleSort = 'latest' | 'oldest' | 'popular' | 'title';

export interface ListAllArticlesResult {
  items:      ArticleRow[];
  total:      number;
  totalPages: number;
  page:       number;
  pageSize:   number;
}

/**
 * 管理画面用：公開・非公開を含む全記事を取得する（Rev24 #④: pagination 対応）。
 * タイトル検索とソート、ページネーションをサポート。
 *
 * - `page` / `pageSize` 未指定時は 1ページ目・pageSize=50 を返す
 * - `pageSize` は 1〜200 に clamp（呼び出し側の事故防止）
 */
export async function listAllArticles(opts: {
  search?:   string;
  category?: string;
  tag?:      string;
  sort?:     AdminArticleSort;
  page?:     number;
  pageSize?: number;
} = {}): Promise<ListAllArticlesResult> {
  const { search, category, tag, sort = 'latest' } = opts;
  const page     = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(opts.pageSize ?? 50)));
  const offset   = (page - 1) * pageSize;

  try {
    const conditions = [];

    if (search) {
      conditions.push(ilike(articles.title, `%${escapeLike(search)}%`));
    }

    if (category) {
      conditions.push(sql`${articles.categories} @> ARRAY[${category}]::text[]`);
    }

    if (tag) {
      conditions.push(sql`${articles.tags} @> ARRAY[${tag}]::text[]`);
    }

    const whereClause  = conditions.length > 0 ? and(...conditions) : undefined;
    const orderByClause = {
      latest:  desc(articles.createdAt),
      oldest:  asc(articles.createdAt),
      popular: desc(articles.viewCount),
      title:   asc(articles.title),
    }[sort];

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

    return { items, total, totalPages, page, pageSize };
  } catch (err) {
    logger.error('articles.listAllArticles', { error: err instanceof Error ? err.message : String(err) });
    return { items: [], total: 0, totalPages: 1, page, pageSize };
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
    logger.error('articles.updateArticle', { error: err instanceof Error ? err.message : String(err) });
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
    logger.error('articles.deleteArticle', { error: err instanceof Error ? err.message : String(err) });
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
    logger.error('articles.togglePublished', { error: err instanceof Error ? err.message : String(err) });
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
    .catch((err: unknown) => {
      // L-6: サイレント無視ではなく warn ログで可観測性を確保
      logger.warn('articles.incrementViewCount', {
        slug,
        error: err instanceof Error ? err.message : String(err),
      });
    });
}
