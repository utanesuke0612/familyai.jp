/**
 * app/(site)/about/page.tsx
 * familyai.jp — About ページ
 */

import type { Metadata } from 'next';
import { SITE }          from '@/shared';

export const metadata: Metadata = {
  title:       `familyai.jp について | ${SITE.name}`,
  description: 'familyai.jp は AI活用事例とAIツールをわかりやすく届ける日本語メディアです。',
  alternates:  { canonical: `${SITE.url}/about` },
};

const TEAM = [
  {
    name:   'AIおじさん🏠',
    role:   'ファウンダー・エンジニア',
    emoji:  '👨‍💻',
    desc:   'AIを「家族の愛の道具」にしたいという想いでfamilyai.jpを立ち上げました。',
  },
];

const VALUES = [
  { emoji: '🤝', title: '誰でもわかりやすい', desc: '初心者でも迷わず読めるように、丁寧で実践的な説明を心がけています。' },
  { emoji: '🔒', title: '安心・安全',        desc: 'プライバシーを大切に。個人情報の収集は最小限にとどめます。' },
  { emoji: '🌱', title: '日々アップデート',  desc: 'AI業界は変化が速い。最新情報を素早くわかりやすくお届けします。' },
  { emoji: '💡', title: '実践重視',          desc: '読むだけでなく、今日から使える具体的な方法を紹介します。' },
];

export default function AboutPage() {
  return (
    <main style={{ background: 'var(--washi)' }}>

      {/* ── ヒーロー ── */}
      <section
        className="py-6 px-6 text-center relative overflow-hidden"
        style={{ background: 'var(--washi)' }}
      >
        <div className="relative max-w-2xl mx-auto flex flex-col items-center gap-6">
          <div>
            <h1
              className="font-mincho mb-3"
              style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 500, color: 'var(--sumi)' }}
            >
              familyai.jp について
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'var(--sumi-light)' }}>
              「AI = 愛」— テクノロジーを人の役に立つ形で届ける日本語メディア
            </p>
          </div>
        </div>
      </section>

      {/* ── ミッション ── */}
      <section className="py-5 px-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <h2
            className="font-mincho text-2xl"
            style={{ fontWeight: 500, color: 'var(--sumi)' }}
          >
            私たちのミッション
          </h2>
          <div
            className="p-6 leading-relaxed text-base"
            style={{
              background:   'white',
              borderLeft:   '4px solid var(--shu)',
              border:       '1px solid var(--line)',
              color:        'var(--sumi)',
              borderRadius: '4px',
            }}
          >
            <p>
              AIは難しい、怖い、自分には関係ない——そう思っていませんか？
            </p>
            <p className="mt-3">
              familyai.jp は、そんな不安を「使える楽しさ」に変えるためのメディアです。
              仕事の効率化、学習サポート、日常の小さな困りごとの解決。
              さまざまなシーンで役立つAI活用法を、やさしい日本語でお届けします。
            </p>
            <p className="mt-3 font-mincho" style={{ fontWeight: 500, color: 'var(--shu)' }}>
              AI = 愛。使える形で、わかりやすく。
            </p>
          </div>
        </div>
      </section>

      {/* ── 大切にしていること ── */}
      <section
        className="py-5 px-6"
        style={{ background: 'var(--washi-deep)' }}
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
          <h2
            className="font-mincho text-2xl"
            style={{ fontWeight: 500, color: 'var(--sumi)' }}
          >
            大切にしていること
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="box-ehon p-5 flex flex-col gap-3"
                style={{ background: 'white' }}
              >
                <span className="text-3xl">{v.emoji}</span>
                <h3 className="font-mincho" style={{ fontWeight: 500, color: 'var(--sumi)' }}>{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--sumi-light)' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── チーム ── */}
      <section className="py-5 px-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
          <h2
            className="font-mincho text-2xl"
            style={{ fontWeight: 500, color: 'var(--sumi)' }}
          >
            運営者
          </h2>
          {TEAM.map((m) => (
            <div
              key={m.name}
              className="box-ehon p-6 flex items-start gap-4"
              style={{ background: 'white' }}
            >
              <div
                className="w-16 h-16 flex items-center justify-center text-3xl shrink-0"
                style={{ background: 'var(--washi-deep)', borderRadius: '4px' }}
              >
                {m.emoji}
              </div>
              <div>
                <p className="font-mincho text-lg" style={{ fontWeight: 500, color: 'var(--sumi)' }}>{m.name}</p>
                <p className="serial mb-2" style={{ color: 'var(--shu)' }}>{m.role}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--sumi-light)' }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── お問い合わせ ── */}
      <section
        className="py-5 px-6 text-center"
        style={{ background: 'var(--washi-deep)' }}
      >
        <div className="max-w-lg mx-auto flex flex-col items-center gap-4">
          <h2
            className="font-mincho text-xl"
            style={{ fontWeight: 500, color: 'var(--sumi)' }}
          >
            お問い合わせ
          </h2>
          <p className="text-sm" style={{ color: 'var(--sumi-light)' }}>
            ご意見・ご要望・取材のお問い合わせはこちら
          </p>
          <a
            href="mailto:familyaijp@gmail.com"
            className="btn-mingei inline-block"
          >
            familyaijp@gmail.com
          </a>
        </div>
      </section>

    </main>
  );
}
