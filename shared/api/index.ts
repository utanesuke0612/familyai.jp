/**
 * shared/api/index.ts
 * familyai.jp — API クライアント共通ロジック（pure TypeScript / iOS 移植対応）
 *
 * ブラウザの fetch API のみを使い、Node.js 固有モジュールには依存しない。
 * Next.js Route Handler / iOS Swift のどちらからも呼び出せる設計。
 */

import type { ApiResponse, ArticleSummary, Article, PaginatedResult } from '../types';
import { buildQueryString } from '../utils';
import { PAGINATION } from '../constants';

// ─── 基底 fetch ラッパー ───────────────────────────────────────

/** fetch 共通オプション */
interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** タイムアウト（ms）。デフォルト 15000ms */
  timeout?: number;
}

/**
 * 型安全な fetch ラッパー。
 * - Content-Type: application/json を自動付与
 * - タイムアウトを AbortController で制御
 * - ApiResponse<T> 形式でラップして返す
 */
export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  const { body, timeout = 15_000, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...rest.headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    clearTimeout(timer);

    if (!res.ok) {
      let error = `HTTP ${res.status}`;
      try {
        const json = await res.json();
        error = json?.error ?? error;
      } catch {
        // ignore parse error
      }
      return { ok: false, error, status: res.status };
    }

    const data: T = await res.json();
    return { ok: true, data };
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'リクエストがタイムアウトしました', code: 'TIMEOUT' };
    }
    const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
    return { ok: false, error: message, code: 'NETWORK_ERROR' };
  }
}

// ─── 記事 API ─────────────────────────────────────────────────

export interface ArticlesQuery {
  page?:       number;
  perPage?:    number;
  role?:       string;
  category?:   string;
  difficulty?: string;
  tag?:        string;
  q?:          string; // 全文検索クエリ
}

/**
 * 記事一覧を取得する
 */
export async function fetchArticles(
  baseUrl: string,
  query:   ArticlesQuery = {},
): Promise<ApiResponse<PaginatedResult<ArticleSummary>>> {
  const params = {
    page:       query.page    ?? 1,
    perPage:    query.perPage ?? PAGINATION.defaultPerPage,
    ...query,
  };
  return apiFetch<PaginatedResult<ArticleSummary>>(
    `${baseUrl}/api/articles${buildQueryString(params)}`,
  );
}

/**
 * 記事詳細を取得する
 */
export async function fetchArticle(
  baseUrl: string,
  slug:    string,
): Promise<ApiResponse<Article>> {
  return apiFetch<Article>(`${baseUrl}/api/articles/${slug}`);
}

// ─── チャット API ──────────────────────────────────────────────

export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** OpenRouter モデル識別子 */
  model?:  string;
}

/**
 * チャットをストリーミングで呼び出す（ReadableStream を返す）。
 * エラー時は null を返す。
 */
export async function streamChat(
  baseUrl: string,
  req:     ChatRequest,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array> | null> {
  try {
    const res = await fetch(`${baseUrl}/api/ai`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(req),
      signal,
    });
    if (!res.ok || !res.body) return null;
    return res.body;
  } catch {
    return null;
  }
}

// ─── OGP 画像 URL ─────────────────────────────────────────────

/** 動的 OGP 画像の URL を生成する */
export function buildOgImageUrl(
  baseUrl: string,
  params: {
    title:    string;
    role?:    string;
    category?: string;
  },
): string {
  return `${baseUrl}/api/og${buildQueryString(params)}`;
}
