'use client';

/**
 * components/voaenglish/SentenceList.tsx
 * familyai.jp — AIctation センテンスリスト UI（R3-機能3 Phase 4）
 *
 * 機能:
 *   - デフォルト折りたたみ（「先に答えを見ない」設計）
 *   - 展開時：max-height: 300px、内部スクロール
 *   - 各センテンスをクリック → そのセンテンスへジャンプ + 自動再生（Q1=A）
 *   - 再生中センテンスを自動ハイライト + 中央スクロール
 *   - スピーカープレフィックス（"DrJill: ..."）を分離表示（Q2=B）
 *
 * 使用例:
 *   <SentenceList
 *     sentences={sentences}
 *     currentIndex={state.currentIndex}
 *     isPlaying={state.isPlaying}
 *     onJump={(idx) => actions.jumpToSentence(idx, true)}
 *   />
 */

import { useEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp } from 'lucide-react';
import type { Sentence } from '@/shared/types';
import { AnnotatedSentence } from './AnnotatedSentence';
import {
  buildSentenceId,
  plainifySentence,
  useSentenceBookmark,
} from '@/lib/voaenglish/sentence-bookmark-store';

interface SentenceListProps {
  sentences:    readonly Sentence[];
  currentIndex: number;
  isPlaying:    boolean;
  onJump:       (index: number) => void;
  /**
   * Rev34: ブックマーク 🔖 ボタンを表示するための文脈情報。
   * 省略すると 🔖 は出さない（後方互換）。
   */
  bookmarkContext?: {
    course:       string;
    lesson:       string;
    lessonTitle?: string;
    audioUrl?:    string;
  };
}

/**
 * speaker プレフィックスを {speaker, text} に分解。
 * 対応形式（後方互換 + markdown 太字）:
 *   - "Speaker: text..."        ← 旧形式（既存 sentences.json）
 *   - "**Speaker:** text..."    ← 新形式（コロン内側）
 *   - "**Speaker**: text..."    ← 新形式（コロン外側）
 *   - "**Speaker** text..."     ← markdown 太字のみ
 * コロンを含まない場合は speaker=null・text=入力をそのまま返す。
 */
function splitSpeaker(line: string): { speaker: string | null; text: string } {
  // 1. **Speaker:** text  または **Speaker**: text  → markdown 太字
  const md = line.match(/^\*\*([A-Za-z][A-Za-z0-9_ ]*?)\s*:?\s*\*\*\s*:?\s*(.*)$/);
  if (md) return { speaker: md[1].trim(), text: md[2] };
  // 2. Speaker: text  → 旧形式
  const m = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
  if (m) return { speaker: m[1], text: m[2] };
  return { speaker: null, text: line };
}

// MM:SS 形式
function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SentenceList({
  sentences,
  currentIndex,
  isPlaying,
  onJump,
  bookmarkContext,
}: SentenceListProps) {
  const [open, setOpen] = useState(false);
  const containerRef    = useRef<HTMLDivElement>(null);
  const itemRefs        = useRef<Array<HTMLButtonElement | null>>([]);

  // 再生中センテンスを自動スクロールで中央表示
  useEffect(() => {
    if (!open) return;        // 折りたたみ時はスクロール不要
    if (!isPlaying) return;   // 停止中は自動スクロールしない（ユーザー操作優先）
    const target = itemRefs.current[currentIndex];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentIndex, isPlaying, open]);

  return (
    <div className="flex flex-col gap-2">
      {/* 折りたたみトグル + 注意書き */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{
            background:   '#fff',
            color:        'var(--sumi)',
            border:       '1px solid var(--line)',
            borderRadius: '4px',
            minHeight:    32,
          }}
          aria-expanded={open}
        >
          スクリプトを{open ? '隠す' : '表示する'}
          {open
            ? <ChevronUp size={14} aria-hidden />
            : <ChevronDown size={14} aria-hidden />}
        </button>
        <span className="text-xs" style={{ color: 'var(--sumi-light)' }}>
          先に答えを見ないようにしよう
        </span>
      </div>

      {/* スクロール可能なセンテンスリスト */}
      {open && (
        <div
          ref={containerRef}
          className="overflow-y-auto scrollbar-hide relative"
          style={{
            background:   '#fff',
            border:       '1px solid var(--line)',
            borderRadius: '4px',
            maxHeight:    300,
            scrollBehavior: 'smooth',
          }}
        >
          <ul className="flex flex-col">
            {sentences.map((s, idx) => {
              const { speaker, text } = splitSpeaker(s.text);
              const isCurrent = idx === currentIndex;
              return (
                <SentenceRow
                  key={idx}
                  idx={idx}
                  sentence={s}
                  speaker={speaker}
                  text={text}
                  isCurrent={isCurrent}
                  onJump={onJump}
                  registerRef={(el) => { itemRefs.current[idx] = el; }}
                  bookmarkContext={bookmarkContext}
                />
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── 1 センテンス分の行コンポーネント（Rev34）─────────────────
// 再生用 button と 🔖 ブックマーク用 button を flex 並列で配置。
// HTML の入れ子 button 違反を避け、🔖 タップで onJump が走らないように
// stopPropagation する。
interface SentenceRowProps {
  idx:         number;
  sentence:    Sentence;
  speaker:     string | null;
  text:        string;
  isCurrent:   boolean;
  onJump:      (index: number) => void;
  registerRef: (el: HTMLButtonElement | null) => void;
  bookmarkContext?: SentenceListProps['bookmarkContext'];
}

function SentenceRow({
  idx, sentence, speaker, text, isCurrent, onJump, registerRef, bookmarkContext,
}: SentenceRowProps) {
  const ctxId = bookmarkContext
    ? buildSentenceId(bookmarkContext.course, bookmarkContext.lesson, idx)
    : '';
  const { bookmarked, toggle } = useSentenceBookmark(ctxId);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();   // 親の onJump を発火させない
    if (!bookmarkContext) return;
    toggle({
      id:          ctxId,
      text:        sentence.text,                  // 注釈付き本文を保存
      textPlain:   plainifySentence(sentence.text),
      startSec:    sentence.start,
      endSec:      sentence.end,
      speaker:     speaker ?? undefined,
      course:      bookmarkContext.course,
      lesson:      bookmarkContext.lesson,
      lessonTitle: bookmarkContext.lessonTitle,
      audioUrl:    bookmarkContext.audioUrl,
    });
  };

  return (
    <li className="flex items-stretch" style={{ background: isCurrent ? 'var(--washi-deep)' : 'transparent' }}>
      <button
        ref={registerRef}
        type="button"
        onClick={() => onJump(idx)}
        className="flex-1 min-w-0 text-left px-3 py-2 transition-colors hover:bg-[var(--washi-light)]"
        style={{
          borderLeft: isCurrent ? '3px solid var(--shu)' : '3px solid transparent',
          color:      'var(--sumi)',
        }}
        aria-current={isCurrent ? 'true' : undefined}
      >
        <div className="flex items-baseline gap-2 text-xs">
          <span style={{ color: 'var(--sumi-light)', minWidth: '3em' }}>
            [{formatTime(sentence.start)}]
          </span>
          {speaker && (
            <span className="font-mincho" style={{ fontWeight: 500, color: 'var(--shu)', minWidth: '4em' }}>
              {speaker}
            </span>
          )}
        </div>
        <p
          className="text-sm leading-relaxed mt-0.5"
          style={{ fontWeight: isCurrent ? 700 : 400, color: 'var(--sumi)' }}
        >
          <AnnotatedSentence text={text} />
        </p>
      </button>

      {/* 🔖 ブックマークボタン（bookmarkContext がある時のみ） */}
      {bookmarkContext && (
        <button
          type="button"
          onClick={handleBookmarkClick}
          className="shrink-0 flex items-center justify-center transition-opacity hover:opacity-80"
          style={{
            width:    44,
            minWidth: 44,
            color:    bookmarked ? 'var(--shu)' : 'var(--sumi-light)',
            background: 'transparent',
            border:   'none',
          }}
          aria-label={bookmarked ? 'ブックマークを解除' : 'ブックマークに保存'}
          aria-pressed={bookmarked}
          title={bookmarked ? 'ブックマーク済み（解除する）' : 'マイブックマークに保存'}
        >
          {bookmarked
            ? <BookmarkCheck size={18} aria-hidden />
            : <Bookmark size={18} aria-hidden />}
        </button>
      )}
    </li>
  );
}
