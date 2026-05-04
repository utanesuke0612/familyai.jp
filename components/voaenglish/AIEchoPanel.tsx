'use client';

/**
 * components/voaenglish/AIEchoPanel.tsx
 * AI Echo パネル — レッスンページの聴写プレイヤー直下に常時表示
 *
 * 機能:
 *   - 3 タブ（🌱 Level 1 / 🌿 Level 2 / 🌳 Level 3）
 *   - 各 Level に説明 + ヒント + textarea + 送信ボタン
 *   - SSE で AI フィードバックを逐次表示
 *   - ログイン時は表示完了後に自動保存（バックグラウンド）
 *   - 未ログイン時は「ログインで保存できます」ヒント表示
 *
 * 保存先: ai_echo_entries（user_id × lesson_key × level × user_input × ai_feedback）
 */

import { useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

type Level = 1 | 2 | 3;

interface LevelMeta {
  emoji:       string;
  label:       string;
  subtitle:    string;
  description: string;
  hint:        string;
  placeholder: string;
}

const LEVEL_META: Record<Level, LevelMeta> = {
  1: {
    emoji:       '🌱',
    label:       'Level 1',
    subtitle:    '3文でまとめる',
    description: '今日のレッスンを英語3文でまとめてみましょう。',
    hint:        '💡 ヒント: スクリプトを見ずに、思い出しながら書いてみよう！',
    placeholder: 'The president went to Japan. They talked about trade...',
  },
  2: {
    emoji:       '🌿',
    label:       'Level 2',
    subtitle:    'くわしく復述',
    description: 'スクリプトを見ずに、今日の内容を自由に説明してください。英語で書いてみましょう。',
    hint:        '💡 ヒント: 「誰が・何を・なぜ」 を意識して書いてみよう！',
    placeholder: 'The US president visited Japan to discuss trade issues. They reached some agreements...',
  },
  3: {
    emoji:       '🌳',
    label:       'Level 3',
    subtitle:    '意見を書く',
    description: 'このニュースについてあなたの意見を英語で書いてください。',
    hint:        '💡 ヒント: 「私は〜だと思います。なぜなら〜だからです。」 という構成で書いてみよう！',
    placeholder: 'I think this trade deal is important because...',
  },
};

const LEVELS: Level[] = [1, 2, 3];

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

  const [activeLevel, setActiveLevel] = useState<Level>(1);
  const [input,       setInput]       = useState('');
  const [feedback,    setFeedback]    = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaved,     setIsSaved]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const meta = LEVEL_META[activeLevel];
  const canSubmit = !!input.trim() && !isStreaming;

  // ── タブ切替: 入力・フィードバック・状態をリセット ────────────────
  function switchLevel(next: Level) {
    if (next === activeLevel || isStreaming) return;
    setActiveLevel(next);
    setInput('');
    setFeedback('');
    setIsSaved(false);
    setError(null);
  }

  // ── 「もう一度書く」: 入力 + フィードバックをクリア ──────────────
  function resetForRewrite() {
    if (isStreaming) return;
    setInput('');
    setFeedback('');
    setIsSaved(false);
    setError(null);
  }

  // ── 評価リクエスト送信 + SSE 受信 ──────────────────────────────
  async function submitForFeedback() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setIsStreaming(true);
    setFeedback('');
    setIsSaved(false);
    setError(null);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:          'text-quality',
          feature:       'ai-echo',
          level:         activeLevel,
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

      // SSE ストリーム受信
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let accumulated = '';

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
              setError(json.error);
              setFeedback(json.error);
              setIsStreaming(false);
              return;
            }
            if (json.delta) {
              accumulated += json.delta;
              setFeedback(accumulated);
            }
          } catch {
            // 不正な JSON はスキップ
          }
        }
      }

      setIsStreaming(false);

      // ── ログイン中なら自動保存（失敗してもユーザー体験は壊さない） ──
      if (isLoggedIn && accumulated.trim()) {
        try {
          const saveRes = await fetch('/api/user/ai-echo', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              lessonKey,
              lessonTitle,
              level:      activeLevel,
              userInput:  trimmed,
              aiFeedback: accumulated.slice(0, 4000),
            }),
          });
          if (saveRes.ok) {
            setIsSaved(true);
          }
        } catch (e) {
          console.warn('[AIEchoPanel] save failed', e);
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : '送信に失敗しました。';
      setError(msg);
      setIsStreaming(false);
    } finally {
      abortRef.current = null;
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:    '#fff',
        border:        '1.5px solid #E8CFA8',
        boxShadow:     'var(--shadow-warm-sm)',
      }}
    >
      {/* ── ヘッダー ──────────────────────────── */}
      <div
        className="px-5 py-4"
        style={{ background: 'linear-gradient(135deg, #FFF7EB, #FDF6ED)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🔊</span>
          <span className="font-bold text-base" style={{ color: 'var(--color-brown)' }}>
            AI Echo
          </span>
        </div>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
          学んだことを、自分の言葉で。聴いて・書いて・自分の言葉で表現する 3 ステップで定着しよう。
        </p>
      </div>

      {/* ── タブ ──────────────────────────── */}
      <div
        className="flex"
        style={{ borderBottom: '1.5px solid #E8CFA8' }}
        role="tablist"
        aria-label="AI Echo Level 切替"
      >
        {LEVELS.map((lv) => {
          const m = LEVEL_META[lv];
          const active = activeLevel === lv;
          return (
            <button
              key={lv}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchLevel(lv)}
              disabled={isStreaming}
              className="flex-1 py-2.5 px-2 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: active ? '#FF8C42' : '#FDF6ED',
                color:      active ? '#fff'    : '#B5896A',
              }}
            >
              {m.emoji} {m.label}
              <span className="hidden sm:inline ml-1 font-normal opacity-90">
                {m.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── コンテンツエリア ────────────────────── */}
      <div className="px-5 py-5 flex flex-col gap-4">
        {/* タイトル */}
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--color-brown)' }}>
            {meta.emoji} {meta.label} — {meta.subtitle}
          </p>
          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--color-brown)' }}>
            {meta.description}
          </p>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
            {meta.hint}
          </p>
        </div>

        {/* テキスト入力 */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
          placeholder={meta.placeholder}
          rows={activeLevel === 1 ? 3 : 4}
          maxLength={2000}
          className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-shadow disabled:opacity-50"
          style={{
            background: 'rgba(253, 246, 237, 0.5)',
            border:     '1.5px solid #E8CFA8',
            color:      'var(--color-brown)',
            fontFamily: '"Hiragino Sans", "Meiryo", sans-serif',
            boxShadow:  'inset 0 1px 3px rgba(0,0,0,0.04)',
          }}
          onFocus={(e) => {
            if (isStreaming) return;
            e.currentTarget.style.border    = '1.5px solid #FF8C42';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,140,66,0.15), inset 0 1px 3px rgba(0,0,0,0.04)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.border    = '1.5px solid #E8CFA8';
            e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.04)';
          }}
        />

        {/* 送信ボタン + 文字数 */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px]" style={{ color: 'var(--color-brown-light)' }}>
            {input.length} / 2000 文字
          </span>
          <button
            type="button"
            onClick={submitForFeedback}
            disabled={!canSubmit}
            className="rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              background: canSubmit ? 'linear-gradient(135deg, #FF8C42, #FFA563)' : '#ccc',
              color:      '#fff',
              boxShadow:  canSubmit ? '0 2px 8px rgba(255,140,66,0.35)' : 'none',
            }}
          >
            {isStreaming
              ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> 評価中…</>
              : <>🤖 AI Echoに評価してもらう →</>
            }
          </button>
        </div>

        {/* ── ローディング（フィードバック未受信時のみ） ── */}
        {isStreaming && !feedback && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: '#FDF6ED', color: 'var(--color-brown-light)' }}
          >
            🤖 AI Echo が考えています
            <span style={{ animation: 'aiEchoDots 1.4s infinite', marginLeft: 4 }}>...</span>
          </div>
        )}

        {/* ── フィードバック表示 ────────────────────── */}
        {feedback && (
          <div
            className="rounded-xl px-4 py-3 flex flex-col gap-2"
            style={{
              background: 'linear-gradient(135deg, #FFF7EB, #FDF6ED)',
              border:     '1px solid #E8CFA8',
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold" style={{ color: 'var(--color-brown)' }}>
                🤖 AI Echo からのフィードバック
              </span>
              {/* 保存ステータス */}
              {!isStreaming && isLoggedIn && isSaved && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: '#E8F5E9', color: '#2E7D32' }}
                >
                  ✓ 保存済み
                </span>
              )}
              {!isStreaming && !isLoggedIn && authStatus !== 'loading' && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: '#FFF3CD', color: '#856404', border: '1px solid #FFD54F' }}
                  title="ログインすると履歴を保存できます"
                >
                  💡 ログインで保存可能
                </span>
              )}
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--color-brown)', whiteSpace: 'pre-wrap' }}
            >
              {feedback}
              {isStreaming && (
                <span
                  aria-hidden
                  style={{ display: 'inline-block', width: 8, height: 14, marginLeft: 2, background: 'currentColor', verticalAlign: 'middle', animation: 'aiEchoCursor 1s infinite' }}
                />
              )}
            </p>
            {!isStreaming && (
              <button
                type="button"
                onClick={resetForRewrite}
                className="self-start rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 mt-1"
                style={{
                  background: '#fff',
                  color:      'var(--color-brown)',
                  border:     '1px solid #E8CFA8',
                }}
              >
                ✏️ もう一度書く
              </button>
            )}
          </div>
        )}

        {/* エラー */}
        {error && !feedback && (
          <div
            className="rounded-xl px-4 py-3 text-sm leading-relaxed"
            style={{ background: '#FFF5F5', color: '#7A3030', border: '1px solid #FFB3B3' }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* ── インライン CSS（ドット & カーソル） ── */}
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
