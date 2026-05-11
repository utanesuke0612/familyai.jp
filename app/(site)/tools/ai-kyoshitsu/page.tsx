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
  description: '理科を 3D で学べる図鑑。太陽系・DNA・振り子など、回して観察しながら AI と一緒に学べます。',
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
    <main style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      {/* ── ヘッダー ── */}
      <section
        className="px-6 py-8 sm:py-10"
        style={{ background: 'linear-gradient(160deg, var(--color-peach-light) 0%, var(--color-cream) 80%)' }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3 mb-3">
            <span style={{ fontSize: 36 }} aria-hidden>🌐</span>
            <div>
              <h1
                className="font-display font-bold"
                style={{ fontSize: 'clamp(22px, 3vw + 12px, 32px)', color: 'var(--color-brown)', margin: 0 }}
              >
                うごくAI教室・3D 図鑑
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-brown-light)' }}>
                理科を 3D で観察 ✨ あいちゃんと一緒に発見しよう
              </p>
            </div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--color-brown-muted)', lineHeight: 1.6 }}>
            回したり・拡大したり・AR でリビングに置いたり。
            気になる場所をタップすると、AI が詳しく教えてくれます。
          </p>
        </div>
      </section>

      {/* ── 絞り込み（サブカテゴリのみ・学年は Phase 2 で再検討） ── */}
      <section className="px-6 py-6">
        <div className="mx-auto max-w-6xl">
          <h2 style={filterLabelStyle}>🧪 ジャンルでえらぶ</h2>
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

// ── スタイル ────────────────────────────────────────────────
const filterLabelStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--color-brown)',
};

const chipRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'all 0.15s',
    background: active ? 'var(--color-orange, #F39C5F)' : '#fff',
    color:      active ? '#fff' : 'var(--color-brown, #6B4F3A)',
    border:     active ? '2px solid var(--color-orange, #F39C5F)' : '2px solid var(--color-beige-dark, #D9C7A8)',
    minHeight: 36,
    display: 'inline-flex',
    alignItems: 'center',
  };
}
