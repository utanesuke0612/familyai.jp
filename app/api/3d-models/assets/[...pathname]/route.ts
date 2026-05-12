/**
 * app/api/3d-models/assets/[...pathname]/route.ts
 * GET /api/3d-models/assets/3d-models/:file
 *
 * Private Vercel Blob store から 3D アセットを配信する。
 * ブラウザには BLOB_READ_WRITE_TOKEN を渡さず、この Route Handler が
 * private Blob を取得して同一オリジンのレスポンスとして返す。
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, eq, or }               from 'drizzle-orm';
import { isAdmin }                   from '@/lib/admin-auth';
import { db }                        from '@/lib/db';
import { tutor3dModels }             from '@/lib/db/schema';

export const runtime = 'nodejs';

const ALLOWED_EXT = /\.(glb|usdz|webp|png|jpe?g)$/i;

function getPrivateBlobUrl(pathname: string): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const [, , , storeId = ''] = token?.split('_') ?? [];
  if (!storeId) return null;
  const encodedPath = pathname.split('/').map(encodeURIComponent).join('/');
  return `https://${storeId}.private.blob.vercel-storage.com/${encodedPath}`;
}

function safeAssetPath(parts: string[]): string | null {
  const pathname = parts.join('/');
  if (!pathname.startsWith('3d-models/')) return null;
  if (!ALLOWED_EXT.test(pathname)) return null;
  if (pathname.includes('..') || pathname.includes('\\')) return null;
  return pathname;
}

async function isReferencedByPublishedModel(assetUrl: string): Promise<boolean> {
  const [row] = await db
    .select({ id: tutor3dModels.id })
    .from(tutor3dModels)
    .where(and(
      eq(tutor3dModels.published, true),
      or(
        eq(tutor3dModels.glbUrl, assetUrl),
        eq(tutor3dModels.usdzUrl, assetUrl),
        eq(tutor3dModels.thumbnailUrl, assetUrl),
      ),
    ))
    .limit(1);

  return Boolean(row);
}

async function handleAssetRequest(
  req: NextRequest,
  { params }: { params: { pathname: string[] } },
  method: 'GET' | 'HEAD',
) {
  const pathname = safeAssetPath(params.pathname);
  if (!pathname) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_ASSET_PATH', message: 'asset path is invalid' } },
      { status: 400 },
    );
  }

  const assetUrl = `/api/3d-models/assets/${pathname}`;
  const canRead = await isReferencedByPublishedModel(assetUrl) || await isAdmin();
  if (!canRead) {
    return NextResponse.json(
      { ok: false, error: { code: 'NOT_FOUND', message: 'asset not found' } },
      { status: 404 },
    );
  }

  const blobUrl = getPrivateBlobUrl(pathname);
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobUrl || !token) {
    return NextResponse.json(
      { ok: false, error: { code: 'NO_BLOB_TOKEN', message: 'BLOB_READ_WRITE_TOKEN is not configured' } },
      { status: 500 },
    );
  }

  const upstreamHeaders = new Headers({
    Authorization: `Bearer ${token}`,
  });
  const range = req.headers.get('range');
  if (range) upstreamHeaders.set('Range', range);
  const ifNoneMatch = req.headers.get('if-none-match');
  if (ifNoneMatch) upstreamHeaders.set('If-None-Match', ifNoneMatch);
  const ifModifiedSince = req.headers.get('if-modified-since');
  if (ifModifiedSince) upstreamHeaders.set('If-Modified-Since', ifModifiedSince);

  const upstream = await fetch(blobUrl, {
    method,
    headers: upstreamHeaders,
  });

  if (upstream.status === 404) {
    return NextResponse.json(
      { ok: false, error: { code: 'BLOB_NOT_FOUND', message: 'blob not found' } },
      { status: 404 },
    );
  }
  if (!upstream.ok && upstream.status !== 304) {
    console.error('[3d-assets] private blob fetch failed', upstream.status, upstream.statusText);
    return NextResponse.json(
      { ok: false, error: { code: 'BLOB_FETCH_FAILED', message: 'failed to fetch blob' } },
      { status: 502 },
    );
  }

  const headers = new Headers();
  for (const key of [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
    'last-modified',
  ]) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set('Cache-Control', 'private, max-age=300');

  return new Response(method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: { pathname: string[] } },
) {
  return handleAssetRequest(req, ctx, 'GET');
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: { pathname: string[] } },
) {
  return handleAssetRequest(req, ctx, 'HEAD');
}
