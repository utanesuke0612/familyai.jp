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
 *
 * P2 #5 (Codex 2026-05-13): children 用の Suspense は維持しつつ
 *   - 各 Server page 側で useSearchParams を使う Client コンポーネントの
 *     直近に追加 Suspense を置き、CSR bail-out を狭い範囲に閉じ込める。
 *   - auth/signin は page を Server Component に分割し SignInForm を Suspense で囲む。
 *   - layout 側の fallback は空 div から「最小限の縦余白を確保するスケルトン」へ
 *     差し替え、prerender 中に画面が真っ白になる現象を回避する。
 */

import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';

/** layout 経由でしか Suspense をかぶせられない 'use client' page 用の最小フォールバック */
const ChildrenFallback = (
  <div
    aria-busy="true"
    aria-live="polite"
    style={{ minHeight: '50vh' }}
  />
);

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      <Suspense fallback={<div style={{ height: 'var(--header-height)' }} />}>
        <Header />
      </Suspense>
      <main id="main-content">
        <Suspense fallback={ChildrenFallback}>
          {children}
        </Suspense>
      </main>
      <Footer />
    </ConfirmProvider>
  );
}
