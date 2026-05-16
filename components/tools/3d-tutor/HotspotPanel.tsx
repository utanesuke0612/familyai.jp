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
import { MarkdownContent } from '@/components/ui/MarkdownContent';

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

      // SSE ストリームを読み込んでリアルタイム更新
      // Codex Q1-3 / Q2-5 対応: delta 毎の setMessages を 60ms throttle にまとめる。
      // 既存 AIChatWidget (Rev31 CX-2) と同じパターン。長文回答時の React 再レンダリング暴発を抑制。
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc    = '';
      let lastFlushAt = 0;
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      const FLUSH_INTERVAL_MS = 60;

      const flushNow = () => {
        lastFlushAt = Date.now();
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        setMessages((prev) => prev.map((m) =>
          m.id === assistantId ? { ...m, content: acc } : m,
        ));
      };
      const scheduleFlush = () => {
        const elapsed = Date.now() - lastFlushAt;
        if (elapsed >= FLUSH_INTERVAL_MS) {
          flushNow();
        } else if (!flushTimer) {
          flushTimer = setTimeout(flushNow, FLUSH_INTERVAL_MS - elapsed);
        }
      };

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
              scheduleFlush();
            }
          } catch { /* ignore malformed SSE lines */ }
        }
      }

      // ループ終了時に未 flush の差分を反映 + streaming フラグ解除
      if (flushTimer) clearTimeout(flushTimer);
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId ? { ...m, content: acc, streaming: false } : m,
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
        className="overflow-hidden"
        style={{
          background:   'white',
          border:       '1px solid var(--line)',
          borderRadius: '4px',
        }}
      >
        <div
          className="flex items-center gap-3 p-4"
          style={{ background: 'var(--shu)' }}
        >
          <div>
            <p className="font-mincho text-sm text-white" style={{ fontWeight: 500 }}>AI に質問する</p>
            <p className="text-xs text-white/80 truncate">
              3D「{model.title}」を一緒に観察
            </p>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-3 text-center">
          <p className="text-sm" style={{ color: 'var(--sumi-light)', lineHeight: 1.7 }}>
            左の 3D モデルを<br />
            ぐるぐる回したり、<br />
            <strong style={{ color: 'var(--shu)' }}>気になる部分をタップ</strong>してみよう。<br />
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
      className="overflow-hidden flex flex-col"
      style={{
        background:   'white',
        border:       '1px solid var(--line)',
        borderRadius: '4px',
        height:       'min(70vh, 560px)',
        animation:    'fadeUp 0.2s ease-out',
      }}
    >
      {/* ── ヘッダー ─────────────── */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
        style={{ background: 'var(--shu)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <p
              id="hotspot-panel-title"
              className="font-mincho text-sm text-white truncate"
              style={{ fontWeight: 500 }}
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
              <p className="text-sm" style={{ color: 'var(--sumi-light)' }}>
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
              className="text-xs leading-relaxed px-3 py-2"
              style={{
                background:   'var(--washi-deep)',
                color:        'var(--sumi)',
                border:       '1px solid var(--line)',
                borderRadius: '4px',
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* ── 入力エリア（AIChatWidget と同等の textarea + 送信） ── */}
        <form
          onSubmit={handleSubmit}
          className="shrink-0 flex gap-2 p-3 border-t"
          style={{ borderColor: 'var(--line)' }}
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
            className="flex-1 resize-none border px-3 py-2 text-sm outline-none transition-[border-color,box-shadow]"
            style={{
              borderColor:  'var(--line)',
              borderRadius: '4px',
              color:        'var(--sumi)',
              background:   'var(--washi-light)',
              maxHeight:    '120px',
              lineHeight:   '1.5',
            }}
            aria-label="質問を入力"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-10 h-10 flex items-center justify-center transition-[background-color,color] disabled:opacity-40"
            style={{
              background:   input.trim() && !isLoading ? 'var(--shu)' : 'var(--line)',
              color:        'white',
              minHeight:    44,
              minWidth:     44,
              border:       'none',
              borderRadius: '4px',
              cursor:       input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
            aria-label="質問を送信"
          >
            ➤
          </button>
        </form>
    </div>
  );
}

// ── チャットバブル（AIChatWidget の ChatBubble と同等・Markdown レンダリング対応）──
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}>
      <div
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-mincho text-xs"
        style={{
          background: isUser ? 'var(--shu)' : 'var(--washi-deep)',
          color:      isUser ? 'white' : 'var(--sumi)',
          fontWeight: 500,
        }}
        aria-hidden="true"
      >
        {isUser ? '私' : 'AI'}
      </div>
      <div className="max-w-[85%]">
        <div
          className="px-3 py-2 text-sm"
          style={{
            background:   isUser ? 'var(--shu)' : 'var(--washi-deep)',
            color:        isUser ? 'white' : 'var(--sumi)',
            borderRadius: '4px',
            lineHeight:   1.75,
          }}
        >
          {isUser ? (
            // ユーザー発言: プレーンテキスト
            <span style={{ whiteSpace: 'pre-wrap' }}>
              {message.content || (message.streaming ? '' : '…')}
            </span>
          ) : message.streaming ? (
            // ストリーミング中: プレーンテキスト + 点滅カーソル (Markdown は完了後に差し替え)
            <span style={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
              <span
                className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                style={{ background: 'var(--sumi-light)', animation: 'blink 0.8s step-end infinite' }}
                aria-hidden="true"
              />
            </span>
          ) : message.content ? (
            // ストリーミング完了: Markdown レンダリング (AIChatWidget と同じ仕組み)
            <MarkdownContent color="var(--sumi)" fontSize="0.875rem">
              {message.content}
            </MarkdownContent>
          ) : (
            <span>…</span>
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
        className="w-7 h-7 rounded-full flex items-center justify-center font-mincho text-xs shrink-0"
        style={{ background: 'var(--washi-deep)', color: 'var(--sumi)', fontWeight: 500 }}
        aria-hidden="true"
      >
        AI
      </div>
      <div
        className="px-4 py-3"
        style={{ background: 'var(--washi-deep)', borderRadius: '4px' }}
      >
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background:     'var(--sumi-light)',
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
