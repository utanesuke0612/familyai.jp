/**
 * app/(site)/mypage/page.tsx
 * familyai.jp — MyPage（マイページ）
 *
 * セッションに応じて3状態で表示を切り替える：
 *   - 未ログイン（no session）
 *   - 無料会員（plan='free'）
 *   - プレミアム会員（plan='premium'）
 *
 * 単語帳・AI利用状況・プラン情報などの入り口として機能する。
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { SITE } from '@/shared';

export const metadata: Metadata = {
  title:       `MyPage | ${SITE.name}`,
  description: 'あなたの学習記録、単語帳、プラン情報をまとめて確認できるマイページです。',
  alternates:  { canonical: `${SITE.url}/mypage` },
};

// 状態ごとの見た目設定
const STATE_CONFIG = {
  anon: {
    bgGradient:   'linear-gradient(160deg, var(--color-beige) 0%, var(--color-cream) 100%)',
    badge:        '👋 ゲスト',
    badgeBg:      'rgba(255,255,255,0.85)',
  },
  free: {
    bgGradient:   'linear-gradient(160deg, var(--color-mint) 0%, var(--color-cream) 100%)',
    badge:        '🌱 無料会員',
    badgeBg:      'var(--color-mint)',
  },
  premium: {
    bgGradient:   'linear-gradient(160deg, var(--color-yellow) 0%, var(--color-cream) 100%)',
    badge:        '👑 プレミアム会員',
    badgeBg:      'var(--color-yellow)',
  },
} as const;

const AI_QUOTA = {
  anon:    { label: '非ログイン',       limit: 10 },
  free:    { label: '無料会員',         limit: 30 },
  premium: { label: 'プレミアム会員',   limit: 200 },
} as const;

export default async function MyPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const plan: 'anon' | 'free' | 'premium' = !isLoggedIn
    ? 'anon'
    : session.user.plan === 'premium' ? 'premium' : 'free';

  const config = STATE_CONFIG[plan];
  const quota  = AI_QUOTA[plan];

  return (
    <main style={{ background: 'var(--color-cream)' }}>
      {/* ───── ヒーロー ───── */}
      <section
        className="px-6 py-8 sm:py-10"
        style={{ background: config.bgGradient }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <span
            className="inline-flex w-fit items-center rounded-full px-4 text-sm font-semibold"
            style={{
              minHeight: '44px',
              background: config.badgeBg,
              color: 'var(--color-brown)',
              boxShadow: 'var(--shadow-warm-sm)',
            }}
          >
            {config.badge}
          </span>

          <div className="flex flex-wrap items-center gap-4">
            {session?.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                width={64}
                height={64}
                className="rounded-full shrink-0"
                style={{ border: '2px solid white', boxShadow: 'var(--shadow-warm-sm)' }}
              />
            )}
            {/* 見出し領域: flex-1 + min-w-0 で flex 親内に収め、長い user.name を折返し可能に */}
            <div className="flex-1 min-w-0">
              {isLoggedIn ? (
                <h1
                  className="font-display font-bold leading-tight"
                  style={{
                    // max を 28px に抑え、長いユーザー名でレイアウト崩壊を防ぐ
                    fontSize:    'clamp(20px, 2.4vw + 14px, 28px)',
                    color:       'var(--color-brown)',
                    overflowWrap: 'anywhere',  // 日本語連結の長い user.name でも折返す
                    wordBreak:    'normal',
                  }}
                >
                  ようこそ、
                  <span className="font-bold" style={{ color: 'var(--color-orange)' }}>
                    {session.user.name ?? 'あなた'}
                  </span>
                  さん
                </h1>
              ) : (
                <h1
                  className="font-display font-bold leading-tight"
                  style={{ fontSize: 'clamp(22px, 3vw + 14px, 32px)', color: 'var(--color-brown)' }}
                >
                  MyPage
                </h1>
              )}
              {isLoggedIn && session.user.email && (
                <p
                  className="text-sm mt-1"
                  style={{
                    color:        'var(--color-brown-light)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {session.user.email}
                </p>
              )}
              {!isLoggedIn && (
                <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--color-brown-light)' }}>
                  ログインすると、利用回数や学習記録を複数の端末で共有できます。
                  ログインしなくても一部の機能（単語帳など）はお使いいただけます。
                </p>
              )}
            </div>
          </div>

          {!isLoggedIn && (
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth/signin"
                className="inline-flex items-center rounded-full px-5 text-sm font-semibold"
                style={{
                  minHeight: '44px',
                  background: 'var(--color-orange)',
                  color: 'white',
                }}
              >
                ログイン →
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center rounded-full px-5 text-sm font-semibold"
                style={{
                  minHeight: '44px',
                  background: 'rgba(255,255,255,0.9)',
                  color: 'var(--color-brown)',
                  boxShadow: 'var(--shadow-warm-sm)',
                }}
              >
                新規登録
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ───── コンテンツグリッド ───── */}
      <section className="px-6 py-8 sm:py-10">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {/* 学習カード */}
          <article
            className="rounded-[28px] p-6"
            style={{
              background: 'rgba(255,255,255,0.92)',
              boxShadow: 'var(--shadow-warm-sm)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl" aria-hidden="true">📚</span>
              <h2 className="font-display text-xl font-bold" style={{ color: 'var(--color-brown)' }}>
                わたしの学習
              </h2>
            </div>

            <ul className="flex flex-col gap-3">
              <li>
                <Link
                  href="/mypage/vocab"
                  className="flex items-center justify-between rounded-2xl p-3"
                  style={{
                    background: 'var(--color-cream)',
                    border: '1px solid var(--color-beige-dark)',
                    color: 'var(--color-brown)',
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">⭐</span>
                    <span className="font-semibold">単語帳</span>
                  </span>
                  <span style={{ color: 'var(--color-orange)' }}>→</span>
                </Link>
              </li>
              <li>
                <span
                  className="flex items-center justify-between rounded-2xl p-3"
                  style={{
                    background: 'var(--color-cream)',
                    border: '1px solid var(--color-beige-dark)',
                    color: 'var(--color-brown-light)',
                    opacity: 0.7,
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">🎓</span>
                    <span className="font-semibold">学習履歴</span>
                  </span>
                  <span className="text-xs">準備中</span>
                </span>
              </li>
              <li>
                <Link
                  href="/mypage/aimemo"
                  className="flex items-center justify-between rounded-2xl p-3"
                  style={{
                    background: 'var(--color-cream)',
                    border: '1px solid var(--color-beige-dark)',
                    color: 'var(--color-brown)',
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">📌</span>
                    <span className="font-semibold">AIメモ帳</span>
                  </span>
                  <span style={{ color: 'var(--color-orange)' }}>→</span>
                </Link>
              </li>
            </ul>
          </article>

          {/* AI利用状況カード */}
          <article
            className="rounded-[28px] p-6"
            style={{
              background: 'rgba(255,255,255,0.92)',
              boxShadow: 'var(--shadow-warm-sm)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl" aria-hidden="true">💞</span>
              <h2 className="font-display text-xl font-bold" style={{ color: 'var(--color-brown)' }}>
                AI 利用状況
              </h2>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--color-cream)',
                border: '1px solid var(--color-beige-dark)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
                現在のプラン
              </p>
              <p className="mt-1 text-lg font-bold" style={{ color: 'var(--color-brown)' }}>
                {quota.label}
              </p>
              <p className="mt-3 text-sm" style={{ color: 'var(--color-brown)' }}>
                1日あたり <strong>{quota.limit}回</strong> までAIチャット・解説が使えます。
              </p>
              <p className="mt-2 text-xs" style={{ color: 'var(--color-brown-light)' }}>
                ※ 残り回数の表示は準備中です
              </p>
            </div>

            {plan === 'anon' && (
              <Link
                href="/auth/register"
                className="mt-4 inline-flex w-full items-center justify-center rounded-full px-4 text-sm font-semibold"
                style={{
                  minHeight: '44px',
                  background: 'var(--color-orange)',
                  color: 'white',
                }}
              >
                無料で登録して 30回/日 に拡大 →
              </Link>
            )}
            {plan === 'free' && (
              <div
                className="mt-4 rounded-2xl p-3 text-sm leading-relaxed"
                style={{
                  background: 'var(--color-peach-light, var(--color-beige))',
                  color: 'var(--color-brown)',
                  border: '1px solid var(--color-beige-dark)',
                }}
              >
                👑 <strong>プレミアムプラン</strong>なら 200回/日 に。<br />
                <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
                  プレミアム機能は準備中です。
                </span>
              </div>
            )}
            {plan === 'premium' && (
              <p className="mt-4 text-sm" style={{ color: 'var(--color-brown-light)' }}>
                プレミアムプランをご利用いただきありがとうございます。
              </p>
            )}
          </article>

          {/* アカウント情報カード（ログイン時のみ） */}
          {isLoggedIn && (
            <article
              className="md:col-span-2 rounded-[28px] p-6"
              style={{
                background: 'rgba(255,255,255,0.92)',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl" aria-hidden="true">⚙️</span>
                <h2 className="font-display text-xl font-bold" style={{ color: 'var(--color-brown)' }}>
                  アカウント
                </h2>
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold" style={{ color: 'var(--color-brown-light)' }}>
                    メールアドレス
                  </dt>
                  <dd className="text-sm" style={{ color: 'var(--color-brown)' }}>
                    {session.user.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold" style={{ color: 'var(--color-brown-light)' }}>
                    プラン
                  </dt>
                  <dd className="text-sm" style={{ color: 'var(--color-brown)' }}>
                    {quota.label}
                  </dd>
                </div>
              </dl>

              <form action="/api/auth/signout" method="post" className="mt-5">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full px-5 text-sm font-semibold"
                  style={{
                    minHeight: '44px',
                    background: 'rgba(255,255,255,0.9)',
                    color: 'var(--color-brown)',
                    border: '1px solid var(--color-beige-dark)',
                  }}
                >
                  ログアウト
                </button>
              </form>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
