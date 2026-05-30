/**
 * app/admin/html-pages/page.tsx
 * familyai.jp — 管理画面 HTML ページ管理
 */

import { desc }               from 'drizzle-orm';
import { db, htmlPages }      from '@/lib/db';
import { AdminHtmlPageManager } from '@/components/admin/AdminHtmlPageManager';

export const dynamic = 'force-dynamic';

export default async function AdminHtmlPagesPage() {
  const rows = await db
    .select()
    .from(htmlPages)
    .orderBy(desc(htmlPages.createdAt));

  const serialized = rows.map((r) => ({
    id:          r.id,
    slug:        r.slug,
    title:       r.title,
    blobUrl:     r.blobUrl,
    hasPassword: !!r.passwordHash,  // 平文・ハッシュは渡さない
    createdAt:   r.createdAt.toISOString(),
  }));

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
          HTML ページ管理
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
          HTML ファイルをアップロードして公開 URL を発行できます。
        </p>
      </div>

      <AdminHtmlPageManager initialPages={serialized} />
    </>
  );
}
