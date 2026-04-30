/**
 * components/voaenglish/HandwritingNote.tsx
 * familyai.jp — Dictation 練習の「手書き推奨」案内（R3-機能3 Phase 4）
 *
 * SentencePlayer の上部に配置し、五感学習を促す。
 * SectionCard の subtitle と統合した内容に整理（絵文字アイコンは
 * 親の SectionCard 側に集約済みなので box 内では出さない）。
 */

export function HandwritingNote() {
  return (
    <div
      className="rounded-xl p-3 mb-3"
      style={{
        background: '#fff',
        border:     '1px solid #cfe1f0',
      }}
    >
      <p className="text-sm font-bold" style={{ color: 'var(--color-brown)' }}>
        紙とペンを用意して、聴いた英語を書き取ってみよう
      </p>
      <p
        className="text-xs leading-relaxed mt-1"
        style={{ color: 'var(--color-brown-light)' }}
      >
        キーボードではなく手書きで書くことで、耳・目・手・声を同時に使えます。
        五感を使う学習が、最も記憶に残ります。
      </p>
    </div>
  );
}
