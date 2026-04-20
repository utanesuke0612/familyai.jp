/**
 * app/apple-icon.tsx
 * familyai.jp — Apple Touch Icon（180×180）（Rev26 #4）
 * Next.js 規約で /apple-icon として配信される。
 */

import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const size        = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:           '100%',
          height:          '100%',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          background:      'linear-gradient(135deg, #FFB98A 0%, #FF8C42 100%)',
          color:           'white',
          fontSize:        120,
          fontWeight:      700,
        }}
      >
        💞
      </div>
    ),
    size,
  );
}
