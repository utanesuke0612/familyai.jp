/**
 * app/admin/articles/[slug]/edit/page.tsx
 * familyai.jp — 記事編集ページ
 */

import { notFound } from 'next/navigation';
import Link         from 'next/link';
import { getArticleForAdmin } from '@/lib/repositories/articles';
import { ArticleForm }        from '@/components/admin/ArticleForm';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  return { title: `編集: ${params.slug} | 管理画面` };
}

export default async function AdminEditArticlePage({ params }: Props) {
  // 管理画面なので非公開記事も取得できる Repository 関数を使う
  const article = await getArticleForAdmin(params.slug);
  if (!article) notFound();

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link
          href="/admin"
          style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none' }}
        >
          ← 一覧に戻る
        </Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
          記事を編集
        </h1>
        <span style={{
          fontSize:     '12px',
          padding:      '3px 10px',
          borderRadius: '999px',
          background:   article.published ? '#D1FAE5' : '#F3F4F6',
          color:        article.published ? '#065F46' : '#6B7280',
          fontWeight:   600,
        }}>
          {article.published ? '公開中' : '非公開'}
        </span>
      </div>

      <ArticleForm article={article} />
    </>
  );
}
