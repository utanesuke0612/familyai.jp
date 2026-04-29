/**
 * public/sw.js
 * familyai.jp — Service Worker（PWA 対応・機能2）
 *
 * 役割:
 *   1. オフライン対応（主要ページのプリキャッシュ + フォールバック）
 *   2. MP3 音声のキャッシュ（cache-first・将来 AIctation 用）
 *   3. ナビゲーション要求は network-first（最新コンテンツ優先・オフライン時のみキャッシュ）
 *
 * 設計方針:
 *   - API ルート（/api/*）は完全にバイパス（動的・SSE・PII を扱うため）
 *   - 外部 origin（OpenRouter 等）はバイパス
 *   - 静的アセット（_next/* / 画像 / フォント等）は素通し（ブラウザの HTTP キャッシュに任せる）
 *   - VERSION 更新時は古いキャッシュを自動削除
 *
 * バージョン:
 *   v1（初版・2026-04-29）
 */

const VERSION       = 'v1';
const CACHE_PAGES   = `familyai-pages-${VERSION}`;
const CACHE_AUDIO   = `familyai-audio-${VERSION}`;
const OFFLINE_URL   = '/offline';

/**
 * インストール時にプリキャッシュする URL 一覧。
 * オフライン時にホームと主要セクションのトップにアクセスしても表示できるよう備える。
 */
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/',
  '/learn',
  '/tools',
];

// ── install: オフライン用ページをプリキャッシュ ───────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_PAGES)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => {
        // プリキャッシュ失敗は致命ではない（個別ページは fetch 時に取得される）
        console.warn('[SW] precache failed', err);
      }),
  );
  // 新しい SW を即座に有効化（古いキャッシュに詰まる事故を防ぐ）
  self.skipWaiting();
});

// ── activate: 古いバージョンのキャッシュを削除 ─────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => !k.endsWith(VERSION))
        .map((k) => caches.delete(k)),
    );
    // 既存タブにも新 SW を即時適用
    await self.clients.claim();
  })());
});

// ── fetch: リクエスト戦略の振り分け ───────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GET 以外（POST/PUT/DELETE/PATCH）はバイパス
  if (request.method !== 'GET') return;

  // 別 origin（OpenRouter 等）はバイパス
  if (url.origin !== self.location.origin) return;

  // API ルートは完全バイパス（動的・SSE・PII を扱うため）
  if (url.pathname.startsWith('/api/')) return;

  // ① MP3 → cache-first（一度落としたら永続的にキャッシュから返却）
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith(cacheFirst(request, CACHE_AUDIO));
    return;
  }

  // ② ページナビゲーション → network-first・失敗時はキャッシュ・最後にオフラインページ
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // ③ その他（_next/*, 画像, CSS, JS）はバイパス（ブラウザの HTTP キャッシュに任せる）
  // 明示的に何もしない = ネットワーク fetch
});

// ── 戦略 1: cache-first（MP3 用）─────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // 200 系の正常レスポンスのみキャッシュ
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    // ネットワーク失敗時は cached を返したいが既に missed なので諦める
    throw err;
  }
}

// ── 戦略 2: network-first + offline fallback（ページ用）──────
async function navigationStrategy(request) {
  const cache = await caches.open(CACHE_PAGES);
  try {
    const response = await fetch(request);
    // 成功時：レスポンスをキャッシュに保存（次回オフライン時の保険）
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    // ネットワーク失敗 → キャッシュにあれば返す
    const cached = await cache.match(request);
    if (cached) return cached;
    // 最終フォールバック: オフラインページ
    const fallback = await cache.match(OFFLINE_URL);
    if (fallback) return fallback;
    // それすらない場合は失敗を伝える
    throw err;
  }
}
