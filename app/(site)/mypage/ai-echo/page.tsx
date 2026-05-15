/**
 * app/(site)/mypage/ai-echo/page.tsx
 * AI Echo 履歴ページ — Server Component
 *
 * DB から直接取得してクライアントコンポーネントへ渡す（fetch 経由なし）。
 * 未ログインはサインインページへ redirect。
 */

import type { Metadata } from 'next';
import Link              from 'next/link';
import { redirect }      from 'next/navigation';
import { auth }          from '@/lib/auth';
import { listAiEchoEntries } from '@/lib/repositories/ai-echo';
import { SITE }          from '@/shared';
import AiEchoList, { type AiEchoListItem } from './AiEchoList';

export const metadata: Metadata = {
  title:       `AI Echo 履歴 | ${SITE.name}`,
  description: 'AI Echo で書いた英文と AI からのフィードバック一覧。',
};

export default async function AiEchoHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const rows = await listAiEchoEntries(session.user.id);
  const items: AiEchoListItem[] = rows.map((r) => ({
    id:          r.id,
    lessonKey:   r.lessonKey,
    lessonTitle: r.lessonTitle,
    level:       r.level as 1 | 2 | 3,
    userInput:   r.userInput,
    aiFeedback:  r.aiFeedback,
    createdAt:   r.createdAt.toISOString(),
  }));

  return (
    <main style={{ background: 'var(--washi)', minHeight: '100vh' }}>
      {/* ── ヘッダー ──────────────────────────── */}
      <section
        className="px-6 py-8 sm:py-10"
        style={{ background: 'var(--washi-deep)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="mx-auto max-w-5xl">
          {/* パンくず */}
          <div
            className="flex items-center gap-2 text-sm mb-5 leading-none"
            style={{ color: 'var(--sumi-light)' }}
          >
            <Link href="/mypage" className="leading-none" style={{ color: 'var(--shu)' }}>
              マイページ
            </Link>
            <span aria-hidden="true" className="leading-none translate-y-[-1px]">›</span>
            <span className="leading-none">AI Echo 履歴</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1
                className="font-mincho"
                style={{ fontSize: 'clamp(22px, 3vw + 12px, 32px)', fontWeight: 500, color: 'var(--sumi)' }}
              >
                AI Echo 履歴
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--sumi-light)' }}>
                自分の言葉で書いた英文と AI からのフィードバック ({items.length} 件)
              </p>
            </div>
            <Link
              href="/tools/voaenglish"
              className="inline-flex items-center px-5 text-sm font-semibold"
              style={{ minHeight: 44, background: 'var(--shu)', color: 'white', borderRadius: '4px' }}
            >
              レッスン一覧へ
            </Link>
          </div>
        </div>
      </section>

      {/* ── 本文 ──────────────────────────── */}
      <section className="px-6 pb-12 pt-4">
        <div className="mx-auto max-w-5xl">
          {items.length === 0 ? (
            <div
              className="p-8 text-center"
              style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--line)', borderRadius: '4px' }}
            >
              <p className="text-base font-mincho mb-1" style={{ fontWeight: 500, color: 'var(--sumi)' }}>
                まだ AI Echo の履歴がありません
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--sumi-light)' }}>
                レッスンページの AI Echo パネルで英文を書いて評価してもらうと、ここに表示されます。
              </p>
              <Link
                href="/tools/voaenglish"
                className="inline-block mt-4 px-5 py-2 text-sm font-mincho"
                style={{ background: 'var(--shu)', color: '#fff', fontWeight: 500, borderRadius: '4px' }}
              >
                レッスン一覧を見る
              </Link>
            </div>
          ) : (
            <AiEchoList items={items} />
          )}
        </div>
      </section>
    </main>
  );
}
