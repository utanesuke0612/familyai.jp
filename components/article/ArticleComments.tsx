'use client';

/**
 * components/article/ArticleComments.tsx
 * familyai.jp — 記事コメント統合コンポーネント
 *
 * - コメント入力フォーム（上）
 * - コメント一覧（下）
 * - フォーム送信でリスト自動リロード
 */

import { useState } from 'react';
import { ArticleCommentForm } from './ArticleCommentForm';
import { ArticleCommentList } from './ArticleCommentList';

interface ArticleCommentsProps {
  articleSlug: string;
}

export function ArticleComments({ articleSlug }: ArticleCommentsProps) {
  const [reloadTrigger, setReloadTrigger] = useState(0);

  return (
    <section className="space-y-6 mt-8">
      {/* ─── セクション見出し ── */}
      <div>
        <h2
          className="font-mincho text-lg font-medium mb-2"
          style={{ color: 'var(--sumi)' }}
        >
          コメント
        </h2>
        <p className="text-sm" style={{ color: 'var(--sumi-light)' }}>
          この記事についてご意見・ご質問があればお聞かせください。
        </p>
      </div>

      {/* ─── フォーム ── */}
      <ArticleCommentForm
        articleSlug={articleSlug}
        onCommentAdded={() => setReloadTrigger((t) => t + 1)}
      />

      {/* ─── コメント一覧 ── */}
      <ArticleCommentList
        articleSlug={articleSlug}
        reloadTrigger={reloadTrigger}
      />
    </section>
  );
}
