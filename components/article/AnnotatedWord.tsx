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
import { createPortal } from 'react-dom';
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

/** ツールチップ寸法（縦は実測のため初期値、横は w-72 = 288px 固定） */
const TIP_W   = 288;
const TIP_H   = 160;        // 平均的高さの推定（meaning + example）
const MARGIN  = 8;          // viewport edge との最小マージン
const SPACING = 4;          // 単語とツールチップの隙間（半分に縮小）

type Placement = {
  /** viewport 左上を原点とする座標（position: fixed） */
  top:    number;
  left:   number;
  /** 単語の上 or 下 どちらに表示するか（小さな三角矢印用に保持） */
  vertical: 'above' | 'below';
};

export function AnnotatedWord({ word, meaning, pron, example }: AnnotatedWordProps) {
  const [open,    setOpen]    = useState(false);
  const [pos,     setPos]     = useState<Placement | null>(null);
  const wrapRef    = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
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
  const { bookmarked, toggle, isLoggedIn } = useVocabBookmark(id);

  // 外側クリックで閉じる（Portal の tooltipRef も除外）
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t))    return;
      if (tooltipRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // ── ツールチップ位置計算（viewport 内に収まるよう smart placement） ─────
  const measure = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();

    // ツールチップ実測高さ（あれば）／推定値（初回）
    const tipH = tooltipRef.current?.offsetHeight ?? TIP_H;

    // 上下: 上方に十分なスペースがあれば above、なければ below
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const vertical: Placement['vertical'] =
      spaceAbove >= tipH + SPACING + MARGIN || spaceAbove > spaceBelow
        ? 'above'
        : 'below';

    const top = vertical === 'above'
      ? rect.top - tipH - SPACING
      : rect.bottom + SPACING;

    // 左右: 単語中心に揃えつつ、viewport 端でクランプ
    const desiredLeft = rect.left + rect.width / 2 - TIP_W / 2;
    const left = Math.max(
      MARGIN,
      Math.min(window.innerWidth - TIP_W - MARGIN, desiredLeft),
    );

    setPos({ top, left, vertical });
  }, []);

  // open 中は scroll / resize で再計算
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    measure();
    // 内側コンテナの scroll もキャプチャするため capture: true
    const onUpdate = () => measure();
    window.addEventListener('scroll', onUpdate, true);
    window.addEventListener('resize', onUpdate);
    return () => {
      window.removeEventListener('scroll', onUpdate, true);
      window.removeEventListener('resize', onUpdate);
    };
  }, [open, measure]);

  // 初回レンダー後、実測高さで再計算（推定値とのズレ補正）
  useEffect(() => {
    if (!open || !tooltipRef.current) return;
    // 1 frame 後にレイアウト確定値で測り直す
    const id = requestAnimationFrame(() => measure());
    return () => cancelAnimationFrame(id);
  }, [open, measure]);

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

  // ── ツールチップの中身（Portal で body に描画） ──────────────────
  // overflow:hidden / scroll コンテナで切り取られないよう、body 直下に固定配置。
  // 位置は measure() が計算した pos（top/left）を使う。
  const tooltipNode = open && pos && typeof document !== 'undefined'
    ? createPortal(
        <span
          ref={tooltipRef}
          role="tooltip"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="block w-72 rounded-xl p-3 text-left text-sm"
          style={{
            position:   'fixed',
            top:        pos.top,
            left:       pos.left,
            zIndex:     9999,
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
              {isLoggedIn ? (
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
              ) : (
                <a
                  href="/auth/signin"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="ログインして単語帳に追加"
                  title="ログインすると単語帳に保存できます"
                  className="inline-flex items-center justify-center rounded-full"
                  style={{
                    width:          '28px',
                    height:         '28px',
                    minHeight:      'auto',
                    background:     'var(--color-cream)',
                    border:         '1px solid var(--color-beige-dark)',
                    fontSize:       '14px',
                    padding:        0,
                    lineHeight:     1,
                    textDecoration: 'none',
                    opacity:        0.6,
                  }}
                >
                  ☆
                </a>
              )}
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
        </span>,
        document.body,
      )
    : null;

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
      {tooltipNode}
    </span>
  );
}
