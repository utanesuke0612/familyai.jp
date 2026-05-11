/**
 * types/model-viewer.d.ts
 * Google `<model-viewer>` Web Component の JSX 型宣言
 *
 * `@google/model-viewer` 自体は Web Component として登録するだけで、
 * React/Next.js の JSX 上で型補完されないため、HTMLElement のフォールバックを定義する。
 *
 * 主要な属性のみ列挙（必要に応じて追加）。
 * 参考: https://modelviewer.dev/docs/index.html
 */

import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          src?: string;
          'ios-src'?: string;
          alt?: string;
          poster?: string;
          ar?: boolean | string;
          'ar-modes'?: string;
          'ar-scale'?: string;
          'ar-placement'?: string;
          'camera-controls'?: boolean | string;
          'auto-rotate'?: boolean | string;
          'auto-rotate-delay'?: number | string;
          'rotation-per-second'?: string;
          'interaction-prompt'?: 'auto' | 'when-focused' | 'none';
          'shadow-intensity'?: number | string;
          'shadow-softness'?: number | string;
          'environment-image'?: string;
          'skybox-image'?: string;
          exposure?: number | string;
          'tone-mapping'?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'interaction' | 'manual';
          'camera-orbit'?: string;
          'min-camera-orbit'?: string;
          'max-camera-orbit'?: string;
          'field-of-view'?: string;
          'min-field-of-view'?: string;
          'max-field-of-view'?: string;
          'disable-zoom'?: boolean | string;
          'disable-pan'?: boolean | string;
          'disable-tap'?: boolean | string;
          autoplay?: boolean | string;
          'animation-name'?: string;
          'animation-crossfade-duration'?: number | string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
