/**
 * app/api/admin/users/route.ts
 * GET /api/admin/users — 会員一覧（管理者専用）
 *
 * Query params:
 *   search   - email / name 部分一致
 *   plan     - 'all' | 'free' | 'premium'
 *   sort     - 'newest' | 'oldest' | 'name' | 'plan'
 *   page     - 1-based
 *   pageSize - default 50
 */

import { NextRequest, NextResponse } from 'next/server';
import { ilike, or, eq, asc, desc, count, and } from 'drizzle-orm';
import { requireAdmin }  from '@/lib/admin-auth';
import { db, users }     from '@/lib/db';
import { escapeLike }    from '@/lib/repositories/articles';
import { adminUsersQuerySchema } from '@/lib/schemas/users';

export async function GET(req: NextRequest) {
  const check = await requireAdmin();
  if (!check.ok) return check.response;

  // ── クエリパラメータ検証（C1: page=abc 等の NaN 攻撃防止） ──
  const sp     = req.nextUrl.searchParams;
  const parsed = adminUsersQuerySchema.safeParse({
    search:   sp.get('search')   ?? undefined,
    plan:     sp.get('plan')     ?? undefined,
    sort:     sp.get('sort')     ?? undefined,
    page:     sp.get('page')     ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok:    false,
        error: { code: 'INVALID_PARAMS', message: 'クエリパラメータが不正です。' },
      },
      { status: 400 },
    );
  }
  const { search = '', plan, sort, page, pageSize } = parsed.data;
  const offset = (page - 1) * pageSize;

  // ── 絞り込み条件 ──────────────────────────────────────────────
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(users.email, `%${escapeLike(search)}%`),
        ilike(users.name,  `%${escapeLike(search)}%`),
      ),
    );
  }

  if (plan === 'free' || plan === 'premium') {
    conditions.push(eq(users.plan, plan));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // ── ソート ────────────────────────────────────────────────────
  const orderBy = sort === 'oldest' ? asc(users.createdAt)
               : sort === 'name'    ? asc(users.name)
               : sort === 'plan'    ? asc(users.plan)
               :                     desc(users.createdAt);  // newest (default)

  // ── クエリ実行 ────────────────────────────────────────────────
  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id:           users.id,
      email:        users.email,
      name:         users.name,
      plan:         users.plan,
      authProvider: users.authProvider,
      createdAt:    users.createdAt,
    })
      .from(users)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),

    db.select({ total: count() })
      .from(users)
      .where(where),
  ]);

  // ── サマリー（検索なしのときのみ全体集計） ────────────────────
  let summary: { free: number; premium: number; total: number } | null = null;
  if (!search && plan === 'all') {
    const [freeCount, premiumCount, allCount] = await Promise.all([
      db.select({ n: count() }).from(users).where(eq(users.plan, 'free')),
      db.select({ n: count() }).from(users).where(eq(users.plan, 'premium')),
      db.select({ n: count() }).from(users),
    ]);
    summary = {
      free:    Number(freeCount[0]?.n ?? 0),
      premium: Number(premiumCount[0]?.n ?? 0),
      total:   Number(allCount[0]?.n ?? 0),
    };
  }

  return NextResponse.json({
    ok:   true,
    data: {
      items:      rows,
      meta: {
        total:      Number(total),
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)),
      },
      summary,
    },
  });
}
