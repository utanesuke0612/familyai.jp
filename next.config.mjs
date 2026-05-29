/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── セキュリティヘッダー ──────────────────────────────────
  async headers() {
    return [
      {
        // 太陽系 HTML デモは /tools/ai-kyoshitsu/solar-system 内の iframe で表示する。
        // 外部サイトからの埋め込みは防ぎ、同一オリジンだけ許可する。
        source: '/3d/solar/:path*',
        headers: [
          { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // その他すべてのページ・API で iframe 埋め込みを禁止（clickjacking 対策）
        source: '/((?!3d/solar).*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // ── 画像ドメイン許可 ─────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
      { protocol: 'https', hostname: 'gdb.voanews.com' },
    ],
  },
};

export default nextConfig;
