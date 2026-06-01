/**
 * shared/utils/tag-normalize.ts
 * familyai.jp — タグ正規化ユーティリティ
 *
 * 記事タグの表記揺れを防ぎ、一貫性のあるフィルタリングを実現する。
 * ArticleForm の保存時、API の入力時、一覧フィルタの照合時に使用する。
 *
 * 正規化ルール:
 *   1. 前後空白を除去（trim）
 *   2. 全角スペース・全角カンマ → 半角カンマに統一（表記揺れ吸収）
 *   3. 重複を除去（大文字小文字を区別せず）
 *   4. 先頭の # を除去（#ChatGPT → ChatGPT）
 *   5. 空文字列を除去
 */

/**
 * タグ文字列（カンマ区切り）を正規化された配列に変換する。
 * 管理画面のフォーム入力 → DB 保存前に必ず通すこと。
 *
 * @example
 *   normalizeTags("#ChatGPT, #chatgpt, 画像生成 , 画像生成")
 *   // → ["ChatGPT", "画像生成"]
 */
export function normalizeTags(value: string): string[] {
  // 1. 全角スペース / 全角カンマ → 半角カンマに統一
  const normalized = value
    .replace(/　/g, ',')   // 全角スペース → カンマ
    .replace(/，/g, ',');  // 全角カンマ → 半角カンマ

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const raw of normalized.split(',')) {
    // 2. 前後空白除去 + 先頭 # 除去
    let tag = raw.trim().replace(/^#+/, '').trim();
    if (!tag) continue;

    // 3. case-insensitive 重複除去（最初に見つかった表記を優先）
    const lower = tag.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    tags.push(tag);
  }

  return tags;
}

/**
 * 表示用にタグに # を付ける（検索・フィルターUI のリンクテキスト用）。
 * 内部では # なしで保持し、表示時に付与する。
 *
 * @example tagToDisplay("ChatGPT") → "#ChatGPT"
 */
export function tagToDisplay(tag: string): string {
  return tag.startsWith('#') ? tag : `#${tag}`;
}

/**
 * タグ配列を DB 保存用の文字列配列に変換する。
 * すでに正規化済みの配列をそのまま返す（保存前の最終ステップ）。
 *
 * @example prepareTagsForDb(["ChatGPT", "画像生成"]) → ["ChatGPT", "画像生成"]
 */
export function prepareTagsForDb(tags: string[]): string[] {
  // 防御的: 再度 normalizeTags を通して安全を確保
  return normalizeTags(tags.join(','));
}

/**
 * タグによるフィルタリング時に、ユーザー入力タグを正規化して比較する。
 * 大文字小文字・# 有無の差異を吸収する。
 *
 * @example tagMatches("ChatGPT", "#chatgpt") → true
 */
export function tagMatches(storedTag: string, filterTag: string): boolean {
  const a = storedTag.replace(/^#+/, '').toLowerCase().trim();
  const b = filterTag.replace(/^#+/, '').toLowerCase().trim();
  return a === b;
}
