/**
 * components/tools/3d-tutor/HotspotPanel.tsx
 * familyai.jp / うごくAI教室 3D 図鑑 (Rev34 Phase 1 / Rev36)
 *
 * 3D モデルでホットスポットがタップされた時に画面下から立ち上がるパネル。
 * `components/article/AIChatWidget.tsx` の UI スタイル（オレンジ→peach グラデ
 * ヘッダー・ChatBubble 風メッセージ・textarea 入力）を踏襲する。
 *
 * 仕様（Rev36 ユーザー要望反映）:
 *   - 子供／おとな モード切替は廃止（AI に統一的に質問できるシンプル化）
 *   - 既定説明文を「最初の AI メッセージ」として表示
 *   - ユーザーはホットスポットに紐づく文脈で自由質問できる
 *   - /api/ai に articleTitle + articleExcerpt 経由で 3D モデル + パーツ情報を渡し
 *     サーバ側の buildArticleSystemPrompt() に system prompt 構築を委ねる
 *     （AIChatWidget と同じパターン）
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Tutor3dHotspot, Tutor3dModel } from '@/shared';

interface Message {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  streaming?: boolean;
}

export interface HotspotPanelProps {
  model:   Tutor3dModel;
  hotspot: Tutor3dHotspot | null;
  onClose: () => void;
}

export function HotspotPanel({ model, hotspot, onClose }: HotspotPanelProps) {
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const abortRef     = useRef<AbortController | null>(null);
  const composingRef = useRef(false);

  // hotspot が切り替わったら会話・入力をリセット
  // 初期メッセージとして「既定説明文」を assistant 発言として 1 件挿入する。
  useEffect(() => {
    abortRef.current?.abort();
    if (hotspot) {
      const initial: Message[] = hotspot.defaultExplanation
        ? [{
            id:      `intro-${hotspot.id}`,
            role:    'assistant',
            content: hotspot.defaultExplanation,
          }]
        : [];
      setMessages(initial);
    } else {
      setMessages([]);
    }
    setInput('');
    setError(null);
    setIsLoading(false);
  }, [hotspot?.id, hotspot]);

  // 新着メッセージへ自動スクロール（パネル内部のみ）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  // パネルが開いたら入力欄にフォーカス
  useEffect(() => {
    if (hotspot) setTimeout(() => inputRef.current?.focus(), 200);
  }, [hotspot]);

  // アンマウント時にストリーム中断
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!hotspot) return;
    const text = input.trim();
    if (!text || isLoading) return;

    setError(null);

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // 前回ストリームをキャンセル
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    // /api/ai 仕様: messages は user/assistant のみ。
    // 3D モデル + ホットスポット情報を articleTitle / articleExcerpt 経由でサーバへ渡す。
    const articleTitle  = `${model.title} — ${hotspot.partName}`;
    const articleExcerpt = [
      `3D モデル「${model.title}」を観察中。`,
      model.description ? `モデル概要: ${model.description}` : '',
      `タップされたパーツ: ${hotspot.partName}`,
      hotspot.defaultExplanation ? `既定説明: ${hotspot.defaultExplanation}` : '',
      hotspot.promptHint ? `背景情報: ${hotspot.promptHint}` : '',
      '子ども（小学生〜中学生）にも分かるよう、優しい言葉と適度な絵文字で回答してください。',
    ].filter(Boolean).join(' / ').slice(0, 500);

    // 会話履歴: 既定説明（intro）を除いた user/assistant のみ送信
    const history = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .filter((m) => !m.id.startsWith('intro-'))
      .map((m) => ({ role: m.role, content: m.content }));

    // ストリーミング用 placeholder
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ]);
    setIsLoading(false);

    try {
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:           'text-simple',
          messages:       history,
          articleTitle,
          articleExcerpt,
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        let serverMsg: string | null = null;
        try {
          const j = await res.json() as { error?: { message?: string } | string };
          if (typeof j.error === 'string')           serverMsg = j.error;
          else if (j.error?.message)                  serverMsg = j.error.message;
        } catch { /* noop */ }
        const fallback = res.status === 429
          ? '質問が集中しています。少し時間をおいてもう一度お試しください。'
          : 'AI からの応答を取得できませんでした。';
        const msg = serverMsg ?? fallback;
        setMessages((prev) => prev.map((m) =>
          m.id === assistantId ? { ...m, content: msg, streaming: false } : m,
        ));
        setError(msg);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') break;
          try {
            const obj = JSON.parse(payload) as { delta?: string };
            if (obj.delta) {
              acc += obj.delta;
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId ? { ...m, content: acc } : m,
              ));
            }
          } catch { /* ignore malformed SSE lines */ }
        }
      }

      // 完了 → streaming フラグ解除
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId ? { ...m, streaming: false } : m,
      ));
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = (err as Error).message || '通信エラーが発生しました。';
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId ? { ...m, content: msg, streaming: false } : m,
      ));
      setError(msg);
    }
  }, [input, isLoading, messages, hotspot, model.title, model.description]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (composingRef.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  // hotspot 未選択時のガイダンス表示（サイドバー常駐型のため null を返さない）
  if (!hotspot) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'white',
          boxShadow:  'var(--shadow-warm-sm, 0 2px 10px rgba(107, 79, 58, 0.08))',
          border:     '1px solid var(--color-beige)',
        }}
      >
        <div
          className="flex items-center gap-3 p-4"
          style={{ background: 'linear-gradient(135deg, var(--color-orange) 0%, var(--color-peach) 100%)' }}
        >
          <span className="text-2xl" aria-hidden="true">💞</span>
          <div>
            <p className="font-bold text-sm text-white">AI に質問する</p>
            <p className="text-xs text-white/80 truncate">
              3D「{model.title}」を一緒に観察
            </p>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-3 text-center">
          <span className="text-3xl" aria-hidden="true">👆</span>
          <p className="text-sm" style={{ color: 'var(--color-brown-light)', lineHeight: 1.7 }}>
            左の 3D モデルの<br />
            <strong style={{ color: 'var(--color-orange)' }}>オレンジの光っている点</strong>をタップしてみよう。<br />
            あいちゃんが、その部分について<br />
            やさしく教えてくれるよ！
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-labelledby="hotspot-panel-title"
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'white',
        boxShadow:  'var(--shadow-warm-sm, 0 2px 10px rgba(107, 79, 58, 0.08))',
        border:     '1px solid var(--color-beige)',
        height:     'min(70vh, 560px)',
        animation:  'fadeUp 0.2s ease-out',
      }}
    >
      {/* ── ヘッダー（AIChatWidget 同等のグラデ） ─────────────── */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--color-orange) 0%, var(--color-peach) 100%)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0" aria-hidden="true">💞</span>
          <div className="flex flex-col min-w-0">
            <p
              id="hotspot-panel-title"
              className="font-bold text-sm text-white truncate"
            >
              {hotspot.partName} について
            </p>
            <p className="text-[11px] text-white/85 truncate">
              3D「{model.title}」
            </p>
          </div>
        </div>
        <button
          onClick={() => { abortRef.current?.abort(); onClose(); }}
          className="text-white/80 hover:text-white transition-colors text-lg leading-none min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
          aria-label="ホットスポット選択を解除"
          title="別の場所を選ぶ"
        >
          ✕
        </button>
      </div>

        {/* ── メッセージ一覧 ─────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
          style={{ overscrollBehavior: 'contain' }}
          role="log"
          aria-live="polite"
          aria-label="チャット履歴"
        >
          {messages.length === 0 && (
            <div className="text-center py-6 flex flex-col items-center gap-2">
              <span className="text-3xl" aria-hidden="true">💬</span>
              <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
                「{hotspot.partName}」について何でも質問してね！
              </p>
            </div>
          )}

          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}

          {isLoading && <TypingIndicator />}

          {error && (
            <p
              className="text-xs leading-relaxed px-3 py-2 rounded-xl"
              style={{
                background: 'var(--color-peach-light, var(--color-beige))',
                color:      'var(--color-brown)',
                border:     '1px solid var(--color-beige-dark)',
              }}
            >
              ⚠️ {error}
            </p>
          )}
        </div>

        {/* ── 入力エリア（AIChatWidget と同等の textarea + 送信） ── */}
        <form
          onSubmit={handleSubmit}
          className="shrink-0 flex gap-2 p-3 border-t"
          style={{ borderColor: 'var(--color-beige)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => { composingRef.current = false; }}
            placeholder="質問を入力…（Enterで送信 / Shift+Enterで改行）"
            rows={2}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none transition-[border-color,box-shadow]"
            style={{
              borderColor: 'var(--color-beige-dark)',
              color:       'var(--color-brown)',
              background:  'var(--color-cream)',
              maxHeight:   '120px',
              lineHeight:  '1.5',
            }}
            aria-label="質問を入力"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-[background-color,color] disabled:opacity-40"
            style={{
              background: input.trim() && !isLoading ? 'var(--color-orange)' : 'var(--color-beige-dark)',
              color:      'white',
              minHeight:  44,
              minWidth:   44,
              border:     'none',
              cursor:     input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
            aria-label="質問を送信"
          >
            ➤
          </button>
        </form>
    </div>
  );
}

// ── チャットバブル（AIChatWidget の ChatBubble 簡易版） ──
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}>
      <div
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm"
        style={{
          background: isUser ? 'var(--color-orange)' : 'var(--color-beige)',
          color:      isUser ? 'white' : 'var(--color-brown)',
        }}
        aria-hidden="true"
      >
        {isUser ? '👤' : '💞'}
      </div>
      <div className="max-w-[85%]">
        <div
          className="px-3 py-2 text-sm"
          style={{
            background:   isUser ? 'var(--color-orange)' : 'var(--color-beige)',
            color:        isUser ? 'white' : 'var(--color-brown)',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            whiteSpace:   'pre-wrap',
            lineHeight:   1.75,
          }}
        >
          {message.content || (message.streaming ? '' : '…')}
          {message.streaming && (
            <span
              className="inline-block w-0.5 h-4 ml-0.5 align-middle"
              style={{ background: 'var(--color-brown-light)', animation: 'blink 0.8s step-end infinite' }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── ローディングドット（AIChatWidget と同等） ──
function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
        style={{ background: 'var(--color-beige)', color: 'var(--color-brown)' }}
        aria-hidden="true"
      >
        💞
      </div>
      <div
        className="px-4 py-3 rounded-2xl"
        style={{ background: 'var(--color-beige)', borderRadius: '18px 18px 18px 4px' }}
      >
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background:     'var(--color-brown-light)',
                animation:      'pulse-soft 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
