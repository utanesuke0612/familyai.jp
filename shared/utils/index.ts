/**
 * shared/utils/index.ts
 * familyai.jp — ユーティリティ関数（pure TypeScript / iOS 移植対応）
 * DOM・Node.js 固有 API には依存しない。
 */

import type { PaginationMeta } from '../types';

// ─── 文字列ユーティリティ ──────────────────────────────────────

/**
 * 文字列を指定文字数で切り詰めて末尾に「…」を付ける
 * @example truncate("あいうえおかきくけこ", 5) → "あいうえお…"
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

/**
 * slug を読みやすいタイトル形式に変換する
 * @example slugToTitle("chatgpt-tips-for-mama") → "Chatgpt Tips For Mama"
 */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── 日付ユーティリティ ────────────────────────────────────────

/**
 * ISO 8601 日付文字列を日本語フォーマットに変換する
 * @example formatDateJa("2026-04-17T00:00:00Z") → "2026年4月17日"
 */
export function formatDateJa(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}年${m}月${day}日`;
}

/**
 * 相対日付を日本語で返す（「3日前」「1週間前」など）
 */
export function relativeTimeJa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1)   return 'たった今';
  if (minutes < 60)  return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7)      return `${days}日前`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5)     return `${weeks}週間前`;
  const months = Math.floor(days / 30);
  if (months < 12)   return `${months}ヶ月前`;
  return `${Math.floor(months / 12)}年前`;
}

// ─── 読了時間推定 ──────────────────────────────────────────────

/**
 * Markdown 本文から読了目安分数を計算する（日本語 400字/分 基準）。
 * Markdown 記法（# ` * 等）は概算に影響しない程度の簡易計算。
 */
export function estimateReadingMin(content: string): number {
  const charCount = content.replace(/\s+/g, '').length;
  return Math.max(1, Math.ceil(charCount / 400));
}

// ─── ページネーション ──────────────────────────────────────────

/**
 * ページネーションメタ情報を計算する
 */
export function buildPaginationMeta(
  total:   number,
  page:    number,
  perPage: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return {
    page,
    perPage,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ─── バリデーション ────────────────────────────────────────────

/** メールアドレス簡易バリデーション */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** スラッグバリデーション（英数字・ハイフンのみ） */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

// ─── クラス名ユーティリティ ────────────────────────────────────

/**
 * 条件付きクラス名を結合する（clsx の軽量代替）
 * Next.js 側では clsx + tailwind-merge を使うが、
 * shared/ は外部依存なしで iOS 移植性を保つ
 */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── 数値フォーマット ──────────────────────────────────────────

/** 数値を日本語の万・億表記に変換する */
export function formatNumberJa(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}億`;
  if (n >= 10_000)      return `${(n / 10_000).toFixed(1)}万`;
  return n.toLocaleString('ja-JP');
}

// ─── API ユーティリティ ────────────────────────────────────────

/** URLSearchParams を安全に構築する（配列値は繰り返しパラメータとして展開）*/
export function buildQueryString(
  params: Record<
    string,
    string | number | boolean | undefined | null | ReadonlyArray<string | number | boolean>
  >,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item !== undefined && item !== null) sp.append(k, String(item));
      }
    } else {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ─── AI教室コスト試算（再エクスポート） ────────────────────
export { estimateAiCost, estimateMonthlyCost, TOKEN_ESTIMATE } from './ai-cost';
export type { AiCostBreakdown } from './ai-cost';
