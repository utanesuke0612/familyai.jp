/**
 * app/(site)/pages/[slug]/page.tsx
 * familyai.jp — HTML ページ公開ビュー
 *
 * サーバー側で Private Vercel Blob から HTML を取得し、
 * iframe の srcdoc に直接埋め込む。
 * → プロキシルート不要・接続問題を回避
 */

import type { Metadata }                    from 'next';
import { notFound }                         from 'next/navigation';
import { cookies }                          from 'next/headers';
import { eq }                               from 'drizzle-orm';
import { db, htmlPages }                    from '@/lib/db';
import { SITE }                             from '@/shared';
import { HtmlPagePasswordGate }             from '@/components/pages/HtmlPagePasswordGate';
import { HtmlPageViewer }                   from '@/components/pages/HtmlPageViewer';
import { verifyPageCookie, pageCookieName } from '@/lib/html-page-auth';
import { extractTextFromHtml }            from '@/lib/html';

// パスワード保護ページは毎回動的レンダリング、パスワードなしは ISR（1時間）
// ※ パスワードありかどうかは DB を引くまで分からないため、ページ自体は
//    force-dynamic にしつつ、パスワードなしページの Blob fetch は
//    Cache-Control: public でブラウザ側にキャッシュさせる
export const dynamic = 'force-dynamic';

async function getHtmlPage(slug: string) {
  const [row] = await db
    .select()
    .from(htmlPages)
    .where(eq(htmlPages.slug, slug))
    .limit(1);
  return row ?? null;
}

/**
 * iframe(srcdoc) 内のアンカーリンク（#section）クリックを横取りして、
 * ページ遷移ではなく手動スクロールに変換するスクリプト。
 *
 * 【なぜ必要か】
 * srcdoc iframe の baseURI は親ページ（http://localhost:3000/pages/...）
 * になるため、`href="#ch1"` をクリックすると
 * `http://localhost:3000/pages/...#ch1` への完全なページ遷移が走り、
 * iframe 内に親ページを読み込もうとして「接続拒否」になる。
 * → capture フェーズで全アンカークリックを横取りし、scrollIntoView で代替する。
 */
const ANCHOR_FIX_SCRIPT = `
<script>
(function() {
  document.addEventListener('click', function(e) {
    var t = e.target;
    var a = t && t.closest ? t.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var hashIndex = href.indexOf('#');
    if (hashIndex < 0) return;          // ハッシュを含まないリンクは対象外
    var id = href.slice(hashIndex);     // 例: "#ch1"
    if (id.length < 2) return;
    var el;
    try { el = document.querySelector(id); } catch (_) { el = null; }
    if (el) {
      e.preventDefault();
      e.stopPropagation();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, true);
})();
</script>
`;

/**
 * HTML 内の localhost 参照を無害化する。
 *   1. <base href="http://localhost..."> を削除
 *   2. <meta http-equiv="refresh"> を削除（自動リダイレクト防止）
 *   3. アンカークリック修正スクリプトを </body> 直前（無ければ末尾）に注入
 */
function sanitizeHtml(html: string): string {
  let result = html;

  // 1. <base href="http://localhost..."> を削除
  result = result.replace(
    /<base[^>]+href=["']https?:\/\/(localhost|127\.0\.0\.1)[^"']*["'][^>]*\/?>/gi,
    '',
  );

  // 2. <meta http-equiv="refresh"> を削除
  result = result.replace(
    /<meta[^>]+http-equiv=["']?refresh["']?[^>]*\/?>/gi,
    '',
  );

  // 3. アンカー修正スクリプトを注入
  if (/<\/body>/i.test(result)) {
    result = result.replace(/<\/body>/i, `${ANCHOR_FIX_SCRIPT}</body>`);
  } else {
    result = result + ANCHOR_FIX_SCRIPT;
  }

  return result;
}

/** Private Vercel Blob から HTML テキストを取得し、無害化する */
async function fetchHtmlContent(blobUrl: string): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache:   'no-store',
    });
    if (!res.ok) return null;
    const html = await res.text();
    return sanitizeHtml(html);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const page = await getHtmlPage(params.slug);
  if (!page) return { title: 'Not Found' };
  return {
    title:      `${page.title} | ${SITE.name}`,
    alternates: { canonical: `${SITE.url}/pages/${page.slug}` },
  };
}

export default async function HtmlPublicPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = await getHtmlPage(params.slug);
  if (!page) notFound();

  // パスワード保護チェック
  if (page.passwordHash) {
    const cookieStore = cookies();
    const cookieValue = cookieStore.get(pageCookieName(params.slug))?.value;
    if (!verifyPageCookie(params.slug, page.passwordHash, cookieValue)) {
      return <HtmlPagePasswordGate slug={params.slug} title={page.title} />;
    }
  }

  // サーバー側で HTML を取得
  const htmlContent = await fetchHtmlContent(page.blobUrl);

  if (!htmlContent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: '#6B7280' }}>コンテンツを読み込めませんでした。</p>
      </div>
    );
  }

  // AI チャット用に HTML からテキストを抽出（先頭 6000 字）
  const pageContent = extractTextFromHtml(htmlContent);

  return (
    <HtmlPageViewer
      title={page.title}
      slug={page.slug}
      htmlContent={htmlContent}
      pageContent={pageContent}
    />
  );
}
