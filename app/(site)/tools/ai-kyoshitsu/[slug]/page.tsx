/**
 * app/(site)/tools/ai-kyoshitsu/[slug]/page.tsx
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1)
 *
 * 個別 3D モデル詳細ページ（Server Component）。
 * - DB から model を取得（getPublishedModelBySlugCached）
 * - 非公開（published=false）なら 404
 * - <model-viewer> ベースの ModelDetailClient に model を渡す
 * - ホットスポットタップ → 既定説明 → AI 深掘り（既存 /api/ai）
 *
 * SEO: OGP メタを設定（X 共有時のプレビューに使用）。
 */

import type { Metadata } from 'next';
import Link              from 'next/link';
import { notFound }      from 'next/navigation';
import { SITE }          from '@/shared';
import {
  TUTOR3D_SUBJECT_LABEL,
  TUTOR3D_GRADE_LABEL,
} from '@/shared';
import {
  getPublishedModelBySlugCached,
  incrementViewCount,
} from '@/lib/repositories/3d-models';
import { ModelDetailClient } from '@/components/tools/3d-tutor/ModelDetailClient';

// ISR: モデル本体は変動少ないので 10 分キャッシュ
export const revalidate = 600;

type PageProps = {
  params: { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  let model;
  try {
    model = await getPublishedModelBySlugCached(params.slug);
  } catch {
    model = null;
  }
  if (!model) {
    return {
      title:       `見つかりませんでした | ${SITE.name}`,
      description: '指定された 3D モデルは見つかりませんでした。',
      robots:      'noindex, nofollow',
    };
  }

  const title = `${model.title} | うごくAI教室・3D 図鑑`;
  const desc  = model.description || `${TUTOR3D_SUBJECT_LABEL[model.subject]} の 3D モデルを観察しよう。AI と一緒に発見できる教育コンテンツ。`;

  return {
    title,
    description: desc,
    alternates:  { canonical: `${SITE.url}/tools/ai-kyoshitsu/${model.slug}` },
    openGraph: {
      title,
      description: desc,
      type:        'article',
      url:         `${SITE.url}/tools/ai-kyoshitsu/${model.slug}`,
      siteName:    SITE.name,
      locale:      'ja_JP',
      ...(model.thumbnailUrl ? { images: [{ url: model.thumbnailUrl }] } : {}),
    },
    twitter: {
      card:        'summary_large_image',
      site:        SITE.twitterHandle,
      title,
      description: desc,
    },
  };
}

export default async function ModelDetailPage({ params }: PageProps) {
  // Rev36 + Rev37: 一般公開（admin gate 削除）。
  // getPublishedModelBySlugCached は published=true 限定で取得するため、
  // 非公開モデルへの直 URL アクセスは下の notFound() で 404 になる。

  // 1. DB 取得
  const model = await getPublishedModelBySlugCached(params.slug);
  if (!model) notFound();

  // 2. ビューカウント加算（fire-and-forget）
  void incrementViewCount(params.slug);

  // 3. UI
  return (
    <main style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      {/* パンくず + 戻る */}
      <section
        className="px-6 py-4"
        style={{ background: 'linear-gradient(160deg, var(--color-peach-light) 0%, var(--color-cream) 80%)' }}
      >
        <div className="mx-auto max-w-5xl">
          <nav style={{ fontSize: 13, color: 'var(--color-brown-muted)' }} aria-label="パンくず">
            <Link href="/tools" style={{ color: 'inherit' }}>AIツール</Link>
            <span style={{ margin: '0 6px' }}>›</span>
            <Link href="/tools/ai-kyoshitsu" style={{ color: 'inherit' }}>3D 図鑑</Link>
            <span style={{ margin: '0 6px' }}>›</span>
            <span style={{ color: 'var(--color-brown)', fontWeight: 700 }}>{model.title}</span>
          </nav>
        </div>
      </section>

      {/* タイトル */}
      <section className="px-6 pt-4 pb-2">
        <div className="mx-auto max-w-5xl">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={badgeStyle('var(--color-peach-light)', 'var(--color-brown)')}>
              {TUTOR3D_SUBJECT_LABEL[model.subject]}
            </span>
            <span style={badgeStyle('var(--color-cream)', 'var(--color-brown-muted)')}>
              {TUTOR3D_GRADE_LABEL[model.grade]}
            </span>
            {model.isFeatured && (
              <span style={badgeStyle('var(--color-orange, #F39C5F)', '#fff', 700)}>
                ⭐ おすすめ
              </span>
            )}
          </div>
          <h1
            className="font-display font-bold"
            style={{
              margin: 0,
              fontSize: 'clamp(22px, 3vw + 10px, 32px)',
              color: 'var(--color-brown)',
              lineHeight: 1.3,
            }}
          >
            🔬 {model.title}
          </h1>
          {model.description && (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 14,
                color: 'var(--color-brown-light)',
                lineHeight: 1.7,
              }}
            >
              {model.description}
            </p>
          )}
        </div>
      </section>

      {/* 3D ビューア + AI チャットサイドバー（Lesson と同じ 2 カラム）*/}
      <section className="px-4 sm:px-6 py-4">
        <div className="mx-auto max-w-6xl">
          <ModelDetailClient model={model} />
        </div>
      </section>

      {/* 出典・ライセンス */}
      {(model.attribution || model.license || model.sourceUrl) && (
        <section className="px-6 py-4">
          <div
            className="mx-auto max-w-5xl"
            style={{
              padding: '14px 18px',
              background: '#fff',
              borderRadius: 16,
              fontSize: 12,
              color: 'var(--color-brown-muted)',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: 'var(--color-brown)' }}>📜 出典 / ライセンス</strong>
            {model.attribution && <div style={{ marginTop: 4 }}>{model.attribution}</div>}
            {model.license      && <div>ライセンス: {model.license}</div>}
            {model.sourceUrl    && (
              <div>
                出典元:{' '}
                <a href={model.sourceUrl} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--color-orange, #F39C5F)' }}>
                  {model.sourceUrl}
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 戻る CTA */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-5xl text-center">
          <Link
            href="/tools/ai-kyoshitsu"
            className="inline-flex items-center rounded-full px-6 py-3 text-sm font-bold transition-all hover:-translate-y-0.5"
            style={{
              background: '#fff',
              color: 'var(--color-brown)',
              border: '2px solid var(--color-beige-dark)',
              textDecoration: 'none',
            }}
          >
            ← 他の 3D モデルを見る
          </Link>
        </div>
      </section>
    </main>
  );
}

// ── スタイルヘルパー ────────────────────────────────────────
function badgeStyle(bg: string, color: string, weight = 600): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 999,
    background: bg,
    color,
    fontSize: 12,
    fontWeight: weight,
  };
}
