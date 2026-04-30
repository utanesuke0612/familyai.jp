'use client';

/**
 * components/voaenglish/SentencePlayer.tsx
 * familyai.jp — AIctation センテンス単位音声プレイヤー（R3-機能3 Phase 4）
 *
 * 配置: app/(site)/tools/voaenglish/[course]/[lesson]/page.tsx の ③ Dictation セクション内
 *
 * 機能:
 *   - 再生/一時停止・前/次のセンテンス・リピート・自動停止
 *   - シークバー（クリック/ドラッグでジャンプ）
 *   - 速度変更 0.75x/1.0x/1.25x
 *   - センテンスリスト（クリックでジャンプ・自動ハイライト・自動スクロール）
 *   - キーボードショートカット（Space/←/→/R/S）— PC のみ
 *
 * 使用例:
 *   <SentencePlayer
 *     audioUrl="https://..."
 *     sentences={[{start, end, text}, ...]}
 *     onAllPlayed={() => setShowSelfReportDialog(true)}
 *   />
 */

import { useEffect, useRef } from 'react';
import { useSentencePlayer, type PlaybackRate } from '@/lib/hooks/useSentencePlayer';
import type { Sentence } from '@/shared/types';
import { SentenceList } from './SentenceList';

interface SentencePlayerProps {
  audioUrl:      string;
  sentences:     readonly Sentence[];
  /** 全再生終了時のコールバック（Phase 6 で自己申告ダイアログ表示用・Q5=C）*/
  onAllPlayed?:  () => void;
}

const PLAYBACK_RATES: PlaybackRate[] = [0.75, 1.0, 1.25];

// MM:SS 形式
function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SentencePlayer({ audioUrl, sentences, onAllPlayed }: SentencePlayerProps) {
  const [state, actions] = useSentencePlayer({
    audioUrl,
    sentences,
    initialAutoStop:     true,    // Q3
    initialRepeat:       false,
    initialPlaybackRate: 1.0,
    onEnded:             onAllPlayed,
  });

  // ── キーボードショートカット（PC・@media hover で実機判別） ──────
  // モバイルでも window.addEventListener は登録するが、実質キーボード操作は来ない
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // input/textarea にフォーカスがあるときは無視
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          void actions.toggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          void actions.prevSentence();
          break;
        case 'ArrowRight':
          e.preventDefault();
          void actions.nextSentence();
          break;
        case 'r':
        case 'R':
          actions.toggleRepeat();
          break;
        case 's':
        case 'S':
          actions.toggleAutoStop();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

  // ── シークバー ────────────────────────────────────────
  const seekRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-4"
      style={{
        background: 'var(--color-water-light, #E6F2FB)',
        border:     '1px solid #cfe1f0',
      }}
    >
      {/* ── 操作ボタン群（再生・前後・リピート・自動停止）──────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 再生・停止 */}
        <button
          type="button"
          onClick={() => void actions.toggle()}
          disabled={!state.isReady}
          className="rounded-full font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            minWidth:   48,
            minHeight:  48,
            background: 'var(--color-orange)',
            color:      'white',
            fontSize:   20,
          }}
          aria-label={state.isPlaying ? '一時停止' : '再生'}
        >
          {state.isPlaying ? '⏸' : '▶'}
        </button>

        {/* 前のセンテンス */}
        <button
          type="button"
          onClick={() => void actions.prevSentence()}
          disabled={!state.isReady}
          className="rounded-full transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            minWidth:   40,
            minHeight:  40,
            background: '#fff',
            color:      'var(--color-brown)',
            border:     '1px solid #cfe1f0',
            fontSize:   16,
          }}
          aria-label="前のセンテンス"
          title="前のセンテンス（←）"
        >
          ⏮
        </button>

        {/* 次のセンテンス */}
        <button
          type="button"
          onClick={() => void actions.nextSentence()}
          disabled={!state.isReady}
          className="rounded-full transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            minWidth:   40,
            minHeight:  40,
            background: '#fff',
            color:      'var(--color-brown)',
            border:     '1px solid #cfe1f0',
            fontSize:   16,
          }}
          aria-label="次のセンテンス"
          title="次のセンテンス（→）"
        >
          ⏭
        </button>

        {/* リピート */}
        <button
          type="button"
          onClick={actions.toggleRepeat}
          className="rounded-full px-3 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{
            minHeight:  40,
            background: state.repeat ? '#2D78C8' : '#fff',
            color:      state.repeat ? 'white' : 'var(--color-brown)',
            border:     '1px solid #cfe1f0',
          }}
          aria-pressed={state.repeat}
          title="現在センテンスをリピート（R）"
        >
          🔁 リピート: {state.repeat ? 'ON' : 'OFF'}
        </button>

        {/* 自動停止 */}
        <button
          type="button"
          onClick={actions.toggleAutoStop}
          className="rounded-full px-3 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{
            minHeight:  40,
            background: state.autoStop ? '#2D78C8' : '#fff',
            color:      state.autoStop ? 'white' : 'var(--color-brown)',
            border:     '1px solid #cfe1f0',
          }}
          aria-pressed={state.autoStop}
          title="センテンス末尾で自動停止（S）"
        >
          ⏹ 自動停止: {state.autoStop ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* ── シークバー + 時間表示 ──────────────────────────── */}
      <div className="flex flex-col gap-1">
        <input
          ref={seekRef}
          type="range"
          min={0}
          max={state.duration || 1}
          step={0.1}
          value={state.currentTime}
          onChange={(e) => actions.seekTo(Number(e.target.value))}
          disabled={!state.isReady}
          className="w-full"
          aria-label="再生位置"
          style={{
            accentColor: '#2D78C8',
            height:      6,
          }}
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-brown-light)' }}>
          <span>{formatTime(state.currentTime)} / {formatTime(state.duration)}</span>

          {/* 速度ボタン群 */}
          <div className="flex gap-1">
            {PLAYBACK_RATES.map((rate) => {
              const selected = state.playbackRate === rate;
              return (
                <button
                  key={rate}
                  type="button"
                  onClick={() => actions.setPlaybackRate(rate)}
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background: selected ? '#2D78C8' : '#fff',
                    color:      selected ? 'white' : 'var(--color-brown)',
                    border:     '1px solid #cfe1f0',
                    minHeight:  28,
                  }}
                  aria-pressed={selected}
                >
                  {rate}x
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── エラー / ローディング表示 ──────────────────────── */}
      {state.error && (
        <div
          className="rounded-xl px-3 py-2 text-xs"
          style={{
            background: '#FFF0F0',
            color:      '#E05050',
            border:     '1px solid #ffcdd2',
          }}
        >
          ⚠️ {state.error}
        </div>
      )}
      {!state.isReady && !state.error && (
        <div className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
          🔄 音声を読み込み中…
        </div>
      )}

      {/* ── センテンスリスト ────────────────────────────── */}
      <SentenceList
        sentences={sentences}
        currentIndex={state.currentIndex}
        isPlaying={state.isPlaying}
        onJump={(idx) => void actions.jumpToSentence(idx, true)}
      />
    </div>
  );
}
