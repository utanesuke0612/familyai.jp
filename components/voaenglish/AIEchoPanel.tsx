'use client';

/**
 * components/voaenglish/AIEchoPanel.tsx
 * AI Echo パネル — レッスンページの聴写プレイヤー直下に常時表示
 *
 * UX 仕様（feedback 後の v2）:
 *   - 3 タブ（🌱 / 🌿 / 🌳）の入力 / フィードバック / 保存状態をすべて Level 別に保持
 *     → タブ切替で内容は消えない（ページから離れるまで残る）
 *   - 保存はデフォルト OFF。「📌 保存」ボタン押下時のみ DB へ保存（AI Chat と同じ挙動）
 *   - 入力欄は 5 行の高さ
 *   - SSE で AI フィードバックを逐次表示
 *
 * 親コンポーネントが SectionCard でラップする想定。本コンポーネントは
 * 内部ヘッダー（タイトル）を持たず、タブ + コンテンツ部のみを返す。
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
    description: 'このレッスンについてあなたの意見を英語で書いてください。',
    hint:        '💡 ヒント: 「私は〜だと思います。なぜなら〜だからです。」 という構成で書いてみよう！',
    placeholder: 'I think this lesson is interesting because...',
  },
};

const LEVELS: Level[] = [1, 2, 3];

/** Level 別に独立して保持する状態（タブ切替で消えない） */
interface LevelState {
  input:    string;
  feedback: string;
  isSaved:  boolean;
  isSaving: boolean;
  error:    string | null;
}

const INITIAL_LEVEL_STATE: LevelState = {
  input: '', feedback: '', isSaved: false, isSaving: false, error: null,
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
    patchLevel(lv, { feedback: '', isSaved: false, error: null });

    const ac = new AbortController();
    abortRef.current = ac;

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
              patchLevel(lv, { error: json.error, feedback: json.error });
              setStreamingLevel(null);
              return;
            }
            if (json.delta) {
              accumulated += json.delta;
              patchLevel(lv, { feedback: accumulated });
            }
          } catch {
            // 不正な JSON はスキップ
          }
        }
      }

      setStreamingLevel(null);
    } catch (err) {
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

  // ── 「📌 保存」ボタン: 手動保存 ─────────────────────
  async function saveToHistory() {
    if (!isLoggedIn) return;
    const lv = activeLevel;
    const s  = byLevel[lv];
    if (!s.feedback.trim() || s.isSaved || s.isSaving || isStreamingAny) return;

    patchLevel(lv, { isSaving: true });
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
        patchLevel(lv, { isSaved: true, isSaving: false });
      } else {
        patchLevel(lv, { isSaving: false });
        alert('保存に失敗しました。もう一度お試しください。');
      }
    } catch {
      patchLevel(lv, { isSaving: false });
      alert('通信エラーが発生しました。');
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ── タブ ──────────────────────────── */}
      <div
        className="flex rounded-t-xl overflow-hidden"
        style={{ borderBottom: '1.5px solid #E8CFA8' }}
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
              className="flex-1 py-3 px-2 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: active ? '#FF8C42' : '#FDF6ED',
                color:      active ? '#fff'    : '#B5896A',
              }}
            >
              {m.emoji} {m.label}
              <span className="hidden sm:inline ml-1 font-normal opacity-90">
                {m.subtitle}
              </span>
              {/* タブに既存内容を持っているサイン（小さい黄色ドット） */}
              {!active && hasContent && (
                <span
                  aria-hidden
                  className="inline-block ml-1 rounded-full"
                  style={{ width: 6, height: 6, background: '#FF8C42' }}
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
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-brown)' }}>
            {meta.description}
          </p>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
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
          className="w-full rounded-xl px-4 py-3 text-sm resize-y outline-none transition-shadow disabled:opacity-50"
          style={{
            background: 'rgba(253, 246, 237, 0.5)',
            border:     '1.5px solid #E8CFA8',
            color:      'var(--color-brown)',
            fontFamily: '"Hiragino Sans", "Meiryo", sans-serif',
            boxShadow:  'inset 0 1px 3px rgba(0,0,0,0.04)',
            minHeight:  140,
          }}
          onFocus={(e) => {
            if (isStreamingHere || current.isSaving) return;
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
            {current.input.length} / 2000 文字
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
            {isStreamingHere
              ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> 評価中…</>
              : <>💞 AI Echoに評価してもらう →</>
            }
          </button>
        </div>

        {/* ── ローディング（フィードバック未受信時のみ） ── */}
        {isStreamingHere && !current.feedback && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: '#FDF6ED', color: 'var(--color-brown-light)' }}
          >
            💞 AI Echo が考えています
            <span style={{ animation: 'aiEchoDots 1.4s infinite', marginLeft: 4 }}>...</span>
          </div>
        )}

        {/* ── フィードバック表示 ────────────────────── */}
        {current.feedback && (
          <div
            className="rounded-xl px-4 py-3 flex flex-col gap-2"
            style={{
              background: 'linear-gradient(135deg, #FFF7EB, #FDF6ED)',
              border:     '1px solid #E8CFA8',
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold" style={{ color: 'var(--color-brown)' }}>
                💞 AI Echo からのフィードバック
              </span>
              {/* 保存ステータス */}
              {!isStreamingHere && current.isSaved && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: '#E8F5E9', color: '#2E7D32' }}
                >
                  ✓ 保存済み
                </span>
              )}
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--color-brown)', whiteSpace: 'pre-wrap' }}
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
                {/* 📌 保存（ログイン時のみ・未保存時のみ） */}
                {isLoggedIn && !current.isSaved && (
                  <button
                    type="button"
                    onClick={saveToHistory}
                    disabled={current.isSaving}
                    className="rounded-full px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{
                      background: '#FF8C42',
                      color:      '#fff',
                      boxShadow:  '0 2px 6px rgba(255,140,66,0.3)',
                    }}
                  >
                    {current.isSaving ? '⏳ 保存中…' : '📌 保存'}
                  </button>
                )}

                {/* 未ログイン誘導 */}
                {!isLoggedIn && authStatus !== 'loading' && (
                  <span
                    className="rounded-full px-3 py-1.5 text-[11px] font-bold"
                    style={{ background: '#FFF3CD', color: '#856404', border: '1px solid #FFD54F' }}
                    title="ログインすると履歴を保存できます"
                  >
                    💡 ログインで保存可能
                  </span>
                )}

                {/* もう一度書く */}
                <button
                  type="button"
                  onClick={resetForRewrite}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background: '#fff',
                    color:      'var(--color-brown)',
                    border:     '1px solid #E8CFA8',
                  }}
                >
                  ✏️ もう一度書く
                </button>
              </div>
            )}
          </div>
        )}

        {/* エラー */}
        {current.error && !current.feedback && (
          <div
            className="rounded-xl px-4 py-3 text-sm leading-relaxed"
            style={{ background: '#FFF5F5', color: '#7A3030', border: '1px solid #FFB3B3' }}
          >
            ⚠️ {current.error}
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
