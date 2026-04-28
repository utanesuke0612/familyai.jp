/**
 * app/api/animations/[id]/route.ts
 * うごくAI教室 — アニメーションHTML配信API
 *
 * GET /api/animations/:id
 *
 * iframeのsrc属性に指定するエンドポイント。
 * DBからHTMLを取得してtext/htmlで返す。
 *
 * 【公開ポリシー】
 * デフォルトは「公開（is_public=true）」で、UUID を知る人なら誰でも閲覧可能。
 * UUIDは128bitエントロピーで実質推測不可能なため、
 * シェアURLを知る人のみがアクセスできる「秘密のリンク」方式。
 * （Google Docsのリンク共有と同じ仕組み）
 *
 * 【R3-K3 追加】
 * 所有者がマイページから「🔒 非公開」に切替えた場合（is_public=false）、
 * 所有者本人以外がアクセスすると 404 を返す（情報漏洩防止のため
 * 403 ではなく 404 で「存在しない」と区別不能にする）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth }                       from '@/lib/auth';
import { getAnimationById }           from '@/lib/repositories/animations';

export const runtime = 'nodejs';

export async function GET(
  _req:   NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  // 1. DBからHTMLを取得
  let animation;
  try {
    animation = await getAnimationById(id);
  } catch (err) {
    console.error('[GET /api/animations/:id] DB エラー:', err);
    return new NextResponse('サーバーエラーが発生しました。', { status: 500 });
  }

  // 2. 存在チェック
  if (!animation) {
    return new NextResponse('見つかりませんでした。', { status: 404 });
  }

  // 3. R3-K3: 非公開チェック（所有者以外は 404）
  //    is_public=true なら誰でも閲覧可（既存挙動）
  //    is_public=false なら auth() でログインユーザーを取得し所有者と一致しなければ 404
  if (animation.isPublic === false) {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== animation.userId) {
      return new NextResponse('見つかりませんでした。', { status: 404 });
    }
  }

  // 4. HTMLをそのまま返す
  // 注意: 非公開アイテムは CDN キャッシュさせない（所有者以外への配信を防ぐ）
  const cacheHeader = animation.isPublic === false
    ? 'private, no-store'
    : 'public, max-age=3600, s-maxage=86400';

  return new NextResponse(animation.htmlContent, {
    status: 200,
    headers: {
      'Content-Type':    'text/html; charset=utf-8',
      // Next.js デフォルトの DENY を SAMEORIGIN に上書きしてiframe表示を許可
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control':   cacheHeader,
    },
  });
}
