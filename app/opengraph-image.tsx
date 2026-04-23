/**
 * app/opengraph-image.tsx
 * familyai.jp — デフォルト OGP 画像（1200×630）（Rev26 #4）
 * Next.js 規約で /opengraph-image として配信される（og-default.png の代替）。
 */

import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt         = 'familyai.jp — AI活用事例とAIツール';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width:           '100%',
          height:          '100%',
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          background:      'linear-gradient(135deg, #FFF5EB 0%, #FFE5CC 100%)',
          color:           '#4A3528',
          padding:         60,
        }}
      >
        <div style={{ fontSize: 120, marginBottom: 24 }}>💞</div>
        <div
          style={{
            fontSize:   88,
            fontWeight: 800,
            color:      '#FF8C42',
            letterSpacing: '-0.04em',
          }}
        >
          familyai.jp
        </div>
        <div
          style={{
            fontSize:   36,
            fontWeight: 500,
            marginTop:  18,
            color:      '#6B4E3D',
          }}
        >
          AI活用事例とAIツール
        </div>
      </div>
    ),
    { ...size },
  );
}
