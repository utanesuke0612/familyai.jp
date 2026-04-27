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

/* ───── 定数 ─────────────────────────────────────────── */

const GRADES: Grade[]     = ['elem-low', 'elem-high', 'middle'];
const SUBJECTS: Subject[] = ['science', 'math', 'social'];

const GRADE_COLOR: Record<Grade, { bg: string; text: string }> = {
  'elem-low':  { bg: '#4e9af1', text: '#fff' },
  'elem-high': { bg: '#2979d6', text: '#fff' },
  'middle':    { bg: '#9575cd', text: '#fff' },
};

/* ───── ViewState 型 ─────────────────────────────────── */

type ViewState =
  | { kind: 'idle' }
  | { kind: 'preview';       theme: Theme }
  | { kind: 'generating';    themeLabel: string }
  | { kind: 'result';        id: string; themeLabel: string }
  | { kind: 'clarification'; message: string; options: string[]; optionsAvailable: boolean }
  | { kind: 'rate-limit';    message: string; isLoggedIn: boolean }
  | { kind: 'unauthorized' }
  | { kind: 'error';         message: string };

/* ───── メインコンポーネント ──────────────────────────── */

export default function AiKyoshitsuPage() {
  const [grade,   setGrade]   = useState<Grade>('elem-low');
  const [subject, setSubject] = useState<Subject>('science');
  const [view,    setView]    = useState<ViewState>({ kind: 'idle' });
  const [prompt,  setPrompt]  = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const visibleThemes = filterThemes(grade, subject);
  const subjectColor  = SUBJECT_COLOR[subject];
  const isGenerating  = view.kind === 'generating';

  /* カード選択・トグル */
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

  /* AI 生成 */
  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    setView({ kind: 'generating', themeLabel: trimmed });
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    try {
      const res = await fetch('/api/generate-animation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:  trimmed,
          grade,
          subject,
          theme:   trimmed,
        }),
      });

      const json = await res.json() as {
        ok:                boolean;
        id?:               string;
        error?:            { code: string; message: string };
        options?:          string[];
        optionsAvailable?: boolean;
        suggestion?:       string;
      };

      if (!json.ok || !json.id) {
        const code    = json.error?.code ?? '';
        const message = json.error?.message ?? 'エラーが発生しました。';

        if (code === 'RATE_LIMIT_EXCEEDED') {
          setView({ kind: 'rate-limit', message, isLoggedIn: true });
        } else if (code === 'UNAUTHORIZED') {
          setView({ kind: 'unauthorized' });
        } else if (code === 'CLARIFICATION_NEEDED') {
          setView({
            kind:             'clarification',
            message,
            options:          json.options ?? [],
            optionsAvailable: json.optionsAvailable ?? false,
          });
        } else if (code === 'CONCEPT_NOT_SUITABLE') {
          // 学習内容として不適切（科目に無関係・難易度不一致など）→ 提案付きエラー
          const fullMessage = json.suggestion
            ? `${message}\n\n💡 ${json.suggestion}`
            : message;
          setView({ kind: 'error', message: fullMessage });
        } else {
          setView({ kind: 'error', message });
        }
        return;
      }

      setView({ kind: 'result', id: json.id, themeLabel: trimmed });
    } catch {
      setView({ kind: 'error', message: '通信エラーが発生しました。しばらくしてからお試しください。' });
    }
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

          {/* プレビュー（カード選択） */}
          {view.kind === 'preview' && (
            <PreviewPanel theme={view.theme} grade={grade} subjectColor={subjectColor} />
          )}

          {/* 生成中ローディング */}
          {view.kind === 'generating' && (
            <GeneratingPanel themeLabel={view.themeLabel} subjectColor={subjectColor} />
          )}

          {/* 生成結果 */}
          {view.kind === 'result' && (
            <ResultPanel
              id={view.id}
              themeLabel={view.themeLabel}
              grade={grade}
              subjectColor={subjectColor}
              onReset={() => { setView({ kind: 'idle' }); setPrompt(''); }}
            />
          )}

          {/* 回数制限 */}
          {view.kind === 'rate-limit' && (
            <RateLimitPanel
              message={view.message}
              isLoggedIn={view.isLoggedIn}
              onBack={() => setView({ kind: 'idle' })}
            />
          )}

          {/* 未ログイン */}
          {view.kind === 'unauthorized' && (
            <UnauthorizedPanel onBack={() => setView({ kind: 'idle' })} />
          )}

          {/* エラー */}
          {view.kind === 'error' && (
            <ErrorPanel
              message={view.message}
              onRetry={() => { setView({ kind: 'idle' }); }}
            />
          )}

          {/* AI入力パネル（生成結果表示中は非表示） */}
          {view.kind !== 'result' && (
            <AiInputPanel
              prompt={prompt}
              setPrompt={setPrompt}
              grade={grade}
              subject={subject}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
              subjectColor={subjectColor}
              clarificationMessage={view.kind === 'clarification' ? view.message : undefined}
              clarificationOptions={view.kind === 'clarification' ? view.options : undefined}
            />
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
  theme, grade, subjectColor,
}: {
  theme: Theme;
  grade: Grade;
  subjectColor: { bg: string; text: string; border: string };
}) {
  const [iframeHeight, setIframeHeight] = useState(560);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
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

  return (
    <div className="rounded-3xl overflow-hidden" style={{ boxShadow: 'var(--shadow-warm)', border: `2px solid ${subjectColor.border}44` }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ background: `${subjectColor.border}18` }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{theme.icon}</span>
          <div>
            <div className="font-bold text-sm" style={{ color: 'var(--color-brown)' }}>{theme.name}</div>
            <div className="text-xs" style={{ color: 'var(--color-brown-light)' }}>{GRADE_LABEL[grade]}</div>
          </div>
        </div>
        <button
          onClick={toggleFullscreen}
          className="rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ background: 'rgba(255,255,255,0.85)', color: 'var(--color-brown)', boxShadow: 'var(--shadow-warm-sm)' }}
        >
          {isFs ? '⊠ 閉じる' : '⛶ 全画面'}
        </button>
      </div>
      <div ref={wrapRef} style={{ background: '#fdf6ee', ...(isFs ? { overflowY: 'auto', height: '100vh' } : {}) }}>
        {theme.previewUrl ? (
          <iframe
            ref={iframeRef}
            src={theme.previewUrl}
            width="100%" height={iframeHeight}
            style={{ display: 'block', border: 'none' }}
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
   生成中ローディングパネル
───────────────────────────────────────────────────── */

function GeneratingPanel({ themeLabel, subjectColor }: { themeLabel: string; subjectColor: { bg: string; text: string; border: string } }) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '・'), 600);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="rounded-3xl flex flex-col items-center justify-center gap-5 py-16 px-6 text-center"
      style={{ background: 'rgba(255,255,255,0.9)', boxShadow: 'var(--shadow-warm-sm)', minHeight: 280 }}
    >
      {/* スピナー */}
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg viewBox="0 0 56 56" style={{ width: 56, height: 56, animation: 'spin 1.2s linear infinite' }}>
          <circle cx="28" cy="28" r="22" fill="none" stroke="#f0e8dc" strokeWidth="5" />
          <circle cx="28" cy="28" r="22" fill="none" stroke={subjectColor.border} strokeWidth="5"
            strokeLinecap="round" strokeDasharray="80 60" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      <div>
        <p className="text-base font-bold mb-1" style={{ color: 'var(--color-brown)' }}>
          AIがアニメーションを生成しています{dots}
        </p>
        <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
          テーマ：<strong style={{ color: subjectColor.border }}>{themeLabel}</strong>
        </p>
      </div>
      <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--color-brown-muted)' }}>
        HTMLの生成には30〜60秒ほどかかります。そのままお待ちください。
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   生成結果パネル（iframe表示）
───────────────────────────────────────────────────── */

/** HTMLをBlobダウンロードする共通ユーティリティ */
async function downloadAnimationHtml(id: string, filename: string) {
  const res  = await fetch(`/api/animations/${id}`);
  const html = await res.text();
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

function ResultPanel({
  id, themeLabel, grade, subjectColor, onReset,
}: {
  id:           string;
  themeLabel:   string;
  grade:        Grade;
  subjectColor: { bg: string; text: string; border: string };
  onReset:      () => void;
}) {
  const [iframeHeight, setIframeHeight] = useState(600);
  const [isSaving,     setIsSaving]     = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
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

  return (
    <div className="rounded-3xl overflow-hidden" style={{ boxShadow: 'var(--shadow-warm)', border: `2px solid ${subjectColor.border}44` }}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4" style={{ background: `${subjectColor.border}18` }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">🎬</span>
          <div>
            <div className="font-bold text-sm" style={{ color: 'var(--color-brown)' }}>{themeLabel}</div>
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
        <div className="flex items-center gap-2">
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

      {/* iframe — 全画面時はスクロール可能にする */}
      <div ref={wrapRef} style={{ background: '#fdf6ee', ...(isFs ? { overflowY: 'auto', height: '100vh' } : {}) }}>
        <iframe
          ref={iframeRef}
          src={`/api/animations/${id}`}
          width="100%"
          height={iframeHeight}
          style={{ display: 'block', border: 'none' }}
          title={themeLabel}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* フッター：別のテーマを生成 */}
      <div
        className="px-5 py-4 flex items-center justify-between flex-wrap gap-3"
        style={{ background: `${subjectColor.border}08`, borderTop: `1px solid ${subjectColor.border}22` }}
      >
        <p className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
          生成されたアニメーションはマイページの履歴から再度見ることができます。
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
   エラーパネル
───────────────────────────────────────────────────── */

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="rounded-3xl p-6 flex flex-col gap-4"
      style={{ background: '#fff5f5', boxShadow: 'var(--shadow-warm-sm)', border: '1.5px solid #ffb3b3' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">⚠️</span>
        <span className="font-bold text-sm" style={{ color: '#c0392b' }}>エラーが発生しました</span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: '#7a3030' }}>{message}</p>
      <button
        onClick={onRetry}
        className="self-start rounded-full px-4 py-2 text-xs font-bold transition-opacity hover:opacity-70"
        style={{ background: '#e74c3c', color: '#fff' }}
      >
        ← 戻る
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   AI入力パネル
───────────────────────────────────────────────────── */

function AiInputPanel({
  prompt, setPrompt, grade, subject, isGenerating, onGenerate, subjectColor,
  clarificationMessage, clarificationOptions,
}: {
  prompt:                string;
  setPrompt:             (v: string) => void;
  grade:                 Grade;
  subject:               Subject;
  isGenerating:          boolean;
  onGenerate:            () => void;
  subjectColor:          { bg: string; text: string; border: string };
  clarificationMessage?: string;
  clarificationOptions?: string[];
}) {
  const canSubmit = !!prompt.trim() && !isGenerating;
  const hasOptions = !!clarificationOptions && clarificationOptions.length > 0;

  return (
    <div
      className="rounded-[30px] p-6 sm:p-8 flex flex-col gap-4"
      style={{ background: 'rgba(255,255,255,0.9)', boxShadow: 'var(--shadow-warm-sm)' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">💬</span>
        <span className="font-bold text-base" style={{ color: 'var(--color-brown)' }}>
          AIにきく・テーマを入力
        </span>
      </div>

      {/* AIからの確認メッセージ（テーマが解釈不能な場合のみ表示） */}
      {clarificationMessage && (
        <div
          className="rounded-2xl px-4 py-3 flex flex-col gap-3"
          style={{
            background: `linear-gradient(135deg, ${subjectColor.border}15, ${subjectColor.bg})`,
            border:     `1.5px solid ${subjectColor.border}55`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🤔</span>
            <span className="text-xs font-bold" style={{ color: subjectColor.text }}>
              AIからの確認
            </span>
          </div>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-brown)', whiteSpace: 'pre-wrap' }}
          >
            {clarificationMessage}
          </p>

          {/* 選択肢ボタン（候補がある場合） */}
          {hasOptions && (
            <div className="flex flex-col gap-2 mt-1">
              <p className="text-xs font-bold" style={{ color: 'var(--color-brown-light)' }}>
                ↓ クリックすると入力欄に反映されます
              </p>
              <div className="flex flex-col gap-2">
                {clarificationOptions!.map((option, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(option)}
                    disabled={isGenerating}
                    className="rounded-2xl px-4 py-3 text-sm text-left font-semibold transition-all duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      color:      subjectColor.text,
                      border:     `1.5px solid ${subjectColor.border}88`,
                      boxShadow:  '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <span className="mr-1.5" style={{ color: subjectColor.border }}>▸</span>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasOptions && (
            <p className="text-xs" style={{ color: 'var(--color-brown-muted)' }}>
              ↓ 下のテーマを書き直してもう一度送ってください
            </p>
          )}
        </div>
      )}

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-brown-light)' }}>
        {clarificationMessage
          ? 'テーマをもう少し具体的に入力してください。'
          : '上のカードからテーマを選ぶか、自由にテーマを入力してください。'}
      </p>

      {/* 学年・教科バッジ */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--color-brown-muted)' }}>学年：</span>
          <span
            className="inline-block rounded-full px-3 py-0.5 text-xs font-bold"
            style={{ background: GRADE_COLOR[grade].bg, color: GRADE_COLOR[grade].text }}
          >
            {GRADE_LABEL[grade]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--color-brown-muted)' }}>教科：</span>
          <span
            className="inline-block rounded-full px-3 py-0.5 text-xs font-bold"
            style={{ background: subjectColor.border, color: '#fff' }}
          >
            {SUBJECT_LABEL[subject]}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--color-brown-muted)' }}>
          （上のボタンで変更できます）
        </span>
      </div>

      {/* テキストエリア */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isGenerating}
        placeholder="例：「磁石の力を小学生にわかりやすく」「二次関数のグラフ」など"
        rows={3}
        className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none transition-shadow disabled:opacity-50"
        style={{
          background: 'rgba(255,255,255,0.9)',
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

      {/* 生成ボタン */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onGenerate}
          disabled={!canSubmit}
          className="rounded-2xl px-6 py-3 text-sm font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          style={{
            background: canSubmit
              ? `linear-gradient(135deg, ${subjectColor.border}, ${subjectColor.border}cc)`
              : '#ccc',
            color:     '#fff',
            boxShadow: canSubmit ? 'var(--shadow-warm)' : 'none',
          }}
        >
          {isGenerating
            ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> 生成中…</>
            : '🎬 アニメーションを生成'
          }
        </button>
        {isGenerating && (
          <span className="text-xs" style={{ color: 'var(--color-brown-muted)' }}>
            生成には30〜60秒かかります
          </span>
        )}
      </div>

      {/* ヒント */}
      <div
        className="rounded-2xl px-4 py-3 text-xs leading-relaxed"
        style={{ background: 'var(--color-beige)', color: 'var(--color-brown-light)' }}
      >
        <span className="font-bold" style={{ color: 'var(--color-brown)' }}>💡 使い方のヒント：</span>
        {'テーマは具体的に入力するほど、正確なアニメーションが生成されます。'}
        <br />
        例：「てこの原理」より{' '}
        <span className="font-bold" style={{ color: 'var(--color-orange)' }}>
          「てこの原理：支点・力点・作用点の関係を小学4年生向けに」
        </span>
      </div>
    </div>
  );
}
