import { NextRequest, NextResponse } from 'next/server';
import net from 'node:net';

export const runtime = 'nodejs';
export const revalidate = 86400;

const MAX_HTML_BYTES = 256_000;
const PRIVATE_HOSTS = new Set(['localhost', '0.0.0.0']);

function isPrivateIp(hostname: string): boolean {
  const ipVersion = net.isIP(hostname);
  if (ipVersion === 0) return false;

  if (ipVersion === 4) {
    const parts = hostname.split('.').map(Number);
    const [a, b] = parts;
    return a === 10
      || a === 127
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 169 && b === 254);
  }

  const lower = hostname.toLowerCase();
  return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
}

function safeUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const hostname = url.hostname.toLowerCase();
    if (PRIVATE_HOSTS.has(hostname) || hostname.endsWith('.local') || isPrivateIp(hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function pickMeta(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern)?.[1];
    if (match) return decodeEntities(match);
  }
  return null;
}

function pickTitle(html: string): string | null {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeEntities(title.replace(/\s+/g, ' ')) : null;
}

function absoluteUrl(value: string | null, base: URL): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function readLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (received < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    received += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}


async function fetchHtml(target: URL): Promise<Response> {
  let current = target;

  for (let redirects = 0; redirects < 4; redirects++) {
    const res = await fetch(current, {
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'familyai-link-preview/1.0',
      },
      next: { revalidate: 86400 },
    });

    if (![301, 302, 303, 307, 308].includes(res.status)) return res;

    const location = res.headers.get('location');
    const nextUrl = safeUrl(location ? new URL(location, current).toString() : null);
    if (!nextUrl) throw new Error('Unsafe redirect');
    current = nextUrl;
  }

  throw new Error('Too many redirects');
}

export async function GET(req: NextRequest) {
  const target = safeUrl(req.nextUrl.searchParams.get('url'));
  if (!target) {
    return NextResponse.json({ ok: false, error: 'INVALID_URL' }, { status: 400 });
  }

  try {
    const res = await fetchHtml(target);

    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok || !contentType.includes('text/html')) {
      return NextResponse.json({ ok: false, error: 'UNSUPPORTED_URL' }, { status: 422 });
    }

    const html = await readLimited(res);
    const finalUrl = new URL(res.url || target.toString());
    const title = pickMeta(html, 'og:title') || pickMeta(html, 'twitter:title') || pickTitle(html) || finalUrl.hostname;
    const description = pickMeta(html, 'og:description') || pickMeta(html, 'description') || pickMeta(html, 'twitter:description');
    const image = absoluteUrl(pickMeta(html, 'og:image') || pickMeta(html, 'twitter:image'), finalUrl);
    const siteName = pickMeta(html, 'og:site_name');

    return NextResponse.json({
      ok: true,
      data: {
        url: finalUrl.toString(),
        title,
        description,
        image,
        siteName,
        hostname: finalUrl.hostname.replace(/^www\./, ''),
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'FETCH_FAILED' }, { status: 502 });
  }
}
