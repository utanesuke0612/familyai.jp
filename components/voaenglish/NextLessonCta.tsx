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
      className="p-5 sm:p-7 mt-6"
      style={{
        background:   'var(--washi-deep)',
        border:       '1px solid var(--line)',
        borderRadius: '4px',
      }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <h2
          className="font-mincho"
          style={{
            fontSize:   'clamp(20px, 2.5vw, 26px)',
            fontWeight: 500,
            color:      'var(--shu-deep)',
          }}
        >
          このレッスンを完了しました
        </h2>
        <p className="text-sm" style={{ color: 'var(--sumi)' }}>
          素晴らしい！繰り返し学習で英語が確実に身についています。
        </p>

        {next ? (
          <>
            {/* 次のレッスンカード */}
            <div
              className="mt-2 p-4 w-full max-w-md"
              style={{
                background:   'white',
                border:       '1px solid var(--line)',
                borderRadius: '4px',
              }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--sumi-light)' }}>
                次のレッスン
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="text-left flex-1 min-w-0">
                  <p className="font-mincho text-sm" style={{ fontWeight: 500, color: 'var(--sumi)' }}>
                    {next.lessonNumber ? `Lesson ${next.lessonNumber}: ` : ''}{next.title}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--sumi-light)' }}>
                    {LEVEL_BADGE[next.level]?.icon} {LEVEL_BADGE[next.level]?.label ?? next.level}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href={`/tools/voaenglish/${next.course}/${next.slug}`}
              className="inline-flex items-center px-7 text-sm font-mincho transition-transform hover:-translate-y-0.5"
              style={{
                minHeight:    '52px',
                borderRadius: '4px',
                background:   'var(--shu)',
                color:        'white',
                fontWeight:   500,
              }}
            >
              次のレッスンへ →
            </Link>
            <Link
              href={`/tools/voaenglish/${next.course}`}
              className="text-xs underline"
              style={{ color: 'var(--sumi-light)' }}
            >
              レッスン一覧に戻る
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm" style={{ color: 'var(--sumi)' }}>
              このコースのすべてのレッスンを完了しました
            </p>
            <Link
              href={`/tools/voaenglish`}
              className="inline-flex items-center px-7 text-sm font-mincho"
              style={{
                minHeight:    '52px',
                borderRadius: '4px',
                background:   'var(--shu)',
                color:        'white',
                fontWeight:   500,
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
