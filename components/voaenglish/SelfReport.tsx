'use client';

/**
 * components/voaenglish/SelfReport.tsx
 * familyai.jp — Dictation 自己申告 3 ボタン（R3-機能3 Phase 6）
 *
 * 押下後の処理（API/localStorage 保存・confetti 等）は親（DictationPanel）が担当。
 * このコンポーネントは UI と onSelect コールバックのみを提供する。
 */

export type SelfReportAction = 'retry' | 'good' | 'perfect';

interface SelfReportProps {
  onSelect:    (action: SelfReportAction) => void;
  isSubmitting?: boolean;
  /** 縦並び（モーダル内）か横並び（インライン）か */
  layout?:     'horizontal' | 'vertical';
}

const BUTTONS: ReadonlyArray<{
  action:  SelfReportAction;
  emoji:   string;
  label:   string;
  hint:    string;
  bg:      string;
  fg:      string;
  border:  string;
}> = [
  {
    action: 'retry',
    emoji:  '😓',
    label:  'もう一度やる',
    hint:   '60%未満・最初からやり直す',
    bg:     '#FFF0F0',
    fg:     '#E05050',
    border: '#fcc',
  },
  {
    action: 'good',
    emoji:  '💪',
    label:  '頑張りました！',
    hint:   '60〜80%・もう一度聴く',
    bg:     '#FFF8E6',
    fg:     '#E8A020',
    border: '#fcd986',
  },
  {
    action: 'perfect',
    emoji:  '🌟',
    label:  '完璧！',
    hint:   '80%以上・次のレッスンへ',
    bg:     '#E8F7F0',
    fg:     '#2D9B6F',
    border: '#a8dec3',
  },
];

export function SelfReport({ onSelect, isSubmitting = false, layout = 'horizontal' }: SelfReportProps) {
  return (
    <div
      className={`grid gap-3 ${
        layout === 'horizontal'
          ? 'grid-cols-1 sm:grid-cols-3'
          : 'grid-cols-1'
      }`}
    >
      {BUTTONS.map((b) => (
        <button
          key={b.action}
          type="button"
          onClick={() => onSelect(b.action)}
          disabled={isSubmitting}
          className="rounded-2xl px-3 py-4 transition-[transform,opacity] duration-150 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: b.bg,
            color:      b.fg,
            border:     `1px solid ${b.border}`,
            minHeight:  '88px',
          }}
          aria-label={`${b.emoji} ${b.label} — ${b.hint}`}
        >
          <div className="text-3xl leading-none mb-1.5" aria-hidden="true">
            {b.emoji}
          </div>
          <div className="font-bold text-sm">{b.label}</div>
          <div className="text-xs mt-1 opacity-80">{b.hint}</div>
        </button>
      ))}
    </div>
  );
}
