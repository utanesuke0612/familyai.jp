/**
 * app/(site)/tools/page.tsx
 * familyai.jp — AIツールページ
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Globe2, Home, Briefcase, Palette } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CATEGORY_LABEL, SITE } from '@/shared';
import type { ContentCategory } from '@/shared';

const CATEGORY_ICON: Record<ContentCategory, LucideIcon> = {
  education: BookOpen,
  lifestyle: Home,
  work:      Briefcase,
  creative:  Palette,
};
import { isAdmin } from '@/lib/admin-auth';

export const metadata: Metadata = {
  title:       `AIツール | ${SITE.name}`,
  description: 'カテゴリー別に使えるAIツールをまとめています。',
  alternates:  { canonical: `${SITE.url}/tools` },
};

type ToolItem = {
  name: string;
  summary: string;
  href: string;
  status: string;
  cta: string;
  accent: string;
  Icon?: LucideIcon;
  /**
   * Rev33: true ならログイン中の管理者（ADMIN_EMAIL 一致）にのみ表示する。
   * 当面は機能の出来栄えや収益化が固まっていないツールを段階公開するため。
   */
  adminOnly?: boolean;
};

const TOOLS_BY_CATEGORY: Array<{
  category: ContentCategory;
  lead: string;
  tools: ToolItem[];
}> = [
  {
    category: 'education',
    lead: '学習の習慣化、英語、宿題サポートに使えるツールです。',
    tools: [
      {
        name: 'VOA × AI ディクテーション教室',
        summary: 'VOA（Voice of America）公式素材を聴いて・書いて・声に出すディクテーション学習。疑問はその場で AI に質問できます。',
        href: '/tools/voaenglish',
        status: '公開中',
        cta: '使ってみる',
        accent: 'var(--color-mint)',
        Icon: BookOpen,
      },
      {
        // Rev36: AI生成アニメから 3D 図鑑へ全面リプレイス。
        // URL `/tools/ai-kyoshitsu` を維持しブランド「うごくAI教室」継続。
        // Rev37: 一般公開（adminOnly 削除）— 未ログインユーザーも利用可。
        name: 'うごくAI教室・3D 図鑑',
        summary: '理科の 3D モデル（現在は太陽系）を回しながら観察。気になる場所をタップすると AI が詳しく教えてくれます。AR にも対応。',
        href: '/tools/ai-kyoshitsu',
        status: '公開中',
        cta: '見てみる',
        accent: 'var(--color-mint)',
        Icon: Globe2,
      },
    ],
  },
];

// Rev40: カテゴリピッカーの背景色を washi-deep で統一（多色を撤廃）
const CATEGORY_BG: Record<ContentCategory, string> = {
  education: 'var(--washi-deep)',
  lifestyle: 'var(--washi-deep)',
  work:      'var(--washi-deep)',
  creative:  'var(--washi-deep)',
};

type ToolsPageProps = {
  searchParams?: {
    cat?: string;
  };
};

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  const selectedCategory = TOOLS_BY_CATEGORY.some(({ category }) => category === searchParams?.cat)
    ? (searchParams?.cat as ContentCategory)
    : null;

  // Rev33: adminOnly のツールは管理者のみに表示
  const showAdminOnly = await isAdmin();
  const visibleSectionsRaw = selectedCategory
    ? TOOLS_BY_CATEGORY.filter(({ category }) => category === selectedCategory)
    : TOOLS_BY_CATEGORY;
  const visibleSections = visibleSectionsRaw
    .map(({ category, lead, tools }) => ({
      category,
      lead,
      tools: tools.filter((t) => showAdminOnly || !t.adminOnly),
    }))
    .filter(({ tools }) => tools.length > 0);

  return (
    <main style={{ background: 'var(--washi)' }}>
      <section
        className="px-6 py-8 sm:py-10"
        style={{ background: 'var(--washi)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:items-start">
            <div className="flex flex-col gap-3">
              <h1
                className="font-mincho leading-tight"
                style={{ fontSize: 'clamp(30px, 5vw, 54px)', fontWeight: 500, color: 'var(--sumi)' }}
              >
                家族の学びと暮らしを
                <br />
                <span style={{ color: 'var(--shu)' }}>AI</span> で応援
              </h1>
              <p
                className="max-w-2xl text-base leading-relaxed sm:text-lg"
                style={{ color: 'var(--sumi-light)' }}
              >
                英語学習・教育コンテンツ生成など、家族みんなで使える AI ツールを公開中。
                お子さまの学習サポートから大人の学び直しまで、親子で一緒にお使いいただけます。
              </p>
            </div>

            <div
              className="box-ehon p-5 sm:p-6 flex flex-col gap-4"
              style={{
                background: 'rgba(255,255,255,0.82)',
              }}
            >
              {/* Rev40 Phase H: /learn の CategoryFilter と同じ「⁂ 分類で絞り込む ⁂」ラベル（左寄せ）*/}
              <p
                className="font-mincho text-sm tracking-wide"
                style={{ color: 'var(--sumi)' }}
              >
                <span className="ornament" aria-hidden="true">⁂</span>
                <span className="mx-2">分類で絞り込む</span>
                <span className="ornament" aria-hidden="true">⁂</span>
              </p>

              {/* /learn の CategoryFilter と同じカード形状（4px 角丸 + 罫線・選択時は朱色枠） */}
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(CATEGORY_BG) as ContentCategory[]).map((category) => {
                  const isActive = selectedCategory === category;
                  const hasSelection = !!selectedCategory;
                  return (
                    <Link
                      key={category}
                      href={isActive ? '/tools' : `/tools?cat=${category}`}
                      className="px-4 py-4 text-center transition-[transform,opacity,border-color,color] duration-200 hover:-translate-y-0.5"
                      style={{
                        background:   CATEGORY_BG[category],
                        border:       `1px solid ${isActive ? 'var(--shu)' : 'var(--line)'}`,
                        borderRadius: '4px',
                        opacity:      hasSelection && !isActive ? 0.55 : 1,
                      }}
                      aria-pressed={isActive}
                    >
                      {(() => { const Icon = CATEGORY_ICON[category]; return <Icon size={28} strokeWidth={1.25} aria-hidden="true" />; })()}
                      <div
                        className="mt-2 font-mincho text-sm"
                        style={{
                          color:      isActive ? 'var(--shu)' : 'var(--sumi)',
                          fontWeight: 500,
                        }}
                      >
                        {CATEGORY_LABEL[category]}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
          {visibleSections.flatMap(({ category, tools }) =>
            tools.map((tool, i) => {
              const isReady = tool.status === '公開中';
              const Icon = tool.Icon;
              const card = (
                <article className="box-ehon p-6 group transition-transform duration-200 hover:-translate-y-1">
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
                    {Icon ? (
                      <Icon
                        strokeWidth={1.25}
                        size={28}
                        style={{ color: 'var(--sumi-soft)' }}
                        className="shrink-0 mt-1"
                        aria-hidden="true"
                      />
                    ) : null}
                    <h2
                      className="font-mincho leading-snug group-hover:text-[var(--shu)] transition-colors"
                      style={{ fontSize: '18px', fontWeight: 500, color: 'var(--sumi)' }}
                    >
                      {tool.name}
                    </h2>
                  </div>

                  {/* カテゴリーラベル */}
                  <p className="serial mb-2" style={{ color: 'var(--sumi-soft)' }}>
                    {CATEGORY_LABEL[category]}
                  </p>

                  {/* 説明 */}
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--sumi-light)' }}>
                    {tool.summary}
                  </p>

                  {/* CTA 行 */}
                  <div
                    className="mt-5 pt-3 flex items-center gap-2 font-mincho text-sm"
                    style={{ borderTop: '1px solid var(--line-soft)', color: 'var(--sumi-light)' }}
                  >
                    {tool.cta}
                    {isReady ? (
                      <ArrowRight
                        strokeWidth={1.25}
                        size={14}
                        className="transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                </article>
              );

              if (isReady) {
                return (
                  <Link key={`${category}-${tool.name}`} href={tool.href} className="block">
                    {card}
                  </Link>
                );
              }

              return (
                <div key={`${category}-${tool.name}`} aria-disabled="true">
                  {card}
                </div>
              );
            }),
          )}
        </div>

        {selectedCategory ? (
          <div className="mx-auto mt-6 max-w-5xl">
            <Link
              href="/tools"
              className="btn-mingei btn-mingei-outline inline-flex items-center gap-2"
            >
              <ArrowRight strokeWidth={1.25} size={14} aria-hidden="true" style={{ transform: 'rotate(180deg)' }} />
              <span>すべてのカテゴリーを表示</span>
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
