/**
 * app/admin/layout.tsx
 * familyai.jp — 管理画面レイアウト
 *
 * - ADMIN_EMAIL 環境変数と一致するメールアドレスのみアクセス可
 * - 一致しない場合は /auth/signin にリダイレクト
 * - サイトの Header/Footer は表示しない（管理専用 UI）
 */

import { redirect }  from 'next/navigation';
import { auth }      from '@/lib/auth';
import { AdminNav }  from '@/components/admin/AdminNav';

export const metadata = { title: '管理画面 | familyai.jp' };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session    = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;

  // 未ログイン または 管理者メール不一致 → サインインへ
  if (!adminEmail || !session?.user?.email || session.user.email !== adminEmail) {
    redirect('/auth/signin');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', flexDirection: 'column' }}>
      <AdminNav email={session.user.email} />
      <main id="main-content" style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}
