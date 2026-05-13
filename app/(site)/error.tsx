'use client';

/**
 * app/(site)/error.tsx
 * familyai.jp — エラー境界（Client Component 必須）
 */

import { useEffect } from 'react';
import Link          from 'next/link';
import { AlertCircle, RotateCw, Home } from 'lucide-react';

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
      style={{ background: 'var(--washi)' }}
    >
      <div className="flex flex-col items-center gap-6 max-w-md">
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
          <AlertCircle size={44} strokeWidth={1.5} />
        </div>

        {/* テキスト */}
        <div className="flex flex-col gap-2">
          <p
            className="serial text-sm tracking-widest uppercase"
            style={{ color: 'var(--shu)' }}
          >
            Error
          </p>
          <h1
            className="font-mincho"
            style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 500, color: 'var(--sumi)' }}
          >
            申し訳ありません
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--sumi-light)' }}
          >
            予期しないエラーが発生しました。
            しばらくしてからもう一度お試しください。
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={reset}
            className="btn-mingei flex-1 inline-flex items-center justify-center gap-2"
          >
            <RotateCw size={16} strokeWidth={1.75} />
            もう一度試す
          </button>
          <Link
            href="/"
            className="btn-mingei btn-mingei-outline flex-1 text-center inline-flex items-center justify-center gap-2"
          >
            <Home size={16} strokeWidth={1.75} />
            ホームへ戻る
          </Link>
        </div>

        {/* エラーコード（開発環境のみ表示） */}
        {process.env.NODE_ENV === 'development' && error.digest && (
          <p
            className="text-xs font-mono opacity-50"
            style={{ color: 'var(--sumi-light)' }}
          >
            digest: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
