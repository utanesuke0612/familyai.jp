/**
 * app/(site)/not-found.tsx
 * familyai.jp — 404 ページ
 */

import Link from 'next/link';
import { SearchX, BookOpen, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <main
      className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center relative"
      style={{ background: 'var(--washi)' }}
    >
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md">
        {/* アイコン */}
        <div
          className="w-24 h-24 flex items-center justify-center"
          style={{
            background:   'var(--washi-deep)',
            border:       '1px solid var(--line)',
            borderRadius: '4px',
            color:        'var(--shu)',
          }}
        >
          <SearchX size={44} strokeWidth={1.5} />
        </div>

        {/* テキスト */}
        <div className="flex flex-col gap-2">
          <p
            className="serial text-sm tracking-widest uppercase"
            style={{ color: 'var(--shu)' }}
          >
            404 Not Found
          </p>
          <h1
            className="font-mincho"
            style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 500, color: 'var(--sumi)' }}
          >
            このページは見つかりませんでした
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--sumi-light)' }}
          >
            お探しのページは移動または削除された可能性があります。
            記事一覧から探してみてください。
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/learn"
            className="btn-mingei flex-1 text-center inline-flex items-center justify-center gap-2"
          >
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
