/**
 * shared/api/index.ts
 * familyai.jp — API クライアント共通ロジック（pure TypeScript / iOS 移植対応）
 *
 * ブラウザの fetch API のみを使い、Node.js 固有モジュールには依存しない。
 * Next.js Route Handler / iOS Swift のどちらからも呼び出せる設計。
 */

import type {
  ApiResponse,
  ArticleSummary,
  Article,
  PaginatedResult,
  FamilyRole,
  ContentCategory,
  DifficultyLevel,
} from '../types';
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
 * - サーバー側の `{ ok: true, data: T }` / `{ ok: false, error: {...} }` ラッパーを
 *   1枚剥がして `ApiResponse<T>` で返す（Rev27 #1）
 *
 * サーバ契約:
 *   - 成功: { ok: true,  data: T }
 *   - 失敗: { ok: false, error: { code: string; message: string } }
 *           もしくは { ok: false, error: string }（レガシー）
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

    // ── JSON パース（失敗しても例外にしない）
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      // ignore parse error
    }

    // ── サーバ契約のラッパーを剥がす
    const wrapped = (json ?? {}) as {
      ok?:    boolean;
      data?:  T;
      error?: { code?: string; message?: string } | string;
    };

    if (!res.ok || wrapped.ok === false) {
      const errObj  = wrapped.error;
      const message =
        typeof errObj === 'string'
          ? errObj
          : errObj?.message ?? `HTTP ${res.status}`;
      const code =
        typeof errObj === 'object' ? errObj?.code : undefined;
      return {
        ok:     false,
        error:  message,
        status: res.status,
        ...(code ? { code } : {}),
      };
    }

    // 正常系: { ok: true, data: T } の data を取り出す
    // ※ レガシー（ラップなし）の場合は json 自体を返す
    if (wrapped.ok === true && 'data' in wrapped) {
      return { ok: true, data: wrapped.data as T };
    }
    return { ok: true, data: json as T };
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
  page?:    number;
  perPage?: number;
  /** ロール（単一）— サーバー側パラメータ名 `role` */
  role?:    FamilyRole;
  /** カテゴリ（複数指定可）— サーバー側パラメータ名 `cat`（繰り返し） */
  cat?:     ContentCategory[];
  /** 難易度 — サーバー側パラメータ名 `level` */
  level?:   DifficultyLevel;
  /** ソート */
  sort?:    'latest' | 'popular';
}

/**
 * 記事一覧を取得する。
 * サーバーは PaginatedResult<T>（{ items, meta }）形式で返す。
 * ※ /api/articles のレスポンス形式と完全に一致（Rev17 で統一済み）
 *
 * パラメータ名はサーバーの /api/articles と完全一致させる（Rev22 で修正）：
 *   page / limit / role / cat（複数）/ level / sort
 */
export async function fetchArticles(
  baseUrl: string,
  query:   ArticlesQuery = {},
): Promise<ApiResponse<PaginatedResult<ArticleSummary>>> {
  const params: Record<
    string,
    string | number | boolean | undefined | null | ReadonlyArray<string>
  > = {
    page:  query.page    ?? 1,
    limit: query.perPage ?? PAGINATION.defaultPerPage,
    role:  query.role,
    cat:   query.cat,
    level: query.level,
    sort:  query.sort,
  };

  return apiFetch<PaginatedResult<ArticleSummary>>(
    `${baseUrl}/api/articles${buildQueryString(params)}`,
  );
}

/**
 * 記事詳細を取得する。
 *
 * @note Web 版の Server Component は `lib/repositories/articles.ts` の
 *       `getArticle()` を直呼びするため、このエンドポイントは主に
 *       iOS/Android モバイルクライアントおよび外部クライアント用（Rev23 #3 で実装済み・
 *       `app/api/articles/[slug]/route.ts`）。
 *       サーバは `{ ok: true, data: Article }` 形式で返し、`apiFetch` が剥がす。
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
