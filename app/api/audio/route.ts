/**
 * app/api/audio/route.ts
 * familyai.jp — 音声メタデータ取得 API
 *
 * GET /api/audio?slug={slug}
 *
 * 仕様:
 * - slug から記事を DB で検索し、音声 URL とメタデータを返す
 * - Vercel Blob に保存された MP3 の CDN URL を返す
 * - 未公開記事・音声なし記事は 404
 * - Cache-Control: CDN 1時間キャッシュ
 *
 * レスポンス（成功）:
 * {
 *   ok: true,
 *   data: {
 *     articleId:   string;
 *     url:         string;   // Vercel Blob CDN URL
 *     durationSec: number | null;
 *     title:       string;
 *     transcript:  string | null;
 *     language:    string | null;
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and }                   from 'drizzle-orm';
import { z }                         from 'zod';
import { db, articles }              from '@/lib/db';

export const runtime = 'nodejs';

// ── 入力バリデーション ───────────────────────────────────────────
const querySchema = z.object({
  slug: z.string().min(1).max(255),
});

// ── GET /api/audio?slug={slug} ───────────────────────────────────
export async function GET(req: NextRequest) {
  // 1. クエリパラメータのバリデーション
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({ slug: searchParams.get('slug') });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: '`slug` クエリパラメータが必要です', code: 'INVALID_PARAMS' },
      { status: 400 },
    );
  }

  const { slug } = parsed.data;

  // 2. DB から記事を取得
  try {
    const article = await db
      .select({
        id:               articles.id,
        title:            articles.title,
        audioUrl:         articles.audioUrl,
        audioDurationSec: articles.audioDurationSec,
        audioTranscript:  articles.audioTranscript,
        audioLanguage:    articles.audioLanguage,
        published:        articles.published,
      })
      .from(articles)
      .where(
        and(
          eq(articles.slug, slug),
          eq(articles.published, true),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    // 3. 存在チェック
    if (!article) {
      return NextResponse.json(
        { ok: false, error: '記事が見つかりません', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    if (!article.audioUrl) {
      return NextResponse.json(
        { ok: false, error: 'この記事には音声コンテンツがありません', code: 'NO_AUDIO' },
        { status: 404 },
      );
    }

    // 4. 音声メタデータを返す
    //    audioUrl は Vercel Blob の CDN URL（公開アクセス可能）
    //    ⚠️ プライベート Blob への移行時は @vercel/blob の createPresignedUrl を使用:
    //       import { createPresignedUrl } from '@vercel/blob';
    //       const url = await createPresignedUrl(article.audioUrl, { expiresIn: 3600 });
    const res = NextResponse.json({
      ok:   true,
      data: {
        articleId:   article.id,
        url:         article.audioUrl,
        durationSec: article.audioDurationSec ?? null,
        title:       article.title,
        transcript:  article.audioTranscript ?? null,
        language:    article.audioLanguage ?? null,
      },
    });

    // CDN キャッシュ: 1時間・stale-while-revalidate: 24時間
    res.headers.set(
      'Cache-Control',
      'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    );

    return res;
  } catch (err) {
    console.error('[GET /api/audio] DB エラー:', err);
    return NextResponse.json(
      { ok: false, error: 'サーバーエラーが発生しました。しばらくしてからお試しください。', code: 'DB_ERROR' },
      { status: 500 },
    );
  }
}
