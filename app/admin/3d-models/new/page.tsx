/**
 * app/admin/3d-models/new/page.tsx
 * familyai.jp / 管理画面 — 3D モデル 新規作成
 */

import { ModelForm } from '@/components/admin/3d-models/ModelForm';

export default function NewModelPage() {
  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
          新規 3D モデル
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
          GLB ファイルとメタ情報を登録します。アップロード後、プレビューで確認できます。
        </p>
      </div>

      <ModelForm mode="create" />
    </>
  );
}
