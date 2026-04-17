/**
 * app/(site)/not-found.tsx
 * familyai.jp — 404 ページ
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--color-cream)' }}
    >
      {/* 装飾 blob */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, var(--color-peach-light), transparent)',
            animation:  'pulseSoft 6s ease-in-out infinite',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md">
        {/* アイコン */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
          style={{
            background: 'var(--color-beige)',
            boxShadow:  'var(--shadow-warm-sm)',
          }}
        >
          🔍
        </div>

        {/* テキスト */}
        <div className="flex flex-col gap-2">
          <p
            className="font-bold text-sm tracking-widest uppercase"
            style={{ color: 'var(--color-orange)' }}
          >
            404 Not Found
          </p>
          <h1
            className="font-display font-bold"
            style={{ fontSize: 'clamp(22px, 5vw, 32px)', color: 'var(--color-brown)' }}
          >
            このページは見つかりませんでした
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-brown-light)' }}
          >
            お探しのページは移動または削除された可能性があります。
            記事一覧から探してみてください。
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/learn"
            className="btn-primary flex-1 text-center"
          >
            📚 記事一覧へ
          </Link>
          <Link
            href="/"
            className="flex-1 text-center px-6 py-3 rounded-full font-bold text-sm border-2 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
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
