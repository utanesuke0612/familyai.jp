/**
 * app/(site)/privacy/page.tsx
 * familyai.jp — プライバシーポリシー
 */

import type { Metadata } from 'next';
import { SITE }          from '@/shared';

export const metadata: Metadata = {
  title:       `プライバシーポリシー | ${SITE.name}`,
  description: 'familyai.jp のプライバシーポリシー（個人情報保護方針）です。',
  alternates:  { canonical: `${SITE.url}/privacy` },
};

const SECTIONS = [
  {
    title: '1. 収集する情報',
    body: `当サイトでは、以下の情報を収集することがあります。
・お問い合わせ時のメールアドレス・お名前
・アカウント登録時のメールアドレス・パスワード（bcryptでハッシュ化して保管）
・Google ログイン時のプロフィール情報（名前・メールアドレス・プロフィール画像）
・ページ閲覧・記事再生のアクセスログ（Google Analytics）
・IPアドレス（sha256ハッシュ化して保管。生のIPは保存しません）`,
  },
  {
    title: '2. 情報の利用目的',
    body: `収集した情報は以下の目的で利用します。
・サービスの提供・改善
・お問い合わせへの返答
・不正利用の防止
・利用状況の統計分析（個人を特定しない形で）`,
  },
  {
    title: '3. 第三者への提供',
    body: `以下の場合を除き、個人情報を第三者に提供することはありません。
・ご本人の同意がある場合
・法令に基づく場合
・人の生命・財産を守るために必要な場合`,
  },
  {
    title: '4. Cookie・アクセス解析',
    body: `当サイトは Google Analytics を使用してアクセス解析を行っています。
Google Analytics は Cookie を使用し、個人を特定しない形でデータを収集します。
Cookie の無効化はブラウザの設定から行えます。`,
  },
  {
    title: '5. セキュリティ',
    body: `個人情報の漏えい・紛失・改ざんを防ぐため、適切なセキュリティ対策を実施しています。
・HTTPS 通信による暗号化
・パスワードは bcrypt（saltRounds:12）でハッシュ化して保管
・IPアドレスは sha256 ハッシュ化して保管`,
  },
  {
    title: '6. 個人情報の開示・訂正・削除',
    body: `保有する個人情報の開示・訂正・削除をご希望の場合は、familyaijp@gmail.com までご連絡ください。
本人確認の上、合理的な期間内に対応いたします。`,
  },
  {
    title: '7. プライバシーポリシーの変更',
    body: `本ポリシーは予告なく変更される場合があります。
変更後のポリシーは本ページに掲載した時点から効力を生じます。`,
  },
  {
    title: '8. お問い合わせ',
    body: `プライバシーポリシーに関するご質問は、以下にご連絡ください。
メール: familyaijp@gmail.com`,
  },
];

export default function PrivacyPage() {
  return (
    <main style={{ background: 'var(--color-cream)' }}>
      <section
        className="py-5 px-6"
        style={{ background: 'var(--color-beige)' }}
      >
        <div className="max-w-2xl mx-auto">
          <h1
            className="font-display font-bold mb-2"
            style={{ fontSize: 'clamp(24px, 4vw, 36px)', color: 'var(--color-brown)' }}
          >
            プライバシーポリシー
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
            最終更新日：2026年4月17日
          </p>
        </div>
      </section>

      <section className="py-4 px-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-10">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
            familyai.jp（以下「当サイト」）は、ユーザーの個人情報保護を重要な責務と考え、
            以下のプライバシーポリシーを定めます。
          </p>

          {SECTIONS.map((s) => (
            <div key={s.title} className="flex flex-col gap-3">
              <h2
                className="font-bold text-base"
                style={{ color: 'var(--color-brown)' }}
              >
                {s.title}
              </h2>
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--color-brown-light)' }}
              >
                {s.body}
              </p>
            </div>
          ))}

          <hr style={{ borderColor: 'var(--color-beige-dark)' }} />
          <p className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
            © 2026 familyai.jp
          </p>
        </div>
      </section>
    </main>
  );
}
