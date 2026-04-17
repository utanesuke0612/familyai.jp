'use client';

/**
 * app/(site)/auth/signin/page.tsx
 * familyai.jp — ログインページ
 *
 * - Google OAuth（ソーシャルログイン）
 * - メール + パスワード（ローカルアカウント）
 * - エラーメッセージ表示（URLパラメータ error）
 */

import { useState, useEffect }   from 'react';
import { signIn }                from 'next-auth/react';
import Link                      from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

// ── エラーメッセージマッピング ────────────────────────────────
const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: 'このメールアドレスは既に別の方法で登録されています。',
  CredentialsSignin:     'メールアドレスまたはパスワードが正しくありません。',
  Default:               'ログインに失敗しました。もう一度お試しください。',
};

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [isGLoading,  setIsGLoading]  = useState(false);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

  // URLパラメータからエラーを表示
  useEffect(() => {
    const errorCode = searchParams.get('error');
    if (errorCode) {
      setErrorMsg(ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES['Default']!);
    }
  }, [searchParams]);

  // ── Google ログイン ──────────────────────────────────────────
  const handleGoogle = async () => {
    setIsGLoading(true);
    setErrorMsg(null);
    await signIn('google', { callbackUrl: '/' });
  };

  // ── メール + パスワードログイン ──────────────────────────────
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setErrorMsg(ERROR_MESSAGES['CredentialsSignin']!);
      setIsLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: 'var(--color-cream)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-8"
        style={{
          background:  'white',
          boxShadow:   'var(--shadow-warm)',
          border:      '1px solid var(--color-beige)',
        }}
      >
        {/* ロゴ */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-1"
            style={{ background: 'linear-gradient(135deg, #FFAD80, #FF8C42)' }}
          >
            🏠
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-brown)' }}>
            family<span style={{ color: 'var(--color-orange)' }}>ai</span>.jp にログイン
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
            AI = 愛 — 家族みんなのAI活用メディア
          </p>
        </div>

        {/* エラー表示 */}
        {errorMsg && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
            style={{ background: '#FFF0F0', color: '#C0392B', border: '1px solid #F5C6CB' }}
            role="alert"
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Google ログイン */}
        <button
          onClick={handleGoogle}
          disabled={isGLoading || isLoading}
          className="w-full flex items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50 mb-5 min-h-[48px]"
          style={{
            borderColor: 'var(--color-beige-dark)',
            color:       'var(--color-brown)',
            background:  'white',
          }}
        >
          {isGLoading ? (
            <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--color-beige-dark)', borderTopColor: 'var(--color-orange)' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Googleでログイン
        </button>

        {/* 区切り線 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ background: 'var(--color-beige)' }} />
          <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>または</span>
          <div className="flex-1 h-px" style={{ background: 'var(--color-beige)' }} />
        </div>

        {/* メール + パスワードフォーム */}
        <form onSubmit={handleCredentials} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-brown)' }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mail@example.com"
              required
              autoComplete="email"
              className="rounded-xl border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow]"
              style={{
                borderColor: 'var(--color-beige-dark)',
                color:       'var(--color-brown)',
                background:  'var(--color-cream)',
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-brown)' }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              required
              autoComplete="current-password"
              className="rounded-xl border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow]"
              style={{
                borderColor: 'var(--color-beige-dark)',
                color:       'var(--color-brown)',
                background:  'var(--color-cream)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isGLoading || !email.trim() || !password.trim()}
            className="btn-primary w-full mt-1 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />
                ログイン中…
              </>
            ) : (
              'ログイン'
            )}
          </button>
        </form>

        {/* アカウント登録リンク */}
        <p className="text-center text-sm mt-5" style={{ color: 'var(--color-brown-light)' }}>
          アカウントをお持ちでない方は{' '}
          <Link
            href="/auth/register"
            className="font-medium underline hover:opacity-80"
            style={{ color: 'var(--color-orange)' }}
          >
            新規登録
          </Link>
        </p>
      </div>
    </main>
  );
}
