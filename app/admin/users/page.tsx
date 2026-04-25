/**
 * app/admin/users/page.tsx
 * familyai.jp — 管理画面 会員一覧
 */

import { count, eq } from 'drizzle-orm';
import { db, users }           from '@/lib/db';
import { AdminUserTable }      from '@/components/admin/AdminUserTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  // 初期表示: 最新50件 + サマリー集計
  const [rows, freeCount, premiumCount, allCount] = await Promise.all([
    db
      .select({
        id:           users.id,
        email:        users.email,
        name:         users.name,
        plan:         users.plan,
        authProvider: users.authProvider,
        createdAt:    users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt)
      .limit(50),

    db.select({ n: count() }).from(users).where(eq(users.plan, 'free')),
    db.select({ n: count() }).from(users).where(eq(users.plan, 'premium')),
    db.select({ n: count() }).from(users),
  ]);

  const summary = {
    free:    Number(freeCount[0]?.n  ?? 0),
    premium: Number(premiumCount[0]?.n ?? 0),
    total:   Number(allCount[0]?.n   ?? 0),
  };

  // createdAt を文字列にシリアライズ（Client Component へ渡すため）
  const serialized = rows.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
          会員管理
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
          登録会員 {summary.total.toLocaleString('ja-JP')} 名（無料: {summary.free} 名 / 有料: {summary.premium} 名）
        </p>
      </div>

      <AdminUserTable
        initialUsers={serialized}
        initialTotal={summary.total}
        initialSummary={summary}
      />
    </>
  );
}
