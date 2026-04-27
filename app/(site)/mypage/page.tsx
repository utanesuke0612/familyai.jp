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
        className="px-4 sm:px-6 py-6 sm:py-10"
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
      <section className="px-4 sm:px-6 py-6 sm:py-10">
        {/* 学習カード:AI利用状況カード = 1:2 比率（右側のプラン比較表に余裕を持たせる） */}
        <div className="mx-auto grid max-w-5xl gap-4 sm:gap-6 md:grid-cols-[1fr_2fr]">
          {/* 学習カード */}
          <article
            className="rounded-[24px] sm:rounded-[28px] p-5 sm:p-6"
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
                <Link
                  href="/mypage/ai-kyoshitsu"
                  className="flex items-center justify-between rounded-2xl p-3"
                  style={{
                    background: 'var(--color-cream)',
                    border: '1px solid var(--color-beige-dark)',
                    color: 'var(--color-brown)',
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">🎬</span>
                    <span className="font-semibold">AI教室履歴</span>
                  </span>
                  <span style={{ color: 'var(--color-orange)' }}>→</span>
                </Link>
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

          {/* AI利用状況カード（プラン比較表） */}
          <article
            className="rounded-[24px] sm:rounded-[28px] p-5 sm:p-6"
            style={{
              background: 'rgba(255,255,255,0.92)',
              boxShadow: 'var(--shadow-warm-sm)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl" aria-hidden="true">💞</span>
              <h2 className="font-display text-xl font-bold" style={{ color: 'var(--color-brown)' }}>
                AI 利用状況
              </h2>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--color-brown-light)' }}>
              プランごとの機能と利用回数の比較です。
              <span className="font-semibold" style={{ color: 'var(--color-orange)' }}>
                （現在: {quota.label}）
              </span>
            </p>

            {/* レスポンシブ比較: モバイルはスタックカード、sm以上はテーブル */}
            <FeatureComparison plan={plan} />

            {/* CTA */}
            {plan === 'anon' && (
              <Link
                href="/auth/register"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full px-4 text-sm font-bold"
                style={{
                  minHeight: '44px',
                  background: 'var(--color-orange)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(255,140,66,0.35)',
                }}
              >
                🌱 無料で登録 → AI教室・履歴・メモ帳が使えます
              </Link>
            )}
            {plan === 'free' && (
              <div
                className="mt-5 rounded-2xl p-4 text-sm leading-relaxed"
                style={{
                  background: 'linear-gradient(135deg, #fff8e1, #fff3cd)',
                  border:     '1.5px solid #ffd54f',
                  color:      '#7a5000',
                }}
              >
                <p className="font-bold">👑 プレミアムプランで AI教室を 100回/日に拡大！</p>
                <p className="mt-1 text-xs" style={{ color: '#a07830' }}>
                  プレミアム機能は準備中です。リリース時にお知らせします。
                </p>
              </div>
            )}
            {plan === 'premium' && (
              <p className="mt-5 text-center text-sm font-semibold" style={{ color: 'var(--color-brown)' }}>
                👑 プレミアムプランをご利用いただきありがとうございます！
              </p>
            )}
          </article>

        </div>
      </section>
    </main>
  );
}

/* ─────────────────────────────────────────────────────
   プラン比較サブコンポーネント
   - モバイル（< sm）: 機能ごとのスタックカード
   - タブレット以上（>= sm）: 横並びテーブル
───────────────────────────────────────────────────── */

type PlanKey = 'anon' | 'free' | 'premium';

interface FeatureItem {
  feature: string;
  desc:    string;
  anon:    string;
  free:    string;
  premium: string;
}

const FEATURES: readonly FeatureItem[] = [
  {
    feature: '🎬 AI教室(アニメ生成)',
    desc:    '理科・算数・社会のアニメをAIで生成',
    anon:    '利用不可',
    free:    '3回/日',
    premium: '100回/日',
  },
  {
    feature: '💬 AIチャット・解説',
    desc:    '質問への回答・記事の解説',
    anon:    '10回/日',
    free:    '30回/日',
    premium: '200回/日',
  },
  {
    feature: '📂 履歴から再閲覧',
    desc:    '生成済みアニメを無料で見直し',
    anon:    '利用不可',
    free:    '無制限',
    premium: '無制限',
  },
  {
    feature: '📤 友達にシェア',
    desc:    '記事・アニメをX・LINEで共有',
    anon:    '可',
    free:    '可',
    premium: '可',
  },
  {
    feature: '📌 AIメモ帳',
    desc:    'AIとのやりとりを保存',
    anon:    '利用不可',
    free:    '無制限',
    premium: '無制限',
  },
  {
    feature: '📚 単語ブックマーク',
    desc:    'VOA英語の単語を記録',
    anon:    '利用不可',
    free:    '無制限',
    premium: '無制限',
  },
];

const PLAN_META: Record<PlanKey, { emoji: string; title: string }> = {
  anon:    { emoji: '👋', title: '未ログイン' },
  free:    { emoji: '🌱', title: '無料会員'   },
  premium: { emoji: '👑', title: 'プレミアム' },
};

function FeatureComparison({ plan }: { plan: PlanKey }) {
  return (
    <>
      {/* ── モバイル（< sm）: スタックカード ── */}
      <div className="flex flex-col gap-3 sm:hidden">
        {FEATURES.map((f) => (
          <FeatureMobileCard key={f.feature} item={f} plan={plan} />
        ))}
      </div>

      {/* ── タブレット以上（>= sm）: テーブル ── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-beige-dark)' }}>
              <th
                className="text-left py-2 px-3 font-semibold"
                style={{ color: 'var(--color-brown)' }}
              >
                機能
              </th>
              <PlanHeader title={PLAN_META.anon.title}    emoji={PLAN_META.anon.emoji}    current={plan === 'anon'} />
              <PlanHeader title={PLAN_META.free.title}    emoji={PLAN_META.free.emoji}    current={plan === 'free'} />
              <PlanHeader title={PLAN_META.premium.title} emoji={PLAN_META.premium.emoji} current={plan === 'premium'} />
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <FeatureRow key={f.feature} {...f} plan={plan} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** モバイル用: 機能1つを1カードで表示。各プランの値を縦に並べる */
function FeatureMobileCard({ item, plan }: { item: FeatureItem; plan: PlanKey }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: 'var(--color-cream)',
        border:     '1px solid var(--color-beige-dark)',
      }}
    >
      <div>
        <div className="font-semibold text-sm" style={{ color: 'var(--color-brown)' }}>
          {item.feature}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-brown-light)' }}>
          {item.desc}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <PlanValueRow planKey="anon"    value={item.anon}    plan={plan} />
        <PlanValueRow planKey="free"    value={item.free}    plan={plan} />
        <PlanValueRow planKey="premium" value={item.premium} plan={plan} />
      </div>
    </div>
  );
}

/** モバイルカード内の1行: 「🌱 無料会員 ───── 3回/日」 */
function PlanValueRow({
  planKey, value, plan,
}: {
  planKey: PlanKey;
  value:   string;
  plan:    PlanKey;
}) {
  const isCurrent  = planKey === plan;
  const isDisabled = value === '利用不可';
  const meta       = PLAN_META[planKey];

  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs"
      style={{
        background: isCurrent ? 'rgba(255,140,66,0.12)' : 'rgba(255,255,255,0.6)',
        border:     isCurrent ? '1.5px solid var(--color-orange)' : '1px solid var(--color-beige-dark)',
      }}
    >
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm shrink-0">{meta.emoji}</span>
        <span
          className="truncate"
          style={{
            color:      isCurrent ? 'var(--color-brown)' : 'var(--color-brown-light)',
            fontWeight: isCurrent ? 700 : 500,
          }}
        >
          {meta.title}
          {isCurrent && <span className="ml-1 text-[10px]" style={{ color: 'var(--color-orange)' }}>（あなた）</span>}
        </span>
      </span>
      <span
        className="shrink-0 font-semibold"
        style={{
          color: isDisabled ? 'var(--color-brown-muted)' : (isCurrent ? 'var(--color-orange)' : 'var(--color-brown)'),
        }}
      >
        {isDisabled ? <span style={{ opacity: 0.7 }}>✕ {value}</span> : value}
      </span>
    </div>
  );
}

function PlanHeader({ title, emoji, current }: { title: string; emoji: string; current: boolean }) {
  return (
    <th
      className="py-2 px-2 sm:px-3 text-center font-semibold whitespace-nowrap"
      style={{
        background: current ? 'var(--color-orange)' : 'transparent',
        color:      current ? '#fff'                 : 'var(--color-brown)',
        borderRadius: current ? '12px 12px 0 0'      : 0,
      }}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-base">{emoji}</span>
        <span className="text-xs sm:text-sm">{title}</span>
        {current && <span className="text-[10px] font-normal opacity-90">（あなた）</span>}
      </div>
    </th>
  );
}

function FeatureRow({
  feature, desc, anon, free, premium, plan,
}: {
  feature: string;
  desc:    string;
  anon:    string;
  free:    string;
  premium: string;
  plan:    PlanKey;
}) {
  return (
    <tr style={{ borderBottom: '1px solid var(--color-beige)' }}>
      <td className="py-3 px-2 sm:px-3" style={{ verticalAlign: 'top' }}>
        <div className="font-semibold text-xs sm:text-sm" style={{ color: 'var(--color-brown)' }}>
          {feature}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-brown-light)' }}>
          {desc}
        </div>
      </td>
      <CellValue value={anon}    isCurrent={plan === 'anon'} />
      <CellValue value={free}    isCurrent={plan === 'free'} />
      <CellValue value={premium} isCurrent={plan === 'premium'} />
    </tr>
  );
}

function CellValue({ value, isCurrent }: { value: string; isCurrent: boolean }) {
  const isDisabled = value === '利用不可';
  return (
    <td
      className="py-3 px-2 sm:px-3 text-center text-xs sm:text-sm"
      style={{
        background: isCurrent ? 'rgba(255,140,66,0.08)' : 'transparent',
        color:      isDisabled ? 'var(--color-brown-muted)' : 'var(--color-brown)',
        fontWeight: isCurrent && !isDisabled ? 700 : 500,
      }}
    >
      {isDisabled ? <span style={{ opacity: 0.6 }}>✕ {value}</span> : value}
    </td>
  );
}
