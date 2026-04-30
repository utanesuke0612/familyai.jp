/**
 * app/api/animations/[id]/stage1/route.ts
 * うごくAI教室 — Phase 1a: Stage 1 教育設計 JSON 配信API
 *
 * GET /api/animations/:id/stage1
 *
 * 用途:
 *   結果パネル「📋 学習ポイント」「❓ クイズ」タブが、生成済みアニメーションの
 *   stage1_json（教育設計データ）を取得するためのエンドポイント。
 *   生成直後は /api/generate-animation のレスポンスに同梱されているが、
 *   履歴ページ等で過去の動画を開く際はここから取得する想定。
 *
 * 公開ポリシー:
 *   /api/animations/[id]/route.ts と同じ（is_public=false なら所有者のみ）。
 *
 * レスポンス:
 *   { ok: true,  stage1Json: <Stage1Success の JSON> | null }
 *   { ok: false, error: { code, message } }
 *
 *   stage1Json が null の場合: migration 0014 適用前に生成された古いレコード。
 *   フロント側でフォールバック表示（「学習設計データなし」）すること。
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

  // 1. DB から取得
  let animation;
  try {
    animation = await getAnimationById(id);
  } catch (err) {
    console.error('[GET /api/animations/:id/stage1] DB エラー:', err);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: 'サーバーエラーが発生しました。' } },
      { status: 500 },
    );
  }

  // 2. 存在チェック（非公開アイテムは所有者以外には 404）
  if (!animation) {
    return NextResponse.json(
      { ok: false, error: { code: 'NOT_FOUND', message: '見つかりませんでした。' } },
      { status: 404 },
    );
  }

  if (animation.isPublic === false) {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== animation.userId) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: '見つかりませんでした。' } },
        { status: 404 },
      );
    }
  }

  // 3. stage1_json を返す（NULL の場合は null をそのまま返す → フロントでフォールバック）
  return NextResponse.json(
    { ok: true, stage1Json: animation.stage1Json ?? null },
    {
      headers: {
        'Cache-Control': animation.isPublic === false
          ? 'private, no-store'
          : 'public, max-age=3600, s-maxage=86400',
      },
    },
  );
}
