/** @type {import('next').NextConfig} */
const nextConfig = {
  // Rev38 cleanup: 旧 AI 生成アニメ API（/api/generate-animation,
  // /api/animations）は Rev36 で 3D 図鑑に全面リプレイス済みのため、
  // outputFileTracingIncludes / iframe 許可ヘッダーをまとめて削除した。
  // 3D アセットの iframe 表示要件が出てきた場合は
  // /api/3d-models/assets/:path* に対して明示的にヘッダーを追加する。

  // ── セキュリティヘッダー ──────────────────────────────────
  async headers() {
    return [
      {
        // 全ページ・API で iframe 埋め込みを禁止（clickjacking 対策）
        source: '/:path*',
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
