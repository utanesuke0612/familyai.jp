/**
 * components/voaenglish/NextLessonCta.tsx
 * familyai.jp — 🌟 完璧時に表示する「次のレッスンへ」カード（R3-機能3 Phase 6）
 */

import Link from 'next/link';

export interface NextLessonInfo {
  course:        string;
  slug:          string;
  title:         string;
  lessonNumber:  number | null;
  level:         string;          // "beginning" | "intermediate" | "advanced"
}

interface NextLessonCtaProps {
  next: NextLessonInfo | null;
}

const LEVEL_BADGE: Record<string, { icon: string; label: string }> = {
  beginning:    { icon: '🌱', label: 'Beginning' },
  intermediate: { icon: '📰', label: 'Intermediate' },
  advanced:     { icon: '🎓', label: 'Advanced' },
};

export function NextLessonCta({ next }: NextLessonCtaProps) {
  return (
    <section
      className="rounded-3xl p-5 sm:p-7 mt-6"
      style={{
        background: 'linear-gradient(160deg, #E8F7F0 0%, var(--color-cream) 100%)',
        border:     '1px solid #a8dec3',
        boxShadow:  'var(--shadow-warm-sm)',
      }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-5xl" aria-hidden="true">🎉</div>
        <h2
          className="font-display font-bold"
          style={{
            fontSize: 'clamp(20px, 2.5vw, 26px)',
            color:    '#2D9B6F',
          }}
        >
          このレッスンを完了しました！
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-brown)' }}>
          素晴らしい！繰り返し学習で英語が確実に身についています。
        </p>

        {next ? (
          <>
            {/* 次のレッスンカード */}
            <div
              className="mt-2 rounded-2xl p-4 w-full max-w-md"
              style={{
                background: 'white',
                border:     '1px solid var(--color-beige-dark)',
              }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-brown-light)' }}>
                次のレッスン
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: 'var(--color-brown)' }}>
                    {next.lessonNumber ? `Lesson ${next.lessonNumber}: ` : ''}{next.title}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-brown-light)' }}>
                    {LEVEL_BADGE[next.level]?.icon} {LEVEL_BADGE[next.level]?.label ?? next.level}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href={`/tools/voaenglish/${next.course}/${next.slug}`}
              className="inline-flex items-center rounded-full px-7 text-sm font-bold transition-transform hover:-translate-y-0.5"
              style={{
                minHeight:  '52px',
                background: 'var(--color-orange)',
                color:      'white',
                boxShadow:  '0 4px 12px rgba(255,140,66,0.3)',
              }}
            >
              次のレッスンへ →
            </Link>
            <Link
              href={`/tools/voaenglish/${next.course}`}
              className="text-xs underline"
              style={{ color: 'var(--color-brown-light)' }}
            >
              レッスン一覧に戻る
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm" style={{ color: 'var(--color-brown)' }}>
              🏆 このコースのすべてのレッスンを完了しました！
            </p>
            <Link
              href={`/tools/voaenglish`}
              className="inline-flex items-center rounded-full px-7 text-sm font-bold"
              style={{
                minHeight:  '52px',
                background: 'var(--color-orange)',
                color:      'white',
              }}
            >
              他のコースを見る →
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
