'use client';

/**
 * components/article/ArticleCommentForm.tsx
 * familyai.jp — 記事コメント入力フォーム
 */

import { useState } from 'react';
import { Send }     from 'lucide-react';
import { useSession } from 'next-auth/react';

interface ArticleCommentFormProps {
  articleSlug: string;
  onCommentAdded: () => void;
}

export function ArticleCommentForm({ articleSlug, onCommentAdded }: ArticleCommentFormProps) {
  const { data: session, status } = useSession();
  const [body, setBody]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const isLoggedIn = status === 'authenticated' && !!session?.user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) { setError('コメントを入力してください'); return; }

    setError(null);
    setLoading(true);
    try {
      const res  = await fetch(`/api/articles/${articleSlug}/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'コメント送信に失敗しました'); return; }
      setBody('');
      onCommentAdded();
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div
        className="p-4 rounded-lg text-center text-sm"
        style={{
          background:  'var(--washi-light)',
          border:      '1px solid var(--line-soft)',
          color:       'var(--sumi-light)',
        }}
      >
        コメントするには&nbsp;
        <a href="/auth/signin" style={{ color: 'var(--shu)' }} className="underline hover:opacity-70">
          ログイン
        </a>
        &nbsp;が必要です
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="コメントを入力してください"
        rows={4}
        className="w-full p-3 rounded-lg border text-sm resize-none"
        style={{
          borderColor: 'var(--line-soft)',
          fontFamily:  'inherit',
          outline:     'none',
        }}
        onFocus={(e)  => (e.currentTarget.style.borderColor = 'var(--shu)')}
        onBlur={(e)   => (e.currentTarget.style.borderColor = 'var(--line-soft)')}
      />

      {error && (
        <p className="text-xs" style={{ color: '#d32f2f' }}>{error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: 'var(--shu)', color: 'white' }}
        >
          <Send size={14} />
          {loading ? '送信中...' : '送信'}
        </button>
      </div>
    </form>
  );
}
