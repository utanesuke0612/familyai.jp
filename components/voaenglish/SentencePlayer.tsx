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

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useSentencePlayer, type PlaybackRate } from '@/lib/hooks/useSentencePlayer';
import type { Sentence } from '@/shared/types';
import { SentenceList } from './SentenceList';

interface SentencePlayerProps {
  audioUrl:      string;
  sentences:     readonly Sentence[];
  /** 全再生終了時のコールバック（Phase 6 で自己申告ダイアログ表示用・Q5=C）*/
  onAllPlayed?:  () => void;
  /** Rev34: SentenceList のブックマーク用文脈。省略時はブックマークを表示しない */
  bookmarkContext?: {
    course:       string;
    lesson:       string;
    lessonTitle?: string;
    audioUrl?:    string;
  };
}

/**
 * 親（DictationPanel）が ref 経由で呼び出せるアクション。
 * 自己申告（retry / good）押下時の「最初に戻す」を実現する。
 */
export interface SentencePlayerHandle {
  reset: () => void;
}

const PLAYBACK_RATES: PlaybackRate[] = [0.75, 1.0, 1.25];

// MM:SS 形式
function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SentencePlayer = forwardRef<SentencePlayerHandle, SentencePlayerProps>(
  function SentencePlayer({ audioUrl, sentences, onAllPlayed, bookmarkContext }, ref) {
  const [state, actions] = useSentencePlayer({
    audioUrl,
    sentences,
    initialAutoStop:     false,   // デフォルト OFF（ユーザーが必要に応じて手動 ON）
    initialRepeat:       false,
    initialPlaybackRate: 1.0,
    onEnded:             onAllPlayed,
  });

  // 親（DictationPanel）から reset() を呼べるようにする
  useImperativeHandle(ref, () => ({
    reset: () => actions.reset(),
  }), [actions]);

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
      className="flex flex-col gap-3 p-4"
      style={{
        background:   'var(--washi-deep)',
        border:       '1px solid var(--line)',
        borderRadius: '4px',
      }}
    >
      {/* ── 操作ボタン群 ───────────────────────────────────────────
        モバイルで自然に 2 行に折り返せるよう、再生コントロールと
        トグル群を別グループにしている（gap-y-2 で行間確保）。
        トグルは ON/OFF テキストではなく背景色で状態を伝える（短く）。 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {/* 再生コントロール群: ▶ ⏮ ⏭（密着させて 1 ユニット） */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void actions.toggle()}
            disabled={!state.isReady}
            className="rounded-full font-mincho transition-opacity hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center"
            style={{
              width:       52,
              height:      52,
              background:  'var(--shu)',
              color:       'white',
              fontSize:    22,
              fontWeight:  500,
              paddingLeft: state.isPlaying ? 0 : 3,
            }}
            aria-label={state.isPlaying ? '一時停止' : '再生'}
          >
            {state.isPlaying ? <Pause size={24} strokeWidth={1.5} /> : <Play size={24} strokeWidth={1.5} />}
          </button>

          <button
            type="button"
            onClick={() => void actions.prevSentence()}
            disabled={!state.isReady}
            className="rounded-full transition-opacity hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-start"
            style={{
              width:       44,
              height:      44,
              background:  '#fff',
              color:       'var(--sumi)',
              border:      '1px solid var(--line)',
              paddingLeft: 4,
            }}
            aria-label="前のセンテンス"
            title="前のセンテンス（←キー）"
          >
            <SkipBack size={18} strokeWidth={1.25} />
          </button>

          <button
            type="button"
            onClick={() => void actions.nextSentence()}
            disabled={!state.isReady}
            className="rounded-full transition-opacity hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-end"
            style={{
              width:       44,
              height:      44,
              background:  '#fff',
              color:       'var(--sumi)',
              border:      '1px solid var(--line)',
              paddingRight: 4,
            }}
            aria-label="次のセンテンス"
            title="次のセンテンス（→キー）"
          >
            <SkipForward size={18} strokeWidth={1.25} />
          </button>
        </div>

        {/* トグル群: リピート / 自動停止（短いラベル・背景色で状態伝達） */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={actions.toggleRepeat}
            className="px-3 text-xs font-semibold transition-opacity hover:opacity-90"
            style={{
              minHeight:    40,
              borderRadius: '4px',
              background:   state.repeat ? 'var(--shu)' : '#fff',
              color:        state.repeat ? 'white' : 'var(--sumi)',
              border:       '1px solid var(--line)',
            }}
            aria-pressed={state.repeat}
            title={`現在センテンスをリピート（Rキー）— 現在: ${state.repeat ? 'ON' : 'OFF'}`}
          >
            リピート
          </button>

          <button
            type="button"
            onClick={actions.toggleAutoStop}
            className="px-3 text-xs font-semibold transition-opacity hover:opacity-90"
            style={{
              minHeight:    40,
              borderRadius: '4px',
              background:   state.autoStop ? 'var(--shu)' : '#fff',
              color:        state.autoStop ? 'white' : 'var(--sumi)',
              border:       '1px solid var(--line)',
            }}
            aria-pressed={state.autoStop}
            title={`センテンス末尾で自動停止（Sキー）— 現在: ${state.autoStop ? 'ON' : 'OFF'}`}
          >
            自動停止
          </button>
        </div>
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
            accentColor: 'var(--shu)',
            height:      6,
          }}
        />
        <div className="flex justify-between items-center text-xs flex-wrap gap-y-1" style={{ color: 'var(--sumi-light)' }}>
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
                  className="px-2.5 py-0.5 text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background:   selected ? 'var(--shu)' : '#fff',
                    color:        selected ? 'white' : 'var(--sumi)',
                    border:       '1px solid var(--line)',
                    borderRadius: '4px',
                    minHeight:    28,
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
          className="px-3 py-2 text-xs"
          style={{
            background:   '#FFF0F0',
            color:        '#E05050',
            border:       '1px solid #ffcdd2',
            borderRadius: '4px',
          }}
        >
          {state.error}
        </div>
      )}
      {!state.isReady && !state.error && (
        <div className="text-xs" style={{ color: 'var(--sumi-light)' }}>
          音声を読み込み中…
        </div>
      )}

      {/* ── センテンスリスト ────────────────────────────── */}
      <SentenceList
        sentences={sentences}
        currentIndex={state.currentIndex}
        isPlaying={state.isPlaying}
        onJump={(idx) => void actions.jumpToSentence(idx, true)}
        bookmarkContext={bookmarkContext}
      />
    </div>
  );
});
