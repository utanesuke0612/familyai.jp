'use client';

/**
 * app/(site)/mypage/aimemo/page.tsx
 * familyai.jp — AIメモ帳ページ
 *
 * AIChatWidget で 📌 ボタンで保存した AI 回答を一覧表示する。
 * ログイン会員のみ利用可（DB に保存）。
 */

import Link from 'next/link';
import { useAiMemoList, type AiMemoItem } from '@/lib/ai-memo-store';

function downloadJson(items: AiMemoItem[]) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `familyai-aimemo-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── ログインウォール ──────────────────────────────────────────────
function LoginWall() {
  return (
    <main style={{ background: 'var(--color-cream)', minHeight: '60vh' }}>
      <div className="max-w-container mx-auto flex flex-col items-center justify-center gap-6 py-24" style={{ paddingInline: 'var(--container-px)' }}>
        <p className="text-5xl">📌</p>
        <h1 className="font-display font-bold text-2xl text-center" style={{ color: 'var(--color-brown)' }}>
          AIメモ帳はログイン会員専用です
        </h1>
        <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--color-brown-light)', maxWidth: '360px' }}>
          無料会員登録をすると、AIチャットの回答をクラウドに保存して、どのデバイスからでも見返せます。
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

export default function AiMemoPage() {
  const { items, loading, isLoggedIn, remove } = useAiMemoList();

  // 未ログイン
  if (!loading && !isLoggedIn) return <LoginWall />;

  return (
    <main style={{ background: 'var(--color-cream)' }}>
      <header
        style={{
          background:   'linear-gradient(160deg, var(--color-peach) 0%, var(--color-cream) 100%)',
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

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1
                className="font-display font-bold leading-tight"
                style={{ fontSize: 'clamp(22px, 4vw, 42px)', color: 'var(--color-brown)' }}
              >
                📌 AIメモ帳
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-brown-light)' }}>
                AIチャットの回答で 📌 を押して保存したメモが集まります。
              </p>
            </div>

            {items.length > 0 && (
              <button
                type="button"
                onClick={() => downloadJson(items)}
                className="inline-flex items-center gap-2 rounded-full px-4 text-sm font-semibold"
                style={{
                  minHeight:  '44px',
                  background: 'rgba(255,255,255,0.9)',
                  color:      'var(--color-brown)',
                  boxShadow:  'var(--shadow-warm-sm)',
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
          background:   'var(--color-cream)',
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
                boxShadow:  'var(--shadow-warm-sm)',
              }}
            >
              <p className="text-base" style={{ color: 'var(--color-brown)' }}>
                まだメモが保存されていません。
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-brown-light)' }}>
                記事ページのAIチャットで回答の 📌 ボタンを押すと保存できます。
              </p>
              <Link
                href="/learn"
                className="mt-5 inline-flex items-center rounded-full px-4 text-sm font-semibold"
                style={{
                  minHeight:  '44px',
                  background: 'var(--color-orange)',
                  color:      'white',
                }}
              >
                記事を読む →
              </Link>
            </div>
          )}

          {/* メモ一覧 */}
          {!loading && items.length > 0 && (
            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[24px] p-5 sm:p-6"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    boxShadow:  'var(--shadow-warm-sm)',
                  }}
                >
                  {/* メタ情報 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.articleSlug ? (
                        <Link
                          href={`/learn/${item.articleSlug}`}
                          className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{ background: 'var(--color-peach)', color: 'var(--color-brown)' }}
                        >
                          📄 {item.articleTitle}
                        </Link>
                      ) : (
                        <span
                          className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{ background: 'var(--color-peach)', color: 'var(--color-brown)' }}
                        >
                          📄 {item.articleTitle}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
                        {formatDate(item.savedAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label="メモを削除"
                      className="inline-flex items-center justify-center rounded-full text-sm"
                      style={{
                        width:      '36px',
                        height:     '36px',
                        minHeight:  'auto',
                        background: 'var(--color-beige)',
                        border:     '1px solid var(--color-beige-dark)',
                        padding:    0,
                      }}
                    >
                      🗑️
                    </button>
                  </div>

                  {/* 質問 */}
                  <div
                    className="rounded-xl px-3 py-2 text-sm mb-3"
                    style={{
                      background: 'var(--color-orange)',
                      color:      'white',
                    }}
                  >
                    <span className="text-xs font-semibold opacity-80 block mb-0.5">質問</span>
                    {item.question}
                  </div>

                  {/* 回答 */}
                  <div
                    className="rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed"
                    style={{
                      background: 'var(--color-cream)',
                      color:      'var(--color-brown)',
                      border:     '1px solid var(--color-beige-dark)',
                    }}
                  >
                    <span className="text-xs font-semibold block mb-0.5" style={{ color: 'var(--color-brown-light)' }}>
                      AI の回答
                    </span>
                    {item.answer}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
