/**
 * shared/constants/ai-models.ts
 * familyai.jp — AI教室で利用可能なモデル一覧と料金テーブル
 *
 * 管理画面のドロップダウン選択肢・コスト試算に利用される。
 * 価格は OpenRouter 経由の概算値（USD ベースで 1USD=150円換算）。
 */

/** AI 呼び出し経路（プロバイダー）。Rev32 で導入。 */
export type AiProvider = 'openrouter' | 'deepseek' | 'qwen';

/** AI教室パイプラインで利用可能なモデル ID（管理画面のドロップダウン選択肢） */
export interface AiModelOption {
  /**
   * 内部 ID（ユニーク・DB に保存される）。
   * - OpenRouter 経由: `<vendor>/<model>` 形式（例: `google/gemini-2.0-flash-001`）
   * - 直 API: `<provider>:<model>` 形式（例: `deepseek:deepseek-chat`）
   */
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
  /**
   * Rev32: モデルを呼び出すプロバイダー。
   * `openrouter` 以外を選ぶと、各プロバイダーの公式 API を直接叩く。
   */
  provider:     AiProvider;
  /**
   * Rev32: プロバイダー直 API に渡すモデル名。
   * 省略時は `id` がそのまま使われる（OpenRouter は `vendor/model` を渡す前提なので省略可能）。
   * 例: `provider='deepseek'`、`id='deepseek:deepseek-chat'`、`nativeId='deepseek-chat'`
   */
  nativeId?:    string;
}

export const AI_MODEL_OPTIONS: readonly AiModelOption[] = [
  // ════════════════════════════════════════════════════════════
  // OpenRouter 経由（既存・5モデル）
  // ════════════════════════════════════════════════════════════
  // ── Google Gemini ─────────────────────────────────────────
  {
    id:             'google/gemini-2.0-flash-001',
    label:          'Gemini 2.0 Flash',
    note:           '最速・最安。テスト・大量利用向け',
    speed:          '◎',
    inputPriceJpy:  15,
    outputPriceJpy: 60,
    provider:       'openrouter',
  },
  {
    id:             'google/gemini-2.5-flash',
    label:          'Gemini 2.5 Flash',
    note:           '2.0より高品質・少し遅い',
    speed:          '○',
    inputPriceJpy:  45,
    outputPriceJpy: 375,
    provider:       'openrouter',
  },
  // ── Anthropic Claude ──────────────────────────────────────
  {
    id:             'anthropic/claude-3.5-haiku',
    label:          'Claude Haiku 3.5',
    note:           'Anthropicの最安。長文プロンプトでスケルトン出力リスクあり',
    speed:          '○',
    inputPriceJpy:  120,
    outputPriceJpy: 600,
    provider:       'openrouter',
  },
  {
    id:             'anthropic/claude-sonnet-4',
    label:          'Claude Sonnet 4',
    note:           '最高品質・指示追従性◎。コスト高',
    speed:          '△',
    inputPriceJpy:  450,
    outputPriceJpy: 2250,
    provider:       'openrouter',
  },
  // ── Qwen（OpenRouter 経由） ─────────────────────────────
  {
    id:             'qwen/qwen3-14b',
    label:          'Qwen3 14B (OpenRouter)',
    note:           'チャット用途・低コスト・OpenRouter 経由',
    speed:          '○',
    inputPriceJpy:  11,
    outputPriceJpy: 30,
    provider:       'openrouter',
  },

  // ════════════════════════════════════════════════════════════
  // Rev32: DeepSeek 公式 API 直接呼び出し（要 DEEPSEEK_API_KEY）
  // 価格: USD ベース、1USD≒150円換算（2026/05 時点・料金改定で変動あり）
  // ════════════════════════════════════════════════════════════
  {
    id:             'deepseek:deepseek-chat',
    label:          'DeepSeek-V3 Chat (公式)',
    note:           '公式直 API・OpenRouter マージン無し・コスト最安級',
    speed:          '○',
    // V3: $0.27/M (input) → ¥40.5、$1.10/M (output) → ¥165
    inputPriceJpy:  41,
    outputPriceJpy: 165,
    provider:       'deepseek',
    nativeId:       'deepseek-chat',
  },
  {
    id:             'deepseek:deepseek-reasoner',
    label:          'DeepSeek-R1 Reasoner (公式)',
    note:           '推論特化・Stage1 のような構造化 JSON 設計に強い・遅い',
    speed:          '△',
    // R1: $0.55/M (input) → ¥83、$2.19/M (output) → ¥329
    inputPriceJpy:  83,
    outputPriceJpy: 329,
    provider:       'deepseek',
    nativeId:       'deepseek-reasoner',
  },

  // ════════════════════════════════════════════════════════════
  // Rev32: Qwen (Alibaba DashScope) 公式 API 直接呼び出し
  // 要 DASHSCOPE_API_KEY。OpenAI 互換モード（compatible-mode/v1）使用。
  // 国際版 endpoint: dashscope-intl.aliyuncs.com（DASHSCOPE_BASE_URL で上書き可）
  // ════════════════════════════════════════════════════════════
  {
    id:             'qwen:qwen-turbo',
    label:          'Qwen-Turbo (公式)',
    note:           'Alibaba 公式・最速・最安。チャット・短文向け',
    speed:          '◎',
    // qwen-turbo: input ¥0.3/M、output ¥0.6/M (DashScope 公式・人民元換算)
    inputPriceJpy:  6,
    outputPriceJpy: 12,
    provider:       'qwen',
    nativeId:       'qwen-turbo',
  },
  {
    id:             'qwen:qwen-plus',
    label:          'Qwen-Plus (公式)',
    note:           'Alibaba 公式・バランス型・コスパ良好。Stage2 推奨',
    speed:          '○',
    inputPriceJpy:  17,
    outputPriceJpy: 50,
    provider:       'qwen',
    nativeId:       'qwen-plus',
  },
  {
    id:             'qwen:qwen-max',
    label:          'Qwen-Max (公式)',
    note:           'Alibaba 公式・最高品質・コスト高',
    speed:          '△',
    inputPriceJpy:  240,
    outputPriceJpy: 960,
    provider:       'qwen',
    nativeId:       'qwen-max',
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
  //   - Vercel 60秒制限から最低 8〜20秒の buffer を確保
  //   - Stage1 + Stage2 ≤ 52秒 を目安
  //   - 各モデルの実速度を考慮した maxTokens 上限
  //
  // ⚠️ Gemini 2.0 Flash は OpenRouter 共有プールの 429 / 上流タイムアウトが
  //    発生しやすい（is_byok=false の場合）。本番運用では「安定運用」推奨。
  {
    id:          'stable',
    label:       '🛡️ 安定運用（推奨）',
    description: 'Anthropic Haiku 3.5 を全Stageで利用（buffer 8秒）。Gemini共有プール由来の429・AbortErrorを回避できる最も安定な構成。本番運用に最適。',
    values: {
      stage1Model:       'anthropic/claude-3.5-haiku',
      stage2Model:       'anthropic/claude-3.5-haiku',
      stage1TimeoutMs:   12_000,
      stage2TimeoutMs:   40_000,   // 合計 52秒・buffer 8秒
      stage2MaxTokens:   4_000,
      stage2Temperature: 0.5,
    },
  },
  {
    id:          'cheapest',
    label:       '💰 最安構成（テスト用）',
    description: '速度・コスト最優先（buffer 20秒）。⚠️ Gemini共有プール混雑時は429/AbortErrorで失敗しやすい。本番では「安定運用」を推奨。',
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
    label:       '⚖️ バランス（Gemini）',
    description: '速度・品質・コストの中間（buffer 15秒）。⚠️ Gemini 共有プール混雑の影響あり。安定優先なら「安定運用」を選択。',
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
    label:       '✨ 品質重視（Haiku 3.5）',
    description: 'Stage2 のみ Haiku 3.5 で高品質HTML（buffer 10秒）。Stage1 が Gemini なので 429 リスクは残る。完全安定は「安定運用」。',
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
