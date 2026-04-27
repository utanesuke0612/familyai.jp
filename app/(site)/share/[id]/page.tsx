/**
 * app/(site)/share/[id]/page.tsx
 * うごくAI教室 — シェア用公開ページ
 *
 * 友達にシェアされたシェアURL（/share/[id]）からアクセスされる公開ページ。
 * UUIDを知る人のみがアクセスできる「秘密のリンク」方式。
 * 認証不要で誰でも閲覧可能。
 */

import type { Metadata } from 'next';
import Link              from 'next/link';
import { notFound }      from 'next/navigation';
import { getAnimationByIdCached } from '@/lib/repositories/animations';
import { SITE }          from '@/shared';
import ShareButtons      from './ShareButtons';

/**
 * ISR: アニメーションは生成後 immutable のため、長めにキャッシュしてOK。
 * 1時間ごとに再検証することで、シェアURLの大量アクセス時の DB 負荷を削減。
 * （iframe 配信先 /api/animations/:id 側も Cache-Control で同様にキャッシュ済み）
 */
export const revalidate = 3600;

// ── 定数 ─────────────────────────────────────────────────────
const SUBJECT_LABEL: Record<string, string> = {
  science: '🔬 理科',
  math:    '📐 算数・数学',
  social:  '🌏 社会',
};
const GRADE_LABEL: Record<string, string> = {
  'elem-low':  '小3・4年生',
  'elem-high': '小5・6年生',
  'middle':    '中学生',
};
const SUBJECT_COLOR: Record<string, string> = {
  science: '#52b788',
  math:    '#4e9af1',
  social:  '#ff8c42',
};

// ── 動的Metadata（OGP画像・SNS共有時のプレビュー用） ──────────
export async function generateMetadata(
  { params }: { params: { id: string } },
): Promise<Metadata> {
  // DB エラーは fallback metadata で握りつぶす（NotFound と区別したいが metadata 段階では
  // throw すると Next.js が描画フェーズに到達できないため、安全側でフォールバックを返す）。
  let animation: Awaited<ReturnType<typeof getAnimationByIdCached>> = null;
  try {
    animation = await getAnimationByIdCached(params.id);
  } catch (err) {
    console.error('[share/generateMetadata] DB エラー:', err);
  }
  if (!animation) {
    return {
      title:       'シェアされたアニメーション',
      description: `${SITE.name} AI教室で生成された教育アニメーションです。`,
      robots:      'noindex, nofollow',
    };
  }

  const title = `${animation.theme} | ${SITE.name} AI教室`;
  const desc  = `${SUBJECT_LABEL[animation.subject] ?? ''} ${GRADE_LABEL[animation.grade] ?? ''}向けに AI が生成したアニメーション解説です。`;

  return {
    title,
    description: desc,
    // 検索エンジンには載せない（シェアリンク方式）
    robots:      'noindex, nofollow',
    openGraph: {
      title,
      description: desc,
      type:        'article',
      url:         `${SITE.url}/share/${params.id}`,
      siteName:    SITE.name,
      locale:      'ja_JP',
    },
    twitter: {
      card:        'summary_large_image',
      site:        SITE.twitterHandle,
      title,
      description: desc,
    },
  };
}

// ── ページ本体 ───────────────────────────────────────────────
export default async function ShareAnimationPage(
  { params }: { params: { id: string } },
) {
  // DB エラーと NotFound を分離:
  //   - getAnimationByIdCached が throw → DB 障害として 500 で扱う（catch せず再 throw）
  //   - row === null               → 該当 ID なし → 404
  // catch せずに上位 (Next.js) に伝播させると Error Boundary 経由で 500 が返る。
  const animation = await getAnimationByIdCached(params.id);
  if (!animation) notFound();

  const themeColor   = SUBJECT_COLOR[animation.subject] ?? '#ff8c42';
  const subjectLabel = SUBJECT_LABEL[animation.subject] ?? animation.subject;
  const gradeLabel   = GRADE_LABEL[animation.grade]     ?? animation.grade;
  const shareUrl     = `${SITE.url}/share/${params.id}`;

  return (
    <main style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>

      {/* ── ヘッダー ── */}
      <section
        className="px-6 py-6 sm:py-8"
        style={{ background: `linear-gradient(160deg, ${themeColor}15 0%, var(--color-cream) 100%)` }}
      >
        <div className="mx-auto max-w-5xl">
          {/* familyai.jp ブランディング */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-70">
              <span className="text-xl">🌳</span>
              <span className="font-display font-bold text-lg" style={{ color: 'var(--color-brown)' }}>
                {SITE.name}
              </span>
              <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'var(--color-mint)', color: '#1a6644' }}>
                AI教室
              </span>
            </Link>
            <Link
              href="/tools/ai-kyoshitsu"
              className="rounded-full px-4 py-2 text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{ background: themeColor, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            >
              ✨ 自分も作ってみる
            </Link>
          </div>

          {/* タイトル */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: `${themeColor}22`, color: themeColor, border: `1px solid ${themeColor}66` }}
              >
                {subjectLabel}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-brown-light)' }}>
                {gradeLabel}
              </span>
            </div>
            <h1
              className="font-display font-bold leading-tight"
              style={{ fontSize: 'clamp(22px, 3vw + 12px, 32px)', color: 'var(--color-brown)' }}
            >
              🎬 {animation.theme}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-brown-light)' }}>
              AIが作った教育アニメーションです
            </p>
          </div>
        </div>
      </section>

      {/* ── アニメーション本体 ── */}
      <section className="px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <div
            className="rounded-3xl overflow-hidden"
            style={{ boxShadow: 'var(--shadow-warm)', border: `2px solid ${themeColor}44`, background: '#fdf6ee' }}
          >
            <iframe
              src={`/api/animations/${params.id}`}
              width="100%"
              height={800}
              style={{ display: 'block', border: 'none' }}
              title={animation.theme}
              sandbox="allow-scripts allow-same-origin"
              loading="lazy"
            />
          </div>

          {/* シェアボタン */}
          <ShareButtons
            shareUrl={shareUrl}
            theme={animation.theme}
            subjectColor={themeColor}
          />

          {/* CTA */}
          <div
            className="mt-6 rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-4 text-center"
            style={{ background: 'rgba(255,255,255,0.85)', boxShadow: 'var(--shadow-warm-sm)' }}
          >
            <span className="text-3xl">✨</span>
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--color-brown)' }}>
              あなたも自分のテーマで作れます！
            </h2>
            <p className="text-sm leading-relaxed max-w-lg" style={{ color: 'var(--color-brown-light)' }}>
              理科・算数・社会のテーマを入力すると、AIが学年に合わせた
              アニメーションとクイズを自動で作ります。無料で試せます。
            </p>
            <Link
              href="/tools/ai-kyoshitsu"
              className="inline-flex items-center rounded-full px-6 py-3 text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{ background: themeColor, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
            >
              🎬 AI教室を試す →
            </Link>
          </div>
        </div>
      </section>

      {/* ── フッター ── */}
      <section className="px-6 py-6">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs" style={{ color: 'var(--color-brown-muted)' }}>
            © {SITE.name} - {SITE.tagline}
          </p>
        </div>
      </section>
    </main>
  );
}
