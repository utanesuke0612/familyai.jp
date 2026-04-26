/**
 * app/api/animations/[id]/route.ts
 * うごくAI教室 — アニメーションHTML配信API
 *
 * GET /api/animations/:id
 *
 * iframeのsrc属性に指定するエンドポイント。
 * DBからHTMLを取得してtext/htmlで返す。
 * 本人のみアクセス可能（セッションCookieで認証）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth }                       from '@/lib/auth';
import { getAnimationById }           from '@/lib/repositories/animations';

export const runtime = 'nodejs';

export async function GET(
  req:     NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  // 1. 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse('ログインが必要です。', { status: 401 });
  }

  // 2. DBからHTMLを取得
  let animation;
  try {
    animation = await getAnimationById(id);
  } catch (err) {
    console.error('[GET /api/animations/:id] DB エラー:', err);
    return new NextResponse('サーバーエラーが発生しました。', { status: 500 });
  }

  // 3. 存在チェック
  if (!animation) {
    return new NextResponse('見つかりませんでした。', { status: 404 });
  }

  // 4. 所有者チェック（他人のアニメーションは閲覧不可）
  if (animation.userId !== session.user.id) {
    return new NextResponse('アクセス権限がありません。', { status: 403 });
  }

  // 5. HTMLをそのまま返す
  return new NextResponse(animation.htmlContent, {
    status: 200,
    headers: {
      'Content-Type':    'text/html; charset=utf-8',
      // Next.js デフォルトの DENY を SAMEORIGIN に上書きしてiframe表示を許可
      'X-Frame-Options': 'SAMEORIGIN',
      // iframeのsandbox属性と組み合わせてセキュリティを確保
      'Cache-Control':   'private, max-age=3600',
    },
  });
}
