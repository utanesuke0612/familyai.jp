'use client';

/**
 * app/(site)/auth/register/page.tsx
 * familyai.jp — 新規アカウント登録ページ
 *
 * - メール + パスワード（ローカルアカウント）
 * - バリデーション: 8文字以上・英数字混在
 * - 登録後: /auth/signin へリダイレクト
 */

import { useState }   from 'react';
import Link           from 'next/link';
import { useRouter }  from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null);

  // ── バリデーション ─────────────────────────────────────────────
  function validate(): string | null {
    if (!email.trim())      return 'メールアドレスを入力してください。';
    if (password.length < 8) return 'パスワードは8文字以上で入力してください。';
    if (!/[a-zA-Z]/.test(password)) return 'パスワードに英字を含めてください。';
    if (!/[0-9]/.test(password))    return 'パスワードに数字を含めてください。';
    if (password !== confirm) return 'パスワードが一致しません。';
    return null;
  }

  // ── 登録送信 ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim() || undefined, email, password }),
      });
      const json = await res.json() as { ok: boolean; error?: { message: string } };

      if (!json.ok) {
        setErrorMsg(json.error?.message ?? '登録に失敗しました。もう一度お試しください。');
        return;
      }

      setSuccessMsg('登録が完了しました！ログインページへ移動します…');
      setTimeout(() => router.push('/auth/signin'), 1500);
    } catch {
      setErrorMsg('通信エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // ── パスワード強度インジケーター ──────────────────────────────
  function passwordStrength(): { level: number; label: string; color: string } {
    if (!password) return { level: 0, label: '', color: 'transparent' };
    let score = 0;
    if (password.length >= 8)  score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (score <= 2) return { level: score, label: '弱い',   color: '#E07070' };
    if (score <= 3) return { level: score, label: '普通',   color: '#E0B050' };
    return              { level: score, label: '強い',   color: '#50B070' };
  }

  const strength = passwordStrength();

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: 'var(--color-cream)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-8"
        style={{
          background: 'white',
          boxShadow:  'var(--shadow-warm)',
          border:     '1px solid var(--color-beige)',
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
            family<span style={{ color: 'var(--color-orange)' }}>ai</span>.jp に登録
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
            無料でアカウントを作成できます
          </p>
        </div>

        {/* エラー */}
        {errorMsg && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
            style={{ background: '#FFF0F0', color: '#C0392B', border: '1px solid #F5C6CB' }}
            role="alert"
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* 成功 */}
        {successMsg && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
            style={{ background: '#F0FFF4', color: '#27AE60', border: '1px solid #B2DFCC' }}
            role="status"
          >
            ✅ {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* 名前（任意） */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-brown)' }}>
              お名前 <span style={{ color: 'var(--color-brown-light)' }}>(任意)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：田中 太郎"
              autoComplete="name"
              className="rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{
                borderColor: 'var(--color-beige-dark)',
                color:       'var(--color-brown)',
                background:  'var(--color-cream)',
              }}
            />
          </div>

          {/* メール */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-brown)' }}>
              メールアドレス <span style={{ color: '#E07070' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mail@example.com"
              required
              autoComplete="email"
              className="rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{
                borderColor: 'var(--color-beige-dark)',
                color:       'var(--color-brown)',
                background:  'var(--color-cream)',
              }}
            />
          </div>

          {/* パスワード */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-brown)' }}>
              パスワード <span style={{ color: '#E07070' }}>*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上・英数字混在"
              required
              autoComplete="new-password"
              className="rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{
                borderColor: 'var(--color-beige-dark)',
                color:       'var(--color-brown)',
                background:  'var(--color-cream)',
              }}
            />
            {/* 強度バー */}
            {password && (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full transition-colors"
                      style={{
                        background: strength.level >= i * 1.5
                          ? strength.color
                          : 'var(--color-beige)',
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* パスワード確認 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-brown)' }}>
              パスワード確認 <span style={{ color: '#E07070' }}>*</span>
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="もう一度入力"
              required
              autoComplete="new-password"
              className="rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{
                borderColor: confirm && confirm !== password ? '#E07070' : 'var(--color-beige-dark)',
                color:       'var(--color-brown)',
                background:  'var(--color-cream)',
              }}
            />
            {confirm && confirm !== password && (
              <p className="text-xs" style={{ color: '#E07070' }}>パスワードが一致しません</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !!successMsg}
            className="btn-primary w-full mt-2 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />
                登録中…
              </>
            ) : (
              'アカウントを作成'
            )}
          </button>
        </form>

        {/* ログインリンク */}
        <p className="text-center text-sm mt-5" style={{ color: 'var(--color-brown-light)' }}>
          既にアカウントをお持ちの方は{' '}
          <Link
            href="/auth/signin"
            className="font-medium underline hover:opacity-80"
            style={{ color: 'var(--color-orange)' }}
          >
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
