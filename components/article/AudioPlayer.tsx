'use client';

/**
 * components/article/AudioPlayer.tsx
 * familyai.jp — 記事内音声プレーヤー
 *
 * 機能：
 * - 再生 / 一時停止
 * - シークバー（クリック & ドラッグ）
 * - 再生速度切り替え（0.75x〜2x）
 * - リピート（1曲リピート）
 * - 残り時間 / 総時間表示
 * - 文字起こし（transcript）の展開表示
 * - バッファリングインジケーター
 * - キーボード操作（Space: 再生停止 / ← →: 10秒スキップ）
 */

import { useRef, useState, useEffect, useCallback, useId } from 'react';

// ── 型定義 ─────────────────────────────────────────────────────
interface AudioPlayerProps {
  src:          string;
  title?:       string;
  transcript?:  string | null;
  /** 語学コンテンツの言語コード: 'en' | 'zh' | 'ko' 等 */
  language?:    string | null;
  durationSec?: number | null;
}

// ── 定数 ──────────────────────────────────────────────────────
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const;

const LANG_LABEL: Record<string, string> = {
  en: '🇺🇸 英語',
  zh: '🇨🇳 中国語',
  ko: '🇰🇷 韓国語',
  fr: '🇫🇷 フランス語',
  de: '🇩🇪 ドイツ語',
  es: '🇪🇸 スペイン語',
};

// ── 時間フォーマット ───────────────────────────────────────────
function formatTime(sec: number): string {
  if (!isFinite(sec) || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── メインコンポーネント ───────────────────────────────────────
export function AudioPlayer({
  src,
  title,
  transcript,
  language,
  durationSec,
}: AudioPlayerProps) {
  const audioRef         = useRef<HTMLAudioElement>(null);
  const seekBarRef       = useRef<HTMLDivElement>(null);
  const transcriptId     = useId();

  const [isPlaying,        setIsPlaying]        = useState(false);
  const [isBuffering,      setIsBuffering]       = useState(false);
  const [currentTime,      setCurrentTime]       = useState(0);
  const [duration,         setDuration]          = useState(durationSec ?? 0);
  const [speed,            setSpeed]             = useState<number>(1);
  const [isRepeat,         setIsRepeat]          = useState(false);
  const [showTranscript,   setShowTranscript]    = useState(false);
  const [isDragging,       setIsDragging]        = useState(false);
  const [hasError,         setHasError]          = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Audio イベント ──────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate     = () => { if (!isDragging) setCurrentTime(audio.currentTime); };
    const onPlay           = () => setIsPlaying(true);
    const onPause          = () => setIsPlaying(false);
    const onWaiting        = () => setIsBuffering(true);
    const onCanPlay        = () => setIsBuffering(false);
    const onError          = () => { setHasError(true); setIsBuffering(false); };
    const onEnded          = () => {
      setIsPlaying(false);
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate',     onTimeUpdate);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('waiting',        onWaiting);
    audio.addEventListener('canplay',        onCanPlay);
    audio.addEventListener('error',          onError);
    audio.addEventListener('ended',          onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('waiting',        onWaiting);
      audio.removeEventListener('canplay',        onCanPlay);
      audio.removeEventListener('error',          onError);
      audio.removeEventListener('ended',          onEnded);
    };
  }, [isDragging, isRepeat]);

  // ── 再生速度を適用 ──────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // ── 再生 / 一時停止 ─────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setHasError(true));
    }
  }, [isPlaying]);

  // ── シーク共通ヘルパー ──────────────────────────────────────
  const calcRatio = useCallback((clientX: number) => {
    const bar = seekBarRef.current;
    if (!bar || duration === 0) return null;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, [duration]);

  // ── シーク（Pointer Down — マウス・タッチ共通）─────────────
  const handleSeekPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const bar   = seekBarRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || duration === 0) return;

    // Pointer Capture で指が外れてもイベントを受け取り続ける
    bar.setPointerCapture(e.pointerId);
    setIsDragging(true);

    const ratio = calcRatio(e.clientX);
    if (ratio !== null) setCurrentTime(ratio * duration);
  }, [duration, calcRatio]);

  // ── シーク（Pointer Move）──────────────────────────────────
  const handleSeekPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const ratio = calcRatio(e.clientX);
    if (ratio !== null) setCurrentTime(ratio * duration);
  }, [isDragging, duration, calcRatio]);

  // ── シーク（Pointer Up — 確定）────────────────────────────
  const handleSeekPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const bar   = seekBarRef.current;
    const audio = audioRef.current;
    bar?.releasePointerCapture(e.pointerId);

    const ratio = calcRatio(e.clientX);
    if (ratio !== null && audio) {
      const newTime = ratio * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
    setIsDragging(false);
  }, [isDragging, duration, calcRatio]);

  // ── 10秒スキップ ────────────────────────────────────────────
  const skip = useCallback((sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + sec));
  }, [duration]);

  // ── キーボード操作 ──────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skip(-10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        skip(10);
        break;
    }
  }, [togglePlay, skip]);

  // ── エラー状態 ───────────────────────────────────────────────
  if (hasError) {
    return (
      <div
        className="rounded-2xl p-5 flex items-center gap-3"
        style={{ background: 'var(--color-beige)', border: '1px solid var(--color-beige-dark)' }}
        role="alert"
      >
        <span className="text-2xl" aria-hidden="true">⚠️</span>
        <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
          音声ファイルの読み込みに失敗しました。ページを再読み込みしてお試しください。
        </p>
      </div>
    );
  }

  // ── UI ──────────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'white', boxShadow: 'var(--shadow-warm-sm)', border: '1px solid var(--color-beige)' }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* hidden audio element */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* ── ヘッダー ── */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{
          background:  'linear-gradient(135deg, var(--color-orange) 0%, #f4a261 100%)',
          borderBottom: 'none',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0" aria-hidden="true">🎵</span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white/80 uppercase tracking-wider">
              音声コンテンツ
            </p>
            {title && (
              <p className="text-sm font-bold text-white line-clamp-1">{title}</p>
            )}
          </div>
        </div>

        {/* 言語バッジ */}
        {language && LANG_LABEL[language] && (
          <span
            className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}
          >
            {LANG_LABEL[language]}
          </span>
        )}
      </div>

      {/* ── コントロールエリア ── */}
      <div className="px-5 pt-5 pb-4 flex flex-col gap-4">

        {/* 時間表示 */}
        <div
          className="flex justify-between text-xs font-mono"
          style={{ color: 'var(--color-brown-light)' }}
          aria-live="off"
        >
          <span aria-label={`現在位置 ${formatTime(currentTime)}`}>
            {formatTime(currentTime)}
          </span>
          <span aria-label={`総時間 ${formatTime(duration)}`}>
            {formatTime(duration)}
          </span>
        </div>

        {/* ── シークバー ── */}
        <div
          ref={seekBarRef}
          role="slider"
          aria-label="再生位置"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
          tabIndex={0}
          className="relative h-2 rounded-full cursor-pointer select-none"
          style={{ background: 'var(--color-beige)', touchAction: 'none' }}
          onPointerDown={handleSeekPointerDown}
          onPointerMove={handleSeekPointerMove}
          onPointerUp={handleSeekPointerUp}
          onPointerCancel={handleSeekPointerUp}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft')  { e.preventDefault(); skip(-5); }
            if (e.key === 'ArrowRight') { e.preventDefault(); skip(5); }
          }}
        >
          {/* バッファリングバー */}
          <div
            className="absolute inset-y-0 left-0 rounded-full opacity-40"
            style={{ width: `${progress}%`, background: 'var(--color-orange)', transition: 'width 0.1s linear' }}
            aria-hidden="true"
          />
          {/* 再生済みバー */}
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${progress}%`, background: 'var(--color-orange)', transition: isDragging ? 'none' : 'width 0.1s linear' }}
            aria-hidden="true"
          />
          {/* つまみ */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
            style={{
              left:       `calc(${progress}% - 8px)`,
              background: 'var(--color-orange)',
              boxShadow:  '0 0 0 3px rgba(249,115,22,0.2)',
            }}
            aria-hidden="true"
          />
        </div>

        {/* ── 再生コントロール行 ── */}
        <div className="flex items-center justify-between gap-2">

          {/* 左: スキップ戻る + 再生ボタン + スキップ進む */}
          <div className="flex items-center gap-2">

            {/* -10秒 */}
            <button
              onClick={() => skip(-10)}
              className="flex flex-col items-center justify-center w-10 h-10 rounded-full transition-[opacity,transform] hover:opacity-70 active:scale-95"
              style={{ background: 'var(--color-beige)', color: 'var(--color-brown)' }}
              aria-label="10秒戻る"
              title="10秒戻る"
            >
              <span className="text-sm leading-none">↺</span>
              <span className="text-[9px] leading-none font-bold mt-0.5">10</span>
            </button>

            {/* 再生 / 一時停止 */}
            <button
              onClick={togglePlay}
              disabled={isBuffering}
              className="flex items-center justify-center w-14 h-14 rounded-full transition-[background-color,color,box-shadow,transform] hover:scale-105 active:scale-95"
              style={{
                background: isBuffering ? 'var(--color-beige)' : 'var(--color-orange)',
                color:      isBuffering ? 'var(--color-brown-light)' : 'white',
                boxShadow:  isBuffering ? 'none' : 'var(--shadow-orange)',
              }}
              aria-label={isBuffering ? '読み込み中' : isPlaying ? '一時停止' : '再生'}
            >
              {isBuffering ? (
                // ローディングスピナー
                <span
                  className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                  style={{ animation: 'spin 0.8s linear infinite' }}
                  aria-hidden="true"
                />
              ) : isPlaying ? (
                // 一時停止アイコン
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <rect x="4" y="3" width="4" height="14" rx="1" />
                  <rect x="12" y="3" width="4" height="14" rx="1" />
                </svg>
              ) : (
                // 再生アイコン
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M5 3.5l12 6.5-12 6.5V3.5z" />
                </svg>
              )}
            </button>

            {/* +10秒 */}
            <button
              onClick={() => skip(10)}
              className="flex flex-col items-center justify-center w-10 h-10 rounded-full transition-[opacity,transform] hover:opacity-70 active:scale-95"
              style={{ background: 'var(--color-beige)', color: 'var(--color-brown)' }}
              aria-label="10秒進む"
              title="10秒進む"
            >
              <span className="text-sm leading-none">↻</span>
              <span className="text-[9px] leading-none font-bold mt-0.5">10</span>
            </button>

          </div>

          {/* 右: リピート + 速度 */}
          <div className="flex items-center gap-2 flex-wrap justify-end">

            {/* リピートボタン */}
            <button
              onClick={() => setIsRepeat((v) => !v)}
              className="flex items-center justify-center w-9 h-9 rounded-full border text-sm transition-[background-color,color,border-color,box-shadow]"
              style={{
                background:  isRepeat ? 'var(--color-orange)' : 'white',
                borderColor: isRepeat ? 'var(--color-orange)' : 'var(--color-beige-dark)',
                color:       isRepeat ? 'white' : 'var(--color-brown-light)',
                boxShadow:   isRepeat ? 'var(--shadow-orange)' : 'none',
              }}
              aria-pressed={isRepeat}
              aria-label={isRepeat ? 'リピートON（クリックでOFF）' : 'リピートOFF（クリックでON）'}
              title="リピート"
            >
              🔁
            </button>

            {/* 再生速度 */}
            <div className="flex items-center gap-1" role="group" aria-label="再生速度">
              {SPEED_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className="px-2 py-1 rounded-lg text-xs font-bold border transition-[background-color,color,border-color] min-h-[36px]"
                  style={{
                    background:  speed === s ? 'var(--color-brown)' : 'white',
                    borderColor: speed === s ? 'var(--color-brown)' : 'var(--color-beige-dark)',
                    color:       speed === s ? 'white' : 'var(--color-brown-light)',
                    minWidth:    '40px',
                  }}
                  aria-pressed={speed === s}
                  aria-label={`${s}倍速`}
                >
                  {s === 1 ? '1×' : `${s}×`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* キーボードヒント */}
        <p className="text-center text-xs" style={{ color: 'var(--color-brown-light)', opacity: 0.6 }}>
          Space: 再生/停止 &nbsp;·&nbsp; ←→: 10秒スキップ
        </p>

      </div>

      {/* ── Transcript（文字起こし）── */}
      {transcript && (
        <div
          className="border-t"
          style={{ borderColor: 'var(--color-beige)' }}
        >
          {/* トグルボタン */}
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium transition-opacity hover:opacity-70 min-h-[48px]"
            style={{ color: 'var(--color-brown)' }}
            aria-expanded={showTranscript}
            aria-controls={transcriptId}
          >
            <span className="flex items-center gap-2">
              📄 文字起こしを{showTranscript ? '閉じる' : '読む'}
            </span>
            <span
              className="text-lg transition-transform duration-200"
              style={{ transform: showTranscript ? 'rotate(180deg)' : 'none' }}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

          {/* Transcript 本文 */}
          {showTranscript && (
            <div
              id={transcriptId}
              className="px-5 pb-5"
            >
              <div
                className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: 'var(--color-cream)',
                  color:      'var(--color-brown)',
                  maxHeight:  '280px',
                  overflowY:  'auto',
                  lineHeight: '1.8',
                }}
              >
                {transcript}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
