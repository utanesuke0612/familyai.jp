/**
 * app/api/cron/cleanup-3d-orphans/route.ts
 * familyai.jp — Rev39: 3D model orphan blob nightly cleanup
 *
 * Vercel Cron から JST 03:00（UTC 18:00）に呼ばれる前提。
 * `Authorization: Bearer <CRON_SECRET>` で簡易認証。
 *
 * 背景:
 *   Rev38 #H4 で 3D model DELETE の処理順を「DB 削除先 → Blob 削除後 best-effort」に
 *   変更したため、Blob 削除失敗時に orphan blob が累積し得る。
 *   本ジョブで `3d-models/` プレフィクスを全列挙し、DB に参照が無い blob を削除する。
 *
 * 安全策:
 *   - DB 参照判定は `pathname` ベースで行う（URL は `/api/3d-models/assets/...` の
 *     proxy 形式と直 Blob URL の 2 種類があり、URL 全文一致では取りこぼす）。
 *   - 削除エラーは個別 catch して `failedCount` に集計（1件の失敗で全体停止しない）。
 *   - Cron Secret 一致のみで実行可能（管理者セッションは Cron では使えないため）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { list, del }                  from '@vercel/blob';
import { db }                          from '@/lib/db';
import { tutor3dModels }               from '@/lib/db/schema';
import { withRequest }                 from '@/lib/log';
import { getServerEnv }                from '@/lib/env';

export const runtime  = 'nodejs';
export const dynamic  = 'force-dynamic';
export const maxDuration = 300;

const BLOB_PREFIX = '3d-models/';

/**
 * DB に保存された URL を Blob の pathname に正規化する。
 * 既存 admin/3d-models/[slug]/route.ts の `assetUrlToBlobPathname` と同等。
 *  - `/api/3d-models/assets/3d-models/foo.glb` → `3d-models/foo.glb`
 *  - `https://<store>.public.blob.vercel-storage.com/3d-models/foo.glb` → `3d-models/foo.glb`
 *  - 認識できない場合は null
 */
function urlToPathname(url: string | null | undefined): string | null {
  if (!url) return null;

  const apiPrefix = '/api/3d-models/assets/';
  if (url.startsWith(apiPrefix)) {
    const pathname = url.slice(apiPrefix.length);
    return pathname.startsWith(BLOB_PREFIX) ? pathname : null;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) return null;
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    return pathname.startsWith(BLOB_PREFIX) ? pathname : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const log = withRequest(req, '/api/cron/cleanup-3d-orphans');

  // 1. Cron Secret 認証
  const { CRON_SECRET } = getServerEnv();
  if (!CRON_SECRET) {
    log.error('cron.no_secret', { hint: 'CRON_SECRET is not configured' });
    return NextResponse.json(
      { ok: false, error: { code: 'NO_CRON_SECRET', message: 'cron secret not configured' } },
      { status: 500 },
    );
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    log.warn('cron.auth_failed', { hint: 'authorization header mismatch' });
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 },
    );
  }

  try {
    // 2. Blob 一覧取得（cursor で全件ページング）
    const allBlobs: Array<{ url: string; pathname: string; size: number }> = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: BLOB_PREFIX, cursor });
      for (const b of page.blobs) {
        allBlobs.push({ url: b.url, pathname: b.pathname, size: b.size });
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    log.info('cron.blob_listed', { count: allBlobs.length });

    // 3. DB 参照 pathname 集合を構築
    const referenced = await db
      .select({
        glbUrl:       tutor3dModels.glbUrl,
        usdzUrl:      tutor3dModels.usdzUrl,
        thumbnailUrl: tutor3dModels.thumbnailUrl,
      })
      .from(tutor3dModels);

    const refPathnames = new Set<string>();
    for (const row of referenced) {
      const a = urlToPathname(row.glbUrl);
      const b = urlToPathname(row.usdzUrl);
      const c = urlToPathname(row.thumbnailUrl);
      if (a) refPathnames.add(a);
      if (b) refPathnames.add(b);
      if (c) refPathnames.add(c);
    }
    log.info('cron.db_referenced', { count: refPathnames.size });

    // 4. orphan 抽出 + 削除
    const orphans = allBlobs.filter((b) => !refPathnames.has(b.pathname));
    let deletedBytes = 0;
    let deletedCount = 0;
    let failedCount  = 0;

    for (const orphan of orphans) {
      try {
        await del(orphan.url);
        deletedBytes += orphan.size;
        deletedCount++;
      } catch (err) {
        log.warn('cron.del_failed', {
          pathname: orphan.pathname,
          error:    err instanceof Error ? err.message : String(err),
        });
        failedCount++;
      }
    }

    log.info('cron.cleanup_summary', {
      blobsTotal:   allBlobs.length,
      referenced:   refPathnames.size,
      orphansFound: orphans.length,
      deletedCount,
      deletedBytes,
      failedCount,
    });

    return NextResponse.json({
      ok: true,
      data: {
        blobsTotal:   allBlobs.length,
        referenced:   refPathnames.size,
        orphansFound: orphans.length,
        deletedCount,
        deletedBytes,
        failedCount,
      },
    });
  } catch (err) {
    log.error('cron.fatal', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'cleanup failed' } },
      { status: 500 },
    );
  }
}
