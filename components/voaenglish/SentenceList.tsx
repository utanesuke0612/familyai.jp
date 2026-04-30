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
import type { Sentence } from '@/shared/types';

interface SentenceListProps {
  sentences:    readonly Sentence[];
  currentIndex: number;
  isPlaying:    boolean;
  onJump:       (index: number) => void;
}

/**
 * "Speaker: text..." 形式を {speaker, text} に分解。
 * コロンを含まない場合は speaker=null・text=入力をそのまま返す。
 */
function splitSpeaker(line: string): { speaker: string | null; text: string } {
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

export function SentenceList({ sentences, currentIndex, isPlaying, onJump }: SentenceListProps) {
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
          className="rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{
            background: '#fff',
            color:      'var(--color-brown)',
            border:     '1px solid #cfe1f0',
            minHeight:  32,
          }}
          aria-expanded={open}
        >
          📜 スクリプトを{open ? '隠す ▲' : '表示する ▼'}
        </button>
        <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
          ⚠️ 先に答えを見ないようにしよう！
        </span>
      </div>

      {/* スクロール可能なセンテンスリスト */}
      {open && (
        <div
          ref={containerRef}
          className="rounded-xl overflow-y-auto scrollbar-hide relative"
          style={{
            background: '#fff',
            border:     '1px solid #cfe1f0',
            maxHeight:  300,
            scrollBehavior: 'smooth',
          }}
        >
          <ul className="flex flex-col">
            {sentences.map((s, idx) => {
              const { speaker, text } = splitSpeaker(s.text);
              const isCurrent = idx === currentIndex;
              return (
                <li key={idx}>
                  <button
                    ref={(el) => { itemRefs.current[idx] = el; }}
                    type="button"
                    onClick={() => onJump(idx)}
                    className="w-full text-left px-3 py-2 transition-colors hover:bg-[var(--color-cream)]"
                    style={{
                      background: isCurrent ? '#E6F2FB' : 'transparent',
                      borderLeft: isCurrent ? '3px solid #2D78C8' : '3px solid transparent',
                      color:      'var(--color-brown)',
                    }}
                    aria-current={isCurrent ? 'true' : undefined}
                  >
                    <div className="flex items-baseline gap-2 text-xs">
                      <span style={{ color: 'var(--color-brown-light)', minWidth: '3em' }}>
                        [{formatTime(s.start)}]
                      </span>
                      {speaker && (
                        <span
                          className="font-bold"
                          style={{ color: '#2D78C8', minWidth: '4em' }}
                        >
                          {speaker}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm leading-relaxed mt-0.5"
                      style={{
                        fontWeight: isCurrent ? 700 : 400,
                        color:      'var(--color-brown)',
                      }}
                    >
                      {text}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
