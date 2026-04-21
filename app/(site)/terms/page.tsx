/**
 * app/(site)/terms/page.tsx
 * familyai.jp — 利用規約
 */

import type { Metadata } from 'next';
import { SITE }          from '@/shared';

export const metadata: Metadata = {
  title:       `利用規約 | ${SITE.name}`,
  description: 'familyai.jp の利用規約です。',
  alternates:  { canonical: `${SITE.url}/terms` },
};

const SECTIONS = [
  {
    title: '第1条（適用）',
    body: `本規約は、familyai.jp（以下「当サイト」）が提供するサービスの利用条件を定めるものです。
ユーザーは本規約に同意した上でサービスをご利用ください。`,
  },
  {
    title: '第2条（利用登録）',
    body: `登録申請者が以下に該当する場合、登録をお断りすることがあります。
・虚偽の情報を申請した場合
・過去に本規約に違反したことがある場合
・その他、当サイトが不適切と判断した場合`,
  },
  {
    title: '第3条（禁止事項）',
    body: `ユーザーは以下の行為を行ってはなりません。
・法令または公序良俗に違反する行為
・犯罪行為に関連する行為
・当サイトのサーバーへの過負荷をかける行為
・当サイトのサービス運営を妨害する行為
・他のユーザーや第三者への迷惑行為
・当サイトの著作物を無断で転載・複製する行為
・AIを悪用して虚偽情報を生成・拡散する行為`,
  },
  {
    title: '第4条（コンテンツの著作権）',
    body: `当サイトに掲載されている文章・画像・その他のコンテンツの著作権は、
当サイトまたは正当な権利者に帰属します。
無断での転載・複製・改変はお断りします。
ただし、個人利用・非営利目的での引用（出典明記の上）は許可します。`,
  },
  {
    title: '第5条（AIサービスの利用）',
    body: `当サイトが提供するAIチャット機能は、OpenRouter経由でサードパーティのAIモデルを利用しています。
AIの回答は参考情報であり、医療・法律・金融等の専門的判断の代替とはなりません。
AIの回答内容について、当サイトは一切の責任を負いません。`,
  },
  {
    title: '第6条（免責事項）',
    body: `当サイトは以下について一切の責任を負いません。
・サービスの中断・終了・変更
・コンテンツの正確性・完全性
・ユーザーがサービスを通じて得た情報の利用結果
・ユーザー間またはユーザーと第三者との間に生じたトラブル`,
  },
  {
    title: '第7条（サービスの変更・停止）',
    body: `当サイトは、ユーザーへの事前通知なくサービス内容を変更・停止することがあります。
これによりユーザーに生じた損害について、当サイトは責任を負いません。`,
  },
  {
    title: '第8条（利用規約の変更）',
    body: `本規約は予告なく変更される場合があります。
変更後の規約は本ページに掲載した時点から効力を生じます。
変更後もサービスを継続して利用された場合、変更後の規約に同意したものとみなします。`,
  },
  {
    title: '第9条（準拠法・管轄裁判所）',
    body: `本規約の解釈および適用は日本法に準拠します。
本規約に関する紛争は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。`,
  },
];

export default function TermsPage() {
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
            利用規約
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
            最終更新日：2026年4月17日
          </p>
        </div>
      </section>

      <section className="py-4 px-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-10">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
            本利用規約（以下「本規約」）は、familyai.jp（以下「当サイト」）が
            提供するすべてのサービスの利用条件を定めるものです。
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
            © 2026 familyai.jp　制定日：2026年4月17日
          </p>
        </div>
      </section>
    </main>
  );
}
