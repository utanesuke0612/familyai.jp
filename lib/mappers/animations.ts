/**
 * lib/mappers/animations.ts
 * familyai.jp — user_animations DB 行 → API DTO（shared/types 契約）変換マッパー
 *
 * 目的:
 * - DB モデル（lib/db/schema.ts:userAnimations）・API DTO（shared/types）・UI の 3 層を分離する。
 * - 公開 API（/api/user/animations, /api/animations/:id）で同じ変換を必ず経由させ、
 *   iOS/Android 側の shared/api クライアントが安定した契約で受け取れるようにする。
 *
 * 変換責務:
 *   - timestamp 列 → ISO 8601 文字列
 *   - grade/subject 文字列 → shared/types の union 型に narrow
 *   - htmlContent は AnimationDetail にのみ含める（一覧では除外）
 */

import type {
  Animation,
  AnimationSummary,
  AnimationGrade,
  AnimationSubject,
} from '@/shared/types';

// ── 型ガード兼フィルタ ────────────────────────────────────────
const GRADES:   readonly AnimationGrade[]   = ['elem-low', 'elem-high', 'middle'];
const SUBJECTS: readonly AnimationSubject[] = ['science', 'math', 'social'];

function coerceGrade(v: string): AnimationGrade {
  return (GRADES as readonly string[]).includes(v) ? (v as AnimationGrade) : 'elem-low';
}

function coerceSubject(v: string): AnimationSubject {
  return (SUBJECTS as readonly string[]).includes(v) ? (v as AnimationSubject) : 'science';
}

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

// ── DB 行の最小型（他層から独立させるため局所定義） ──────────
export interface AnimationRowSummary {
  id:        string;
  theme:     string;
  grade:     string;
  subject:   string;
  prompt:    string;
  createdAt: Date | string;
}

export interface AnimationRow extends AnimationRowSummary {
  htmlContent: string;
  userId:      string;
}

// ── 変換関数 ──────────────────────────────────────────────────
export function toAnimationSummary(row: AnimationRowSummary): AnimationSummary {
  return {
    id:        row.id,
    theme:     row.theme,
    grade:     coerceGrade(row.grade),
    subject:   coerceSubject(row.subject),
    prompt:    row.prompt,
    createdAt: toIso(row.createdAt),
  };
}

export function toAnimationDetail(row: AnimationRow): Animation {
  return {
    ...toAnimationSummary(row),
    htmlContent: row.htmlContent,
    userId:      row.userId,
  };
}
