/**
 * app/(site)/mypage/ai-kyoshitsu/page.tsx
 * AI教室履歴ページ — Server Component
 * DBから直接データを取得してクライアントへ渡す（fetchなし・即表示）
 */

import type { Metadata } from 'next';
import Link              from 'next/link';
import { redirect }      from 'next/navigation';
import { auth }          from '@/lib/auth';
import { listUserAnimations } from '@/lib/repositories/animations';
import { toAnimationSummary } from '@/lib/mappers/animations';
import { SITE }          from '@/shared';
import AnimationList, { type AnimationItem } from './AnimationList';

export const metadata: Metadata = {
  title:  `AI教室履歴 | ${SITE.name}`,
  description: '生成したアニメーション一覧をまとめて確認できます。',
};

export default async function AiKyoshitsuHistoryPage() {
  // 認証チェック（未ログインはサインインページへ）
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  // DBから直接取得（APIを経由しない）
  const rows = await listUserAnimations(session.user.id);

  // shared/types の AnimationSummary に変換（mapper 経由で型安全な DTO 化）
  const items: AnimationItem[] = rows.map(toAnimationSummary);

  return (
    <main style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>

      {/* ヘッダー */}
      <section className="px-6 py-8 sm:py-10"
        style={{ background: 'linear-gradient(160deg, #fff3e0 0%, var(--color-cream) 100%)' }}>
        <div className="mx-auto max-w-5xl">
          {/* パンくず */}
          <div className="flex items-center gap-2 text-sm mb-5" style={{ color: 'var(--color-brown-light)' }}>
            <Link href="/mypage" style={{ color: 'var(--color-orange)' }}>マイページ</Link>
            <span>›</span>
            <span>AI教室履歴</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold"
                style={{ fontSize: 'clamp(22px, 3vw + 12px, 32px)', color: 'var(--color-brown)' }}>
                🎬 AI教室履歴
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-brown-light)' }}>
                生成したアニメーション一覧
              </p>
            </div>
            <Link href="/tools/ai-kyoshitsu"
              className="inline-flex items-center rounded-full px-5 text-sm font-semibold"
              style={{ minHeight: 44, background: '#ff8c42', color: 'white', boxShadow: '0 2px 8px rgba(255,140,66,0.35)' }}>
              ✨ 新しく作る →
            </Link>
          </div>
        </div>
      </section>

      {/* コンテンツ */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <AnimationList initialItems={items} />
        </div>
      </section>
    </main>
  );
}
