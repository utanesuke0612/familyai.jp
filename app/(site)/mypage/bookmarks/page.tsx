'use client';

/**
 * app/(site)/mypage/bookmarks/page.tsx
 * familyai.jp — MyPage マイブックマーク（Rev34）
 *
 * 単語帳（既存・ログイン会員専用）とセンテンス（新規・ゲストも localStorage 保存可）
 * をタブで統合表示する。
 *
 * URL:
 *   /mypage/bookmarks                 → デフォルト 📚 単語タブ
 *   /mypage/bookmarks?tab=words       → 📚 単語タブ
 *   /mypage/bookmarks?tab=sentences   → 📜 センテンスタブ
 *
 * 旧 /mypage/vocab は /mypage/bookmarks?tab=words に redirect される（後方互換）。
 */

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  useVocabList,
  type VocabItem,
} from '@/lib/voaenglish/vocab-store';
import {
  useSentenceBookmarkList,
  type SentenceBookmarkItem,
} from '@/lib/voaenglish/sentence-bookmark-store';
import { rowsToCsv } from '@/shared';

type TabKey = 'words' | 'sentences';

// ─── ページ本体（Suspense で囲む必要がある useSearchParams） ──
export default function BookmarksPage() {
  return (
    <Suspense fallback={null}>
      <BookmarksInner />
    </Suspense>
  );
}

function BookmarksInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: TabKey = searchParams.get('tab') === 'sentences' ? 'sentences' : 'words';

  const switchTab = (next: TabKey) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('tab', next);
    router.replace(`${pathname}?${sp.toString()}`);
  };

  return (
    <main style={{ background: 'var(--color-cream)' }}>
      <header
        style={{
          background:   'linear-gradient(160deg, var(--color-yellow) 0%, var(--color-cream) 100%)',
          paddingBlock: 'clamp(16px, 2.5vw, 28px)',
        }}
      >
        <div className="max-w-container mx-auto" style={{ paddingInline: 'var(--container-px)' }}>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold mb-5">
            <Link
              href="/mypage"
              className="inline-flex items-center rounded-full px-4"
              style={{
                minHeight:  '44px',
                background: 'rgba(255,255,255,0.9)',
                color:      'var(--color-brown)',
                boxShadow:  'var(--shadow-warm-sm)',
              }}
            >
              ← MyPage へ戻る
            </Link>
          </nav>

          <h1
            className="font-display font-bold leading-tight"
            style={{ fontSize: 'clamp(22px, 4vw, 42px)', color: 'var(--color-brown)' }}
          >
            🔖 マイブックマーク
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-brown-light)' }}>
            VOA レッスンで保存した単語とセンテンスをまとめて見直せます。
          </p>

          {/* タブ切替 */}
          <div
            role="tablist"
            aria-label="ブックマーク種別"
            className="mt-4 inline-flex rounded-full p-1"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid var(--color-beige-dark)' }}
          >
            <TabButton active={tab === 'words'}     label="📚 単語"     onClick={() => switchTab('words')} />
            <TabButton active={tab === 'sentences'} label="📜 センテンス" onClick={() => switchTab('sentences')} />
          </div>
        </div>
      </header>

      <section style={{ paddingBlock: 'clamp(12px, 2vw, 20px)' }}>
        <div className="max-w-container mx-auto" style={{ paddingInline: 'var(--container-px)' }}>
          {tab === 'words'     && <WordsTab />}
          {tab === 'sentences' && <SentencesTab />}
        </div>
      </section>
    </main>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="rounded-full px-4 text-sm font-semibold transition-colors"
      style={{
        minHeight:  '40px',
        background: active ? 'var(--color-orange)' : 'transparent',
        color:      active ? '#fff'                : 'var(--color-brown)',
      }}
    >
      {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// 📚 単語タブ（既存単語帳の機能を流用）
// ════════════════════════════════════════════════════════════════
function WordsTab() {
  const { items, loading, isLoggedIn, remove } = useVocabList();

  // レッスン別グループ
  const groups = useMemo(() => {
    const map = new Map<string, VocabItem[]>();
    for (const it of items) {
      const key = `${it.course ?? 'misc'}/${it.lesson ?? 'misc'}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries()).map(([key, list]) => {
      const [course, lesson] = key.split('/');
      return { course, lesson, items: list };
    });
  }, [items]);

  if (!loading && !isLoggedIn) return <LoginWallForWords />;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyCard
        message="まだ単語が登録されていません。"
        hint="各レッスンの赤い点線の単語をクリックして、☆ ボタンで登録できます。"
        cta={{ href: '/tools/voaenglish/anna/lesson-01', label: 'Lesson 1 へ行く →' }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 書き出しボタン */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={() => downloadVocabCsv(items)}
          className="inline-flex items-center gap-2 rounded-full px-4 text-sm font-semibold"
          style={{
            minHeight:  '44px',
            background: 'rgba(255,255,255,0.9)',
            color:      'var(--color-brown)',
            boxShadow:  'var(--shadow-warm-sm)',
          }}
        >
          📊 CSV
        </button>
        <button
          type="button"
          onClick={() => downloadJson(items, 'familyai-vocab')}
          className="inline-flex items-center gap-2 rounded-full px-4 text-sm font-semibold"
          style={{
            minHeight:  '44px',
            background: 'rgba(255,255,255,0.9)',
            color:      'var(--color-brown)',
            boxShadow:  'var(--shadow-warm-sm)',
          }}
        >
          📥 JSON
        </button>
      </div>

      {groups.map((g) => (
        <section
          key={`${g.course}/${g.lesson}`}
          className="rounded-[24px] p-5 sm:p-6"
          style={{ background: 'rgba(255,255,255,0.92)', boxShadow: 'var(--shadow-warm-sm)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--color-brown)' }}>
                {g.course} / {g.lesson}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
                {g.items.length} 語
              </p>
            </div>
            <Link
              href={`/tools/voaenglish/${g.course}/${g.lesson}`}
              className="text-sm font-semibold"
              style={{ color: 'var(--color-orange)' }}
            >
              レッスンを開く →
            </Link>
          </div>

          <ul className="flex flex-col gap-3">
            {g.items.map((it) => (
              <li
                key={it.id}
                className="flex flex-wrap items-start gap-3 rounded-2xl p-3"
                style={{ background: 'var(--color-cream)', border: '1px solid var(--color-beige-dark)' }}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold" style={{ color: 'var(--color-brown)' }}>{it.word}</span>
                    {it.pron && (
                      <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>{it.pron}</span>
                    )}
                  </div>
                  <span className="text-sm mt-0.5" style={{ color: 'var(--color-brown)' }}>{it.meaning}</span>
                  {it.example && (
                    <span className="text-xs italic mt-1" style={{ color: 'var(--color-brown-light)' }}>
                      例：{it.example}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => speakEnglish(it.word)}
                    aria-label={`${it.word} を読み上げ`}
                    className="inline-flex items-center justify-center rounded-full"
                    style={{ width: '36px', height: '36px', background: 'white', border: '1px solid var(--color-beige-dark)', fontSize: '16px' }}
                  >🔊</button>
                  <button
                    type="button"
                    onClick={() => remove(it.id)}
                    aria-label="単語帳から外す"
                    className="inline-flex items-center justify-center rounded-full"
                    style={{ width: '36px', height: '36px', background: 'var(--color-yellow)', border: '1px solid var(--color-orange)', fontSize: '14px' }}
                  >★</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 📜 センテンスタブ（Rev34 新規・ゲストも localStorage で利用可）
// ════════════════════════════════════════════════════════════════
function SentencesTab() {
  const { items, loading, isLoggedIn, remove } = useSentenceBookmarkList();

  // レッスン別グループ
  const groups = useMemo(() => {
    const map = new Map<string, SentenceBookmarkItem[]>();
    for (const it of items) {
      const key = `${it.course}/${it.lesson}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries()).map(([key, list]) => {
      const [course, lesson] = key.split('/');
      return { course, lesson, lessonTitle: list[0]?.lessonTitle, items: list };
    });
  }, [items]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyCard
        message="まだセンテンスが保存されていません。"
        hint="VOA レッスンの 📜 スクリプト の各文に表示される 🏷️ をタップして保存できます。"
        cta={{ href: '/tools/voaenglish/anna/lesson-01', label: 'Lesson 1 へ行く →' }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 未ログインの注意書き */}
      {!isLoggedIn && (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{ background: '#FFF8E1', border: '1px solid #FFD54F', color: '#7a5000' }}
        >
          ℹ️ 現在ゲストモードです。保存はこのデバイスのブラウザ内（localStorage）に
          のみ残ります。
          <Link href="/auth/signin" className="font-semibold underline ml-1" style={{ color: 'var(--color-orange)' }}>
            ログイン
          </Link>
          すればクラウドに同期されます。
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={() => downloadJson(items, 'familyai-sentences')}
          className="inline-flex items-center gap-2 rounded-full px-4 text-sm font-semibold"
          style={{
            minHeight:  '44px',
            background: 'rgba(255,255,255,0.9)',
            color:      'var(--color-brown)',
            boxShadow:  'var(--shadow-warm-sm)',
          }}
        >
          📥 JSON
        </button>
      </div>

      {groups.map((g) => (
        <section
          key={`${g.course}/${g.lesson}`}
          className="rounded-[24px] p-5 sm:p-6"
          style={{ background: 'rgba(255,255,255,0.92)', boxShadow: 'var(--shadow-warm-sm)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--color-brown)' }}>
                {g.lessonTitle ?? `${g.course} / ${g.lesson}`}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
                {g.items.length} 文
              </p>
            </div>
            <Link
              href={`/tools/voaenglish/${g.course}/${g.lesson}`}
              className="text-sm font-semibold"
              style={{ color: 'var(--color-orange)' }}
            >
              レッスンを開く →
            </Link>
          </div>

          <ul className="flex flex-col gap-3">
            {g.items.map((it) => (
              <li
                key={it.id}
                className="flex items-start gap-3 rounded-2xl p-3"
                style={{ background: 'var(--color-cream)', border: '1px solid var(--color-beige-dark)' }}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  {it.speaker && (
                    <span className="text-xs font-bold mb-0.5" style={{ color: '#2D78C8' }}>
                      {it.speaker}
                    </span>
                  )}
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-brown)' }}>
                    {it.textPlain}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  aria-label="ブックマークから外す"
                  title="ブックマークから外す"
                  className="shrink-0 inline-flex items-center justify-center rounded-full"
                  style={{
                    width: '36px',
                    height: '36px',
                    background: 'var(--color-yellow)',
                    border:     '1px solid var(--color-orange)',
                    fontSize:   '14px',
                  }}
                >
                  🔖
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 共通サブ部品
// ════════════════════════════════════════════════════════════════
function LoginWallForWords() {
  return (
    <div
      className="rounded-[28px] p-8 text-center"
      style={{ background: 'rgba(255,255,255,0.88)', boxShadow: 'var(--shadow-warm-sm)' }}
    >
      <p className="text-5xl mb-4">⭐</p>
      <h2 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--color-brown)' }}>
        単語帳はログイン会員専用です
      </h2>
      <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-brown-light)' }}>
        無料会員登録をすると、VOAレッスンで覚えた単語をクラウドに保存して、どのデバイスからでも復習できます。
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          href="/auth/signin"
          className="inline-flex items-center rounded-full px-6 text-sm font-semibold"
          style={{ minHeight: '44px', background: 'var(--color-orange)', color: 'white' }}
        >
          🌱 ログイン / 登録
        </Link>
        <Link
          href="/mypage/bookmarks?tab=sentences"
          className="inline-flex items-center rounded-full px-6 text-sm font-semibold"
          style={{ minHeight: '44px', background: 'white', color: 'var(--color-brown)', border: '1px solid var(--color-beige-dark)' }}
        >
          📜 センテンスタブを見る
        </Link>
      </div>
    </div>
  );
}

function EmptyCard({
  message,
  hint,
  cta,
}: {
  message: string;
  hint:    string;
  cta:     { href: string; label: string };
}) {
  return (
    <div
      className="rounded-[28px] p-6 sm:p-8 text-center"
      style={{ background: 'rgba(255,255,255,0.88)', boxShadow: 'var(--shadow-warm-sm)' }}
    >
      <p className="text-base" style={{ color: 'var(--color-brown)' }}>{message}</p>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-brown-light)' }}>{hint}</p>
      <Link
        href={cta.href}
        className="mt-5 inline-flex items-center rounded-full px-4 text-sm font-semibold"
        style={{ minHeight: '44px', background: 'var(--color-orange)', color: 'white' }}
      >
        {cta.label}
      </Link>
    </div>
  );
}

// ─── 共通ユーティリティ ────────────────────────────────────────
function speakEnglish(text: string) {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  synth.speak(u);
}

function downloadJson<T>(items: T, basename: string) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${basename}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadVocabCsv(items: VocabItem[]) {
  const rows = items.map((v) => ({
    word:        v.word,
    meaning:     v.meaning,
    pron:        v.pron        ?? '',
    example:     v.example     ?? '',
    course:      v.course      ?? '',
    lesson:      v.lesson      ?? '',
    lessonTitle: v.lessonTitle ?? '',
    addedAt:     new Date(v.addedAt).toISOString(),
  }));
  const csv  = rowsToCsv(rows, ['word', 'meaning', 'pron', 'example', 'course', 'lesson', 'lessonTitle', 'addedAt']);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `familyai-vocab-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
