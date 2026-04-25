'use client';

/**
 * components/Providers.tsx
 * familyai.jp — クライアント側プロバイダーラッパー
 *
 * NextAuth v5 の useSession() を Client Components で使うために
 * SessionProvider をルートレイアウトに注入する。
 * Server Component の layout.tsx からは直接 'use client' を使えないため、
 * このラッパーコンポーネントを経由する。
 */

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
