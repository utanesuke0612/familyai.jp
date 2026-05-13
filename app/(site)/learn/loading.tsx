/**
 * app/(site)/learn/loading.tsx
 * familyai.jp — 記事一覧スケルトン UI
 */

function CardSkeleton() {
  return (
    <div
      className="overflow-hidden animate-pulse"
      style={{ background: 'white', border: '1px solid var(--line)', borderRadius: '4px' }}
    >
      {/* サムネイル */}
      <div
        className="h-36"
        style={{ background: 'var(--washi-deep)' }}
      />
      {/* ボディ */}
      <div className="p-5 flex flex-col gap-3">
        {/* タグ行 */}
        <div className="flex gap-2">
          <div className="h-5 w-14" style={{ background: 'var(--washi-deep)', borderRadius: '4px' }} />
          <div className="h-5 w-20" style={{ background: 'var(--washi-deep)', borderRadius: '4px' }} />
        </div>
        {/* タイトル */}
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-full"  style={{ background: 'var(--washi-deep)', borderRadius: '4px' }} />
          <div className="h-4 w-3/4"   style={{ background: 'var(--washi-deep)', borderRadius: '4px' }} />
        </div>
        {/* メタ */}
        <div className="h-3.5 w-1/2 mt-1" style={{ background: 'var(--washi-deep)', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

export default function LearnLoading() {
  return (
    <div style={{ background: 'var(--washi)', minHeight: '100vh' }}>
      {/* ヘッダーエリア */}
      <div
        className="py-10 px-6 animate-pulse"
        style={{ background: 'var(--washi-deep)' }}
      >
        <div className="max-w-container mx-auto flex flex-col gap-3">
          <div className="h-5 w-32"  style={{ background: 'var(--line)', borderRadius: '4px' }} />
          <div className="h-8 w-64"  style={{ background: 'var(--line)', borderRadius: '4px' }} />
          <div className="h-4 w-full max-w-sm" style={{ background: 'var(--line)', borderRadius: '4px' }} />
        </div>
      </div>

      {/* フィルターエリア */}
      <div className="py-6 px-6">
        <div className="max-w-container mx-auto flex gap-3 flex-wrap animate-pulse">
          {[80, 64, 72, 60, 88].map((w, i) => (
            <div
              key={i}
              className="h-9"
              style={{ width: `${w}px`, background: 'var(--washi-deep)', borderRadius: '4px' }}
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
