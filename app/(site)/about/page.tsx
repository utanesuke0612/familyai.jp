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
    <main style={{ background: 'var(--color-cream)' }}>

      {/* ── ヒーロー ── */}
      <section
        className="py-6 px-6 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, var(--color-beige) 0%, var(--color-cream) 100%)' }}
      >
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, var(--color-peach-light), transparent)', transform: 'translate(30%, -30%)' }}
          />
        </div>
        <div className="relative max-w-2xl mx-auto flex flex-col items-center gap-6">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background: 'var(--color-orange)', boxShadow: 'var(--shadow-orange)' }}
          >
            🏠
          </div>
          <div>
            <h1
              className="font-display font-bold mb-3"
              style={{ fontSize: 'clamp(28px, 5vw, 48px)', color: 'var(--color-brown)' }}
            >
              familyai.jp について
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
              「AI = 愛」— テクノロジーを人の役に立つ形で届ける日本語メディア
            </p>
          </div>
        </div>
      </section>

      {/* ── ミッション ── */}
      <section className="py-5 px-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <h2
            className="font-display font-bold text-2xl"
            style={{ color: 'var(--color-brown)' }}
          >
            私たちのミッション
          </h2>
          <div
            className="rounded-2xl p-6 leading-relaxed text-base"
            style={{
              background:   'white',
              borderLeft:   '4px solid var(--color-orange)',
              color:        'var(--color-brown)',
              boxShadow:    'var(--shadow-warm-sm)',
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
            <p className="mt-3 font-bold" style={{ color: 'var(--color-orange)' }}>
              AI = 愛。使える形で、わかりやすく。
            </p>
          </div>
        </div>
      </section>

      {/* ── 大切にしていること ── */}
      <section
        className="py-5 px-6"
        style={{ background: 'var(--color-beige)' }}
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
          <h2
            className="font-display font-bold text-2xl"
            style={{ color: 'var(--color-brown)' }}
          >
            大切にしていること
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: 'white', boxShadow: 'var(--shadow-warm-sm)' }}
              >
                <span className="text-3xl">{v.emoji}</span>
                <h3 className="font-bold" style={{ color: 'var(--color-brown)' }}>{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── チーム ── */}
      <section className="py-5 px-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
          <h2
            className="font-display font-bold text-2xl"
            style={{ color: 'var(--color-brown)' }}
          >
            運営者
          </h2>
          {TEAM.map((m) => (
            <div
              key={m.name}
              className="rounded-2xl p-6 flex items-start gap-4"
              style={{ background: 'white', boxShadow: 'var(--shadow-warm-sm)' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ background: 'var(--color-beige)' }}
              >
                {m.emoji}
              </div>
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--color-brown)' }}>{m.name}</p>
                <p className="text-sm mb-2" style={{ color: 'var(--color-orange)' }}>{m.role}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── お問い合わせ ── */}
      <section
        className="py-5 px-6 text-center"
        style={{ background: 'var(--color-beige)' }}
      >
        <div className="max-w-lg mx-auto flex flex-col items-center gap-4">
          <span className="text-4xl">✉️</span>
          <h2
            className="font-display font-bold text-xl"
            style={{ color: 'var(--color-brown)' }}
          >
            お問い合わせ
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
            ご意見・ご要望・取材のお問い合わせはこちら
          </p>
          <a
            href="mailto:familyaijp@gmail.com"
            className="btn-primary inline-block"
          >
            familyaijp@gmail.com
          </a>
        </div>
      </section>

    </main>
  );
}
