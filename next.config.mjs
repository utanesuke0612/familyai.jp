/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── セキュリティヘッダー ──────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
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
