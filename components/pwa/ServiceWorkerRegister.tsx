'use client';

/**
 * components/pwa/ServiceWorkerRegister.tsx
 * familyai.jp — Service Worker 登録（PWA 対応・機能2）
 *
 * 動作条件:
 *   - 本番環境のみ（NODE_ENV === 'production'）
 *     → dev は HMR と SW のキャッシュが衝突するため登録しない
 *   - serviceWorker API 対応ブラウザのみ
 *
 * 配置:
 *   app/layout.tsx の <body> 末尾に <ServiceWorkerRegister /> を配置する。
 *   何もレンダリングしないので位置はどこでも良い。
 */

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // 開発環境では登録しない（HMR と競合・古いコードを掴む事故を防ぐ）
    if (process.env.NODE_ENV !== 'production') return;
    // SSR 時は window が存在しないので早期 return
    if (typeof window === 'undefined') return;
    // 古いブラウザ・プライベートモード対応
    if (!('serviceWorker' in navigator)) return;

    // ページロード後に登録（初回ロードのパフォーマンスを優先）
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // 登録失敗は致命ではない（PWA 機能のみ無効・サイトは通常通り動作）
          console.warn('[SW] register failed', err);
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
