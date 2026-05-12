/**
 * app/api/admin/3d-models/upload-token/route.ts
 * POST /api/admin/3d-models/upload-token
 *
 * Vercel Blob「クライアント直接アップロード」用の token を発行する。
 * 5MB 超の GLB ファイルは Next.js Route Handler の body 制限（4.5MB）を
 * 超えるため、ブラウザから Vercel Blob へ直接 PUT する必要がある。
 *
 * 流れ:
 *   1. クライアント: `@vercel/blob/client` の `upload()` がこの endpoint を呼ぶ
 *      （内部で 2 段階通信が走る・本 handler は両段階を `handleUpload` で処理）
 *   2. サーバ:  isAdmin / CSRF / レート制限 を確認 → 短命 token を発行
 *   3. クライアント: 取得した token で Vercel Blob に直接 PUT
 *   4. クライアント: アップロード完了後、得た URL を /api/admin/3d-models へ POST
 *
 * セキュリティ:
 *   - requireAdmin（ADMIN_EMAIL 一致のみ）
 *   - verifyCsrf（Origin 検証）
 *   - enforceAdminRateLimit（10 req/min）
 *   - allowed MIME / max size を pathname 別に制限
 *
 * 命名規則:
 *   tutor3d/{slug}-{hash8}.{ext}   ← cache-busting 用ハッシュ付与
 *   （Codex Q1-8 対応・GLB / USDZ / Thumbnail それぞれ独立）
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleUpload }              from '@vercel/blob/client';
import type { HandleUploadBody }     from '@vercel/blob/client';
import { requireAdmin }              from '@/lib/admin-auth';
import { verifyCsrf }                from '@/lib/csrf';
import { enforceAdminRateLimit }     from '@/lib/ratelimit';

export const runtime = 'nodejs';

// 推奨案で確定済の上限値
const MAX_GLB_BYTES        = 30 * 1024 * 1024;  // 30 MB
const MAX_USDZ_BYTES       = 30 * 1024 * 1024;  // 30 MB
const MAX_THUMBNAIL_BYTES  =  2 * 1024 * 1024;  //  2 MB

const ALLOWED_GLB_TYPES  = ['model/gltf-binary', 'application/octet-stream'];
const ALLOWED_USDZ_TYPES = ['model/vnd.usdz+zip', 'application/zip', 'application/octet-stream'];
const ALLOWED_IMG_TYPES  = ['image/webp', 'image/png', 'image/jpeg'];

/** pathname の拡張子から MIME 制約と最大サイズを決める */
function constraintsFor(pathname: string): { types: string[]; max: number } | null {
  if (pathname.endsWith('.glb'))            return { types: ALLOWED_GLB_TYPES,  max: MAX_GLB_BYTES };
  if (pathname.endsWith('.usdz'))           return { types: ALLOWED_USDZ_TYPES, max: MAX_USDZ_BYTES };
  if (/\.(webp|png|jpe?g)$/i.test(pathname)) return { types: ALLOWED_IMG_TYPES,  max: MAX_THUMBNAIL_BYTES };
  return null;
}

export async function POST(req: NextRequest) {
  // 重要: 本 endpoint は 2 段階で呼ばれる
  //   ① ブラウザ → サーバ: `type: 'blob.generate-client-token'`（token 取得）
  //   ② Vercel Blob → サーバ: `type: 'blob.upload-completed'`（完了通知・署名付き）
  // ① はブラウザからの呼び出しなので Cookie/Origin が揃う → CSRF/admin/rate-limit を適用。
  // ② は Vercel の edge からの呼び出しなので Cookie/Origin が無い。代わりに
  //    `handleUpload` 内部で `BLOB_READ_WRITE_TOKEN` による署名検証が走るため
  //    本側の追加チェックは不要（むしろ通すと 403 で完了通知が失敗し、
  //    ブラウザの `upload()` が永久に pending になる事故が発生する）。
  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON' } },
      { status: 400 },
    );
  }

  // ① の token 生成時のみブラウザ起源チェック
  if (body.type === 'blob.generate-client-token') {
    if (!verifyCsrf(req)) {
      return NextResponse.json(
        { ok: false, error: { code: 'CSRF', message: 'CSRF check failed' } },
        { status: 403 },
      );
    }

    const check = await requireAdmin();
    if (!check.ok) return check.response;

    const rl = await enforceAdminRateLimit(req, 'admin');
    if (rl) return rl;
  }

  // デバッグログ（問題切り分け中）
  console.log('[upload-token] body.type =', body.type);
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[upload-token] ⚠️ BLOB_READ_WRITE_TOKEN 環境変数が未設定です');
    return NextResponse.json(
      { ok: false, error: { code: 'NO_BLOB_TOKEN', message: 'サーバ側 BLOB_READ_WRITE_TOKEN が未設定です。Vercel の Storage で Blob を作成し、.env.local に追加してください。' } },
      { status: 500 },
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
        const c = constraintsFor(pathname);
        if (!c) {
          throw new Error(`許可されていない拡張子です: ${pathname}`);
        }
        console.log('[upload-token] generating token for', pathname, `(max ${c.max} bytes)`);
        return {
          allowedContentTypes:    c.types,
          maximumSizeInBytes:     c.max,
          // クライアントが Blob に到達するまでの token 有効期限（秒）
          validUntil:             Date.now() + 60 * 1000,  // 1 分
          // ファイル名はクライアント側から `tutor3d/{slug}-{hash8}.glb` の形で来る前提
          addRandomSuffix:        false,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('[upload-token] upload completed:', blob.pathname, blob.url);
      },
    });

    console.log('[upload-token] OK', body.type);
    return NextResponse.json(jsonResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload token generation failed';
    console.error('[upload-token] ❌', msg, err);
    return NextResponse.json(
      { ok: false, error: { code: 'UPLOAD_TOKEN_ERROR', message: msg } },
      { status: 400 },
    );
  }
}
