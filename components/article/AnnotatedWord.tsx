'use client';

/**
 * components/article/AnnotatedWord.tsx
 * familyai.jp — 単語ホバー／タップで意味・発音・例文を表示するツールチップ
 *
 * - ArticleBody の preprocessor が `{word|meaning|pron|example}` を検出して
 *   このコンポーネントへ展開する。
 * - 🔊 ボタン: Web Speech API で英単語を読み上げ
 * - ⭐ ボタン: localStorage へブックマーク／解除
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { buildVocabId, useVocabBookmark } from '@/lib/voaenglish/vocab-store';

interface AnnotatedWordProps {
  word:    string;
  meaning: string;
  pron?:   string;
  example?: string;
}

function speakEnglish(text: string) {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.95;
    u.pitch = 1.0;
    synth.speak(u);
  } catch {
    // noop
  }
}

export function AnnotatedWord({ word, meaning, pron, example }: AnnotatedWordProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname() ?? '';

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    // 単語 → ツールチップ内のボタン への移動時間を確保するため少し待つ
    closeTimerRef.current = setTimeout(() => setOpen(false), 250);
  }, [cancelClose]);

  // unmount で timer を掃除
  useEffect(() => () => cancelClose(), [cancelClose]);

  // URL から course / lesson を推定（/tools/voaenglish/<course>/<lesson>）
  const { course, lesson } = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    // ['tools','voaenglish','anna','lesson-01'] 等
    const i = parts.indexOf('voaenglish');
    return {
      course: i >= 0 && parts[i + 1] ? parts[i + 1] : '',
      lesson: i >= 0 && parts[i + 2] ? parts[i + 2] : '',
    };
  }, [pathname]);

  const id = useMemo(
    () => buildVocabId(course || 'misc', lesson || 'misc', word),
    [course, lesson, word],
  );
  const { bookmarked, toggle } = useVocabBookmark(id);

  // 外側クリックで閉じる（モバイルのタップ対応）
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle({
      id,
      word,
      meaning,
      pron,
      example,
      course,
      lesson,
    });
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakEnglish(word);
  };

  return (
    <span
      ref={wrapRef}
      className="annot-word relative inline-block"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <span
        role="button"
        tabIndex={0}
        aria-label={`${word}: ${meaning}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        style={{
          cursor:                'help',
          textDecoration:        'underline',
          textDecorationStyle:   'dotted',
          textDecorationColor:   'var(--color-orange)',
          textUnderlineOffset:   '3px',
          textDecorationThickness: '2px',
          color:                 'inherit',
          fontWeight:            'inherit',
        }}
      >
        {word}
      </span>

      {open && (
        <span
          role="tooltip"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="absolute bottom-full left-1/2 z-20 mb-2 block w-72 -translate-x-1/2 rounded-xl p-3 text-left text-sm"
          style={{
            background: 'white',
            boxShadow:  'var(--shadow-warm)',
            border:     '1px solid var(--color-beige-dark)',
            color:      'var(--color-brown)',
            lineHeight: 1.5,
          }}
        >
          {/* 1行目: 単語 + 発音記号 + 🔊 + ⭐ */}
          <span className="flex items-center gap-2">
            <span className="font-bold" style={{ color: 'var(--color-brown)' }}>
              {word}
            </span>
            {pron && (
              <span className="text-xs font-normal" style={{ color: 'var(--color-brown-light)' }}>
                {pron}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={handleSpeak}
                aria-label={`${word} を読み上げ`}
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  width:       '28px',
                  height:      '28px',
                  minHeight:   'auto',
                  background:  'var(--color-cream)',
                  border:      '1px solid var(--color-beige-dark)',
                  fontSize:    '14px',
                  padding:     0,
                  lineHeight:  1,
                }}
              >
                🔊
              </button>
              <button
                type="button"
                onClick={handleBookmark}
                aria-label={bookmarked ? 'ブックマーク解除' : '単語帳に追加'}
                aria-pressed={bookmarked}
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  width:       '28px',
                  height:      '28px',
                  minHeight:   'auto',
                  background:  bookmarked ? 'var(--color-yellow)' : 'var(--color-cream)',
                  border:      `1px solid ${bookmarked ? 'var(--color-orange)' : 'var(--color-beige-dark)'}`,
                  fontSize:    '14px',
                  padding:     0,
                  lineHeight:  1,
                }}
              >
                {bookmarked ? '★' : '☆'}
              </button>
            </span>
          </span>

          {/* 2行目: 意味 */}
          <span className="mt-2 block" style={{ color: 'var(--color-brown)' }}>
            {meaning}
          </span>

          {/* 3行目: 例文（任意） */}
          {example && (
            <span
              className="mt-2 block text-xs italic"
              style={{ color: 'var(--color-brown-light)' }}
            >
              例：{example}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
