/**
 * app/admin/ai-config/page.tsx
 * familyai.jp — AI機能 統合設定の管理画面（Server Component）
 *
 * ここで設定したモデル・パラメータは、以下の全AI機能で共通使用される:
 *   1. AI チャット（記事・HTMLページの右下サイドバー）
 *   2. AI Echo（VOA 英語レッスンの英文添削）
 *   3. AI 3D 先生（うごくAI教室のホットスポット解説）
 *
 * /admin レイアウトで管理者認証は完了している前提。
 */

import type { Metadata } from 'next';
import { getAiChatConfig } from '@/lib/config/ai-config';
import {
  getAiConfigFromDb,
  getAiConfigHistory,
} from '@/lib/repositories/ai-config';
import type { AiConfigHistoryRow } from '@/lib/db/schema';
import { AiConfigForm }  from './AiConfigForm';

export const metadata: Metadata = {
  title: 'AI機能 統合設定 | familyai.jp 管理画面',
};

export const dynamic = 'force-dynamic';   // 毎回最新を取得（履歴・現在値の鮮度優先）

export default async function AdminAiConfigPage() {
  // DB / env / DEFAULTS の3層を全部取得して画面に渡す
  const [effective, dbPartial, history] = await Promise.all([
    getAiChatConfig(),
    getAiConfigFromDb(),
    getAiConfigHistory(10),
  ]);

  // 履歴をシリアライズ可能な形に整形
  const serializableHistory = history.map((h: AiConfigHistoryRow) => ({
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
          AI機能 統合設定
        </h1>
        <p style={{ marginTop: 8, color: '#6B7280', fontSize: 14, lineHeight: 1.6 }}>
          ここでの設定は<strong>AI チャット・AI Echo・AI 3D 先生</strong>の3機能で共通使用されます。
          モデル・応答の長さ・創造性を一元管理できます。
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
