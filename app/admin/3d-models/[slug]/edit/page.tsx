/**
 * app/admin/3d-models/[slug]/edit/page.tsx
 * familyai.jp / 管理画面 — 3D モデル 編集
 */

import { notFound } from 'next/navigation';
import Link         from 'next/link';
import { getModelBySlugForAdmin } from '@/lib/repositories/3d-models';
import { ModelForm } from '@/components/admin/3d-models/ModelForm';

export const dynamic = 'force-dynamic';

interface Ctx { params: { slug: string }; }

export default async function EditModelPage({ params }: Ctx) {
  const model = await getModelBySlugForAdmin(params.slug);
  if (!model) notFound();

  return (
    <>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
            ✏️ {model.title} を編集
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            slug: <code style={{ fontFamily: 'monospace' }}>{model.slug}</code>
            （slug は変更できません）
          </p>
        </div>
        <Link
          href={`/admin/3d-models/${model.slug}/preview`}
          style={{
            padding: '8px 16px',
            background: '#fff',
            color: '#374151',
            border: '1px solid #D1D5DB',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          👁 プレビュー
        </Link>
      </div>

      <ModelForm
        mode="edit"
        originalSlug={model.slug}
        initial={{
          slug:         model.slug,
          title:        model.title,
          description:  model.description,
          subject:      model.subject,
          grade:        model.grade,
          glbUrl:       model.glbUrl,
          usdzUrl:      model.usdzUrl,
          thumbnailUrl: model.thumbnailUrl,
          hotspots:     model.hotspots,
          attribution:  model.attribution,
          license:      model.license,
          sourceUrl:    model.sourceUrl,
          published:    model.published,
          isFeatured:   model.isFeatured,
        }}
      />
    </>
  );
}
