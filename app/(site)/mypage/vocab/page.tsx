'use client';

/**
 * app/(site)/mypage/vocab/page.tsx
 * familyai.jp — MyPage 単語帳
 *
 * VOA レッスンの AnnotatedWord から ☆ で登録した単語を一覧表示。
 * ログイン会員のみ利用可（DB に保存）。
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { useVocabList, type VocabItem } from '@/lib/voaenglish/vocab-store';

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

function downloadJson(items: VocabItem[]) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `familyai-vocab-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── ログインウォール ──────────────────────────────────────────────
function LoginWall() {
  return (
    <main style={{ background: 'var(--color-cream)', minHeight: '60vh' }}>
      <div className="max-w-container mx-auto flex flex-col items-center justify-center gap-6 py-24" style={{ paddingInline: 'var(--container-px)' }}>
        <p className="text-5xl">⭐</p>
        <h1 className="font-display font-bold text-2xl text-center" style={{ color: 'var(--color-brown)' }}>
          単語帳はログイン会員専用です
        </h1>
        <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--color-brown-light)', maxWidth: '360px' }}>
          無料会員登録をすると、VOAレッスンで覚えた単語をクラウドに保存して、どのデバイスからでも復習できます。
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link
            href="/auth/signin"
            className="inline-flex items-center rounded-full px-6 text-sm font-semibold"
            style={{ minHeight: '44px', background: 'var(--color-orange)', color: 'white' }}
          >
            ログイン
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center rounded-full px-6 text-sm font-semibold"
            style={{ minHeight: '44px', background: 'white', color: 'var(--color-brown)', border: '1px solid var(--color-beige-dark)' }}
          >
            無料会員登録
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function VocabPage() {
  const { items, loading, isLoggedIn, remove } = useVocabList();

  // レッスン別にグループ化
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

  // 未ログイン
  if (!loading && !isLoggedIn) return <LoginWall />;

  return (
    <main style={{ background: 'var(--color-cream)' }}>
      <header
        style={{
          background: 'linear-gradient(160deg, var(--color-yellow) 0%, var(--color-cream) 100%)',
          paddingBlock: 'clamp(16px, 2.5vw, 28px)',
        }}
      >
        <div className="max-w-container mx-auto" style={{ paddingInline: 'var(--container-px)' }}>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold mb-5">
            <Link
              href="/mypage"
              className="inline-flex items-center rounded-full px-4"
              style={{
                minHeight: '44px',
                background: 'rgba(255,255,255,0.9)',
                color: 'var(--color-brown)',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              ← MyPage へ戻る
            </Link>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1
                className="font-display font-bold leading-tight"
                style={{ fontSize: 'clamp(22px, 4vw, 42px)', color: 'var(--color-brown)' }}
              >
                ⭐ わたしの単語帳
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-brown-light)' }}>
                レッスンで ☆ を押して登録した単語が、このページに集まります。
              </p>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => downloadJson(items)}
                className="inline-flex items-center gap-2 rounded-full px-4 text-sm font-semibold"
                style={{
                  minHeight: '44px',
                  background: 'rgba(255,255,255,0.9)',
                  color: 'var(--color-brown)',
                  boxShadow: 'var(--shadow-warm-sm)',
                }}
              >
                📥 JSONで書き出す
              </button>
            )}
          </div>
        </div>
      </header>

      <section
        style={{
          background: 'var(--color-cream)',
          paddingBlock: 'clamp(12px, 2vw, 20px)',
        }}
      >
        <div className="max-w-container mx-auto" style={{ paddingInline: 'var(--container-px)' }}>

          {/* ローディング */}
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
            </div>
          )}

          {/* 空状態 */}
          {!loading && items.length === 0 && (
            <div
              className="rounded-[28px] p-6 sm:p-8 text-center"
              style={{
                background: 'rgba(255,255,255,0.88)',
                boxShadow: 'var(--shadow-warm-sm)',
              }}
            >
              <p className="text-base" style={{ color: 'var(--color-brown)' }}>
                まだ単語が登録されていません。
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-brown-light)' }}>
                各レッスンの赤い点線の単語をクリックして、☆ ボタンで登録できます。
              </p>
              <Link
                href="/tools/voaenglish/anna/lesson-01"
                className="mt-5 inline-flex items-center rounded-full px-4 text-sm font-semibold"
                style={{
                  minHeight: '44px',
                  background: 'var(--color-orange)',
                  color: 'white',
                }}
              >
                Lesson 1 へ行く →
              </Link>
            </div>
          )}

          {/* 単語一覧（レッスン別グループ） */}
          {!loading && groups.length > 0 && (
            <div className="flex flex-col gap-6">
              {groups.map((g) => (
                <section
                  key={`${g.course}/${g.lesson}`}
                  className="rounded-[24px] p-5 sm:p-6"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    boxShadow: 'var(--shadow-warm-sm)',
                  }}
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
                        style={{
                          background: 'var(--color-cream)',
                          border: '1px solid var(--color-beige-dark)',
                        }}
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold" style={{ color: 'var(--color-brown)' }}>
                              {it.word}
                            </span>
                            {it.pron && (
                              <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
                                {it.pron}
                              </span>
                            )}
                          </div>
                          <span className="text-sm mt-0.5" style={{ color: 'var(--color-brown)' }}>
                            {it.meaning}
                          </span>
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
                            style={{
                              width: '36px',
                              height: '36px',
                              minHeight: 'auto',
                              background: 'white',
                              border: '1px solid var(--color-beige-dark)',
                              fontSize: '16px',
                              padding: 0,
                            }}
                          >
                            🔊
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(it.id)}
                            aria-label="単語帳から外す"
                            className="inline-flex items-center justify-center rounded-full"
                            style={{
                              width: '36px',
                              height: '36px',
                              minHeight: 'auto',
                              background: 'var(--color-yellow)',
                              border: '1px solid var(--color-orange)',
                              fontSize: '14px',
                              padding: 0,
                            }}
                          >
                            ★
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
