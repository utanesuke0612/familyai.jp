/**
 * app/(site)/learn/[slug]/not-found.tsx
 * familyai.jp — 記事が存在しない場合の 404
 */

import Link from 'next/link';
import { FileX, BookOpen, Home } from 'lucide-react';

export default function ArticleNotFound() {
  return (
    <main
      className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--washi)' }}
    >
      <div className="flex flex-col items-center gap-6 max-w-md">
        <div
          className="w-24 h-24 flex items-center justify-center"
          style={{
            background:   'var(--washi-deep)',
            border:       '1px solid var(--line)',
            borderRadius: '4px',
            color:        'var(--shu)',
          }}
        >
          <FileX size={44} strokeWidth={1.5} />
        </div>

        <div className="flex flex-col gap-2">
          <p
            className="serial text-sm tracking-widest uppercase"
            style={{ color: 'var(--shu)' }}
          >
            404 Not Found
          </p>
          <h1
            className="font-mincho"
            style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 500, color: 'var(--sumi)' }}
          >
            この記事は見つかりませんでした
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--sumi-light)' }}
          >
            記事が削除されたか、URLが変更された可能性があります。
            記事一覧から探してみてください。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link href="/learn" className="btn-mingei flex-1 text-center inline-flex items-center justify-center gap-2">
            <BookOpen size={16} strokeWidth={1.75} />
            記事一覧へ
          </Link>
          <Link
            href="/"
            className="btn-mingei btn-mingei-outline flex-1 text-center inline-flex items-center justify-center gap-2"
          >
            <Home size={16} strokeWidth={1.75} />
            ホームへ
          </Link>
        </div>
      </div>
    </main>
  );
}
