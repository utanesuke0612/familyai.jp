'use client';

/**
 * components/voaenglish/AIEchoPanel.tsx
 * AI Echo パネル — レッスンページの聴写プレイヤー直下に常時表示
 *
 * UX 仕様（feedback 後の v2）:
 *   - 3 タブ（Level 1 / 2 / 3）の入力 / フィードバック / 保存状態をすべて Level 別に保持
 *     → タブ切替で内容は消えない（ページから離れるまで残る）
 *   - 保存はデフォルト OFF。「保存」ボタン押下時のみ DB へ保存（AI Chat と同じ挙動）
 *   - 入力欄は 5 行の高さ
 *   - SSE で AI フィードバックを逐次表示
 *
 * 親コンポーネントが SectionCard でラップする想定。本コンポーネントは
 * 内部ヘッダー（タイトル）を持たず、タブ + コンテンツ部のみを返す。
 */

import { useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Sprout, Leaf, TreePine, Loader2, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Level = 1 | 2 | 3;

interface LevelMeta {
  Icon:        LucideIcon;
  label:       string;
  subtitle:    string;
  description: string;
  hint:        string;
  placeholder: string;
}

const LEVEL_META: Record<Level, LevelMeta> = {
  1: {
    Icon:        Sprout,
    label:       'Level 1',
    subtitle:    '3文でまとめる',
    description: '今日のレッスンを英語3文でまとめてみましょう。',
    hint:        'ヒント: スクリプトを見ずに、思い出しながら書いてみよう',
    placeholder: 'The president went to Japan. They talked about trade...',
  },
  2: {
    Icon:        Leaf,
    label:       'Level 2',
    subtitle:    'くわしく復述',
    description: 'スクリプトを見ずに、今日の内容を自由に説明してください。英語で書いてみましょう。',
    hint:        'ヒント: 「誰が・何を・なぜ」 を意識して書いてみよう',
    placeholder: 'The US president visited Japan to discuss trade issues. They reached some agreements...',
  },
  3: {
    Icon:        TreePine,
    label:       'Level 3',
    subtitle:    '意見を書く',
    description: 'このレッスンについてあなたの意見を英語で書いてください。',
    hint:        'ヒント: 「私は〜だと思います。なぜなら〜だからです。」 という構成で書いてみよう',
    placeholder: 'I think this lesson is interesting because...',
  },
};

const LEVELS: Level[] = [1, 2, 3];

/** Level 別に独立して保持する状態（タブ切替で消えない） */
interface LevelState {
  input:     string;
  feedback:  string;
  isSaved:   boolean;
  isSaving:  boolean;
  error:     string | null;
  /** P3 #12: 保存失敗の通知（aria-live 領域に表示）。alert() の置換 */
  saveError: string | null;
}

const INITIAL_LEVEL_STATE: LevelState = {
  input: '', feedback: '', isSaved: false, isSaving: false, error: null, saveError: null,
};

interface AIEchoPanelProps {
  /** "<course>/<slug>" 形式（lessons_progress と同じ命名規則） */
  lessonKey:     string;
  /** 表示用のレッスン名（DB 保存時にも使う） */
  lessonTitle:   string;
  /** VOA レッスン全文スクリプト（system prompt 参照用） */
  lessonScript:  string;
}

export function AIEchoPanel({ lessonKey, lessonTitle, lessonScript }: AIEchoPanelProps) {
  const { data: session, status: authStatus } = useSession();
  const isLoggedIn = !!session?.user?.id;

  const [activeLevel,    setActiveLevel]    = useState<Level>(1);
  const [byLevel,        setByLevel]        = useState<Record<Level, LevelState>>({
    1: { ...INITIAL_LEVEL_STATE },
    2: { ...INITIAL_LEVEL_STATE },
    3: { ...INITIAL_LEVEL_STATE },
  });
  // 同時ストリームは 1 本のみ（streamingLevel が null 以外なら他のレベルもサブミット不可）
  const [streamingLevel, setStreamingLevel] = useState<Level | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const meta            = LEVEL_META[activeLevel];
  const current         = byLevel[activeLevel];
  const isStreamingHere = streamingLevel === activeLevel;
  const isStreamingAny  = streamingLevel !== null;
  const canSubmit       = !!current.input.trim() && !isStreamingAny && !current.isSaving;

  // ── Level 別 state を部分更新するヘルパ ─────────────────
  function patchLevel(level: Level, patch: Partial<LevelState>) {
    setByLevel((prev) => ({ ...prev, [level]: { ...prev[level], ...patch } }));
  }

  // ── タブ切替: 入力やフィードバックは消さない（per-level 保持） ─
  function switchLevel(next: Level) {
    if (next === activeLevel || isStreamingAny) return;
    setActiveLevel(next);
  }

  // ── 「もう一度書く」: 当 Level の入力 + フィードバックをリセット
  function resetForRewrite() {
    if (isStreamingHere) return;
    patchLevel(activeLevel, { ...INITIAL_LEVEL_STATE });
  }

  // ── 評価リクエスト送信 + SSE 受信 ──────────────────────
  async function submitForFeedback() {
    const trimmed = current.input.trim();
    if (!trimmed || isStreamingAny || current.isSaving) return;

    const lv = activeLevel;
    setStreamingLevel(lv);
    patchLevel(lv, { feedback: '', isSaved: false, error: null, saveError: null });

    const ac = new AbortController();
    abortRef.current = ac;

    // P3 #10: SSE delta 毎に React 再レンダーすると長文時にモバイルで詰まる。
    // AIChatWidget と同じ 60ms throttle + 終端 flush で再レンダー回数を抑える。
    const FLUSH_INTERVAL_MS = 60;
    let accumulated = '';
    let lastFlushedLen = 0;
    let lastFlushAt = 0;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const cancelFlushTimer = () => {
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
    };
    const flushNow = () => {
      cancelFlushTimer();
      if (accumulated.length === lastFlushedLen) return;
      lastFlushedLen = accumulated.length;
      lastFlushAt    = Date.now();
      patchLevel(lv, { feedback: accumulated });
    };
    const scheduleFlush = () => {
      if (flushTimer !== null) return;
      const elapsed = Date.now() - lastFlushAt;
      if (elapsed >= FLUSH_INTERVAL_MS) {
        flushNow();
      } else {
        flushTimer = setTimeout(flushNow, FLUSH_INTERVAL_MS - elapsed);
      }
    };

    try {
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:          'text-quality',
          feature:       'ai-echo',
          level:         lv,
          messages:      [{ role: 'user', content: trimmed }],
          lessonContext: lessonScript.slice(0, 8000),
        }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = (j?.error?.message as string | undefined)
          ?? (res.status === 429
                ? '本日のAI利用上限に達しました。明日またお試しください。'
                : `通信エラーが発生しました（HTTP ${res.status}）。`);
        throw new Error(msg);
      }
      if (!res.body) throw new Error('レスポンスが空でした。');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const json = JSON.parse(payload) as { delta?: string; error?: string };
            if (json.error) {
              cancelFlushTimer();
              patchLevel(lv, { error: json.error, feedback: json.error });
              setStreamingLevel(null);
              return;
            }
            if (json.delta) {
              accumulated += json.delta;
              scheduleFlush();
            }
          } catch {
            // 不正な JSON はスキップ
          }
        }
      }

      // 受信完了: 最後の差分を確実に反映
      flushNow();
      setStreamingLevel(null);
    } catch (err) {
      cancelFlushTimer();
      if ((err as Error)?.name === 'AbortError') {
        setStreamingLevel(null);
        return;
      }
      const msg = err instanceof Error ? err.message : '送信に失敗しました。';
      patchLevel(lv, { error: msg });
      setStreamingLevel(null);
    } finally {
      abortRef.current = null;
    }
  }

  // ── 「保存」ボタン: 手動保存 ─────────────────────
  async function saveToHistory() {
    if (!isLoggedIn) return;
    const lv = activeLevel;
    const s  = byLevel[lv];
    if (!s.feedback.trim() || s.isSaved || s.isSaving || isStreamingAny) return;

    patchLevel(lv, { isSaving: true, saveError: null });
    try {
      const res = await fetch('/api/user/ai-echo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          lessonKey,
          lessonTitle,
          level:      lv,
          userInput:  s.input.trim(),
          aiFeedback: s.feedback.slice(0, 4000),
        }),
      });
      if (res.ok) {
        patchLevel(lv, { isSaved: true, isSaving: false, saveError: null });
      } else {
        // P3 #12: alert() を廃止し、aria-live 領域での inline 通知に置換
        patchLevel(lv, { isSaving: false, saveError: '保存に失敗しました。もう一度お試しください。' });
      }
    } catch {
      patchLevel(lv, { isSaving: false, saveError: '通信エラーが発生しました。' });
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ── タブ ──────────────────────────── */}
      <div
        className="flex overflow-hidden"
        style={{ borderBottom: '1.5px solid var(--line)' }}
        role="tablist"
        aria-label="AI Echo Level 切替"
      >
        {LEVELS.map((lv) => {
          const m       = LEVEL_META[lv];
          const active  = activeLevel === lv;
          const lvState = byLevel[lv];
          const hasContent = !!lvState.input || !!lvState.feedback;
          return (
            <button
              key={lv}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchLevel(lv)}
              disabled={isStreamingAny && !active}
              className="flex-1 py-3 px-2 text-sm font-mincho transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: active ? 'var(--shu)' : 'var(--washi-deep)',
                color:      active ? '#fff'       : 'var(--sumi-light)',
                fontWeight: 500,
              }}
            >
              <m.Icon size={16} strokeWidth={1.25} aria-hidden="true" /> {m.label}
              <span className="hidden sm:inline ml-1 font-normal opacity-90">
                {m.subtitle}
              </span>
              {/* タブに既存内容を持っているサイン（小さいドット） */}
              {!active && hasContent && (
                <span
                  aria-hidden
                  className="inline-block ml-1 rounded-full"
                  style={{ width: 6, height: 6, background: 'var(--shu)' }}
                  title="入力 / フィードバックが残っています"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── コンテンツエリア ────────────────────── */}
      <div
        className="px-1 sm:px-2 py-5 flex flex-col gap-4"
      >
        {/* 説明 + ヒント（タブにすでにタイトルがあるので重複は省略） */}
        <div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--sumi)' }}>
            {meta.description}
          </p>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--sumi-light)' }}>
            {meta.hint}
          </p>
        </div>

        {/* テキスト入力（5 行・統一） */}
        <textarea
          value={current.input}
          onChange={(e) => patchLevel(activeLevel, { input: e.target.value })}
          disabled={isStreamingHere || current.isSaving}
          placeholder={meta.placeholder}
          rows={5}
          maxLength={2000}
          className="w-full px-4 py-3 text-sm resize-y outline-none transition-shadow disabled:opacity-50"
          style={{
            background:   'var(--washi-light)',
            border:       '1.5px solid var(--line)',
            borderRadius: '4px',
            color:        'var(--sumi)',
            fontFamily:   '"Hiragino Sans", "Meiryo", sans-serif',
            boxShadow:    'inset 0 1px 3px rgba(0,0,0,0.04)',
            minHeight:    140,
          }}
          onFocus={(e) => {
            if (isStreamingHere || current.isSaving) return;
            e.currentTarget.style.border    = '1.5px solid var(--shu)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(178,58,42,0.12), inset 0 1px 3px rgba(0,0,0,0.04)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.border    = '1.5px solid var(--line)';
            e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.04)';
          }}
        />

        {/* 送信ボタン + 文字数 */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px]" style={{ color: 'var(--sumi-light)' }}>
            {current.input.length} / 2000 文字
          </span>
          <button
            type="button"
            onClick={submitForFeedback}
            disabled={!canSubmit}
            className="px-5 py-2.5 text-sm font-mincho transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              background:   canSubmit ? 'var(--shu)' : '#ccc',
              color:        '#fff',
              fontWeight:   500,
              borderRadius: '4px',
            }}
          >
            {isStreamingHere
              ? <><Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> 評価中…</>
              : <>AI Echoに評価してもらう →</>
            }
          </button>
        </div>

        {/* ── ローディング（フィードバック未受信時のみ） ── */}
        {isStreamingHere && !current.feedback && (
          <div
            className="px-4 py-3 text-sm"
            style={{ background: 'var(--washi-deep)', color: 'var(--sumi-light)', borderRadius: '4px' }}
          >
            AI Echo が考えています
            <span style={{ animation: 'aiEchoDots 1.4s infinite', marginLeft: 4 }}>...</span>
          </div>
        )}

        {/* ── フィードバック表示 ────────────────────── */}
        {current.feedback && (
          <div
            className="px-4 py-3 flex flex-col gap-2"
            style={{
              background:   'var(--washi-deep)',
              border:       '1px solid var(--line)',
              borderRadius: '4px',
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mincho" style={{ fontWeight: 500, color: 'var(--sumi)' }}>
                AI Echo からのフィードバック
              </span>
              {/* 保存ステータス */}
              {!isStreamingHere && current.isSaved && (
                <span
                  className="px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: '#E8F5E9', color: '#2E7D32', borderRadius: '4px' }}
                >
                  <Check size={12} strokeWidth={2} aria-hidden="true" /> 保存済み
                </span>
              )}
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--sumi)', whiteSpace: 'pre-wrap' }}
            >
              {current.feedback}
              {isStreamingHere && (
                <span
                  aria-hidden
                  style={{ display: 'inline-block', width: 8, height: 14, marginLeft: 2, background: 'currentColor', verticalAlign: 'middle', animation: 'aiEchoCursor 1s infinite' }}
                />
              )}
            </p>

            {/* アクション群（ストリーム完了後のみ表示） */}
            {!isStreamingHere && (
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {/* 保存（ログイン時のみ・未保存時のみ） */}
                {isLoggedIn && !current.isSaved && (
                  <button
                    type="button"
                    onClick={saveToHistory}
                    disabled={current.isSaving}
                    className="px-3 py-1.5 text-xs font-mincho transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{
                      background:   'var(--shu)',
                      color:        '#fff',
                      fontWeight:   500,
                      borderRadius: '4px',
                    }}
                  >
                    {current.isSaving ? '保存中…' : '保存'}
                  </button>
                )}

                {/* 未ログイン誘導 */}
                {!isLoggedIn && authStatus !== 'loading' && (
                  <span
                    className="px-3 py-1.5 text-[11px] font-bold"
                    style={{ background: '#FFF3CD', color: '#856404', border: '1px solid #FFD54F', borderRadius: '4px' }}
                    title="ログインすると履歴を保存できます"
                  >
                    ログインで保存可能
                  </span>
                )}

                {/* もう一度書く */}
                <button
                  type="button"
                  onClick={resetForRewrite}
                  className="px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background:   '#fff',
                    color:        'var(--sumi)',
                    border:       '1px solid var(--line)',
                    borderRadius: '4px',
                  }}
                >
                  もう一度書く
                </button>
              </div>
            )}

            {/* P3 #12: 保存失敗の inline 通知（alert() の代替・SR 読み上げ対応） */}
            {current.saveError && (
              <div
                role="alert"
                aria-live="polite"
                aria-atomic="true"
                className="px-3 py-2 text-xs leading-relaxed mt-1"
                style={{ background: '#FFF5F5', color: '#7A3030', border: '1px solid #FFB3B3', borderRadius: '4px' }}
              >
                {current.saveError}
              </div>
            )}
          </div>
        )}

        {/* エラー */}
        {current.error && !current.feedback && (
          <div
            className="px-4 py-3 text-sm leading-relaxed"
            style={{ background: '#FFF5F5', color: '#7A3030', border: '1px solid #FFB3B3', borderRadius: '4px' }}
          >
            {current.error}
          </div>
        )}
      </div>

      {/* ── インライン CSS ── */}
      <style jsx>{`
        @keyframes aiEchoDots {
          0%, 20%   { content: ''; }
          40%       { content: '.'; }
          60%       { content: '..'; }
          80%, 100% { content: '...'; }
        }
        @keyframes aiEchoCursor {
          0%, 50%   { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
