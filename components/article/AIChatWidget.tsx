'use client';

/**
 * components/article/AIChatWidget.tsx
 * familyai.jp — 記事内AIチャットウィジェット
 *
 * - 記事の内容についてAIに質問できるチャットUI
 * - Step 17 でストリーミング API（/api/chat）と接続する
 * - 現状はスタブレスポンス（APIキー未設定時）を返す
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// ── 型定義 ─────────────────────────────────────────────────────
interface Message {
  role:    'user' | 'assistant';
  content: string;
  id:      string;
}

interface AIChatWidgetProps {
  articleTitle:   string;
  /** Step 17 で /api/chat に渡すスラッグ */
  articleSlug?:   string;
  /** Step 17 で /api/chat に渡す概要 */
  articleExcerpt?: string;
}

// ── スタブレスポンス（Step 17 まで） ──────────────────────────
const STUB_RESPONSES = [
  'ご質問ありがとうございます！AIチャット機能は準備中です。もうしばらくお待ちください 🙏',
  'この機能は近日公開予定です。familyai.jp をお楽しみに！',
  'AIが記事の内容について詳しくお答えします。サービス開始までもう少々お待ちを😊',
];

let stubIndex = 0;
function getStubResponse() {
  const res = STUB_RESPONSES[stubIndex % STUB_RESPONSES.length]!;
  stubIndex++;
  return res;
}

// ── チャットバブル ─────────────────────────────────────────────
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div
      className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}
    >
      {/* アバター */}
      <div
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm"
        style={{
          background: isUser ? 'var(--color-orange)' : 'var(--color-beige)',
          color:      isUser ? 'white' : 'var(--color-brown)',
        }}
        aria-hidden="true"
      >
        {isUser ? '👤' : '🤖'}
      </div>

      {/* バブル本体 */}
      <div
        className="max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed"
        style={{
          background:   isUser ? 'var(--color-orange)' : 'var(--color-beige)',
          color:        isUser ? 'white' : 'var(--color-brown)',
          borderRadius: isUser
            ? '18px 18px 4px 18px'
            : '18px 18px 18px 4px',
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

// ── ローディングドット ─────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
        style={{ background: 'var(--color-beige)', color: 'var(--color-brown)' }}
        aria-hidden="true"
      >
        🤖
      </div>
      <div
        className="px-4 py-3 rounded-2xl"
        style={{
          background:   'var(--color-beige)',
          borderRadius: '18px 18px 18px 4px',
        }}
      >
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background:      'var(--color-brown-light)',
                animation:       'pulseSoft 1.2s ease-in-out infinite',
                animationDelay:  `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── メインコンポーネント ───────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AIChatWidget({ articleTitle, articleSlug, articleExcerpt }: AIChatWidgetProps) {
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [isOpen,     setIsOpen]     = useState(false);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);

  // 新着メッセージへ自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 開いたら入力欄にフォーカス
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id:      crypto.randomUUID(),
      role:    'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // TODO Step 17: 実際の API 呼び出しに差し替え
      // スタブ（800ms 疑似レイテンシ）
      await new Promise((r) => setTimeout(r, 800));
      const reply = getStubResponse();

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id:      crypto.randomUUID(),
          role:    'assistant',
          content: 'エラーが発生しました。もう一度お試しください。',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isLoading]);

  // Enterキー送信（Shift+Enter で改行）
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  // ── 折りたたみ状態（CTA ボタン） ─────────────────────────────
  if (!isOpen) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: 'var(--shadow-warm-sm)', border: '1px solid var(--color-beige)' }}
      >
        {/* ヘッダー */}
        <div
          className="flex items-center gap-3 p-4"
          style={{ background: 'linear-gradient(135deg, var(--color-orange) 0%, var(--color-peach) 100%)' }}
        >
          <span className="text-2xl" aria-hidden="true">🤖</span>
          <div>
            <p className="font-bold text-sm text-white">AIに質問する</p>
            <p className="text-xs text-white/80">この記事について何でも聞けます</p>
          </div>
        </div>

        {/* 本体 */}
        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
            「{articleTitle.length > 20 ? articleTitle.slice(0, 20) + '…' : articleTitle}」について疑問があれば、AIが丁寧にお答えします。
          </p>

          {/* よくある質問ボタン */}
          {[
            'もっと簡単に教えて',
            '実際の手順を教えて',
            'このAIツールは安全？',
          ].map((q) => (
            <button
              key={q}
              onClick={() => {
                setIsOpen(true);
                setInput(q);
              }}
              className="text-left text-sm px-3 py-2 rounded-xl border transition-opacity hover:opacity-80 min-h-[44px]"
              style={{
                background:  'var(--color-cream)',
                borderColor: 'var(--color-beige)',
                color:       'var(--color-brown)',
              }}
            >
              💬 {q}
            </button>
          ))}

          <button
            onClick={() => setIsOpen(true)}
            className="btn-primary w-full text-sm mt-1"
          >
            チャットを開く →
          </button>
        </div>
      </div>
    );
  }

  // ── 開いた状態（チャット） ────────────────────────────────────
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'white',
        boxShadow:  'var(--shadow-warm-sm)',
        border:     '1px solid var(--color-beige)',
        height:     '420px',
      }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--color-orange) 0%, var(--color-peach) 100%)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">🤖</span>
          <p className="font-bold text-sm text-white">AIに質問する</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white transition-colors text-lg leading-none min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="チャットを閉じる"
        >
          ✕
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
        role="log"
        aria-live="polite"
        aria-label="チャット履歴"
      >
        {/* ウェルカムメッセージ */}
        {messages.length === 0 && (
          <div
            className="text-center py-4 flex flex-col items-center gap-2"
          >
            <span className="text-3xl" aria-hidden="true">💬</span>
            <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
              記事の内容について気軽に質問してください！
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* 入力エリア */}
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
          placeholder="質問を入力…（Enterで送信）"
          rows={1}
          disabled={isLoading}
          className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none transition-[border-color,box-shadow]"
          style={{
            borderColor:    'var(--color-beige-dark)',
            color:          'var(--color-brown)',
            background:     'var(--color-cream)',
            maxHeight:      '96px',
            lineHeight:     '1.5',
          }}
          aria-label="質問を入力"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-[border-color,box-shadow]"
          style={{
            background: input.trim() && !isLoading
              ? 'var(--color-orange)'
              : 'var(--color-beige)',
            color: input.trim() && !isLoading ? 'white' : 'var(--color-brown-light)',
          }}
          aria-label="送信"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
