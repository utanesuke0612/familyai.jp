/**
 * app/api/og/route.tsx
 * familyai.jp — 動的 OGP 画像生成 API
 *
 * GET /api/og?title=...&level=beginner
 *
 * - @vercel/og（Satori）で 1200×630px の PNG を生成
 * - NotoSansJP-VariableFont_wght.ttf で日本語を正しくレンダリング
 * - Edge Runtime で高速配信・CDN キャッシュ 24時間
 */

import { ImageResponse } from '@vercel/og';
import { type NextRequest } from 'next/server';

export const runtime = 'edge';

const OG_THEME = {
  bg: '#FFF5EE',
  accent: '#C95A1E',
};

const LEVEL_LABEL: Record<string, string> = {
  beginner:     'はじめて',
  intermediate: '慣れてきた',
  advanced:     '使いこなす',
};

// ── フォント読み込み（Edge キャッシュ利用） ────────────────────
let _fontData: ArrayBuffer | null = null;

async function loadFont(baseUrl: string): Promise<ArrayBuffer> {
  if (_fontData) return _fontData;
  const fontUrl = `${baseUrl}/fonts/NotoSansJP-VariableFont_wght.ttf`;
  const res = await fetch(fontUrl);
  _fontData = await res.arrayBuffer();
  return _fontData;
}

// ── GET /api/og ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);

  const title  = searchParams.get('title')  ?? 'familyai.jp';
  const level  = searchParams.get('level')  ?? '';
  const levelLabel = level ? LEVEL_LABEL[level] : null;

  // タイトルが長い場合は折り返す（最大40文字）
  const displayTitle = title.length > 40 ? title.slice(0, 39) + '…' : title;

  try {
    const fontData = await loadFont(origin);

    return new ImageResponse(
      (
        <div
          style={{
            width:          '1200px',
            height:         '630px',
            background:     '#FDF6ED',
            display:        'flex',
            flexDirection:  'column',
            position:       'relative',
            overflow:       'hidden',
            fontFamily:     '"NotoSansJP"',
          }}
        >
          {/* 背景アクセント blob */}
          <div
            style={{
              position:     'absolute',
              top:          '-100px',
              right:        '-100px',
              width:        '500px',
              height:       '500px',
              borderRadius: '50%',
              background:   `radial-gradient(circle, ${OG_THEME.bg}, transparent)`,
              opacity:      0.8,
            }}
          />
          <div
            style={{
              position:     'absolute',
              bottom:       '-80px',
              left:         '-80px',
              width:        '350px',
              height:       '350px',
              borderRadius: '50%',
              background:   'radial-gradient(circle, #FFAD8044, transparent)',
            }}
          />

          {/* メインコンテンツ */}
          <div
            style={{
              position:      'relative',
              display:       'flex',
              flexDirection: 'column',
              flex:          1,
              padding:       '64px 80px',
              gap:           '0',
            }}
          >
            {/* サイトロゴ */}
            <div
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         '12px',
                marginBottom: '36px',
              }}
            >
              <div
                style={{
                  width:        '48px',
                  height:       '48px',
                  borderRadius: '12px',
                  background:   'linear-gradient(135deg, #FFAD80, #FF8C42)',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  fontSize:     '26px',
                }}
              >
                🏠
              </div>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#8B5E3C' }}>
                family<span style={{ color: '#FF8C42' }}>ai</span>.jp
              </span>
            </div>

            {/* バッジ行 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}>
              {/* レベルバッジ */}
              {levelLabel && (
                <div
                  style={{
                    padding:      '6px 16px',
                    borderRadius: '999px',
                    background:   '#F5E6D0',
                    fontSize:     '20px',
                    color:        '#B5896A',
                    fontWeight:   700,
                  }}
                >
                  {levelLabel}
                </div>
              )}
            </div>

            {/* タイトル */}
            <div
              style={{
                fontSize:   displayTitle.length > 24 ? '44px' : '52px',
                fontWeight: 700,
                color:      '#8B5E3C',
                lineHeight: 1.35,
                flex:       1,
                display:    'flex',
                alignItems: 'flex-start',
              }}
            >
              {displayTitle}
            </div>

            {/* フッター */}
            <div
              style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'center',
                borderTop:      '2px solid #F5E6D0',
                paddingTop:     '24px',
                marginTop:      '24px',
              }}
            >
              <span style={{ fontSize: '22px', color: '#B5896A' }}>
                AI = 愛 — AI活用事例とAIツール
              </span>
              <div
                style={{
                  padding:      '8px 20px',
                  borderRadius: '999px',
                  background:   OG_THEME.accent,
                  color:        'white',
                  fontSize:     '18px',
                  fontWeight:   700,
                }}
              >
                今すぐ読む →
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width:  1200,
        height: 630,
        fonts: [
          {
            name:   'NotoSansJP',
            data:   fontData,
            weight: 700,
            style:  'normal',
          },
        ],
      },
    );
  } catch (err) {
    console.error('[GET /api/og] 生成エラー:', err);
    // フォールバック: テキストのみの最小 OGP
    return new ImageResponse(
      (
        <div
          style={{
            width:           '1200px',
            height:          '630px',
            background:      '#FDF6ED',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        '48px',
            fontWeight:      700,
            color:           '#8B5E3C',
          }}
        >
          familyai.jp
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }
}
