/**
 * app/(site)/learn/loading.tsx
 * familyai.jp — 記事一覧スケルトン UI
 */

function CardSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{ background: 'white', border: '2px solid var(--color-beige)' }}
    >
      {/* サムネイル */}
      <div
        className="h-36"
        style={{ background: 'var(--color-beige)' }}
      />
      {/* ボディ */}
      <div className="p-5 flex flex-col gap-3">
        {/* タグ行 */}
        <div className="flex gap-2">
          <div className="h-5 w-14 rounded-full" style={{ background: 'var(--color-beige)' }} />
          <div className="h-5 w-20 rounded-full" style={{ background: 'var(--color-beige)' }} />
        </div>
        {/* タイトル */}
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-full rounded-lg"  style={{ background: 'var(--color-beige)' }} />
          <div className="h-4 w-3/4 rounded-lg"   style={{ background: 'var(--color-beige)' }} />
        </div>
        {/* メタ */}
        <div className="h-3.5 w-1/2 rounded-lg mt-1" style={{ background: 'var(--color-beige)' }} />
      </div>
    </div>
  );
}

export default function LearnLoading() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      {/* ヘッダーエリア */}
      <div
        className="py-10 px-6 animate-pulse"
        style={{ background: 'var(--color-beige)' }}
      >
        <div className="max-w-container mx-auto flex flex-col gap-3">
          <div className="h-5 w-32 rounded-lg"  style={{ background: 'var(--color-beige-dark)' }} />
          <div className="h-8 w-64 rounded-xl"  style={{ background: 'var(--color-beige-dark)' }} />
          <div className="h-4 w-full max-w-sm rounded-lg" style={{ background: 'var(--color-beige-dark)' }} />
        </div>
      </div>

      {/* フィルターエリア */}
      <div className="py-6 px-6">
        <div className="max-w-container mx-auto flex gap-3 flex-wrap animate-pulse">
          {[80, 64, 72, 60, 88].map((w, i) => (
            <div
              key={i}
              className="h-9 rounded-full"
              style={{ width: `${w}px`, background: 'var(--color-beige)' }}
            />
          ))}
        </div>
      </div>

      {/* カードグリッド */}
      <div className="px-6 pb-16">
        <div className="max-w-container mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
