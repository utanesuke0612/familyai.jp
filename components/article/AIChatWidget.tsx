'use client';

/**
 * components/article/AIChatWidget.tsx
 * familyai.jp — 記事内AIチャットウィジェット（SSEストリーミング対応）
 *
 * - 記事の内容についてAIに質問できるチャットUI
 * - /api/ai（SSEストリーミング）と接続
 * - リアルタイムでAI応答を表示（タイピングアニメーション）
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// ── 型定義 ─────────────────────────────────────────────────────
interface Message {
  role:    'user' | 'assistant';
  content: string;
  id:      string;
  /** ストリーミング中かどうか */
  streaming?: boolean;
}

interface AIChatWidgetProps {
  articleTitle:    string;
  articleSlug?:    string;
  articleExcerpt?: string;
  /** カテゴリ配列（language系なら text-quality モデルを選択） */
  articleCategories?: string[];
}

// ── AI タイプ選択 ──────────────────────────────────────────────
function selectAiType(categories?: string[]): 'text-simple' | 'text-quality' {
  const languageCats = ['voice', 'education'];
  if (categories?.some((c) => languageCats.includes(c))) return 'text-quality';
  return 'text-simple';
}

// ── AI応答を段落・箇条書きに整形 ───────────────────────────────
function formatAssistantContent(raw: string): React.ReactNode {
  const normalized = raw
    .replace(/\s+(\d+\.)\s*/g, '\n$1 ')
    .replace(/\s*([・•])\s*/g, '\n$1 ')
    .replace(/([。！？!?])\s+(?=\S)/g, '$1\n');

  const blocks = normalized.split(/\n{2,}|\n(?=\d+\.\s|[・•])/).map(b => b.trim()).filter(Boolean);

  return blocks.map((block, i) => {
    const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
    const isList = lines.length > 1 && lines.every(l => /^(\d+\.\s|[・•]\s)/.test(l));
    if (isList) {
      const ordered = /^\d+\./.test(lines[0]!);
      const ListTag = ordered ? 'ol' : 'ul';
      return (
        <ListTag key={i} style={{ paddingLeft: '1.25em', margin: '0.25em 0' }}>
          {lines.map((l, j) => (
            <li key={j} style={{ marginBottom: '0.2em' }}>
              {l.replace(/^(\d+\.\s|[・•]\s)/, '')}
            </li>
          ))}
        </ListTag>
      );
    }
    return (
      <p key={i} style={{ margin: i === 0 ? '0 0 0.5em' : '0.5em 0', whiteSpace: 'pre-wrap' }}>
        {block}
      </p>
    );
  });
}

// ── チャットバブル ─────────────────────────────────────────────
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  return (
    <div
      className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}
    >
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

      <div className="max-w-[85%] flex flex-col gap-1">
        <div
          className="px-3 py-2 text-sm leading-relaxed"
          style={{
            background:   isUser ? 'var(--color-orange)' : 'var(--color-beige)',
            color:        isUser ? 'white' : 'var(--color-brown)',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          }}
        >
          {message.content
            ? (isUser ? message.content : formatAssistantContent(message.content))
            : (message.streaming ? '' : '…')}
          {message.streaming && (
            <span
              className="inline-block w-0.5 h-4 ml-0.5 align-middle"
              style={{
                background: 'var(--color-brown-light)',
                animation:  'blink 0.8s step-end infinite',
              }}
              aria-hidden="true"
            />
          )}
        </div>

        {!isUser && message.content && !message.streaming && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label="回答をコピー"
            className="self-start text-xs px-2 py-0.5 rounded-md transition-opacity hover:opacity-80"
            style={{
              background: copied ? 'var(--color-orange)' : 'transparent',
              color:      copied ? 'white' : 'var(--color-brown-light)',
              border:     '1px solid var(--color-beige-dark)',
              minHeight:  'auto',
            }}
          >
            {copied ? '✓ コピー済' : '📋 コピー'}
          </button>
        )}
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

// ── メインコンポーネント ───────────────────────────────────────
export function AIChatWidget({
  articleTitle,
  articleSlug:    _articleSlug, // eslint-disable-line @typescript-eslint/no-unused-vars
  articleExcerpt,
  articleCategories,
}: AIChatWidgetProps) {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen,    setIsOpen]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef   = useRef<AbortController | null>(null);
  const composingRef = useRef(false);

  // 新着メッセージへ自動スクロール（チャット内部のみスクロール、ページ全体は動かさない）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  // 開いたら入力欄にフォーカス
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  // アンマウント時にストリームを中断
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setError(null);

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // 前回のストリームをキャンセル
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    // 会話履歴（user / assistant のみ送信）
    const history = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    // ストリーミング用のメッセージを先に追加
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ]);
    setIsLoading(false); // ドット表示をやめてカーソル表示に切り替え

    try {
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:           selectAiType(articleCategories),
          messages:       history,
          articleTitle,
          articleExcerpt: articleExcerpt?.slice(0, 300),
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      // SSE ストリームを読み込んでリアルタイム更新
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
            const json = JSON.parse(payload) as { delta?: string; error?: string; code?: string };

            if (json.error) {
              // API がエラーをストリームで返してきた場合
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: json.error!, streaming: false }
                    : m,
                ),
              );
              setError(json.error);
              return;
            }

            if (json.delta) {
              accumulated += json.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: accumulated, streaming: true }
                    : m,
                ),
              );
            }
          } catch {
            // 不正な JSON はスキップ
          }
        }
      }

      // ストリーム完了 → streaming フラグを解除
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m,
        ),
      );
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'エラーが発生しました。もう一度お試しください。', streaming: false }
            : m,
        ),
      );
      setError('エラーが発生しました。');
    }
  }, [input, isLoading, messages, articleTitle, articleExcerpt, articleCategories]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // IME変換中（日本語入力の確定Enter）は送信しない
    // `isComposing` / keyCode 229 / composingRef（onCompositionStart/End で更新）を多層チェック
    if (composingRef.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  }

  // ── 折りたたみ状態（CTA ボタン） ─────────────────────────────
  if (!isOpen) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: 'var(--shadow-warm-sm)', border: '1px solid var(--color-beige)' }}
      >
        <div
          className="flex items-center gap-3 p-4"
          style={{ background: 'linear-gradient(135deg, var(--color-orange) 0%, var(--color-peach) 100%)' }}
        >
          <span className="text-2xl" aria-hidden="true">💞</span>
          <div>
            <p className="font-bold text-sm text-white">AIに質問する</p>
            <p className="text-xs text-white/80">この記事について何でも聞けます</p>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
            「{articleTitle.length > 20 ? articleTitle.slice(0, 20) + '…' : articleTitle}」について疑問があれば、AIが丁寧にお答えします。
          </p>

          {[
            'もっと簡単に教えて',
            '実際の手順を教えて',
            'このAIツールは安全？',
          ].map((q) => (
            <button
              key={q}
              onClick={() => { setIsOpen(true); setInput(q); }}
              className="text-left text-sm px-3 py-2 rounded-xl border transition-opacity hover:opacity-80 min-h-[44px]"
              style={{ background: 'var(--color-cream)', borderColor: 'var(--color-beige)', color: 'var(--color-brown)' }}
            >
              💬 {q}
            </button>
          ))}

          <button onClick={() => setIsOpen(true)} className="btn-primary w-full text-sm mt-1">
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
      style={{ background: 'white', boxShadow: 'var(--shadow-warm-sm)', border: '1px solid var(--color-beige)', height: '500px' }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--color-orange) 0%, var(--color-peach) 100%)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">💞</span>
          <p className="font-bold text-sm text-white">AIに質問する</p>
        </div>
        <button
          onClick={() => { abortRef.current?.abort(); setIsOpen(false); }}
          className="text-white/80 hover:text-white transition-colors text-lg leading-none min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="チャットを閉じる"
        >
          ✕
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
        style={{ overscrollBehavior: 'contain' }}
        role="log"
        aria-live="polite"
        aria-label="チャット履歴"
      >
        {messages.length === 0 && (
          <div className="text-center py-4 flex flex-col items-center gap-2">
            <span className="text-3xl" aria-hidden="true">💬</span>
            <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
              記事の内容について気軽に質問してください！
            </p>
          </div>
        )}

        {messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)}
        {isLoading && <TypingIndicator />}

        {/* エラー通知 */}
        {error && (
          <p className="text-xs text-center px-3 py-2 rounded-xl" style={{ background: 'var(--color-beige)', color: 'var(--color-brown-light)' }}>
            ⚠️ {error}
          </p>
        )}

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
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-[background-color,color]"
          style={{
            background: input.trim() && !isLoading ? 'var(--color-orange)' : 'var(--color-beige)',
            color:      input.trim() && !isLoading ? 'white' : 'var(--color-brown-light)',
          }}
          aria-label="送信"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
