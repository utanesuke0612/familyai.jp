/**
 * app/admin/page.tsx
 * familyai.jp — 管理画面トップ（記事一覧）
 */

import { listAllArticles }       from '@/lib/repositories/articles';
import { AdminArticleTable }     from '@/components/admin/AdminArticleTable';

export default async function AdminPage() {
  // Rev24 #④: 初期表示は最新50件のみ。残りはクライアント側でページング取得。
  const { items, total } = await listAllArticles({ sort: 'latest', page: 1, pageSize: 50 });
  const publishedCount = items.filter((a) => a.published).length;

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
          記事一覧
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
          全 {total.toLocaleString('ja-JP')} 件（表示中: {items.length} 件・うち公開: {publishedCount} 件）
        </p>
      </div>

      <AdminArticleTable initialArticles={items} initialTotal={total} />
    </>
  );
}
