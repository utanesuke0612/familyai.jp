/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── セキュリティヘッダー ──────────────────────────────────
  async headers() {
    return [
      {
        // アニメーションHTML配信API: iframeで表示するため SAMEORIGIN を許可
        source: '/api/animations/:path*',
        headers: [
          { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // その他すべてのページ・API: iframe埋め込みを禁止
        source: '/((?!api/animations).*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // ── 画像ドメイン許可（Vercel Blob など）──────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
    ],
  },
};

export default nextConfig;
