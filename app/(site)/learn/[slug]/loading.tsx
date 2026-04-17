/**
 * app/(site)/learn/[slug]/loading.tsx
 * familyai.jp — 記事詳細スケルトン UI
 */

export default function ArticleLoading() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>

      {/* 記事ヘッダー */}
      <div
        className="py-12 px-6 animate-pulse"
        style={{ background: 'var(--color-cream)' }}
      >
        <div className="max-w-container mx-auto flex flex-col gap-4">
          {/* パンくず */}
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-12 rounded" style={{ background: 'var(--color-beige-dark)' }} />
            <div className="h-3.5 w-2  rounded" style={{ background: 'var(--color-beige-dark)' }} />
            <div className="h-3.5 w-16 rounded" style={{ background: 'var(--color-beige-dark)' }} />
            <div className="h-3.5 w-2  rounded" style={{ background: 'var(--color-beige-dark)' }} />
            <div className="h-3.5 w-40 rounded" style={{ background: 'var(--color-beige-dark)' }} />
          </div>
          {/* バッジ */}
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full" style={{ background: 'var(--color-beige)' }} />
            <div className="h-6 w-20 rounded-full" style={{ background: 'var(--color-beige)' }} />
          </div>
          {/* タイトル */}
          <div className="flex flex-col gap-2">
            <div className="h-9 w-full max-w-xl rounded-xl" style={{ background: 'var(--color-beige)' }} />
            <div className="h-9 w-3/4 max-w-md rounded-xl" style={{ background: 'var(--color-beige)' }} />
          </div>
          {/* メタ */}
          <div className="h-4 w-48 rounded" style={{ background: 'var(--color-beige)' }} />
        </div>
      </div>

      {/* サムネイル */}
      <div
        className="w-full h-56 md:h-80 animate-pulse"
        style={{ background: 'var(--color-beige)' }}
      />

      {/* 本文 + サイドバー */}
      <div className="py-10 px-6">
        <div className="max-w-container mx-auto flex gap-10 items-start animate-pulse">
          {/* 本文 */}
          <div className="flex-1 flex flex-col gap-4">
            {[100, 90, 95, 70, 85, 100, 60, 88, 75, 92].map((w, i) => (
              <div
                key={i}
                className="h-4 rounded-lg"
                style={{ width: `${w}%`, background: 'var(--color-beige)' }}
              />
            ))}
            <div className="h-32 w-full rounded-2xl mt-4" style={{ background: 'var(--color-beige)' }} />
            {[80, 95, 65, 90].map((w, i) => (
              <div
                key={i}
                className="h-4 rounded-lg"
                style={{ width: `${w}%`, background: 'var(--color-beige)' }}
              />
            ))}
          </div>

          {/* サイドバー（lg以上） */}
          <div className="hidden lg:flex w-80 shrink-0 flex-col gap-4">
            <div className="h-64 rounded-2xl" style={{ background: 'var(--color-beige)' }} />
            <div className="h-40 rounded-2xl" style={{ background: 'var(--color-beige)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
