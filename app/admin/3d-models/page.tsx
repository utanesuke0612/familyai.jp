/**
 * app/admin/3d-models/page.tsx
 * familyai.jp / 管理画面 — 3D 図鑑 モデル一覧
 *
 * 既存 /admin（記事一覧）と同パターン。
 */

import Link from 'next/link';
import { listAllModelsForAdmin } from '@/lib/repositories/3d-models';
import { AdminModelTable }       from '@/components/admin/3d-models/AdminModelTable';

export default async function Admin3dModelsPage() {
  const { items, total } = await listAllModelsForAdmin({
    sort: 'latest', page: 1, pageSize: 50,
  });
  const publishedCount = items.filter((m) => m.published).length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
            3D 図鑑 — モデル管理
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            全 {total.toLocaleString('ja-JP')} 件
            （表示中: {items.length} 件・公開: {publishedCount} 件 / 非公開: {items.length - publishedCount} 件）
          </p>
        </div>
        <Link
          href="/admin/3d-models/new"
          style={{
            padding: '10px 20px',
            background: '#3B82F6',
            color: '#fff',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          新規モデル
        </Link>
      </div>

      <AdminModelTable initialModels={items} initialTotal={total} />
    </>
  );
}
