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
 * UUIDで指定されたアニメーションは認証なしで誰でも閲覧可能。
 * UUIDは128bitエントロピーで実質推測不可能なため、
 * シェアURLを知る人のみがアクセスできる「秘密のリンク」方式。
 * （Google Docsのリンク共有と同じ仕組み）
 */

import { NextRequest, NextResponse } from 'next/server';
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

  // 3. HTMLをそのまま返す（公開アクセス可・UUID知る人のみ）
  return new NextResponse(animation.htmlContent, {
    status: 200,
    headers: {
      'Content-Type':    'text/html; charset=utf-8',
      // Next.js デフォルトの DENY を SAMEORIGIN に上書きしてiframe表示を許可
      'X-Frame-Options': 'SAMEORIGIN',
      // 公開コンテンツ：CDNでもキャッシュ可能（同じUUIDは同じHTML）
      'Cache-Control':   'public, max-age=3600, s-maxage=86400',
    },
  });
}
