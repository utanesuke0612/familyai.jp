/**
 * app/icon.tsx
 * familyai.jp — 動的ファビコン / PWA アイコン（192×192）（Rev26 #4）
 * Next.js のファイルベース規約で自動的に /icon (PNG) として配信される。
 * 実画像（デザイナー提供）が public/ に入り次第、このファイルを削除して差し替える。
 */

import { ImageResponse } from 'next/og';

export const runtime  = 'edge';
export const size     = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
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
          fontSize:        130,
          fontWeight:      700,
          letterSpacing:   '-0.05em',
          borderRadius:    32,
        }}
      >
        💞
      </div>
    ),
    size,
  );
}
