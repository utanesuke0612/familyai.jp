/**
 * app/admin/ai-config/page.tsx
 * familyai.jp — AI教室パイプライン設定の管理画面（Server Component）
 *
 * /admin レイアウトで管理者認証は完了している前提。
 */

import type { Metadata } from 'next';
import { getAiConfig }   from '@/lib/config/ai-config';
import {
  getAiConfigFromDb,
  getAiConfigHistory,
} from '@/lib/repositories/ai-config';
import { AiConfigForm }  from './AiConfigForm';

export const metadata: Metadata = {
  title: 'AI設定 | familyai.jp 管理画面',
};

export const dynamic = 'force-dynamic';   // 毎回最新を取得（履歴・現在値の鮮度優先）

export default async function AdminAiConfigPage() {
  // DB / env / DEFAULTS の3層を全部取得して画面に渡す
  const [effective, dbPartial, history] = await Promise.all([
    getAiConfig(),
    getAiConfigFromDb(),
    getAiConfigHistory(10),
  ]);

  // 履歴をシリアライズ可能な形に整形
  const serializableHistory = history.map((h) => ({
    id:         h.id,
    config:     h.config as Record<string, unknown>,
    changedAt:  h.changedAt instanceof Date ? h.changedAt.toISOString() : String(h.changedAt),
    changedBy:  h.changedBy ?? '',
    changeNote: h.changeNote ?? '',
  }));

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F2937' }}>
          🛠️ AI教室パイプライン設定
        </h1>
        <p style={{ marginTop: 8, color: '#6B7280', fontSize: 14, lineHeight: 1.6 }}>
          Stage1 / Stage2 のモデル・タイムアウト・出力サイズを管理できます。
          保存すると即時反映（DBキャッシュ60秒・PUT 時に無効化）。
          設定の優先順位は <code>コード DEFAULTS &lt; DB &lt; env</code>。
        </p>
      </div>

      <AiConfigForm
        effective={effective}
        dbPartial={dbPartial}
        history={serializableHistory}
      />
    </div>
  );
}
