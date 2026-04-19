/**
 * app/(site)/layout.tsx
 * familyai.jp — サイト共通レイアウト（Header + main + Footer）
 *
 * root layout（app/layout.tsx）から Header/Footer を分離し、
 * /admin など他のレイアウトが独立できるようにした。
 */

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main-content">
        {children}
      </main>
      <Footer />
    </>
  );
}
