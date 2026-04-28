/**
 * app/(site)/share/[id]/opengraph-image.tsx
 * うごくAI教室 シェア URL の動的 OGP 画像（1200×630）
 *
 * R3-U2（Rev30 候補）: SNS（X / LINE / Slack 等）で共有された時に
 * テーマ名・教科・学年を含む専用 OGP 画像が表示される。
 * 各 share/[id] にユニークな OGP を生成して回遊率と訴求力を上げる。
 *
 * Next.js 14 のファイルベース規約により、build 時に `/share/[id]/opengraph-image`
 * として自動配信される。`generateMetadata` の openGraph.images は不要。
 *
 * ⚠️ 保留中の課題（2026-04-28）:
 *   ローカル dev で `/share/[id]/opengraph-image` を直接開くと 404 が返る。
 *   Edge runtime → Node.js runtime に変更しても解消せず。原因候補:
 *     (1) Next.js 14 の opengraph-image 規約が route group `(site)` 配下で
 *         dev server の File-System Router に正しく登録されない
 *     (2) DB 取得（getAnimationByIdCached）が dev で起動エラー
 *     (3) dev server のキャッシュ起因（rm -rf .next で要再検証）
 *   対策候補:
 *     A) ファイルを `app/share/[id]/opengraph-image.tsx`（route group 外）に移動
 *     B) Vercel 本番ビルドでの動作可否を先に確認
 *   詳細は todo/02_CodingAgent指示書.md の Rev30 行「⚠️ R3-U2 保留」参照。
 */

import { ImageResponse } from 'next/og';
import { getAnimationByIdCached } from '@/lib/repositories/animations';
import { SITE } from '@/shared';

// ── Node.js runtime（DB 直接読み取りのため Edge ではなく Node を使用）──
// Drizzle/Neon の bundle 互換性を考慮し、Edge ではなく Node で動かす。
// next/og の ImageResponse は Node でも動作する。
export const runtime  = 'nodejs';
export const size     = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt      = 'うごくAI教室で生成されたアニメーション';

// ── 教科ごとのカラーテーマと絵文字 ────────────────────────────
const SUBJECT_THEME: Record<string, { emoji: string; label: string; bg1: string; bg2: string; accent: string }> = {
  science: {
    emoji:  '🔬',
    label:  '理科',
    bg1:    '#52b788',
    bg2:    '#A8E6CF',
    accent: '#1a6644',
  },
  math: {
    emoji:  '📐',
    label:  '算数・数学',
    bg1:    '#4e9af1',
    bg2:    '#A8C8F0',
    accent: '#1f4690',
  },
  social: {
    emoji:  '🌏',
    label:  '社会',
    bg1:    '#ff8c42',
    bg2:    '#FFD3A5',
    accent: '#7a3a18',
  },
};

const GRADE_LABEL: Record<string, string> = {
  'elem-low':  '小3・4年生',
  'elem-high': '小5・6年生',
  'middle':    '中学生',
};

// ── OGP 画像本体 ────────────────────────────────────────────
export default async function OpengraphImage(
  { params }: { params: { id: string } },
) {
  // DB から取得（失敗時はフォールバック画像）
  let animation: Awaited<ReturnType<typeof getAnimationByIdCached>> = null;
  try {
    animation = await getAnimationByIdCached(params.id);
  } catch {
    // ignore — fallback OGP を表示
  }

  // フォールバック: アニメ取得失敗時
  if (!animation) {
    return new ImageResponse(
      (
        <div
          style={{
            width:          '100%',
            height:         '100%',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            background:     'linear-gradient(135deg, #FFB98A 0%, #FF8C42 100%)',
            color:          'white',
            fontSize:       72,
            fontWeight:     800,
          }}
        >
          <div style={{ fontSize: 120 }}>🎬</div>
          <div>うごくAI教室</div>
          <div style={{ fontSize: 28, marginTop: 16, opacity: 0.85 }}>{SITE.name}</div>
        </div>
      ),
      size,
    );
  }

  const theme  = SUBJECT_THEME[animation.subject] ?? SUBJECT_THEME.science;
  const grade  = GRADE_LABEL[animation.grade] ?? animation.grade;

  // テーマ文字列を 30 文字でカット（OGP 縦サイズに収まるよう）
  const titleText = animation.theme.length > 30
    ? animation.theme.slice(0, 30) + '…'
    : animation.theme;

  return new ImageResponse(
    (
      <div
        style={{
          width:           '100%',
          height:          '100%',
          display:         'flex',
          flexDirection:   'column',
          background:      `linear-gradient(135deg, ${theme.bg2} 0%, #FDF6ED 60%, ${theme.bg1}33 100%)`,
          padding:         '64px 80px',
          position:        'relative',
        }}
      >
        {/* 装飾ブロブ（右上） */}
        <div
          style={{
            position:     'absolute',
            top:          -120,
            right:        -120,
            width:        420,
            height:       420,
            borderRadius: 9999,
            background:   `radial-gradient(circle, ${theme.bg1}55 0%, transparent 70%)`,
          }}
        />

        {/* 上段: ブランディング + 教科バッジ */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 56 }}>🌳</span>
            <span
              style={{
                fontSize:   42,
                fontWeight: 800,
                color:      '#5C3A1F',
                letterSpacing: '-0.02em',
              }}
            >
              {SITE.name}
            </span>
          </div>
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          12,
              padding:      '12px 28px',
              borderRadius: 9999,
              background:   '#fff',
              border:       `3px solid ${theme.bg1}`,
              fontSize:     32,
              fontWeight:   700,
              color:        theme.accent,
            }}
          >
            <span>{theme.emoji}</span>
            <span>{theme.label}</span>
          </div>
        </div>

        {/* 中央: テーマ大見出し */}
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            justifyContent: 'center',
            alignItems:     'flex-start',
            flex:           1,
            marginTop:      24,
            position:       'relative',
            zIndex:         1,
          }}
        >
          <div
            style={{
              fontSize:   28,
              fontWeight: 600,
              color:      '#A07758',
              marginBottom: 16,
            }}
          >
            🎬 AI教室で生成されたアニメ
          </div>
          <div
            style={{
              fontSize:    titleText.length > 18 ? 76 : 96,
              fontWeight:  900,
              color:       '#3D2817',
              lineHeight:  1.15,
              letterSpacing: '-0.02em',
              maxWidth:    '100%',
            }}
          >
            {titleText}
          </div>
        </div>

        {/* 下段: 学年 + CTA */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginTop:      32,
          }}
        >
          <div
            style={{
              fontSize:   30,
              fontWeight: 600,
              color:      '#7C5840',
            }}
          >
            👦 {grade} 向け
          </div>
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          12,
              padding:      '16px 32px',
              borderRadius: 9999,
              background:   theme.bg1,
              color:        '#fff',
              fontSize:     30,
              fontWeight:   800,
              boxShadow:    '0 6px 20px rgba(0,0,0,0.15)',
            }}
          >
            ✨ 自分も作ってみる →
          </div>
        </div>
      </div>
    ),
    size,
  );
}
