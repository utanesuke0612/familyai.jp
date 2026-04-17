/**
 * app/api/auth/[...nextauth]/route.ts
 * NextAuth.js v5 ルートハンドラ
 *
 * GET  /api/auth/* — セッション取得・リダイレクト等
 * POST /api/auth/* — サインイン・サインアウト等
 */

import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
