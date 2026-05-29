/**
 * lib/repositories/comments.ts
 * familyai.jp — 記事コメント Repository
 *
 * 全関数はサーバー側専用（API Route / Server Component）。
 */

import { desc, eq, count, and } from 'drizzle-orm';
import { db, articleComments, users } from '@/lib/db';
import { logger } from '@/lib/log';

// ─── 型 ───────────────────────────────────────────────────────

/** API レスポンス / フロントエンドで使う型 */
export interface CommentItem {
  id:        string;
  userId:    string;   // 所有者判定（クライアントで自分のコメントかを判定）
  body:      string;
  createdAt: string;  // ISO 8601 文字列（JSON シリアライズ済み）
  author: {
    name:  string | null;
    image: string | null;
  };
}

// ─── コメント一覧取得 ─────────────────────────────────────────

/**
 * 記事スラッグに紐づくコメントを新着順で取得する。
 */
export async function getComments(
  slug:     string,
  opts:     { page?: number; pageSize?: number } = {},
): Promise<{ items: CommentItem[]; total: number }> {
  const page     = Math.max(1, opts.page     ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
  const offset   = (page - 1) * pageSize;

  try {
    const [rows, countRows] = await Promise.all([
      db
        .select({
          id:          articleComments.id,
          userId:      articleComments.userId,
          body:        articleComments.body,
          createdAt:   articleComments.createdAt,
          authorName:  users.name,
          authorImage: users.image,
        })
        .from(articleComments)
        .innerJoin(users, eq(articleComments.userId, users.id))
        .where(eq(articleComments.articleSlug, slug))
        .orderBy(desc(articleComments.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(articleComments)
        .where(eq(articleComments.articleSlug, slug)),
    ]);

    const items: CommentItem[] = rows.map((r) => ({
      id:        r.id,
      userId:    r.userId,
      body:      r.body,
      createdAt: r.createdAt.toISOString(),
      author: {
        name:  r.authorName  ?? null,
        image: r.authorImage ?? null,
      },
    }));

    return { items, total: Number(countRows[0]?.total ?? 0) };
  } catch (err) {
    logger.error('comments.getComments', {
      slug,
      error: err instanceof Error ? err.message : String(err),
    });
    return { items: [], total: 0 };
  }
}

// ─── コメント投稿 ─────────────────────────────────────────────

/**
 * 新規コメントを作成して返す。失敗時は null を返す。
 */
export async function createComment(
  slug:   string,
  userId: string,
  body:   string,
): Promise<CommentItem | null> {
  try {
    const [inserted] = await db
      .insert(articleComments)
      .values({ articleSlug: slug, userId, body })
      .returning();

    if (!inserted) return null;

    // ユーザー情報を取得
    const [user] = await db
      .select({ name: users.name, image: users.image })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      id:        inserted.id,
      userId:    inserted.userId,
      body:      inserted.body,
      createdAt: inserted.createdAt.toISOString(),
      author: {
        name:  user?.name  ?? null,
        image: user?.image ?? null,
      },
    };
  } catch (err) {
    logger.error('comments.createComment', {
      slug,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── コメント更新 ─────────────────────────────────────────────

/**
 * 自分のコメントを更新する。
 * userId チェックを含むため、他ユーザーのコメントは更新不可。
 * 失敗または対象なしは null を返す。
 */
export async function updateComment(
  id:     string,
  userId: string,
  body:   string,
): Promise<CommentItem | null> {
  try {
    const [updated] = await db
      .update(articleComments)
      .set({ body, updatedAt: new Date() })
      .where(and(eq(articleComments.id, id), eq(articleComments.userId, userId)))
      .returning();

    if (!updated) return null;

    const [user] = await db
      .select({ name: users.name, image: users.image })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      id:        updated.id,
      userId:    updated.userId,
      body:      updated.body,
      createdAt: updated.createdAt.toISOString(),
      author: {
        name:  user?.name  ?? null,
        image: user?.image ?? null,
      },
    };
  } catch (err) {
    logger.error('comments.updateComment', {
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── コメント削除 ─────────────────────────────────────────────

/**
 * 自分のコメントを削除する。
 * userId チェックを含むため、他ユーザーのコメントは削除不可。
 * true: 削除成功 / false: 対象なしまたはエラー
 */
export async function deleteComment(
  id:     string,
  userId: string,
): Promise<boolean> {
  try {
    const result = await db
      .delete(articleComments)
      .where(and(eq(articleComments.id, id), eq(articleComments.userId, userId)))
      .returning({ id: articleComments.id });

    return result.length > 0;
  } catch (err) {
    logger.error('comments.deleteComment', {
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
