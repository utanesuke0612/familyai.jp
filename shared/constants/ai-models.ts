/**
 * shared/constants/ai-models.ts
 * familyai.jp — AI教室で利用可能なモデル一覧と料金テーブル
 *
 * 管理画面のドロップダウン選択肢・コスト試算に利用される。
 * 価格は OpenRouter 経由の概算値（USD ベースで 1USD=150円換算）。
 */

/** AI教室パイプラインで利用可能なモデル ID（管理画面のドロップダウン選択肢） */
export interface AiModelOption {
  /** OpenRouter のモデル ID */
  id:           string;
  /** UI に表示する名前 */
  label:        string;
  /** 簡単な説明（運用判断用） */
  note:         string;
  /** 速度の目安（◎>○>△） */
  speed:        '◎' | '○' | '△';
  /** 1Mトークンあたりの入力コスト（円） */
  inputPriceJpy:  number;
  /** 1Mトークンあたりの出力コスト（円） */
  outputPriceJpy: number;
}

export const AI_MODEL_OPTIONS: readonly AiModelOption[] = [
  // ── Google Gemini ─────────────────────────────────────────
  {
    id:             'google/gemini-2.0-flash-001',
    label:          'Gemini 2.0 Flash',
    note:           '最速・最安。テスト・大量利用向け',
    speed:          '◎',
    inputPriceJpy:  15,
    outputPriceJpy: 60,
  },
  {
    id:             'google/gemini-2.5-flash',
    label:          'Gemini 2.5 Flash',
    note:           '2.0より高品質・少し遅い',
    speed:          '○',
    inputPriceJpy:  45,
    outputPriceJpy: 375,
  },
  // ── Anthropic Claude ──────────────────────────────────────
  {
    id:             'anthropic/claude-3.5-haiku',
    label:          'Claude Haiku 3.5',
    note:           'Anthropicの最安。長文プロンプトでスケルトン出力リスクあり',
    speed:          '○',
    inputPriceJpy:  120,
    outputPriceJpy: 600,
  },
  {
    id:             'anthropic/claude-sonnet-4',
    label:          'Claude Sonnet 4',
    note:           '最高品質・指示追従性◎。コスト高',
    speed:          '△',
    inputPriceJpy:  450,
    outputPriceJpy: 2250,
  },
  // ── Qwen / その他 ─────────────────────────────────────────
  {
    id:             'qwen/qwen3-14b',
    label:          'Qwen3 14B',
    note:           'チャット用途・低コスト',
    speed:          '○',
    inputPriceJpy:  11,
    outputPriceJpy: 30,
  },
];

/** モデル ID から AiModelOption を取得（コスト試算等で使用） */
export function findAiModel(id: string): AiModelOption | undefined {
  return AI_MODEL_OPTIONS.find((m) => m.id === id);
}

// ─── プリセット（管理画面の「プリセット切替」用） ─────────────
export interface AiConfigPreset {
  id:          string;
  label:       string;
  description: string;
  /** Partial<AiKyoshitsuConfig> を指定（型は循環参照回避のため緩く） */
  values: {
    stage1Model?:        string;
    stage2Model?:        string;
    stage1TimeoutMs?:    number;
    stage2TimeoutMs?:    number;
    stage2MaxTokens?:    number;
    stage2Temperature?:  number;
  };
}

export const AI_CONFIG_PRESETS: readonly AiConfigPreset[] = [
  // 共通方針:
  //   - Vercel 60秒制限から最低 10〜20秒の buffer を確保
  //   - Stage1 + Stage2 ≤ 50秒 を目安
  //   - 各モデルの実速度を考慮した maxTokens 上限
  {
    id:          'cheapest',
    label:       '💰 最安構成',
    description: '速度・コスト最優先（buffer 20秒・最も安定）。テスト・大量利用に。',
    values: {
      stage1Model:       'google/gemini-2.0-flash-001',
      stage2Model:       'google/gemini-2.0-flash-001',
      stage1TimeoutMs:   10_000,
      stage2TimeoutMs:   30_000,   // 合計 40秒・buffer 20秒
      stage2MaxTokens:   4_000,
      stage2Temperature: 0.5,
    },
  },
  {
    id:          'balanced',
    label:       '⚖️ バランス（推奨）',
    description: '速度・品質・コストの中間（buffer 15秒）。通常運用におすすめ。',
    values: {
      stage1Model:       'google/gemini-2.0-flash-001',
      stage2Model:       'google/gemini-2.0-flash-001',
      stage1TimeoutMs:   10_000,
      stage2TimeoutMs:   35_000,   // 合計 45秒・buffer 15秒
      stage2MaxTokens:   5_000,
      stage2Temperature: 0.5,
    },
  },
  {
    id:          'quality',
    label:       '✨ 品質重視',
    description: 'Haiku 3.5 で高品質HTML（buffer 10秒）。コスト中・速度可。',
    values: {
      stage1Model:       'google/gemini-2.0-flash-001',
      stage2Model:       'anthropic/claude-3.5-haiku',
      stage1TimeoutMs:   10_000,
      stage2TimeoutMs:   40_000,   // 合計 50秒・buffer 10秒
      stage2MaxTokens:   5_000,
      stage2Temperature: 0.5,
    },
  },
  {
    id:          'premium',
    label:       '👑 最高品質（実験的・タイムアウトリスクあり）',
    description: 'Sonnet 4 でフル実装。Vercel 60秒制限と Sonnet 4 の生成速度の関係で、テーマによりタイムアウトする場合あり。',
    values: {
      stage1Model:       'google/gemini-2.0-flash-001',
      stage2Model:       'anthropic/claude-sonnet-4',
      stage1TimeoutMs:   10_000,
      stage2TimeoutMs:   40_000,   // 合計 50秒・buffer 10秒
      stage2MaxTokens:   3_000,    // Sonnet 4 は 50tok/s なので 3000tok ≒ 60秒（ギリギリ）
      stage2Temperature: 0.5,
    },
  },
];

// ─── 値の範囲制限（zod スキーマで使用） ──────────────────────
export const AI_CONFIG_RANGES = {
  stage1TimeoutMs:   { min: 3_000,  max: 30_000  },
  stage2TimeoutMs:   { min: 10_000, max: 58_000  }, // Vercel 60秒制限を考慮
  stage2MaxTokens:   { min: 1_000,  max: 16_000  },
  stage2Temperature: { min: 0.0,    max: 1.0     },
} as const;
