/**
 * app/(site)/mypage/ai-kyoshitsu/loading.tsx
 * AI教室履歴 — ローディング時のスケルトンUI
 */

export default function Loading() {
  return (
    <main style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      {/* ヘッダー骨格 */}
      <section className="px-6 py-8 sm:py-10"
        style={{ background: 'linear-gradient(160deg, #fff3e0 0%, var(--color-cream) 100%)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="h-4 w-32 rounded-full bg-orange-100 mb-5" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="h-8 w-48 rounded-2xl bg-orange-100" />
              <div className="h-4 w-32 rounded-full bg-orange-50" />
            </div>
            <div className="h-11 w-36 rounded-full bg-orange-200" />
          </div>
        </div>
      </section>

      {/* カード骨格 */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="h-4 w-24 rounded-full bg-gray-100 mb-5" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-[20px] overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.95)', boxShadow: 'var(--shadow-warm-sm)' }}>
                <div style={{ height: 4, background: '#e0e0e0' }} />
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <div className="h-5 w-14 rounded-full bg-gray-100" />
                    <div className="h-5 w-20 rounded-full bg-gray-100" />
                  </div>
                  <div className="h-4 w-full rounded-full bg-gray-100" />
                  <div className="h-4 w-3/4 rounded-full bg-gray-100" />
                  <div className="h-3 w-20 rounded-full bg-gray-50 mt-1" />
                  <div className="h-10 w-full rounded-full bg-gray-100 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes shimmer {
          0%   { opacity: 1; }
          50%  { opacity: 0.5; }
          100% { opacity: 1; }
        }
        main > section > div > div,
        main > section:last-child .grid > div {
          animation: shimmer 1.4s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
