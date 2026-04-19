/**
 * app/admin/articles/new/page.tsx
 * familyai.jp — 記事新規作成ページ
 */

import Link              from 'next/link';
import { ArticleForm }   from '@/components/admin/ArticleForm';

export default function AdminNewArticlePage() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link
          href="/admin"
          style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none' }}
        >
          ← 一覧に戻る
        </Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
          記事を新規作成
        </h1>
      </div>

      <ArticleForm />
    </>
  );
}
