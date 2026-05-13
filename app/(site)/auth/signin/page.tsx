/**
 * app/(site)/auth/signin/page.tsx
 * familyai.jp — ログインページ（Server Component / Suspense ラッパー）
 *
 * 本体は ./SignInForm.tsx（Client Component）。
 * P2 #5: useSearchParams() を使う Inner Client を <Suspense> で囲み、
 *        ページ全体の CSR bail-out を最小範囲に閉じ込める。
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SITE } from '@/shared';
import { SignInForm } from './SignInForm';

export const metadata: Metadata = {
  title:       `ログイン | ${SITE.name}`,
  description: 'familyai.jp にログインして AI メモや単語帳をクラウド同期しましょう。',
  alternates:  { canonical: `${SITE.url}/auth/signin` },
};

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen flex items-center justify-center px-4 py-16"
          style={{ background: 'var(--color-cream)' }}
          aria-busy="true"
        >
          <div className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
            読み込み中…
          </div>
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
