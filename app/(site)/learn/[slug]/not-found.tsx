/**
 * app/(site)/learn/[slug]/not-found.tsx
 * familyai.jp — 記事が存在しない場合の 404
 */

import Link from 'next/link';

export default function ArticleNotFound() {
  return (
    <main
      className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--color-cream)' }}
    >
      <div className="flex flex-col items-center gap-6 max-w-md">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
          style={{ background: 'var(--color-beige)', boxShadow: 'var(--shadow-warm-sm)' }}
        >
          📄
        </div>

        <div className="flex flex-col gap-2">
          <p
            className="font-bold text-sm tracking-widest uppercase"
            style={{ color: 'var(--color-orange)' }}
          >
            404 Not Found
          </p>
          <h1
            className="font-display font-bold"
            style={{ fontSize: 'clamp(20px, 4vw, 28px)', color: 'var(--color-brown)' }}
          >
            この記事は見つかりませんでした
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-brown-light)' }}
          >
            記事が削除されたか、URLが変更された可能性があります。
            記事一覧から探してみてください。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link href="/learn" className="btn-primary flex-1 text-center">
            📚 記事一覧へ
          </Link>
          <Link
            href="/"
            className="flex-1 text-center px-6 py-3 rounded-full font-bold text-sm border-2 transition-[transform,box-shadow] hover:-translate-y-0.5"
            style={{
              borderColor: 'var(--color-beige-dark)',
              color:       'var(--color-brown)',
              background:  'white',
            }}
          >
            🏠 ホームへ
          </Link>
        </div>
      </div>
    </main>
  );
}
