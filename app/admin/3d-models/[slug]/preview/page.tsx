/**
 * app/admin/3d-models/[slug]/preview/page.tsx
 * familyai.jp / 管理画面 — 3D モデル プレビュー
 *
 * 公開ページ `/tools/ai-kyoshitsu/[slug]` と完全に同じ表示。
 * 違い:
 *   - 非公開（published=false）モデルでも閲覧可能
 *   - 上部に「🚧 プレビュー中」バナー表示
 *   - ビューカウント加算なし
 *   - admin layout（AdminNav）の中で動作
 */

import type { Metadata }     from 'next';
import Link                  from 'next/link';
import { notFound }          from 'next/navigation';
import { SITE }              from '@/shared';
import {
  TUTOR3D_SUBJECT_LABEL,
  TUTOR3D_GRADE_LABEL,
} from '@/shared';
import { getModelBySlugForAdmin } from '@/lib/repositories/3d-models';
import { ModelDetailClient }      from '@/components/tools/3d-tutor/ModelDetailClient';

export const dynamic = 'force-dynamic';  // 非公開含めて最新状態を常に取得

export const metadata: Metadata = {
  title:  `プレビュー | ${SITE.name} 管理画面`,
  robots: 'noindex, nofollow',
};

interface Ctx { params: { slug: string }; }

export default async function ModelPreviewPage({ params }: Ctx) {
  const model = await getModelBySlugForAdmin(params.slug);
  if (!model) notFound();

  return (
    <main>
      {/* ── プレビューバナー ────────────────────────────────── */}
      <div
        role="status"
        style={{
          background: model.published ? '#DBEAFE' : '#FEF3C7',
          border:     `1px solid ${model.published ? '#93C5FD' : '#FDE68A'}`,
          padding: '12px 16px',
          borderRadius: 12,
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 14 }}>
          <strong style={{ color: model.published ? '#1E40AF' : '#92400E' }}>
            {model.published ? '🔵 公開中モデルのプレビュー' : '🚧 非公開モデルのプレビュー（一般ユーザーには見えません）'}
          </strong>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            この画面はビューカウントを増やしません。公開ページと同じ表示で動作確認できます。
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link
            href={`/admin/3d-models/${model.slug}/edit`}
            style={{ padding: '6px 12px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            ✏️ 編集に戻る
          </Link>
          <Link
            href="/admin/3d-models"
            style={{ padding: '6px 12px', background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            一覧に戻る
          </Link>
        </div>
      </div>

      {/* ── 公開ページ相当のレイアウト ────────────────────────── */}
      <div style={{ background: 'var(--color-cream, #FDF6ED)', borderRadius: 16, padding: 16 }}>
        {/* タイトル */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ padding: '4px 12px', borderRadius: 999, background: '#FFEBD8', color: '#6B4F3A', fontSize: 12, fontWeight: 600 }}>
              {TUTOR3D_SUBJECT_LABEL[model.subject]}
            </span>
            <span style={{ padding: '4px 12px', borderRadius: 999, background: '#FDF6ED', color: '#A48B72', fontSize: 12 }}>
              {TUTOR3D_GRADE_LABEL[model.grade]}
            </span>
            {model.isFeatured && (
              <span style={{ padding: '4px 12px', borderRadius: 999, background: '#F39C5F', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                ⭐ おすすめ
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 3vw + 10px, 32px)', color: '#6B4F3A', margin: 0, fontWeight: 700 }}>
            🔬 {model.title}
          </h1>
          {model.description && (
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#8B7355', lineHeight: 1.7 }}>
              {model.description}
            </p>
          )}
        </div>

        {/* 公開ページと同じ ModelDetailClient（2 カラム + AI チャット） */}
        <ModelDetailClient model={model} />

        {/* 出典・ライセンス */}
        {(model.attribution || model.license || model.sourceUrl) && (
          <div style={{ marginTop: 16, padding: '14px 18px', background: '#fff', borderRadius: 16, fontSize: 12, color: '#A48B72', lineHeight: 1.6 }}>
            <strong style={{ color: '#6B4F3A' }}>📜 出典 / ライセンス</strong>
            {model.attribution && <div style={{ marginTop: 4 }}>{model.attribution}</div>}
            {model.license      && <div>ライセンス: {model.license}</div>}
            {model.sourceUrl    && (
              <div>
                出典元:{' '}
                <a href={model.sourceUrl} target="_blank" rel="noreferrer noopener" style={{ color: '#F39C5F' }}>
                  {model.sourceUrl}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
