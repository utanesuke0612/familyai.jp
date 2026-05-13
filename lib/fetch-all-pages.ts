'use client';

/**
 * lib/fetch-all-pages.ts
 * familyai.jp — クライアント側 pagination 全件取得ヘルパ（CX-4 後フォロー）
 *
 * 用途: `/api/user/ai-memos` 等の同期 API が
 *   `{ ok, data: T[], meta: { total, page, perPage } }`
 * を返すようになったが、Web クライアントは `?pageSize=200` の 1 ページ目しか
 * 読んでおらず、201 件目以降がマイページから欠落していた（Codex P2 #8）。
 *
 * このヘルパは meta.total を見て足りないページを順次取得し、全件を
 * 1 つの配列として返す。並列 fetch ではなく順次 fetch にしているのは、
 * サーバ DB 負荷を抑え、後段の cursor / updatedSince 差分同期へ
 * 移行しやすくするため（巨大利用者でも 50 ページ = 10,000 件で打ち切り）。
 *
 * 将来: cursor / updatedSince ベースの差分同期に置き換える際は
 *       本ヘルパを差し替えるだけで呼び出し側を変えなくて済むように
 *       署名を最小化している。
 */

interface PaginatedSuccess<T> {
  ok:   true;
  data: T[];
  meta?: { total: number; page: number; perPage: number };
}

interface PaginatedFailure {
  ok:    false;
  error?: unknown;
}

type PaginatedResponse<T> = PaginatedSuccess<T> | PaginatedFailure;

const DEFAULT_PAGE_SIZE = 200;
/** 取得ページ数の上限（pageSize=200 なら 200 * 50 = 10,000 件で打ち切り） */
const MAX_PAGES = 50;

export interface FetchAllPagesOptions {
  /** 1 ページあたりの件数（API 側上限と一致させること。既定 200） */
  pageSize?: number;
  /** AbortController 連携 */
  signal?: AbortSignal;
  /** fetch オプション（credentials 等を渡したい時用） */
  init?: RequestInit;
}

export async function fetchAllPages<T>(
  basePath: string,
  options:  FetchAllPagesOptions = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const sep      = basePath.includes('?') ? '&' : '?';

  async function fetchPage(page: number): Promise<PaginatedResponse<T>> {
    const url = `${basePath}${sep}page=${page}&pageSize=${pageSize}`;
    const res = await fetch(url, { signal: options.signal, ...options.init });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as PaginatedResponse<T>;
    return json;
  }

  const first = await fetchPage(1);
  if (!first.ok || !Array.isArray(first.data)) return [];

  const items: T[] = first.data.slice();
  const total = first.meta?.total ?? items.length;
  const totalPages = Math.min(MAX_PAGES, Math.ceil(total / pageSize));

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchPage(page);
    if (!next.ok || !Array.isArray(next.data)) break;
    items.push(...next.data);
    // 期待件数に到達していれば早期終了
    if (items.length >= total) break;
  }
  return items;
}
