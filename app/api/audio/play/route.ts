/**
 * app/api/audio/play/route.ts
 * familyai.jp — 音声再生カウント API
 *
 * POST /api/audio/play
 * Body: { articleId: string, listenedSec: number }
 *
 * 仕様:
 * - 再生開始から 30秒以上聴いた場合のみカウント（listenedSec >= 30）
 * - 同一 IP × 同一記事の 24時間以内の重複再生はカウントしない
 * - Redis（Upstash）でデデュープキーを管理（TTL: 86400秒）
 * - Redis 未設定時はデデュープをスキップしてカウントを続行（可用性優先）
 * - IP は sha256 ハッシュ（+ソルト）でのみ保存（生 IP は一切保存しない）
 * - `articles.audioPlayCount` をインクリメント
 * - `audio_play_logs` テーブルに再生ログを挿入
 *
 * レスポンス:
 * { ok: true, counted: boolean }
 *   counted: true  → 新規カウント（Redis フラグ設定済み）
 *   counted: false → 重複（24時間以内に同 IP で再生済み）または30秒未満
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql }                   from 'drizzle-orm';
import { createHash }                from 'crypto';
import { z }                         from 'zod';
import { Redis }                     from '@upstash/redis';
import { db, articles, audioPlayLogs } from '@/lib/db';

export const runtime = 'nodejs';

// ── 入力バリデーション ───────────────────────────────────────────
const bodySchema = z.object({
  articleId:   z.string().uuid('articleId は UUID 形式である必要があります'),
  /** クライアントで計測した累積リスニング秒数（30秒未満はカウント対象外） */
  listenedSec: z.number().int().min(0).max(7200).default(0),
});

// ── Redis lazy singleton ─────────────────────────────────────────
let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // Redis 未設定時はデデュープをスキップ（ローカル開発・プレビューデプロイ等）
    return null;
  }
  _redis = Redis.fromEnv();
  return _redis;
}

// ── IP ハッシュ（プライバシー保護） ─────────────────────────────
function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? 'familyai_ip_salt_v1';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

// ── クライアント IP 取得 ────────────────────────────────────────
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  );
}

// ── POST /api/audio/play ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. リクエストボディのパース
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'リクエストボディが不正です', code: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  // 2. Zod バリデーション
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok:    false,
        error: '`articleId`（UUID）が必要です',
        code:  'INVALID_PARAMS',
      },
      { status: 400 },
    );
  }

  const { articleId, listenedSec } = parsed.data;

  // 3. 30秒条件チェック（仕様: 再生開始から30秒以上聴いた場合のみカウント）
  if (listenedSec < 30) {
    return NextResponse.json({ ok: true, counted: false });
  }

  // 4. Redis デデュープチェック（24時間以内の同一 IP × 同一記事）
  const ip       = getClientIp(req);
  const ipHash   = hashIp(ip);
  const redis    = getRedis();
  const redisKey = `audio:played:${articleId}:${ipHash}`;

  if (redis) {
    try {
      const alreadyPlayed = await redis.get(redisKey);
      if (alreadyPlayed !== null) {
        // 重複再生 → カウントなしで 200 を返す
        return NextResponse.json({ ok: true, counted: false });
      }
    } catch (err) {
      // Redis エラーは無視してカウント処理を続行（可用性優先）
      console.warn('[POST /api/audio/play] Redis get エラー（スキップ）:', err);
    }
  }

  // 5. DB 処理: 記事の存在確認 + カウントインクリメント + ログ挿入
  try {
    // 5-1. 記事の存在確認（公開済みのみ）
    const article = await db
      .select({ id: articles.id, published: articles.published })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!article || !article.published) {
      return NextResponse.json(
        { ok: false, error: '記事が見つかりません', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    // 5-2. audioPlayCount をインクリメント
    await db
      .update(articles)
      .set({ audioPlayCount: sql`${articles.audioPlayCount} + 1` })
      .where(eq(articles.id, articleId));

    // 5-3. 再生ログを挿入（生 IP は保存しない・ipHash のみ）
    await db.insert(audioPlayLogs).values({
      articleId,
      ipHash,
    });

    // 6. Redis にフラグをセット（TTL: 86400秒 = 24時間）
    if (redis) {
      try {
        await redis.set(redisKey, '1', { ex: 86400 });
      } catch (err) {
        // Redis set 失敗は無視（次のリクエストでまたカウントされる可能性があるが許容）
        console.warn('[POST /api/audio/play] Redis set エラー（スキップ）:', err);
      }
    }

    return NextResponse.json({ ok: true, counted: true });
  } catch (err) {
    console.error('[POST /api/audio/play] DB エラー:', err);
    return NextResponse.json(
      {
        ok:    false,
        error: 'サーバーエラーが発生しました。しばらくしてからお試しください。',
        code:  'DB_ERROR',
      },
      { status: 500 },
    );
  }
}
