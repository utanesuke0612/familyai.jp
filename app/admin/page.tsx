/**
 * app/admin/page.tsx
 * familyai.jp — 管理画面トップ（記事一覧）
 */

import { listAllArticles }       from '@/lib/repositories/articles';
import { AdminArticleTable }     from '@/components/admin/AdminArticleTable';

export default async function AdminPage() {
  const articles = await listAllArticles({ sort: 'latest' });

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
          記事一覧
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
          全 {articles.length} 件（公開中: {articles.filter((a) => a.published).length} 件）
        </p>
      </div>

      <AdminArticleTable initialArticles={articles} />
    </>
  );
}
