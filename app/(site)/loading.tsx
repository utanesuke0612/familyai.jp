/**
 * app/(site)/loading.tsx
 * familyai.jp — トップレベルローディング（スケルトン UI）
 */

export default function Loading() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      style={{ background: 'var(--color-cream)' }}
      aria-label="読み込み中"
      role="status"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-full border-4 border-t-transparent"
          style={{
            borderColor:      'var(--color-beige-dark)',
            borderTopColor:   'var(--color-orange)',
            animation:        'spin 0.9s linear infinite',
          }}
          aria-hidden="true"
        />
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--color-brown-light)' }}
        >
          読み込み中...
        </p>
      </div>
    </div>
  );
}
