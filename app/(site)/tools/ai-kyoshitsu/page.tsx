/**
 * app/(site)/tools/ai-kyoshitsu/page.tsx
 * うごくAI教室 — メインページ
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  GRADE_LABEL,
  SUBJECT_LABEL,
  SUBJECT_COLOR,
  filterThemes,
  type Grade,
  type Subject,
  type Theme,
} from '@/lib/ai-kyoshitsu/themes';
import type { Stage1Success } from '@/lib/ai-kyoshitsu/stage1-schema';
import {
  MAX_CONVERSATION_TURNS,
  MAX_TURN_TEXT_LENGTH,
  type ConversationTurn,
} from '@/lib/ai-kyoshitsu/conversation';

/* ───── 定数 ─────────────────────────────────────────── */

const GRADES: Grade[]     = ['elem-low', 'elem-high', 'middle'];
const SUBJECTS: Subject[] = ['science', 'math', 'social'];

const GRADE_COLOR: Record<Grade, { bg: string; text: string }> = {
  'elem-low':  { bg: '#4e9af1', text: '#fff' },
  'elem-high': { bg: '#2979d6', text: '#fff' },
  'middle':    { bg: '#9575cd', text: '#fff' },
};

/* ───── ViewState 型（上の段＝生成プレビュー領域） ───────────
 * Phase 1c で 'clarification' と 'error' は ChatMessage に移行した。
 * 上の段で表示するのは「視覚的な進捗・結果・ブロック画面」のみ。
 */

type ViewState =
  | { kind: 'idle' }
  | { kind: 'preview';      theme: Theme }
  | { kind: 'generating';   themeLabel: string }
  | { kind: 'result';       id: string; themeLabel: string; stage1Json: Stage1Success | null }
  | { kind: 'rate-limit';   message: string; isLoggedIn: boolean }
  | { kind: 'unauthorized' };

/* ───── ChatMessage 型（下の段＝対話領域・Phase 1c） ────────
 * AI とユーザーの対話履歴。1 セッション内で累積し、結果表示後も残る。
 *  - user           : ユーザーの発言（テーマ送信・選択肢クリック）
 *  - ai/thinking    : AI 思考中スピナー（応答が返ったら別 variant に置換）
 *  - ai/understood  : AI が Stage 1 を理解できたとき（Stage 2 自動起動を案内）
 *  - ai/clarification: AI からの確認質問。options[] あればチャット内ボタンで返信
 *  - ai/error       : 学習内容として不適切（CONCEPT_NOT_SUITABLE）等
 */
type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'ai';   variant: 'thinking' }
  | { id: string; role: 'ai';   variant: 'understood';    text: string }
  | { id: string; role: 'ai';   variant: 'clarification'; text: string; options: string[] }
  | { id: string; role: 'ai';   variant: 'error';         text: string };

// ID 採番（再 render に依存しないシンプルな増分）
let _chatMsgCounter = 0;
function genChatMsgId(): string {
  _chatMsgCounter += 1;
  return `m${Date.now()}-${_chatMsgCounter}`;
}

/**
 * Phase 1c+: ChatMessage[] を API 送信用の ConversationTurn[] に変換。
 * - thinking バブルは除外（これから AI 応答待ち）
 * - 直近 MAX_CONVERSATION_TURNS ターンに制限（履歴肥大による Stage 1 トークン浪費を防ぐ）
 * - 各ターンの text は MAX_TURN_TEXT_LENGTH で切り詰め
 */
function chatMessagesToConversationHistory(messages: ChatMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  for (const m of messages) {
    if (m.role === 'user') {
      turns.push({ role: 'user', text: m.text.slice(0, MAX_TURN_TEXT_LENGTH) });
      continue;
    }
    // role === 'ai'
    if (m.variant === 'thinking') continue;        // 思考中バブルはスキップ
    if (m.variant === 'understood' || m.variant === 'clarification' || m.variant === 'error') {
      turns.push({ role: 'ai', text: m.text.slice(0, MAX_TURN_TEXT_LENGTH) });
    }
  }
  // 直近 N ターン（古い方から削る）
  return turns.slice(-MAX_CONVERSATION_TURNS);
}

/* ───── メインコンポーネント ──────────────────────────── */

export default function AiKyoshitsuPage() {
  const [grade,         setGrade]         = useState<Grade>('elem-low');
  const [subject,       setSubject]       = useState<Subject>('science');
  const [view,          setView]          = useState<ViewState>({ kind: 'idle' });
  const [prompt,        setPrompt]        = useState('');
  const [messages,      setMessages]      = useState<ChatMessage[]>([]);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const visibleThemes = filterThemes(grade, subject);
  const subjectColor  = SUBJECT_COLOR[subject];
  const isGenerating  = view.kind === 'generating';

  /* 結果が表示された瞬間にチャットを折りたたみ + 結果へスクロール */
  useEffect(() => {
    if (view.kind === 'result') {
      setChatCollapsed(true);
      // 折りたたみアニメーション後に結果へスクロール
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [view.kind]);

  /* カード選択・トグル：上の段に静的プレビュー + チャット入力欄にテーマ名を流し込む */
  function handleCardClick(theme: Theme) {
    if (view.kind === 'preview' && view.theme.id === theme.id) {
      setView({ kind: 'idle' });
      setPrompt('');
      return;
    }
    setView({ kind: 'preview', theme });
    setPrompt(theme.name);
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  /**
   * チャットメッセージ送信 → /api/generate-animation 呼び出し → 応答に応じてチャットを更新。
   *
   * フロー:
   *   1. ユーザー発言 + AI 思考中バブルをチャットに追加
   *   2. 上の段を 'generating' にして進捗バー表示
   *   3. POST → 応答に応じて思考中バブルを以下に置換:
   *        success            → 'understood' バブル + view='result'
   *        CLARIFICATION      → 'clarification' バブル（選択肢ボタン付き）+ view='idle'
   *        CONCEPT_NOT_SUITABLE → 'error' バブル + view='idle'
   *        RATE_LIMIT / UNAUTH → 思考中バブルを除去して上の段でブロック表示
   *
   * Q5=A の通り、API 側は変更せず UI レイヤーで会話履歴を管理する。
   */
  async function sendMessage(rawText: string) {
    const trimmed = rawText.trim();
    if (!trimmed || isGenerating) return;

    // 0. 会話履歴は send 直前の messages で確定（今回追加するユーザー発言は除外）
    const conversationHistory = chatMessagesToConversationHistory(messages);

    // 1. ユーザー発言 + 思考中バブル
    const userMsg:     ChatMessage = { id: genChatMsgId(), role: 'user', text: trimmed };
    const thinkingId   = genChatMsgId();
    const thinkingMsg: ChatMessage = { id: thinkingId, role: 'ai', variant: 'thinking' };
    setMessages((prev) => [...prev, userMsg, thinkingMsg]);

    // 2. 入力欄クリア + 上の段を生成中に + チャット展開（折りたたみ済みなら開く）
    setPrompt('');
    setChatCollapsed(false);
    setView({ kind: 'generating', themeLabel: trimmed });
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    // 思考中バブルを「役割つきの別バブル」に置換するヘルパ
    const replaceThinking = (replacement: ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === thinkingId ? replacement : m)));
    };
    const removeThinking = () => {
      setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
    };

    try {
      const res = await fetch('/api/generate-animation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:               trimmed,
          grade,
          subject,
          theme:                trimmed,
          // Phase 1c+: 文脈を踏まえた解釈のため直近 N ターンを送信
          conversationHistory,
        }),
      });

      const json = await res.json() as {
        ok:                boolean;
        id?:               string;
        stage1Json?:       Stage1Success | null;
        error?:            { code: string; message: string };
        options?:          string[];
        optionsAvailable?: boolean;
        suggestion?:       string;
      };

      if (!json.ok || !json.id) {
        const code    = json.error?.code ?? '';
        const message = json.error?.message ?? 'エラーが発生しました。';

        if (code === 'RATE_LIMIT_EXCEEDED') {
          // ブロック画面：思考中は消し、上の段を rate-limit パネルに切替
          removeThinking();
          setView({ kind: 'rate-limit', message, isLoggedIn: true });
        } else if (code === 'UNAUTHORIZED') {
          removeThinking();
          setView({ kind: 'unauthorized' });
        } else if (code === 'CLARIFICATION_NEEDED') {
          // チャット内に AI 反問を表示（選択肢があれば inline ボタン）
          replaceThinking({
            id:      genChatMsgId(),
            role:    'ai',
            variant: 'clarification',
            text:    message,
            options: json.options ?? [],
          });
          setView({ kind: 'idle' });
        } else if (code === 'CONCEPT_NOT_SUITABLE') {
          const fullMessage = json.suggestion
            ? `${message}\n\n💡 ${json.suggestion}`
            : message;
          replaceThinking({
            id:      genChatMsgId(),
            role:    'ai',
            variant: 'error',
            text:    fullMessage,
          });
          setView({ kind: 'idle' });
        } else {
          replaceThinking({
            id:      genChatMsgId(),
            role:    'ai',
            variant: 'error',
            text:    message,
          });
          setView({ kind: 'idle' });
        }
        return;
      }

      // 成功: Stage 1 + Stage 2 完了 → AI 「理解しました」 + 上の段 = 結果
      replaceThinking({
        id:      genChatMsgId(),
        role:    'ai',
        variant: 'understood',
        text:    `「${trimmed}」のアニメーションを作成しました。上の段から見られます！`,
      });
      setView({
        kind:       'result',
        id:         json.id,
        themeLabel: trimmed,
        stage1Json: json.stage1Json ?? null,
      });
    } catch {
      replaceThinking({
        id:      genChatMsgId(),
        role:    'ai',
        variant: 'error',
        text:    '通信エラーが発生しました。しばらくしてからお試しください。',
      });
      setView({ kind: 'idle' });
    }
  }

  /* テキストエリアの「送信」ボタン用 */
  function handleGenerate() {
    void sendMessage(prompt);
  }

  /* チャット内の選択肢ボタン用（AI 反問の選択肢を即送信） */
  function handleOptionClick(option: string) {
    void sendMessage(option);
  }

  /* チャット履歴をクリア（「新しいテーマで始める」ボタン用） */
  function clearChat() {
    setMessages([]);
    setPrompt('');
    setChatCollapsed(false);
    setView({ kind: 'idle' });
  }

  return (
    <main style={{ background: 'var(--color-cream)' }}>

      {/* ── ヘッダー ── */}
      <section
        className="px-6 py-8 sm:py-10"
        style={{ background: 'linear-gradient(160deg, var(--color-beige) 0%, var(--color-cream) 100%)' }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            <Link
              href="/tools"
              className="rounded-full px-4 py-2"
              style={{ background: 'rgba(255,255,255,0.88)', color: 'var(--color-brown)', boxShadow: 'var(--shadow-warm-sm)' }}
            >
              ← AIツール一覧へ戻る
            </Link>
            <span
              className="rounded-full px-4 py-2"
              style={{ background: 'var(--color-mint)', color: 'var(--color-brown)' }}
            >
              📚 学習・教育
            </span>
            <Link
              href="/mypage/ai-kyoshitsu"
              className="rounded-full px-4 py-2 transition-opacity hover:opacity-80 ml-auto"
              style={{
                background: 'linear-gradient(135deg, #ff8c42, #ffa563)',
                color:      '#fff',
                boxShadow:  '0 2px 8px rgba(255,140,66,0.35)',
              }}
              title="過去に生成したアニメーションを再表示できます（コスト削減）"
            >
              📂 AI教室履歴を見る
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-start">
            {/* 左：タイトル */}
            <div className="flex flex-col gap-4">
              <h1
                className="font-display font-bold leading-tight"
                style={{ fontSize: 'clamp(32px, 5vw, 56px)', color: 'var(--color-brown)' }}
              >
                テーマを選んで
                <br />
                アニメーションで学ぼう
              </h1>
              <p className="max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--color-brown-light)' }}>
                理科・算数・社会のテーマをえらぶと、インタラクティブなアニメーションが表示されます。
                自分のテーマを入力してAIに生成させることもできます。
              </p>
            </div>

            {/* 右：フィルターカード */}
            <aside
              className="rounded-[28px] p-6 flex flex-col gap-5"
              style={{ background: 'rgba(255,255,255,0.86)', boxShadow: 'var(--shadow-warm)' }}
            >
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-brown-light)' }}>学年</p>
                <div className="flex flex-wrap gap-2">
                  {GRADES.map((g) => {
                    const active = grade === g;
                    return (
                      <button
                        key={g}
                        onClick={() => { setGrade(g); if (view.kind !== 'generating') setView({ kind: 'idle' }); }}
                        className="rounded-full px-3 py-1.5 text-sm font-bold transition-all duration-150"
                        style={{
                          background: active ? GRADE_COLOR[g].bg    : 'rgba(255,255,255,0.85)',
                          color:      active ? GRADE_COLOR[g].text  : 'var(--color-brown-light)',
                          boxShadow:  active ? 'var(--shadow-warm)' : 'var(--shadow-warm-sm)',
                          border:     active ? 'none'               : '1.5px solid #e8e0d8',
                        }}
                      >
                        {GRADE_LABEL[g]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-brown-light)' }}>教科</p>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => {
                    const active = subject === s;
                    const sColor = SUBJECT_COLOR[s];
                    return (
                      <button
                        key={s}
                        onClick={() => { setSubject(s); if (view.kind !== 'generating') setView({ kind: 'idle' }); }}
                        className="rounded-full px-3 py-1.5 text-sm font-bold transition-all duration-150"
                        style={{
                          background: active ? sColor.border         : 'rgba(255,255,255,0.85)',
                          color:      active ? '#fff'                : 'var(--color-brown-light)',
                          boxShadow:  active ? 'var(--shadow-warm)'  : 'var(--shadow-warm-sm)',
                          border:     active ? 'none'                : '1.5px solid #e8e0d8',
                        }}
                      >
                        {SUBJECT_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── テーマカード ── */}
      <section className="px-6 py-8 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-xs font-semibold" style={{ color: 'var(--color-brown-muted)' }}>
            {GRADE_LABEL[grade]} ／ {SUBJECT_LABEL[subject].replace(/^.{2}/, '')} — {visibleThemes.length}件
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleThemes.map((theme) => {
              const isSelected = view.kind === 'preview' && view.theme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleCardClick(theme)}
                  disabled={isGenerating}
                  className="rounded-2xl p-4 text-left transition-all duration-150 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${subjectColor.border}22, ${subjectColor.border}11)`
                      : 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,250,245,0.93) 100%)',
                    boxShadow: isSelected
                      ? `0 0 0 2px ${subjectColor.border}, var(--shadow-warm)`
                      : 'var(--shadow-warm-sm)',
                    border: isSelected ? 'none' : '1.5px solid #ede6dd',
                  }}
                >
                  <span className="text-2xl block mb-2">{theme.icon}</span>
                  <div className="text-sm font-bold leading-tight mb-1" style={{ color: 'var(--color-brown)' }}>
                    {theme.name}
                  </div>
                  <div className="text-xs leading-snug mb-2" style={{ color: 'var(--color-brown-light)' }}>
                    {theme.desc}
                  </div>
                  <span
                    className="inline-block rounded px-2 py-0.5 text-xs font-medium"
                    style={{ background: subjectColor.bg, color: subjectColor.text }}
                  >
                    🎬 {theme.animHint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 下部パネルエリア ── */}
      <div ref={bottomRef} />

      <section className="px-6 pb-12">
        <div className="mx-auto max-w-5xl flex flex-col gap-6">

          {/* ── ① チャット領域（最上部） ────────────────────
              Stage 1 のユーザー ↔ AI 対話 + 生成中 thinking バブル。
              結果が出ると自動的に折りたたまれ、ヘッダーだけになる（手動で再展開可）。
              ブロック画面（rate-limit / unauthorized）時のみ非表示。 */}
          {view.kind !== 'rate-limit' && view.kind !== 'unauthorized' && (
            <ChatPanel
              messages={messages}
              prompt={prompt}
              setPrompt={setPrompt}
              grade={grade}
              subject={subject}
              isGenerating={isGenerating}
              subjectColor={subjectColor}
              collapsed={chatCollapsed}
              hasResult={view.kind === 'result'}
              onSend={handleGenerate}
              onOptionClick={handleOptionClick}
              onClearChat={clearChat}
              onToggleCollapse={() => setChatCollapsed((v) => !v)}
            />
          )}

          {/* ── ② プレビュー / 結果 / ブロック領域（チャットの下） ── */}
          <div ref={resultRef} />

          {/* プレビュー（既製カード選択時の静的 iframe） */}
          {view.kind === 'preview' && (
            <PreviewPanel
              theme={view.theme}
              grade={grade}
              subjectColor={subjectColor}
              onClose={() => { setView({ kind: 'idle' }); setPrompt(''); }}
            />
          )}

          {/* 生成結果 */}
          {view.kind === 'result' && (
            <ResultPanel
              id={view.id}
              themeLabel={view.themeLabel}
              grade={grade}
              subjectColor={subjectColor}
              stage1Json={view.stage1Json}
              onReset={() => { setView({ kind: 'idle' }); setPrompt(''); }}
            />
          )}

          {/* 回数制限（ブロック画面） */}
          {view.kind === 'rate-limit' && (
            <RateLimitPanel
              message={view.message}
              isLoggedIn={view.isLoggedIn}
              onBack={() => setView({ kind: 'idle' })}
            />
          )}

          {/* 未ログイン（ブロック画面） */}
          {view.kind === 'unauthorized' && (
            <UnauthorizedPanel onBack={() => setView({ kind: 'idle' })} />
          )}

        </div>
      </section>
    </main>
  );
}

/* ─────────────────────────────────────────────────────
   プレビューパネル（カード選択・既存HTML）
───────────────────────────────────────────────────── */

function PreviewPanel({
  theme, grade, subjectColor, onClose,
}: {
  theme:        Theme;
  grade:        Grade;
  subjectColor: { bg: string; text: string; border: string };
  onClose:      () => void;
}) {
  const [iframeHeight, setIframeHeight] = useState(560);
  const [isSaving,     setIsSaving]     = useState(false);
  const [copied,       setCopied]       = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      // 自分の iframe からのメッセージのみ受け付ける（他フレームからの偽装を防ぐ）
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      if (e.data && typeof e.data.iframeHeight === 'number') {
        setIframeHeight(Math.max(400, e.data.iframeHeight));
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useEffect(() => {
    function onFsChange() { setIsFs(!!document.fullscreenElement); }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  function toggleFullscreen() {
    if (isFs) { document.exitFullscreen().catch(() => {}); }
    else { (wrapRef.current ?? iframeRef.current)?.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); }
  }

  // 静的テーマのシェアURL: previewUrl をそのまま共有（無ければ tools ページへフォールバック）
  function getShareUrl(): string {
    return theme.previewUrl ?? `${window.location.origin}/tools/ai-kyoshitsu`;
  }

  function shareToX() {
    const text = `「${theme.name}」をfamilyai.jp AI教室で見たよ！🎬`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl())}&hashtags=familyai,AI教室`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  }

  function shareToLine() {
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(`「${theme.name}」のアニメーション解説 ${getShareUrl()}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = getShareUrl();
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleSave() {
    if (!theme.previewUrl) return;
    setIsSaving(true);
    try { await downloadHtmlFromUrl(theme.previewUrl, theme.name); }
    finally { setIsSaving(false); }
  }

  const canShare = !!theme.previewUrl;

  return (
    <div className="rounded-3xl overflow-hidden" style={{ boxShadow: 'var(--shadow-warm)', border: `2px solid ${subjectColor.border}44` }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4" style={{ background: `${subjectColor.border}18` }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">{theme.icon}</span>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: 'var(--color-brown)' }}>{theme.name}</div>
            <div className="text-xs" style={{ color: 'var(--color-brown-light)' }}>{GRADE_LABEL[grade]}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end w-full sm:w-auto">
          {/* シェアボタン群（previewUrl がある時のみ表示） */}
          {canShare && (
            <>
              <button
                onClick={shareToX}
                className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ background: '#000', color: '#fff', boxShadow: 'var(--shadow-warm-sm)' }}
                title="Xでシェア"
              >
                𝕏 シェア
              </button>
              <button
                onClick={shareToLine}
                className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ background: '#06c755', color: '#fff', boxShadow: 'var(--shadow-warm-sm)' }}
                title="LINEでシェア"
              >
                💬 LINE
              </button>
              <button
                onClick={copyShareLink}
                className="rounded-xl px-3 py-2 text-xs font-semibold transition-all"
                style={{
                  background: copied ? '#22c55e' : 'rgba(255,255,255,0.85)',
                  color:      copied ? '#fff'    : 'var(--color-brown)',
                  boxShadow:  'var(--shadow-warm-sm)',
                }}
                title="リンクコピー"
              >
                {copied ? '✓ コピー済' : '🔗 コピー'}
              </button>

              {/* 区切り線 */}
              <span
                aria-hidden="true"
                className="mx-1 h-6 w-px"
                style={{ background: 'rgba(0,0,0,0.18)' }}
              />
            </>
          )}

          {/* 操作ボタン群 */}
          {canShare && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{ background: subjectColor.border, color: '#fff', boxShadow: 'var(--shadow-warm-sm)' }}
            >
              {isSaving ? '⏳ 保存中…' : '💾 保存'}
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.85)', color: 'var(--color-brown)', boxShadow: 'var(--shadow-warm-sm)' }}
          >
            {isFs ? '⊠ 閉じる' : '⛶ 全画面'}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.85)', color: 'var(--color-brown-light)', boxShadow: 'var(--shadow-warm-sm)' }}
          >
            ✕ 閉じる
          </button>
        </div>
      </div>
      <div
        ref={wrapRef}
        style={{
          background: '#fdf6ee',
          position: 'relative',
          ...(isFs ? { height: '100vh', overflow: 'hidden' } : {}),
        }}
      >
        {/* 全画面時の閉じるボタン（スマホ用 — ESC キーが無いため必須） */}
        {isFs && <FullscreenCloseButton onClick={toggleFullscreen} />}
        {theme.previewUrl ? (
          <iframe
            ref={iframeRef}
            src={theme.previewUrl}
            width="100%"
            // 全画面時はiframe自体が100vh+内部スクロール、通常時はpostMessage高さ
            height={isFs ? undefined : iframeHeight}
            style={{
              display: 'block',
              border:  'none',
              ...(isFs ? { height: '100vh', width: '100%' } : {}),
            }}
            title={theme.name}
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
          />
        ) : (
          <ComingSoonPlaceholder theme={theme} subjectColor={subjectColor} />
        )}
      </div>
    </div>
  );
}

/**
 * 全画面表示時の閉じるボタン（フローティング）
 * - スマホには ESC キーが無いため、必ず押せる UI が必要
 * - position: fixed で iframe の上に固定表示
 * - タップ領域 44x44 以上（モバイル UX ガイドライン準拠）
 */
function FullscreenCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="全画面表示を閉じる"
      className="rounded-full transition-opacity hover:opacity-80 active:opacity-60"
      style={{
        position:  'fixed',
        top:       'max(16px, env(safe-area-inset-top, 16px))',
        right:     'max(16px, env(safe-area-inset-right, 16px))',
        zIndex:    2147483647, // フルスクリーン中は最前面に
        width:     48,
        height:    48,
        background:'rgba(0,0,0,0.65)',
        color:     '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        border:    'none',
        fontSize:  20,
        fontWeight:700,
        lineHeight:'48px',
        textAlign: 'center',
        cursor:    'pointer',
      }}
    >
      ✕
    </button>
  );
}

function ComingSoonPlaceholder({ theme, subjectColor }: { theme: Theme; subjectColor: { bg: string; text: string; border: string } }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center" style={{ minHeight: 320 }}>
      <span className="text-5xl">{theme.icon}</span>
      <div>
        <p className="text-base font-bold mb-1" style={{ color: 'var(--color-brown)' }}>{theme.name}</p>
        <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>このテーマのアニメーションは近日公開予定です。</p>
      </div>
      <span className="inline-block rounded-xl px-4 py-2 text-xs font-medium" style={{ background: subjectColor.bg, color: subjectColor.text }}>
        🎬 {theme.animHint}
      </span>
      <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--color-brown-muted)' }}>
        下の「AIにきく」エリアから、このテーマについてAIにアニメーションを生成させることもできます。
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   生成中の段階メッセージ・豆知識
   - Phase 1c+ ではチャット内 thinking バブル（ChatThinkingBubble）で再利用
   - 上の段の GeneratingPanel は廃止済み
───────────────────────────────────────────────────── */

/** 経過秒数に応じた段階メッセージ */
const GENERATING_STAGES: ReadonlyArray<{ minSec: number; emoji: string; label: string; sub: string }> = [
  { minSec:  0, emoji: '🧠', label: 'テーマを理解しています',     sub: '学年と教科に合った内容を考えています…' },
  { minSec:  8, emoji: '📐', label: '教育設計を組み立て中',         sub: 'キーポイント・クイズ・誤概念を整理しています…' },
  { minSec: 14, emoji: '🎨', label: 'アニメーションをデザイン中',   sub: '色と動きを決めています…' },
  { minSec: 24, emoji: '✨', label: 'HTMLを書き上げています',       sub: 'もう少しでお見せできます…' },
  { minSec: 40, emoji: '🎬', label: 'まもなく完成します',           sub: '最終チェック中…' },
];

/** ローディング中に表示する豆知識（飽き防止） */
const FUN_FACTS: readonly string[] = [
  '💡 AIは数千冊の教科書から学んでいます',
  '🌍 1回の生成で扱うトークン数は本1冊分くらいです',
  '⚡ Vercel のサーバーが世界中で並列に動いています',
  '🎯 教育設計には「足場かけ理論」を取り入れています',
  '🧪 クイズには「よくある間違い」も組み込まれます',
  '🔬 子供の好奇心を引き出す表現を選んでいます',
  '🎨 教科ごとに色のテーマを変えて作成中です',
];

/* ─────────────────────────────────────────────────────
   生成結果パネル（iframe表示）
───────────────────────────────────────────────────── */

/** HTMLをBlobダウンロードする共通ユーティリティ（DB保存のアニメーション用） */
async function downloadAnimationHtml(id: string, filename: string) {
  const res  = await fetch(`/api/animations/${id}`);
  const html = await res.text();
  triggerHtmlDownload(html, filename);
}

/** 任意のURLからHTMLをダウンロード（静的テーマ・S3など外部URL対応） */
async function downloadHtmlFromUrl(url: string, filename: string) {
  const res  = await fetch(url);
  const html = await res.text();
  triggerHtmlDownload(html, filename);
}

/** Blob ダウンロード共通処理 */
function triggerHtmlDownload(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename.replace(/[\\/:*?"<>|]/g, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type ResultTab = 'animation' | 'points' | 'quiz';

function ResultPanel({
  id, themeLabel, grade, subjectColor, stage1Json, onReset,
}: {
  id:           string;
  themeLabel:   string;
  grade:        Grade;
  subjectColor: { bg: string; text: string; border: string };
  stage1Json:   Stage1Success | null;
  onReset:      () => void;
}) {
  const [iframeHeight, setIframeHeight] = useState(600);
  const [isSaving,     setIsSaving]     = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [tab,          setTab]          = useState<ResultTab>('animation');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

  // Stage 1 JSON が利用可能かどうか（migration 0014 適用前のレコードは NULL）
  const hasStage1 = !!stage1Json;
  const quizCount = stage1Json?.concept_check.quiz.length ?? 0;

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      // 自分の iframe からのメッセージのみ受け付ける（他フレームからの偽装を防ぐ）
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      if (e.data && typeof e.data.iframeHeight === 'number') {
        setIframeHeight(Math.max(400, e.data.iframeHeight));
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useEffect(() => {
    function onFsChange() { setIsFs(!!document.fullscreenElement); }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  function toggleFullscreen() {
    if (isFs) { document.exitFullscreen().catch(() => {}); }
    else { (wrapRef.current ?? iframeRef.current)?.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); }
  }

  async function handleSave() {
    setIsSaving(true);
    try { await downloadAnimationHtml(id, themeLabel); }
    finally { setIsSaving(false); }
  }

  function shareToX() {
    const shareUrl = `${window.location.origin}/share/${id}`;
    const text = `「${themeLabel}」をfamilyai.jp AI教室で学んでみた！🎬`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}&hashtags=familyai,AI教室`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  }

  function shareToLine() {
    const shareUrl = `${window.location.origin}/share/${id}`;
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(`「${themeLabel}」のアニメーション解説 ${shareUrl}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function copyShareLink() {
    const shareUrl = `${window.location.origin}/share/${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="rounded-3xl overflow-hidden" style={{ boxShadow: 'var(--shadow-warm)', border: `2px solid ${subjectColor.border}44` }}>
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4" style={{ background: `${subjectColor.border}18` }}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl">🎬</span>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: 'var(--color-brown)' }}>{themeLabel}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="inline-block rounded-full px-2 py-0.5 text-xs font-bold"
                style={{ background: 'var(--color-mint)', color: '#1a6644' }}
              >
                ✨ AI生成
              </span>
              <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>{GRADE_LABEL[grade]}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end w-full sm:w-auto">
          {/* シェアボタン群 */}
          <button
            onClick={shareToX}
            className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ background: '#000', color: '#fff', boxShadow: 'var(--shadow-warm-sm)' }}
            title="Xでシェア"
          >
            𝕏 シェア
          </button>
          <button
            onClick={shareToLine}
            className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ background: '#06c755', color: '#fff', boxShadow: 'var(--shadow-warm-sm)' }}
            title="LINEでシェア"
          >
            💬 LINE
          </button>
          <button
            onClick={copyShareLink}
            className="rounded-xl px-3 py-2 text-xs font-semibold transition-all"
            style={{
              background: copied ? '#22c55e' : 'rgba(255,255,255,0.85)',
              color:      copied ? '#fff'    : 'var(--color-brown)',
              boxShadow:  'var(--shadow-warm-sm)',
            }}
            title="リンクコピー"
          >
            {copied ? '✓ コピー済' : '🔗 コピー'}
          </button>

          {/* 区切り線（シェア vs 操作系の区別） */}
          <span
            aria-hidden="true"
            className="mx-1 h-6 w-px"
            style={{ background: 'rgba(0,0,0,0.18)' }}
          />

          {/* 操作ボタン群 */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-70 disabled:opacity-50"
            style={{ background: subjectColor.border, color: '#fff', boxShadow: 'var(--shadow-warm-sm)' }}
          >
            {isSaving ? '⏳ 保存中…' : '💾 保存'}
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.85)', color: 'var(--color-brown)', boxShadow: 'var(--shadow-warm-sm)' }}
          >
            {isFs ? '⊠ 閉じる' : '⛶ 全画面'}
          </button>
          <button
            onClick={onReset}
            className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.85)', color: 'var(--color-brown-light)', boxShadow: 'var(--shadow-warm-sm)' }}
          >
            ✕ 閉じる
          </button>
        </div>
      </div>

      {/* 成功通知バナー：履歴から再閲覧できることを案内（コスト削減誘導） */}
      <div
        className="px-5 py-3 flex items-start gap-3 flex-wrap"
        style={{
          background:   'linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%)',
          borderBottom: '1.5px solid #ffd54f',
        }}
      >
        <span className="text-lg shrink-0">💡</span>
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-bold leading-snug" style={{ color: '#7a5000' }}>
            生成完了！この動画は <span style={{ color: '#ff8c42' }}>「📂 AI教室履歴」</span> からいつでも見直せます
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#a07830' }}>
            同じ内容を再生成する必要はありません。マイページの履歴から再表示できます。
          </p>
        </div>
        <Link
          href="/mypage/ai-kyoshitsu"
          className="rounded-full px-3 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #ff8c42, #ffa563)',
            color:      '#fff',
            boxShadow:  '0 2px 8px rgba(255,140,66,0.35)',
          }}
        >
          📂 履歴を開く
        </Link>
      </div>

      {/* ── タブナビゲーション（Phase 1a） ── */}
      <div
        className="flex items-stretch overflow-x-auto"
        style={{
          background:    '#faf6ef',
          borderBottom:  `1px solid ${subjectColor.border}22`,
        }}
        role="tablist"
        aria-label="生成結果の表示切替"
      >
        <ResultTabButton
          active={tab === 'animation'}
          onClick={() => setTab('animation')}
          subjectColor={subjectColor}
          label="🎬 アニメーション"
        />
        <ResultTabButton
          active={tab === 'points'}
          onClick={() => setTab('points')}
          subjectColor={subjectColor}
          label="📋 学習ポイント"
        />
        <ResultTabButton
          active={tab === 'quiz'}
          onClick={() => setTab('quiz')}
          subjectColor={subjectColor}
          label={`❓ クイズ${quizCount > 0 ? ` (${quizCount})` : ''}`}
        />
      </div>

      {/* ── タブ 1: アニメーション iframe ──────────────────────
          ※ 他タブに切り替えても iframe を unmount しないよう display で制御。
            タブを戻したときに再ロードされず、iframe 内部の状態（再生位置等）が保持される。 */}
      <div
        ref={wrapRef}
        style={{
          background: '#fdf6ee',
          position:   'relative',
          display:    tab === 'animation' ? 'block' : 'none',
          ...(isFs ? { height: '100vh', overflow: 'hidden' } : {}),
        }}
      >
        {/* 全画面時の閉じるボタン（スマホ用 — ESC キーが無いため必須） */}
        {isFs && <FullscreenCloseButton onClick={toggleFullscreen} />}
        <iframe
          ref={iframeRef}
          src={`/api/animations/${id}`}
          width="100%"
          height={isFs ? undefined : iframeHeight}
          style={{
            display: 'block',
            border:  'none',
            ...(isFs ? { height: '100vh', width: '100%' } : {}),
          }}
          title={themeLabel}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* ── タブ 2: 学習ポイント ── */}
      {tab === 'points' && (
        hasStage1 ? (
          <LearningPointsView data={stage1Json!} subjectColor={subjectColor} />
        ) : (
          <Stage1FallbackView subjectColor={subjectColor} />
        )
      )}

      {/* ── タブ 3: クイズ ── */}
      {tab === 'quiz' && (
        hasStage1 && quizCount > 0 ? (
          <QuizView data={stage1Json!} subjectColor={subjectColor} />
        ) : (
          <Stage1FallbackView subjectColor={subjectColor} note={hasStage1 ? 'このアニメーションにはクイズが含まれていません。' : undefined} />
        )
      )}

      {/* フッター：別のテーマを生成 */}
      <div
        className="px-5 py-4 flex items-center justify-between flex-wrap gap-3"
        style={{ background: `${subjectColor.border}08`, borderTop: `1px solid ${subjectColor.border}22` }}
      >
        <p className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
          ✨ AIの生成は時間とコストがかかります。同じテーマは履歴から再表示するのがおすすめです。
        </p>
        <button
          onClick={onReset}
          className="rounded-full px-4 py-2 text-xs font-bold transition-all hover:-translate-y-0.5"
          style={{ background: subjectColor.border, color: '#fff', boxShadow: 'var(--shadow-warm-sm)' }}
        >
          🎬 別のテーマを生成
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   結果タブ — タブボタン
───────────────────────────────────────────────────── */
function ResultTabButton({
  active, onClick, subjectColor, label,
}: {
  active:       boolean;
  onClick:      () => void;
  subjectColor: { bg: string; text: string; border: string };
  label:        string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="relative px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors hover:opacity-80"
      style={{
        background: active ? '#fff' : 'transparent',
        color:      active ? subjectColor.border : 'var(--color-brown-light)',
        // 下線アクセント（アクティブのみ）
        boxShadow:  active ? `inset 0 -3px 0 0 ${subjectColor.border}` : 'none',
        flex:       '0 0 auto',
      }}
    >
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────
   結果タブ — Stage1 JSON 不在時のフォールバック
───────────────────────────────────────────────────── */
function Stage1FallbackView({
  subjectColor, note,
}: {
  subjectColor: { bg: string; text: string; border: string };
  note?:        string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center" style={{ background: '#fdf6ee', minHeight: 320 }}>
      <span className="text-4xl">📭</span>
      <p className="text-sm font-bold" style={{ color: 'var(--color-brown)' }}>
        {note ?? '学習設計データが利用できません'}
      </p>
      {!note && (
        <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
          このアニメーションは学習設計データの保存機能が追加される前に生成されたため、
          学習ポイントとクイズを表示できません。新しく生成し直すと、学習ポイントとクイズが表示されます。
        </p>
      )}
      <span
        className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
        style={{ background: subjectColor.bg, color: subjectColor.text }}
      >
        🎬 アニメーションは表示できます
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   結果タブ — 学習ポイントビュー
───────────────────────────────────────────────────── */
function LearningPointsView({
  data, subjectColor,
}: {
  data:         Stage1Success;
  subjectColor: { bg: string; text: string; border: string };
}) {
  const { content, concept_check } = data;
  return (
    <div className="px-5 sm:px-6 py-6 flex flex-col gap-6" style={{ background: '#fdf6ee' }}>
      {/* ① 概念名 + 一行サマリ */}
      <section>
        <p className="text-xs font-bold mb-1" style={{ color: subjectColor.border }}>
          学ぶこと
        </p>
        <h3 className="text-xl font-bold leading-snug mb-1" style={{ color: 'var(--color-brown)' }}>
          {content.concept_name}
        </h3>
        {content.concept_name_simple && content.concept_name_simple !== content.concept_name && (
          <p className="text-xs mb-2" style={{ color: 'var(--color-brown-light)' }}>
            やさしく言うと：<strong>{content.concept_name_simple}</strong>
          </p>
        )}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-brown)' }}>
          {content.one_line_summary}
        </p>
      </section>

      {/* ② キーワード */}
      {content.keywords.length > 0 && (
        <section>
          <p className="text-xs font-bold mb-2" style={{ color: subjectColor.border }}>
            🔑 大事な言葉
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {content.keywords.map((kw, i) => (
              <div
                key={i}
                className="rounded-2xl px-4 py-3"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border:     `1px solid ${subjectColor.border}33`,
                  boxShadow:  '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <p className="text-sm font-bold" style={{ color: subjectColor.text }}>
                  {kw.term}
                  {kw.reading && (
                    <span className="ml-1 text-xs font-normal" style={{ color: 'var(--color-brown-light)' }}>
                      （{kw.reading}）
                    </span>
                  )}
                </p>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--color-brown)' }}>
                  {kw.definition}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ③ 学習目標（key_points） */}
      {content.key_points.length > 0 && (
        <section>
          <p className="text-xs font-bold mb-2" style={{ color: subjectColor.border }}>
            🎯 ここを押さえよう
          </p>
          <ul className="flex flex-col gap-2">
            {content.key_points.map((p, i) => (
              <li
                key={i}
                className="rounded-xl px-3 py-2 text-sm leading-relaxed flex gap-2"
                style={{ background: subjectColor.bg, color: subjectColor.text }}
              >
                <span className="font-bold shrink-0">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ④ 学習の流れ（teaching_flow） */}
      {content.teaching_flow.length > 0 && (
        <section>
          <p className="text-xs font-bold mb-2" style={{ color: subjectColor.border }}>
            🪜 学びの流れ
          </p>
          <ol className="flex flex-col gap-3">
            {content.teaching_flow.map((step) => (
              <li
                key={step.step}
                className="flex gap-3 rounded-2xl p-3"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border:     `1px solid ${subjectColor.border}22`,
                }}
              >
                <span
                  className="rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    width:      28,
                    height:     28,
                    background: subjectColor.border,
                    color:      '#fff',
                  }}
                >
                  {step.step}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--color-brown)' }}>
                    {step.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
                    {step.explanation}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ⑤ よくある誤解 */}
      {concept_check.misconceptions.length > 0 && (
        <section>
          <p className="text-xs font-bold mb-2" style={{ color: subjectColor.border }}>
            ⚠️ よくある誤解
          </p>
          <div className="flex flex-col gap-2">
            {concept_check.misconceptions.map((m, i) => (
              <div
                key={i}
                className="rounded-2xl p-3 flex flex-col gap-1.5"
                style={{
                  background: '#fff5f0',
                  border:     '1px solid #ffd1b3',
                }}
              >
                <p className="text-xs flex gap-1.5">
                  <span className="font-bold shrink-0" style={{ color: '#c25040' }}>✗</span>
                  <span style={{ color: '#7a3030' }}>{m.wrong_idea}</span>
                </p>
                <p className="text-xs flex gap-1.5">
                  <span className="font-bold shrink-0" style={{ color: '#2e8b57' }}>○</span>
                  <span style={{ color: 'var(--color-brown)' }}>{m.correction}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   結果タブ — クイズビュー（インタラクティブ）
───────────────────────────────────────────────────── */
function QuizView({
  data, subjectColor,
}: {
  data:         Stage1Success;
  subjectColor: { bg: string; text: string; border: string };
}) {
  const quizzes = data.concept_check.quiz;
  // 各設問のユーザー解答（選択した index）— 未回答は -1
  const [answers, setAnswers] = useState<number[]>(() => quizzes.map(() => -1));

  // 正答数
  const answeredCount = answers.filter((a) => a >= 0).length;
  const correctCount  = answers.reduce((acc, a, i) => (a === quizzes[i].answer_index ? acc + 1 : acc), 0);
  const allAnswered   = answeredCount === quizzes.length;

  function selectAnswer(quizIdx: number, choiceIdx: number) {
    if (answers[quizIdx] >= 0) return; // 既回答はロック
    setAnswers((prev) => prev.map((v, i) => (i === quizIdx ? choiceIdx : v)));
  }

  function resetAll() {
    setAnswers(quizzes.map(() => -1));
  }

  return (
    <div className="px-5 sm:px-6 py-6 flex flex-col gap-5" style={{ background: '#fdf6ee' }}>
      {/* 進捗・スコア */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{
          background: allAnswered
            ? `linear-gradient(135deg, ${subjectColor.border}22, ${subjectColor.border}10)`
            : 'rgba(255,255,255,0.92)',
          border: `1px solid ${subjectColor.border}33`,
        }}
      >
        <p className="text-sm font-bold" style={{ color: 'var(--color-brown)' }}>
          {allAnswered ? '🎉 全問解答完了！' : `📝 ${answeredCount} / ${quizzes.length} 問 解答`}
        </p>
        {answeredCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
              正解: <strong style={{ color: subjectColor.border }}>{correctCount}</strong> / {answeredCount}
            </span>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{
                background: '#fff',
                color:      'var(--color-brown)',
                border:     '1px solid #ddd6cc',
              }}
            >
              🔄 もう一度
            </button>
          </div>
        )}
      </div>

      {/* 設問リスト */}
      {quizzes.map((q, qIdx) => {
        const userAns = answers[qIdx];
        const answered = userAns >= 0;
        const isCorrect = userAns === q.answer_index;
        return (
          <div
            key={qIdx}
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{
              background: '#fff',
              border:     `1.5px solid ${answered ? (isCorrect ? '#a5d6a7' : '#ffb3b3') : '#ddd6cc'}`,
              boxShadow:  '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-start gap-2">
              <span
                className="rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{
                  width:      24,
                  height:     24,
                  background: subjectColor.border,
                  color:      '#fff',
                }}
              >
                {qIdx + 1}
              </span>
              <p className="text-sm font-bold leading-relaxed" style={{ color: 'var(--color-brown)' }}>
                {q.question}
              </p>
              {q.is_trick_question && (
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
                  style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffd54f' }}
                  title="ひっかけ問題です"
                >
                  ⚠ ひっかけ
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {q.choices.map((choice, cIdx) => {
                const isUserChoice = userAns === cIdx;
                const isAnswerKey  = q.answer_index === cIdx;
                let bg = 'rgba(255,255,255,0.95)';
                let color = 'var(--color-brown)';
                let border = '1.5px solid #ddd6cc';
                if (answered) {
                  if (isAnswerKey) {
                    bg = '#e8f5e9'; color = '#2e7d32'; border = '1.5px solid #a5d6a7';
                  } else if (isUserChoice) {
                    bg = '#fff5f0'; color = '#c25040'; border = '1.5px solid #ffb3b3';
                  } else {
                    bg = '#f7f2eb'; color = 'var(--color-brown-light)'; border = '1.5px solid #e8e0d8';
                  }
                }
                return (
                  <button
                    key={cIdx}
                    type="button"
                    disabled={answered}
                    onClick={() => selectAnswer(qIdx, cIdx)}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-left transition-all hover:opacity-90 disabled:cursor-default"
                    style={{ background: bg, color, border }}
                  >
                    <span className="inline-block mr-2 font-bold" style={{ width: 18 }}>
                      {String.fromCharCode(65 + cIdx)}.
                    </span>
                    {choice}
                    {answered && isAnswerKey && <span className="ml-2">✓</span>}
                    {answered && isUserChoice && !isAnswerKey && <span className="ml-2">✗</span>}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div
                className="rounded-xl px-3 py-2 text-xs leading-relaxed"
                style={{
                  background: isCorrect ? '#e8f5e9' : '#fff5f0',
                  color:      isCorrect ? '#2e7d32' : '#7a3030',
                  border:     `1px solid ${isCorrect ? '#a5d6a7' : '#ffb3b3'}`,
                }}
              >
                <p className="font-bold mb-1">
                  {isCorrect ? '🎉 正解！' : '😅 残念…正解は ' + String.fromCharCode(65 + q.answer_index) + ' でした'}
                </p>
                <p>{isCorrect ? q.explanation_correct : q.explanation_wrong}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   回数制限パネル
───────────────────────────────────────────────────── */

function RateLimitPanel({ message, isLoggedIn, onBack }: {
  message:    string;
  isLoggedIn: boolean;
  onBack:     () => void;
}) {
  return (
    <div
      className="rounded-3xl p-6 sm:p-8 flex flex-col gap-5"
      style={{
        background: 'linear-gradient(135deg, #fff8e1, #fff3cd)',
        boxShadow:  'var(--shadow-warm)',
        border:     '2px solid #ffd54f',
      }}
    >
      {/* アイコン＋タイトル */}
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 36 }}>🎯</span>
        <div>
          <p className="font-bold text-base" style={{ color: '#7a5000' }}>
            本日の生成回数の上限に達しました
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#a07830' }}>
            明日の午前0時にリセットされます
          </p>
        </div>
      </div>

      {/* 詳細メッセージ */}
      <p className="text-sm leading-relaxed" style={{ color: '#7a5000' }}>
        {message}
      </p>

      {/* プラン別の上限説明 */}
      <div
        className="rounded-2xl p-4 flex flex-col gap-2"
        style={{ background: 'rgba(255,255,255,0.7)' }}
      >
        <p className="text-xs font-bold mb-1" style={{ color: '#7a5000' }}>
          📊 1日あたりの生成回数
        </p>
        {[
          { label: '無料プラン',     count: '5回/日',   current: isLoggedIn },
          { label: 'プレミアムプラン', count: '100回/日', current: false },
        ].map(({ label, count, current }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {current && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ background: '#ffd54f', color: '#7a5000' }}
                >
                  現在
                </span>
              )}
              <span className="text-xs" style={{ color: '#7a5000' }}>{label}</span>
            </div>
            <span className="text-xs font-bold" style={{ color: '#5a3a00' }}>{count}</span>
          </div>
        ))}
      </div>

      {/* アクション */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onBack}
          className="rounded-full px-4 py-2 text-xs font-bold transition-opacity hover:opacity-70"
          style={{ background: '#fff', color: '#7a5000', border: '1.5px solid #ffd54f' }}
        >
          ← 戻る
        </button>
        <Link
          href="/mypage"
          className="rounded-full px-4 py-2 text-xs font-bold transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-orange)', color: '#fff', boxShadow: 'var(--shadow-warm-sm)' }}
        >
          プランを確認する →
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   未ログインパネル
───────────────────────────────────────────────────── */

function UnauthorizedPanel({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="rounded-3xl p-6 sm:p-8 flex flex-col gap-5"
      style={{
        background: 'linear-gradient(135deg, #e8f5e9, #f1f8e9)',
        boxShadow:  'var(--shadow-warm)',
        border:     '2px solid #a5d6a7',
      }}
    >
      {/* アイコン＋タイトル */}
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 36 }}>🔑</span>
        <div>
          <p className="font-bold text-base" style={{ color: '#2e7d32' }}>
            ログインが必要です
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#558b2f' }}>
            生成結果を保存するためにログインしてください
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: '#2e7d32' }}>
        うごくAI教室の生成機能はログイン会員向けです。
        無料プランでも<strong>1日5回</strong>まで生成できます。
        生成したアニメーションはマイページの履歴から何度でも見直せます。
      </p>

      {/* アクション */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onBack}
          className="rounded-full px-4 py-2 text-xs font-bold transition-opacity hover:opacity-70"
          style={{ background: '#fff', color: '#2e7d32', border: '1.5px solid #a5d6a7' }}
        >
          ← 戻る
        </button>
        <Link
          href="/api/auth/signin"
          className="rounded-full px-5 py-2 text-sm font-bold transition-opacity hover:opacity-80"
          style={{ background: '#43a047', color: '#fff', boxShadow: 'var(--shadow-warm-sm)' }}
        >
          ログインして生成する →
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ChatPanel — Phase 1c: チャット型 UI
   ・上の段（GeneratingPanel / ResultPanel）と並ぶ「下の段」
   ・Stage 1 のユーザー ↔ AI 対話を時系列バブルで表示
   ・選択肢ボタンは AI バブル内に inline 表示（クリックで即送信）
───────────────────────────────────────────────────── */

function ChatPanel({
  messages, prompt, setPrompt, grade, subject, isGenerating, subjectColor,
  collapsed, hasResult,
  onSend, onOptionClick, onClearChat, onToggleCollapse,
}: {
  messages:         ChatMessage[];
  prompt:           string;
  setPrompt:        (v: string) => void;
  grade:            Grade;
  subject:          Subject;
  isGenerating:     boolean;
  subjectColor:     { bg: string; text: string; border: string };
  collapsed:        boolean;
  hasResult:        boolean;
  onSend:           () => void;
  onOptionClick:    (option: string) => void;
  onClearChat:      () => void;
  onToggleCollapse: () => void;
}) {
  const canSubmit       = !!prompt.trim() && !isGenerating;
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const hasMessages     = messages.length > 0;

  // 最終 AI メッセージ（折りたたみ時のプレビュー用）
  const lastAiMsg = [...messages].reverse().find((m) => m.role === 'ai');
  const lastAiPreview =
    lastAiMsg?.role === 'ai'
      ? (lastAiMsg.variant === 'thinking'
          ? '考えています…'
          : lastAiMsg.variant === 'understood'
            ? `✨ ${lastAiMsg.text}`
            : lastAiMsg.variant === 'clarification'
              ? `🤔 ${lastAiMsg.text}`
              : lastAiMsg.variant === 'error'
                ? `⚠️ ${lastAiMsg.text}`
                : '')
      : '';

  // 新メッセージ追加時にチャット末尾へスクロール（折りたたみ時はスキップ）
  useEffect(() => {
    if (!hasMessages || collapsed) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, hasMessages, collapsed]);

  // ── 折りたたみモード：ヘッダー 1 行 + 最後の AI メッセージ抜粋 ──
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        className="rounded-2xl p-4 flex items-center gap-3 text-left transition-all hover:-translate-y-0.5 w-full"
        style={{
          background: hasResult
            ? `linear-gradient(135deg, ${subjectColor.bg}, #fff)`
            : 'rgba(255,255,255,0.92)',
          boxShadow: 'var(--shadow-warm-sm)',
          border:    `1px solid ${subjectColor.border}33`,
        }}
        title="チャットを開く"
      >
        <span className="text-xl shrink-0">💬</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm" style={{ color: 'var(--color-brown)' }}>
              AI教室チャット
            </span>
            {hasMessages && (
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: subjectColor.border, color: '#fff' }}
              >
                {messages.length} メッセージ
              </span>
            )}
          </div>
          <p
            className="text-xs leading-snug truncate mt-0.5"
            style={{ color: 'var(--color-brown-light)' }}
          >
            {lastAiPreview || 'クリックで開く・テーマを入力できます'}
          </p>
        </div>
        <span
          className="shrink-0 text-sm font-bold"
          style={{ color: subjectColor.border }}
          aria-hidden
        >
          ▼ 開く
        </span>
      </button>
    );
  }

  // ── 通常モード ─────────────────────────────────
  return (
    <div
      className="rounded-[30px] p-5 sm:p-6 flex flex-col gap-4"
      style={{ background: 'rgba(255,255,255,0.92)', boxShadow: 'var(--shadow-warm-sm)' }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <span className="font-bold text-base" style={{ color: 'var(--color-brown)' }}>
            AI教室チャット
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasMessages && (
            <button
              type="button"
              onClick={onClearChat}
              disabled={isGenerating}
              className="rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: '#fff', color: 'var(--color-brown-light)', border: '1px solid #ddd6cc' }}
              title="会話をクリアして新しいテーマで始める"
            >
              🆕 新しいテーマ
            </button>
          )}
          {/* 折りたたみボタン（常時表示・どの状態でも開閉可能） */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#fff', color: 'var(--color-brown-light)', border: '1px solid #ddd6cc' }}
            title="チャットを折りたたむ"
          >
            ▲ 閉じる
          </button>
        </div>
      </div>

      {/* 学年・教科バッジ */}
      <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--color-brown-muted)' }}>
        <span>学年：</span>
        <span
          className="inline-block rounded-full px-2.5 py-0.5 font-bold"
          style={{ background: GRADE_COLOR[grade].bg, color: GRADE_COLOR[grade].text }}
        >
          {GRADE_LABEL[grade]}
        </span>
        <span>／教科：</span>
        <span
          className="inline-block rounded-full px-2.5 py-0.5 font-bold"
          style={{ background: subjectColor.border, color: '#fff' }}
        >
          {SUBJECT_LABEL[subject]}
        </span>
        <span>（上のボタンで変更できます）</span>
      </div>

      {/* メッセージリスト */}
      <div
        className="flex flex-col gap-3 rounded-2xl p-3 sm:p-4"
        style={{
          background: 'var(--color-beige)',
          maxHeight:  hasMessages ? 480 : undefined,
          overflowY:  hasMessages ? 'auto' : undefined,
          minHeight:  hasMessages ? 120 : undefined,
        }}
      >
        {!hasMessages ? (
          <ChatEmptyHint subjectColor={subjectColor} />
        ) : (
          <>
            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                msg={m}
                subjectColor={subjectColor}
                isGenerating={isGenerating}
                onOptionClick={onOptionClick}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* コンポーザー（テキストエリア + 送信） */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            // Cmd/Ctrl + Enter で送信
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={isGenerating}
          placeholder={hasMessages
            ? '返信や追加の質問を入力…'
            : '例：「磁石の力を小学生にわかりやすく」「二次関数のグラフ」など'}
          rows={2}
          className="flex-1 rounded-2xl px-4 py-3 text-sm resize-none outline-none transition-shadow disabled:opacity-50"
          style={{
            background: '#fff',
            border:     '1.5px solid #ddd6cc',
            color:      'var(--color-brown)',
            fontFamily: "'Hiragino Kaku Gothic ProN', Meiryo, sans-serif",
            boxShadow:  'inset 0 1px 3px rgba(0,0,0,0.06)',
          }}
          onFocus={(e) => {
            if (isGenerating) return;
            e.currentTarget.style.border    = `1.5px solid ${subjectColor.border}`;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${subjectColor.border}22, inset 0 1px 3px rgba(0,0,0,0.04)`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.border    = '1.5px solid #ddd6cc';
            e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.06)';
          }}
        />
        <button
          onClick={onSend}
          disabled={!canSubmit}
          className="rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:self-auto self-stretch sm:w-auto"
          style={{
            background: canSubmit
              ? `linear-gradient(135deg, ${subjectColor.border}, ${subjectColor.border}cc)`
              : '#ccc',
            color:     '#fff',
            boxShadow: canSubmit ? 'var(--shadow-warm)' : 'none',
            minWidth:  120,
          }}
        >
          {isGenerating
            ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>送信中</>
            : <>🎬 送信</>
          }
        </button>
      </div>

      {/* フッターヒント */}
      {!hasMessages && (
        <div
          className="rounded-2xl px-4 py-3 text-xs leading-relaxed"
          style={{ background: 'var(--color-beige)', color: 'var(--color-brown-light)' }}
        >
          <span className="font-bold" style={{ color: 'var(--color-brown)' }}>💡 使い方のヒント：</span>
          テーマは具体的に入力するほど、正確なアニメーションが生成されます。
          <br />
          例：「てこの原理」より{' '}
          <span className="font-bold" style={{ color: 'var(--color-orange)' }}>
            「てこの原理：支点・力点・作用点の関係を小学4年生向けに」
          </span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ChatEmptyHint — メッセージ空時のオンボーディング
───────────────────────────────────────────────────── */
function ChatEmptyHint({
  subjectColor,
}: {
  subjectColor: { bg: string; text: string; border: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-6 px-4">
      <span className="text-3xl">💞</span>
      <p className="text-sm font-bold" style={{ color: 'var(--color-brown)' }}>
        どんなテーマで学びたいですか？
      </p>
      <p className="text-xs leading-relaxed max-w-md" style={{ color: 'var(--color-brown-light)' }}>
        上のカードから選ぶか、下の入力欄に自由に書いてください。
        AI がテーマを理解できない時は、もう少し詳しく聞き返します。
      </p>
      <span
        className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold mt-1"
        style={{ background: subjectColor.bg, color: subjectColor.text }}
      >
        ✨ Stage 1：対話で理解 → Stage 2：上の段でアニメ生成
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ChatThinkingBubble — 生成中の段階表示（旧 GeneratingPanel をチャット内に統合）
   - 経過秒数で段階メッセージを切替（GENERATING_STAGES）
   - 細い進捗バー（推定値・60秒満タン・95%で頭打ち）
   - 5秒ごとに豆知識ローテーション（FUN_FACTS）
───────────────────────────────────────────────────── */
function ChatThinkingBubble({
  subjectColor,
}: {
  subjectColor: { bg: string; text: string; border: string };
}) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [factIdx,    setFactIdx]    = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const tick = setInterval(() => {
      setElapsedSec((Date.now() - startedAt) / 1000);
    }, 500);
    const factTimer = setInterval(() => {
      setFactIdx((i) => (i + 1) % FUN_FACTS.length);
    }, 5_000);
    return () => {
      clearInterval(tick);
      clearInterval(factTimer);
    };
  }, []);

  const currentStage =
    [...GENERATING_STAGES].reverse().find((s) => elapsedSec >= s.minSec) ?? GENERATING_STAGES[0];
  const progressPct = Math.min(95, (elapsedSec / 60) * 100);

  return (
    <div
      className="rounded-2xl px-4 py-3 flex flex-col gap-2"
      style={{
        background: '#fff',
        border:     `1px solid ${subjectColor.border}33`,
        boxShadow:  '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* 段階：絵文字 + ラベル */}
      <div className="flex items-center gap-2">
        <span
          style={{
            fontSize:  20,
            animation: 'aiKyoshitsuPulse 2s ease-in-out infinite',
            display:   'inline-block',
          }}
        >
          {currentStage.emoji}
        </span>
        <p className="text-sm font-bold leading-snug" style={{ color: 'var(--color-brown)' }}>
          {currentStage.label}
        </p>
      </div>

      {/* サブテキスト */}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
        {currentStage.sub}
      </p>

      {/* 進捗バー（細め） */}
      <div
        style={{
          width:        '100%',
          height:       4,
          background:   '#f0e8dc',
          borderRadius: 9999,
          overflow:     'hidden',
          position:     'relative',
        }}
      >
        <div
          style={{
            width:        `${progressPct}%`,
            height:       '100%',
            background:   `linear-gradient(90deg, ${subjectColor.border} 0%, ${subjectColor.border}cc 100%)`,
            borderRadius: 9999,
            transition:   'width 0.5s ease-out',
          }}
        />
        {/* 流れるシャイン */}
        <div
          aria-hidden
          style={{
            position:      'absolute',
            top:           0,
            left:          0,
            right:         0,
            height:        '100%',
            background:    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
            animation:     'aiKyoshitsuShine 2s linear infinite',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* 経過秒 + 豆知識（コンパクト） */}
      <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: 'var(--color-brown-muted)' }}>
        <span>{Math.floor(elapsedSec)}秒経過</span>
        <span
          key={factIdx}  // key でフェードイン再発火
          className="text-right"
          style={{
            animation: 'aiKyoshitsuFadeIn 0.5s ease-out',
            maxWidth:  '70%',
          }}
        >
          {FUN_FACTS[factIdx]}
        </span>
      </div>

      {/* 40秒以降の長時間警告 */}
      {elapsedSec >= 40 && (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-brown-muted)' }}>
          通常 30〜50 秒で完成します。混雑時はもう少しかかることがあります。
        </p>
      )}

      {/* インライン CSS（旧 GeneratingPanel から流用） */}
      <style>{`
        @keyframes aiKyoshitsuPulse {
          0%, 100% { transform: scale(1);   filter: drop-shadow(0 2px 6px rgba(0,0,0,0.06)); }
          50%      { transform: scale(1.08); filter: drop-shadow(0 4px 9px rgba(0,0,0,0.10)); }
        }
        @keyframes aiKyoshitsuShine {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes aiKyoshitsuFadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ChatBubble — 個別メッセージバブル
───────────────────────────────────────────────────── */
function ChatBubble({
  msg, subjectColor, isGenerating, onOptionClick,
}: {
  msg:           ChatMessage;
  subjectColor:  { bg: string; text: string; border: string };
  isGenerating:  boolean;
  onOptionClick: (option: string) => void;
}) {
  // ── ユーザー発言：右寄せ・濃色背景 ──────────────────
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="rounded-2xl px-4 py-2.5 max-w-[85%] sm:max-w-[75%] text-sm leading-relaxed"
          style={{
            background: subjectColor.border,
            color:      '#fff',
            boxShadow:  '0 1px 3px rgba(0,0,0,0.08)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {msg.text}
        </div>
      </div>
    );
  }

  // ── AI 発言：左寄せ・白背景・variant 別 ───────────────
  return (
    <div className="flex items-start gap-2">
      <span
        className="rounded-full flex items-center justify-center text-base shrink-0"
        style={{
          width:      32,
          height:     32,
          background: '#fff',
          border:     `1.5px solid ${subjectColor.border}55`,
          marginTop:  2,
        }}
        aria-hidden
      >
        💞
      </span>
      <div className="flex-1 min-w-0 max-w-[85%] sm:max-w-[80%]">
        {msg.variant === 'thinking' && (
          <ChatThinkingBubble subjectColor={subjectColor} />
        )}

        {msg.variant === 'understood' && (
          <div
            className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
            style={{
              background: `linear-gradient(135deg, ${subjectColor.bg}, #fff)`,
              border:     `1px solid ${subjectColor.border}33`,
              color:      'var(--color-brown)',
              whiteSpace: 'pre-wrap',
            }}
          >
            <span className="font-bold mr-1">✨ 理解しました！</span>
            {msg.text}
          </div>
        )}

        {msg.variant === 'clarification' && (
          <div className="flex flex-col gap-2">
            <div
              className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
              style={{
                background: '#fff',
                border:     `1px solid ${subjectColor.border}55`,
                color:      'var(--color-brown)',
                whiteSpace: 'pre-wrap',
              }}
            >
              <span className="font-bold mr-1" style={{ color: subjectColor.text }}>🤔 確認させてください：</span>
              {msg.text}
            </div>
            {msg.options.length > 0 && (
              <div className="flex flex-col gap-1.5 pl-1">
                <p className="text-[11px] font-semibold" style={{ color: 'var(--color-brown-muted)' }}>
                  ↓ クリックで返信
                </p>
                {msg.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => onOptionClick(opt)}
                    className="rounded-2xl px-4 py-2.5 text-sm text-left font-semibold transition-all duration-150 hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      color:      subjectColor.text,
                      border:     `1.5px solid ${subjectColor.border}88`,
                      boxShadow:  '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <span className="mr-1.5" style={{ color: subjectColor.border }}>▸</span>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {msg.variant === 'error' && (
          <div
            className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
            style={{
              background: '#fff5f5',
              border:     '1px solid #ffb3b3',
              color:      '#7a3030',
              whiteSpace: 'pre-wrap',
            }}
          >
            <span className="font-bold mr-1" style={{ color: '#c0392b' }}>⚠️</span>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
