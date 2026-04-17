'use client';

/**
 * app/(site)/error.tsx
 * familyai.jp — エラー境界（Client Component 必須）
 */

import { useEffect } from 'react';
import Link          from 'next/link';

interface ErrorProps {
  error:  Error & { digest?: string };
  reset:  () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // エラーをロギングサービスに送信（本番では Sentry 等に置き換え）
    console.error('[Error Boundary]', error);
  }, [error]);

  return (
    <main
      className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--color-cream)' }}
    >
      <div className="flex flex-col items-center gap-6 max-w-md">
        {/* アイコン */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
          style={{
            background: 'var(--color-beige)',
            boxShadow:  'var(--shadow-warm-sm)',
          }}
        >
          😢
        </div>

        {/* テキスト */}
        <div className="flex flex-col gap-2">
          <p
            className="font-bold text-sm tracking-widest uppercase"
            style={{ color: 'var(--color-orange)' }}
          >
            Error
          </p>
          <h1
            className="font-display font-bold"
            style={{ fontSize: 'clamp(20px, 4vw, 28px)', color: 'var(--color-brown)' }}
          >
            申し訳ありません
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-brown-light)' }}
          >
            予期しないエラーが発生しました。
            しばらくしてからもう一度お試しください。
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={reset}
            className="btn-primary flex-1"
          >
            🔄 もう一度試す
          </button>
          <Link
            href="/"
            className="flex-1 text-center px-6 py-3 rounded-full font-bold text-sm border-2 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
            style={{
              borderColor: 'var(--color-beige-dark)',
              color:       'var(--color-brown)',
              background:  'white',
            }}
          >
            🏠 ホームへ戻る
          </Link>
        </div>

        {/* エラーコード（開発環境のみ表示） */}
        {process.env.NODE_ENV === 'development' && error.digest && (
          <p
            className="text-xs font-mono opacity-50"
            style={{ color: 'var(--color-brown-light)' }}
          >
            digest: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
