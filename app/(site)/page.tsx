/**
 * app/(site)/page.tsx
 * familyai.jp — トップページ
 *
 * ── Coming Soon / 本番公開 スイッチ ──────────────────────────────
 * Vercel 環境変数 COMING_SOON=true  → Coming Soon ページを表示
 * Vercel 環境変数 COMING_SOON を削除 or false → 実際のホームページを表示
 *
 * ローカル（.env.local に COMING_SOON を設定しない）→ 常に実際のホームページ
 * ─────────────────────────────────────────────────────────────────
 */

import Link from 'next/link';
import { ArrowRight, BookOpen, Globe2 } from 'lucide-react';
import { HeroSection } from '@/components/home/HeroSection';
import { StatsRow }    from '@/components/home/StatsRow';
import { ComingSoon }  from '@/components/home/ComingSoon';

// ── ホーム掲載の AI ツール（/tools と整合）────────────────────
const HOME_TOOLS = [
  {
    name:    'VOA × AI ディクテーション教室',
    summary: 'VOA（Voice of America）公式素材を聴いて・書いて・声に出すディクテーション学習。疑問はその場で AI に質問できます。',
    href:    '/tools/voaenglish',
    status:  '公開中',
    Icon:    BookOpen,
  },
  {
    name:    'うごくAI教室・3D 図鑑',
    summary: '理科の 3D モデル（現在は太陽系）を回しながら観察。気になる場所をタップすると AI が詳しく教えてくれます。AR にも対応。',
    href:    '/tools/ai-kyoshitsu',
    status:  '公開中',
    Icon:    Globe2,
  },
] as const;

// ── AI ツール一覧セクション ─────────────────────────────────
function ToolsListSection() {
  return (
    <section style={{ paddingBlock: 'var(--section-py)' }}>
      <div
        className="max-w-container mx-auto"
        style={{ paddingInline: 'var(--container-px)' }}
      >
        {/* セクション見出し */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="serial mb-2" style={{ color: 'var(--sumi-soft)' }}>
              AI ツール一覧 ── TOOLS
            </p>
            <h2
              className="font-mincho"
              style={{
                fontSize:   'var(--text-title)',
                fontWeight: 500,
                color:      'var(--sumi)',
              }}
            >
              家族の学びと暮らしに
            </h2>
          </div>
          <Link
            href="/tools"
            className="font-mincho text-sm hidden sm:inline-flex items-center gap-1 transition-colors hover:text-[var(--shu)]"
            style={{ color: 'var(--sumi-light)' }}
          >
            すべて見る
            <ArrowRight strokeWidth={1.25} size={14} aria-hidden="true" />
          </Link>
        </div>

        {/* ツールカード */}
        <div className="grid gap-6 md:grid-cols-2">
          {HOME_TOOLS.map((tool, i) => {
            const Icon = tool.Icon;
            return (
              <Link key={tool.href} href={tool.href} className="group block">
                <article className="box-ehon p-6 transition-transform duration-200 hover:-translate-y-1">

                  {/* 通し番号 + ステータス */}
                  <div
                    className="flex items-baseline justify-between mb-4 pb-3"
                    style={{ borderBottom: '1px solid var(--line-soft)' }}
                  >
                    <span className="serial">№ {String(i + 1).padStart(2, '0')}</span>
                    <span className="serial" style={{ color: 'var(--shu)' }}>
                      {tool.status}
                    </span>
                  </div>

                  {/* アイコン + タイトル */}
                  <div className="flex items-start gap-3 mb-3">
                    <Icon
                      strokeWidth={1.25}
                      size={28}
                      style={{ color: 'var(--sumi-soft)' }}
                      className="shrink-0 mt-1"
                      aria-hidden="true"
                    />
                    <h3
                      className="font-mincho leading-snug group-hover:text-[var(--shu)] transition-colors"
                      style={{ fontSize: '18px', fontWeight: 500, color: 'var(--sumi)' }}
                    >
                      {tool.name}
                    </h3>
                  </div>

                  {/* 説明 */}
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--sumi-light)' }}
                  >
                    {tool.summary}
                  </p>

                  {/* CTA 行 */}
                  <div
                    className="mt-5 pt-3 flex items-center gap-2 font-mincho text-sm"
                    style={{ borderTop: '1px solid var(--line-soft)', color: 'var(--sumi-light)' }}
                  >
                    使ってみる
                    <ArrowRight
                      strokeWidth={1.25}
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        {/* モバイル用の「すべて見る」CTA */}
        <div className="text-center mt-8 sm:hidden">
          <Link href="/tools" className="btn-mingei btn-mingei-outline group">
            <span>すべてのツールを見る</span>
            <ArrowRight
              strokeWidth={1.25}
              size={14}
              className="transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── ページ本体 ────────────────────────────────────────────────
export default function HomePage() {
  // COMING_SOON=true の場合は Coming Soon ページを表示
  // 公開時は Vercel 環境変数から COMING_SOON を削除するだけでOK（コード変更不要）
  if (process.env.COMING_SOON === 'true') {
    return <ComingSoon />;
  }

  // 実際のホームページを表示
  return (
    <>
      <HeroSection />
      <StatsRow />
      <ToolsListSection />

      {/* ── クロージング sign-off（familyaidesign casual） ── */}
      <section style={{ paddingBlock: 'var(--section-py)' }}>
        <div
          className="max-w-container mx-auto"
          style={{ paddingInline: 'var(--container-px)' }}
        >
          <div className="closing-casual">
            <div className="sign">
              またお会いしましょう
              <small>· AI = 愛 ·</small>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
