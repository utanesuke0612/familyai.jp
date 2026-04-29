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
import { useAiMemoBookmark } from '@/lib/ai-memo-store';
import { MarkdownContent }   from '@/components/ui/MarkdownContent';

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
  /** 初期表示のクイック質問（3件推奨）。未指定時は記事向けデフォルト */
  suggestedQuestions?: string[];
  /**
   * 表示モード（既定: 'simple'）。
   *  - 'simple'    : 通常記事ページ用。カテゴリタブなし・suggestedQuestions or デフォルト4問。
   *  - 'aictation' : AIctation/VOA 英語ディクテーション用。5カテゴリタブ + 各 3 質問・常に text-quality。
   *
   * 'aictation' 時は articleCategories と suggestedQuestions は無視される。
   */
  mode?: 'simple' | 'aictation';
}

const DEFAULT_SUGGESTED_QUESTIONS = [
  'もっと簡単に教えて',
  '実際の手順を教えて',
  'このAIツールは安全？',
];

// ── AIctation モード用：5 カテゴリ × 3 定型質問 ────────────────
const AICTATION_CATEGORIES = [
  {
    id:        'content',
    label:     '📖 内容',
    questions: [
      'このレッスンの内容を3文で要約して',
      '誰が・いつ・どこで・何をした？',
      'このニュースの背景を教えて',
    ],
  },
  {
    id:        'vocab',
    label:     '📚 語彙',
    questions: [
      '重要単語を5個教えて（意味・例文付き）',
      '難しい表現をやさしく説明して',
      'よく使うフレーズを3つ教えて',
    ],
  },
  {
    id:        'grammar',
    label:     '📝 文法',
    questions: [
      '気になった文法を1つ説明して',
      '時制（現在・過去・完了）の使われ方を教えて',
      '受動態の文を見つけて説明して',
    ],
  },
  {
    id:        'practice',
    label:     '✍️ 練習',
    questions: [
      '英語3文でレッスンの内容をまとめて',
      '私の英文を添削して：',
      'このトピックで意見を書くヒントをくれる？',
    ],
  },
  {
    id:        'review',
    label:     '🎯 復習',
    questions: [
      '重要単語の穴埋め問題を作って',
      'このレッスンからクイズを3問出して',
      '難しかった単語を使った例文を作って',
    ],
  },
] as const;

type AictationCategoryId = typeof AICTATION_CATEGORIES[number]['id'];

// ── AI タイプ選択 ──────────────────────────────────────────────
function selectAiType(
  categories?: string[],
  mode?: 'simple' | 'aictation',
): 'text-simple' | 'text-quality' {
  // AIctation モードは語学高品質回答に最適化（強制 text-quality）
  if (mode === 'aictation') return 'text-quality';
  const languageCats = ['education'];
  if (categories?.some((c) => languageCats.includes(c))) return 'text-quality';
  return 'text-simple';
}

// ── AI応答を段落・箇条書きに整形 ───────────────────────────────

interface ChatBubbleProps {
  message:      Message;
  question?:    string;
  articleTitle: string;
  articleSlug?: string;
}

// ── チャットバブル ─────────────────────────────────────────────
function ChatBubble({ message, question, articleTitle, articleSlug }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const { saved, toggle, isLoggedIn } = useAiMemoBookmark(message.id);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  const handleSave = () => {
    toggle({
      id:           message.id,
      answer:       message.content,
      question:     question ?? '',
      articleTitle,
      articleSlug,
    });
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
          className="px-3 py-2 text-sm"
          style={{
            background:   isUser ? 'var(--color-orange)' : 'var(--color-beige)',
            color:        isUser ? 'white' : 'var(--color-brown)',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          }}
        >
          {isUser ? (
            /* ユーザー発言: プレーンテキスト */
            <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
              {message.content || (message.streaming ? '' : '…')}
            </span>
          ) : message.streaming ? (
            /* ストリーミング中: プレーンテキスト + カーソル */
            <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
              {message.content}
              <span
                className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                style={{ background: 'var(--color-brown-light)', animation: 'blink 0.8s step-end infinite' }}
                aria-hidden="true"
              />
            </span>
          ) : message.content ? (
            /* ストリーミング完了: Markdown レンダリング */
            <MarkdownContent color="var(--color-brown)" fontSize="0.875rem">
              {message.content}
            </MarkdownContent>
          ) : (
            <span style={{ lineHeight: 1.75 }}>…</span>
          )}
        </div>

        {!isUser && message.content && !message.streaming && (
          <div className="flex gap-1 self-start">
            <button
              type="button"
              onClick={handleCopy}
              aria-label="回答をコピー"
              className="text-xs px-2 py-0.5 rounded-md transition-opacity hover:opacity-80"
              style={{
                background: copied ? 'var(--color-orange)' : 'transparent',
                color:      copied ? 'white' : 'var(--color-brown-light)',
                border:     '1px solid var(--color-beige-dark)',
                minHeight:  'auto',
              }}
            >
              {copied ? '✓ コピー済' : '📋 コピー'}
            </button>
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleSave}
                aria-label={saved ? 'メモから外す' : 'AIメモ帳に保存'}
                className="text-xs px-2 py-0.5 rounded-md transition-opacity hover:opacity-80"
                style={{
                  background: saved ? 'var(--color-orange)' : 'transparent',
                  color:      saved ? 'white' : 'var(--color-brown-light)',
                  border:     '1px solid var(--color-beige-dark)',
                  minHeight:  'auto',
                }}
              >
                {saved ? '✓ 保存済' : '📌 保存'}
              </button>
            ) : (
              <a
                href="/auth/signin"
                className="text-xs px-2 py-0.5 rounded-md transition-opacity hover:opacity-80"
                style={{
                  background: 'transparent',
                  color:      'var(--color-brown-light)',
                  border:     '1px solid var(--color-beige-dark)',
                  minHeight:  'auto',
                  textDecoration: 'none',
                  display:    'inline-block',
                }}
                title="ログインするとメモを保存できます"
              >
                📌 ログインして保存
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── R3-機能1: AIctation モード用カテゴリタブ ───────────────────
function CategoryTabs({
  active,
  onChange,
}: {
  active:   AictationCategoryId;
  onChange: (id: AictationCategoryId) => void;
}) {
  return (
    <div
      className="flex gap-1.5 px-2.5 py-2 overflow-x-auto scrollbar-hide"
      style={{
        WebkitOverflowScrolling: 'touch',
        borderBottom: '1px solid var(--color-beige)',
      }}
      role="tablist"
      aria-label="質問カテゴリ"
    >
      {AICTATION_CATEGORIES.map((cat) => {
        const selected = cat.id === active;
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(cat.id)}
            className="shrink-0 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-[background-color,color]"
            style={{
              background: selected ? 'var(--color-orange)' : 'var(--color-beige)',
              color:      selected ? 'white' : 'var(--color-brown-light)',
              minHeight:  '32px',
              whiteSpace: 'nowrap',
            }}
          >
            {cat.label}
          </button>
        );
      })}
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
  articleSlug,
  articleExcerpt,
  articleCategories,
  suggestedQuestions,
  mode = 'simple',
}: AIChatWidgetProps) {
  const isAictation = mode === 'aictation';
  // 通常モード: suggestedQuestions or デフォルト 4 問
  // AIctation モード: 選択中カテゴリの 3 問（後段で activeCategory 経由）
  const simpleQuickQuestions = suggestedQuestions && suggestedQuestions.length > 0
    ? suggestedQuestions
    : DEFAULT_SUGGESTED_QUESTIONS;
  const [messages,        setMessages]        = useState<Message[]>([]);
  const [input,           setInput]           = useState('');
  const [isLoading,       setIsLoading]       = useState(false);
  const [isOpen,          setIsOpen]          = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  // R3-機能1: AIctation モードでのみ使用（デフォルト「内容」タブ）
  const [activeCategory,  setActiveCategory]  = useState<AictationCategoryId>('content');

  // 現在表示すべきクイック質問（モードで分岐）
  const quickQuestions: readonly string[] = isAictation
    ? (AICTATION_CATEGORIES.find((c) => c.id === activeCategory)?.questions ?? [])
    : simpleQuickQuestions;
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
          type:           selectAiType(articleCategories, mode),
          messages:       history,
          articleTitle,
          articleExcerpt: articleExcerpt?.slice(0, 300),
        }),
        signal: ac.signal,
      });

      // Rev28 #HIGH-3: ストリーム確立前のエラーは 4xx/5xx JSON で返る
      if (!res.ok) {
        let serverMessage: string | null = null;
        let serverCode:    string | null = null;
        try {
          const j = await res.json() as { error?: { message?: string; code?: string } | string };
          if (typeof j.error === 'string')                 serverMessage = j.error;
          else if (j.error?.message)                       serverMessage = j.error.message;
          if (typeof j.error === 'object' && j.error?.code) serverCode = j.error.code;
        } catch { /* JSON でない場合は既定メッセージ */ }

        // ユーザー向けに分かりやすいメッセージを組み立てる
        let friendly: string;
        if (res.status === 429 || serverCode === 'RATE_LIMIT_EXCEEDED') {
          friendly = serverMessage
            ?? '今日のAI利用回数の上限に達しました。明日またお試しください（ログインすると上限が増えます）。';
        } else if (res.status === 401 || res.status === 403) {
          friendly = serverMessage ?? 'ログインが必要、またはアクセスが許可されていません。';
        } else if (res.status === 400) {
          friendly = serverMessage ?? '入力内容を確認してもう一度お試しください。';
        } else if (res.status >= 500) {
          friendly = serverMessage ?? 'サーバーでエラーが発生しました。少し時間をおいてから再度お試しください。';
        } else {
          friendly = serverMessage ?? `通信エラーが発生しました（HTTP ${res.status}）。`;
        }
        throw new Error(friendly);
      }
      if (!res.body) throw new Error(`HTTP ${res.status}`);

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

      const msg = (err as Error).message?.trim() || 'エラーが発生しました。もう一度お試しください。';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: msg, streaming: false }
            : m,
        ),
      );
      setError(msg);
    }
  }, [input, isLoading, messages, articleTitle, articleExcerpt, articleCategories, mode]);

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
            <p className="text-xs text-white/80">
              {isAictation ? 'このレッスンについて何でも聞けます' : 'この記事について何でも聞けます'}
            </p>
          </div>
        </div>

        {/* AIctation モード: カテゴリタブ */}
        {isAictation && (
          <CategoryTabs active={activeCategory} onChange={setActiveCategory} />
        )}

        <div className="p-4 flex flex-col gap-3">
          {/* タイトル紹介文（両モード共通） */}
          <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
            「{articleTitle.length > 20 ? articleTitle.slice(0, 20) + '…' : articleTitle}」について疑問があれば、AIが丁寧にお答えします。
          </p>

          {quickQuestions.map((q) => (
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
  // AIctation モードはカテゴリタブと質問チップが追加されるため少し背を高く
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'white',
        boxShadow:  'var(--shadow-warm-sm)',
        border:     '1px solid var(--color-beige)',
        height:     isAictation ? '600px' : '500px',
      }}
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

      {/* AIctation モード: カテゴリタブ */}
      {isAictation && (
        <CategoryTabs active={activeCategory} onChange={setActiveCategory} />
      )}

      {/* AIctation モード: 質問チップ（クリックで textarea に入力） */}
      {isAictation && messages.length === 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5 shrink-0" style={{ borderBottom: '1px solid var(--color-beige)' }}>
          {quickQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setInput(q);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="text-xs px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
              style={{
                background: 'var(--color-cream)',
                color:      'var(--color-brown)',
                border:     '1px solid var(--color-beige-dark)',
              }}
            >
              💬 {q}
            </button>
          ))}
        </div>
      )}

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

        {messages.map((msg, idx) => {
          const prevUserMsg = msg.role === 'assistant'
            ? messages.slice(0, idx).findLast((m) => m.role === 'user')?.content
            : undefined;
          return (
            <ChatBubble
              key={msg.id}
              message={msg}
              question={prevUserMsg}
              articleTitle={articleTitle}
              articleSlug={articleSlug}
            />
          );
        })}
        {isLoading && <TypingIndicator />}

        {/* エラー通知 */}
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
