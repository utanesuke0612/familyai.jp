'use client';

/**
 * lib/hooks/useSentencePlayer.ts
 * familyai.jp — AIctation センテンス単位プレイヤーの再生制御フック（R3-機能3 Phase 4）
 *
 * 役割:
 *   - HTMLAudioElement のラッパー（play / pause / seek / 速度変更）
 *   - センテンス境界に応じた currentIndex 計算
 *   - 自動停止（autoStop）/ リピート（repeat）の自動制御
 *   - 状態変化を React state として公開
 *
 * 設計方針:
 *   - 純粋関数（findIndexAtTime）を分離してテスト可能に
 *   - 副作用は useEffect の中だけに閉じる
 *   - Audio 要素は useRef で保持・コンポーネント側で <audio> を描画する代わりに
 *     hook が new Audio() で生成して owner となる（DOM ツリーから独立）
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Sentence } from '@/shared/types';

export type PlaybackRate = 0.75 | 1.0 | 1.25;

/**
 * 指定時刻 t（秒）が含まれるセンテンスの index を返す。
 * - どのセンテンスにも該当しない時刻（センテンス間の隙間）の場合は、
 *   その時刻より前で最も近いセンテンスの index を返す。
 * - 全センテンスより前なら 0、全センテンスより後なら最後の index。
 *
 * 純粋関数（テスト容易・副作用なし）。
 */
export function findIndexAtTime(sentences: readonly Sentence[], t: number): number {
  if (sentences.length === 0) return 0;
  if (t < sentences[0].start) return 0;
  // 範囲内のセンテンスを探す
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (t >= s.start && t < s.end) return i;
  }
  // 全センテンスより後 → 最後の index
  if (t >= sentences[sentences.length - 1].end) {
    return sentences.length - 1;
  }
  // 隙間にいる場合: 直前のセンテンスを返す（最も近い前を採用）
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (t >= sentences[i].end) return i;
  }
  return 0;
}

interface UseSentencePlayerArgs {
  audioUrl:    string | null;
  sentences:   readonly Sentence[];
  /** 初期値（デフォルト ON）。Q3 採用。 */
  initialAutoStop?:     boolean;
  /** 初期値（デフォルト OFF）。 */
  initialRepeat?:       boolean;
  /** 初期値（デフォルト 1.0x）。 */
  initialPlaybackRate?: PlaybackRate;
  /** 全再生終了時のコールバック（Phase 6 自己申告ダイアログ呼び出し用・Q5=C）。 */
  onEnded?: () => void;
}

export interface SentencePlayerState {
  isReady:      boolean;
  isPlaying:    boolean;
  currentTime:  number;
  duration:     number;
  currentIndex: number;
  playbackRate: PlaybackRate;
  autoStop:     boolean;
  repeat:       boolean;
  error:        string | null;
}

export interface SentencePlayerActions {
  play:             () => Promise<void>;
  pause:            () => void;
  toggle:           () => Promise<void>;
  seekTo:           (time: number) => void;
  jumpToSentence:   (index: number, autoPlay?: boolean) => Promise<void>;
  prevSentence:     () => Promise<void>;
  nextSentence:     () => Promise<void>;
  setPlaybackRate:  (rate: PlaybackRate) => void;
  toggleAutoStop:   () => void;
  toggleRepeat:     () => void;
  /** プレイヤーを最初（currentTime=0）に戻して停止する。😓 / 💪 押下時に使用 */
  reset:            () => void;
}

/**
 * AIctation センテンス単位プレイヤーのカスタムフック。
 *
 * 使用例:
 *   const [state, actions] = useSentencePlayer({ audioUrl, sentences });
 *   <button onClick={actions.toggle}>{state.isPlaying ? '⏸' : '▶'}</button>
 */
export function useSentencePlayer(
  args: UseSentencePlayerArgs,
): [SentencePlayerState, SentencePlayerActions] {
  const {
    audioUrl,
    sentences,
    initialAutoStop     = true,   // Q3=ON
    initialRepeat       = false,
    initialPlaybackRate = 1.0,
    onEnded,
  } = args;

  const audioRef        = useRef<HTMLAudioElement | null>(null);
  // 最新値を timeupdate ハンドラから参照するため ref で保持（state 経由だと stale closure）
  const sentencesRef    = useRef(sentences);
  const autoStopRef     = useRef(initialAutoStop);
  const repeatRef       = useRef(initialRepeat);
  const currentIndexRef = useRef(0);
  const onEndedRef      = useRef(onEnded);

  const [state, setState] = useState<SentencePlayerState>({
    isReady:      false,
    isPlaying:    false,
    currentTime:  0,
    duration:     0,
    currentIndex: 0,
    playbackRate: initialPlaybackRate,
    autoStop:     initialAutoStop,
    repeat:       initialRepeat,
    error:        null,
  });

  // sentences / callback の最新値を ref に追従
  useEffect(() => { sentencesRef.current = sentences; }, [sentences]);
  useEffect(() => { onEndedRef.current   = onEnded;   }, [onEnded]);

  // ── Audio 要素の生成・破棄 ──────────────────────────────
  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.preload      = 'metadata';
    audio.playbackRate = initialPlaybackRate;
    audioRef.current   = audio;

    const onLoaded = () => {
      setState((s) => ({ ...s, isReady: true, duration: audio.duration || 0 }));
    };
    const onPlay  = () => setState((s) => ({ ...s, isPlaying: true,  error: null }));
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));
    const onErr   = () => setState((s) => ({
      ...s,
      isPlaying: false,
      error:     '音声を読み込めませんでした。ネットワーク接続を確認してください。',
    }));

    /**
     * timeupdate: 1/4 秒ごとに発火（ブラウザ依存）。
     * - currentTime / currentIndex を state へ反映
     * - autoStop ON 時、現在センテンスの末尾を超えたら pause
     * - repeat ON 時、現在センテンスの末尾で start に戻す
     */
    const onTimeUpdate = () => {
      const t = audio.currentTime;
      const list = sentencesRef.current;
      const idx  = findIndexAtTime(list, t);
      const cur  = list[currentIndexRef.current];

      // repeat: 現在センテンス末尾でループ
      if (repeatRef.current && cur && t >= cur.end) {
        audio.currentTime = cur.start;
        return;
      }

      // autoStop: 現在センテンス末尾で停止
      if (autoStopRef.current && cur && t >= cur.end && idx > currentIndexRef.current) {
        audio.pause();
        // 次のセンテンスの開始へ位置合わせ（次回 ▶ で続きから）
        if (list[idx]) {
          audio.currentTime = list[idx].start;
        }
      }

      currentIndexRef.current = idx;
      setState((s) => ({ ...s, currentTime: t, currentIndex: idx }));
    };

    const onEndedHandler = () => {
      setState((s) => ({ ...s, isPlaying: false }));
      onEndedRef.current?.();
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('error',          onErr);
    audio.addEventListener('timeupdate',     onTimeUpdate);
    audio.addEventListener('ended',          onEndedHandler);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('error',          onErr);
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('ended',          onEndedHandler);
      audio.pause();
      audio.src = '';   // 解放
      audioRef.current = null;
    };
    // audioUrl 変更で audio を作り直す（initialPlaybackRate は初回のみ反映で OK）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // ── アクション群 ────────────────────────────────────────
  const play = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      await a.play();
    } catch (err) {
      // iOS autoplay 制限など
      setState((s) => ({
        ...s,
        isPlaying: false,
        error:     err instanceof Error ? err.message : '再生に失敗しました',
      }));
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) await play();
    else pause();
  }, [play, pause]);

  const seekTo = useCallback((time: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || time, time));
  }, []);

  const jumpToSentence = useCallback(
    async (index: number, autoPlay: boolean = true) => {
      const a    = audioRef.current;
      const list = sentencesRef.current;
      if (!a || list.length === 0) return;
      const safe = Math.max(0, Math.min(list.length - 1, index));
      a.currentTime = list[safe].start;
      currentIndexRef.current = safe;
      setState((s) => ({ ...s, currentTime: list[safe].start, currentIndex: safe }));
      if (autoPlay) {
        await play();
      }
    },
    [play],
  );

  const prevSentence = useCallback(async () => {
    const idx = currentIndexRef.current;
    await jumpToSentence(Math.max(0, idx - 1));
  }, [jumpToSentence]);

  const nextSentence = useCallback(async () => {
    const idx = currentIndexRef.current;
    const len = sentencesRef.current.length;
    await jumpToSentence(Math.min(len - 1, idx + 1));
  }, [jumpToSentence]);

  const setPlaybackRate = useCallback((rate: PlaybackRate) => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = rate;
    setState((s) => ({ ...s, playbackRate: rate }));
  }, []);

  const toggleAutoStop = useCallback(() => {
    autoStopRef.current = !autoStopRef.current;
    setState((s) => ({ ...s, autoStop: !s.autoStop }));
  }, []);

  const toggleRepeat = useCallback(() => {
    repeatRef.current = !repeatRef.current;
    setState((s) => ({ ...s, repeat: !s.repeat }));
  }, []);

  /**
   * プレイヤーを最初（currentTime=0）に戻して停止。
   * 自己申告 😓「もう一度やる」/ 💪「頑張りました」押下時に
   * DictationPanel から呼び出される（v2 設計書通り）。
   */
  const reset = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    currentIndexRef.current = 0;
    setState((s) => ({
      ...s,
      isPlaying:    false,
      currentTime:  0,
      currentIndex: 0,
    }));
  }, []);

  const actions: SentencePlayerActions = {
    play,
    pause,
    toggle,
    seekTo,
    jumpToSentence,
    prevSentence,
    nextSentence,
    setPlaybackRate,
    toggleAutoStop,
    toggleRepeat,
    reset,
  };

  return [state, actions];
}
