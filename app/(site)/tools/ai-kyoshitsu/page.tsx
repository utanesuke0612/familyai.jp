/**
 * app/(site)/tools/ai-kyoshitsu/page.tsx
 * familyai.jp / うごくAI教室 (Rev34 Phase 1: 3D 図鑑化)
 *
 * AI 生成アニメーション機能から 3D モデル閲覧型「3D 図鑑」へ全面リプレイス。
 * Phase 1 はカタログ閲覧のみ・Phase 2 で AI 3D 生成（Tripo API）を後付け予定。
 *
 * - URL `/tools/ai-kyoshitsu` を維持（ブランド「うごくAI教室」継続）
 * - 理科のみ・4 サブカテゴリ（生物 / 化学 / 地学宇宙 / 物理）
 * - サブカテゴリと学年で絞り込み
 * - Server Component から DB 直接取得
 */

import type { Metadata } from 'next';
import Link              from 'next/link';
import { SITE }          from '@/shared';
import {
  TUTOR3D_SUBJECT_LABEL,
  TUTOR3D_SUBJECTS,
} from '@/shared';
import type { Tutor3dSubject } from '@/shared';
import { listPublishedModels } from '@/lib/repositories/3d-models';
import { ModelGallery }        from '@/components/tools/3d-tutor/ModelGallery';

export const metadata: Metadata = {
  title:       `🌐 うごくAI教室・3D図鑑 | ${SITE.name}`,
  description: '理科を 3D で学べる図鑑。太陽系を回して観察しながら、気になるパーツを AI と一緒に学べます。',
  alternates:  { canonical: `${SITE.url}/tools/ai-kyoshitsu` },
};

// ISR: カタログは 5 分で再検証（管理画面 / Phase 2 で頻繁更新を想定）
export const revalidate = 300;

type PageProps = {
  searchParams?: {
    subject?: string;
  };
};

export default async function AiKyoshitsu3DPage({ searchParams }: PageProps) {
  // Rev36 + Rev37: 一般公開（未ログイン可・admin gate 削除）。
  // 公開モデルのみカタログに表示・非公開モデルは listPublishedModels で除外される。

  // 1. クエリのバリデーション（不正値は無視・デフォルト = 絞り込みなし）
  const subject =
    TUTOR3D_SUBJECTS.includes(searchParams?.subject as Tutor3dSubject)
      ? (searchParams!.subject as Tutor3dSubject)
      : undefined;

  // 2. DB 取得（公開済み・featured 優先）
  let models: Awaited<ReturnType<typeof listPublishedModels>> = [];
  try {
    models = await listPublishedModels({ subject, limit: 50 });
  } catch (err) {
    console.error('[ai-kyoshitsu page] DB エラー:',
      err instanceof Error ? err.message : String(err));
    models = [];
  }

  // 3. クエリ文字列ヘルパー
  const buildQuery = (next: { subject?: string }): string => {
    const params = new URLSearchParams();
    if (next.subject) params.set('subject', next.subject);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  return (
    <main style={{ background: 'var(--washi)', minHeight: '100vh' }}>
      {/* ── ヘッダー（Rev40 Phase J+: /learn /tools と統一仕様）── */}
      <section
        className="px-6 py-8 sm:py-10"
        style={{ background: 'var(--washi)' }}
      >
        <div className="max-w-5xl mx-auto">
          {/* パンくず */}
          <nav
            className="flex items-center gap-2 text-xs flex-wrap mb-4"
            aria-label="パンくずリスト"
          >
            <a href="/" className="inline-flex items-center hover:opacity-70 transition-opacity" style={{ color: 'var(--sumi-light)' }}>
              ホーム
            </a>
            <span style={{ color: 'var(--sumi-light)' }} aria-hidden="true">/</span>
            <a href="/tools" className="inline-flex items-center hover:opacity-70 transition-opacity" style={{ color: 'var(--sumi-light)' }}>
              ツール
            </a>
            <span style={{ color: 'var(--sumi-light)' }} aria-hidden="true">/</span>
            <span
              className="truncate"
              style={{ color: 'var(--shu)', maxWidth: '240px' }}
              aria-current="page"
            >
              うごくAI教室・3D 図鑑
            </span>
          </nav>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:items-start">
            {/* 左カラム: タイトル + 説明（/tools と同位置） */}
            <div className="flex flex-col gap-3">
              <h1
                className="font-mincho leading-tight"
                style={{ fontSize: 'clamp(30px, 5vw, 54px)', fontWeight: 500, color: 'var(--sumi)' }}
              >
                うごく<span style={{ color: 'var(--shu)' }}>AI</span>教室・3D 図鑑
              </h1>
              <p
                className="max-w-2xl text-base leading-relaxed sm:text-lg"
                style={{ color: 'var(--sumi)' }}
              >
                理科を 3D で観察。あいちゃんと一緒に発見しよう。
              </p>
              <p
                className="max-w-2xl text-base leading-relaxed sm:text-lg"
                style={{ color: 'var(--sumi-light)' }}
              >
                回したり・拡大したり・AR でリビングに置いたり。
                気になる場所をタップすると、AI が詳しく教えてくれます。
              </p>
            </div>

            {/* 右カラム: ジャンルフィルター（/tools のカテゴリピッカーと同位置） */}
            <div
              className="box-ehon p-5 sm:p-6 flex flex-col gap-4"
              style={{ background: 'rgba(255,255,255,0.82)' }}
            >
              <p
                className="font-mincho text-sm tracking-wide"
                style={{ color: 'var(--sumi)' }}
              >
                <span className="ornament" aria-hidden="true">⁂</span>
                <span className="mx-2">ジャンルでえらぶ</span>
                <span className="ornament" aria-hidden="true">⁂</span>
              </p>
              <div style={chipRowStyle}>
                <Link href={`/tools/ai-kyoshitsu${buildQuery({ subject: undefined })}`} style={chipStyle(!subject)}>
                  すべて
                </Link>
                {TUTOR3D_SUBJECTS.map((s) => (
                  <Link key={s} href={`/tools/ai-kyoshitsu${buildQuery({ subject: s })}`} style={chipStyle(subject === s)}>
                    {TUTOR3D_SUBJECT_LABEL[s]}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ギャラリー ── */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-6xl">
          <ModelGallery models={models} />
        </div>
      </section>

      {/* ── フッターガイド ── */}
      <section className="px-6 pb-12">
        <div
          className="mx-auto max-w-3xl"
          style={{
            padding: '20px 24px',
            background: '#fff',
            borderRadius: 24,
            boxShadow: '0 4px 20px rgba(107, 79, 58, 0.06)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-brown-muted)', lineHeight: 1.7 }}>
            🚧 <strong>準備中</strong>：AI が新しい 3D モデルを作れる機能（創作モード）は Phase 2 で予定しています。
            <br />
            まずは厳選した 3D 図鑑をお楽しみください！
          </p>
        </div>
      </section>
    </main>
  );
}

// ── スタイル（Rev40 Phase I: Mingei 統一）────────────────────
// Rev40: filterLabelStyle はヘッダー右カラム統合で不要になり撤去
// （ジャンルでえらぶラベルは inline className に変更）

const chipRowStyle: React.CSSProperties = {
  display:  'flex',
  gap:      8,
  flexWrap: 'wrap',
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding:        '8px 14px',
    borderRadius:   4,
    fontSize:       13,
    fontFamily:     'var(--font-display), "Shippori Mincho", serif',
    fontWeight:     500,
    letterSpacing:  '0.04em',
    textDecoration: 'none',
    transition:     'background-color 0.2s, border-color 0.2s, color 0.2s',
    background:     active ? 'var(--shu)'        : 'var(--washi-light)',
    color:          active ? 'var(--washi)'      : 'var(--sumi)',
    border:         `1px solid ${active ? 'var(--shu)' : 'var(--line)'}`,
    minHeight:      36,
    display:        'inline-flex',
    alignItems:     'center',
  };
}
