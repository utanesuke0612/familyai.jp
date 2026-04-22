/**
 * app/(site)/layout.tsx
 * familyai.jp — サイト共通レイアウト（Header + main + Footer）
 *
 * root layout（app/layout.tsx）から Header/Footer を分離し、
 * /admin など他のレイアウトが独立できるようにした。
 *
 * Rev28 #deploy-fix: Header / children 内の Client Component が
 * `useSearchParams()` を使うため、Next.js 14 のプリレンダラが
 * missing-suspense-with-csr-bailout を出して全 (site) ルートの
 * ビルドが失敗していた。Suspense 境界で囲んで CSR bail-out を許可する。
 */

import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div style={{ height: 'var(--header-height)' }} />}>
        <Header />
      </Suspense>
      <main id="main-content">
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
