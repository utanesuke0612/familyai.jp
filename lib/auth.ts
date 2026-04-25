/**
 * lib/auth.ts
 * familyai.jp — NextAuth.js v5 認証設定
 *
 * Phase 1 対応:
 *   - Google OAuth（ソーシャルログイン）
 *   - Credentials（メール + パスワード）
 *
 * TODO: Phase4 - Apple ID Provider を追加予定
 *
 * 同一メールアドレスポリシー:
 *   ① Google 登録済み → 同メールでローカル登録 → エラー
 *   ② ローカル登録済み → 同メールで Google ログイン → 自動連携（google に更新）
 *   ③ 重複防止は users.email の UNIQUE 制約でも保証
 */

import NextAuth            from 'next-auth';
import Google              from 'next-auth/providers/google';
import Credentials         from 'next-auth/providers/credentials';
import 'next-auth/jwt';
import bcrypt              from 'bcryptjs';
import { eq }              from 'drizzle-orm';
import { db, users }       from '@/lib/db';

// ── NextAuth Session 型拡張 ───────────────────────────────────
declare module 'next-auth' {
  interface Session {
    user: {
      id:    string;
      email: string;
      name:  string | null;
      image: string | null;
      /** 'free' | 'pro'（Rev23 #4：JWT に埋め込んで DB 呼び出しを回避） */
      plan:  string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?:   string;
    plan?: string;
  }
}

// ── DB ユーザー取得ヘルパー ─────────────────────────────────────
async function getUserByEmail(email: string) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// ── NextAuth 設定 ──────────────────────────────────────────────
export const { handlers, signIn, signOut, auth } = NextAuth({
  // NEXTAUTH_SECRET / AUTH_SECRET どちらも対応
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,

  providers: [
    // ── Google ログイン ──────────────────────────────────────
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── ローカルアカウント（メール＋パスワード）─────────────
    Credentials({
      credentials: {
        email:    { label: 'メールアドレス', type: 'email' },
        password: { label: 'パスワード',     type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await getUserByEmail(credentials.email as string);
        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!isValid) return null;

        return {
          id:    user.id,
          email: user.email,
          name:  user.name ?? null,
          image: user.image ?? null,
        };
      },
    }),

    // TODO: Phase4 - Apple ID Provider を追加予定
    // Apple({
    //   clientId:     process.env.APPLE_ID!,
    //   clientSecret: generateAppleSecret({
    //     teamId:     process.env.APPLE_TEAM_ID!,
    //     keyId:      process.env.APPLE_KEY_ID!,
    //     privateKey: process.env.APPLE_PRIVATE_KEY!,
    //   }),
    // }),
  ],

  // カスタムページ
  pages: {
    signIn: '/auth/signin',
    error:  '/auth/signin',
  },

  // JWT セッション戦略（DB に sessions テーブル不要）
  session: { strategy: 'jwt' },

  callbacks: {
    // ── Google OAuth ログイン時: 既存ローカルアカウントとの連携 ──
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const existing = await getUserByEmail(user.email);

        if (existing && existing.authProvider === 'local') {
          // ローカル登録済み → Google に自動連携
          await db
            .update(users)
            .set({
              authProvider: 'google',
              passwordHash: null,
              image:        user.image ?? existing.image,
              updatedAt:    new Date(),
            })
            .where(eq(users.email, user.email));
        } else if (!existing) {
          // 新規 Google ユーザーを DB に作成
          await db.insert(users).values({
            email:        user.email,
            name:         user.name  ?? null,
            image:        user.image ?? null,
            authProvider: 'google',
          }).onConflictDoNothing();
        }
        // 既に Google 登録済みの場合はそのまま通過
      }
      return true;
    },

    // ── JWT にユーザー ID + plan を埋め込む（Rev23 #4）────────
    // plan を毎リクエストで DB から引くのを避けるため、
    // ログイン時 / トリガー時のみ users テーブルから取得してトークンに焼き込む。
    async jwt({ token, user, account, trigger }) {
      // 初回サインイン時のみ user オブジェクトが渡される
      if (user) {
        if (account?.provider === 'google' && user.email) {
          // Google ログイン: user.id は Google の sub（数値文字列）なので
          // DBに挿入した UUID をメールアドレスで引く
          const dbUser = await getUserByEmail(user.email);
          if (dbUser) token.id = dbUser.id;
        } else if (user.id) {
          // Credentials ログイン: authorize() が返した DB の UUID をそのまま使用
          token.id = user.id;
        }
      }

      // 初回ログイン or セッション更新時に plan を DB から取得
      const shouldRefreshPlan =
        trigger === 'signIn' ||
        trigger === 'signUp' ||
        trigger === 'update' ||
        (token.plan === undefined && token.id);

      if (shouldRefreshPlan && token.id) {
        try {
          const rows = await db
            .select({ plan: users.plan })
            .from(users)
            .where(eq(users.id, token.id as string))
            .limit(1);
          token.plan = rows[0]?.plan ?? 'free';
        } catch {
          token.plan = token.plan ?? 'free';
        }
      }

      return token;
    },

    // ── Session に id + plan を付与 ─────────────────────────
    async session({ session, token }) {
      if (token.id) {
        (session.user as { id: string }).id = token.id as string;
      }
      (session.user as { plan: string }).plan = (token.plan as string) ?? 'free';
      return session;
    },
  },
});
