/**
 * lib/html.ts
 * familyai.jp — HTML ユーティリティ
 */

/**
 * HTML から可視テキストを抽出する。
 * script/style を除去 → タグ除去 → HTML エンティティをデコード → 空白を正規化 → 切り詰め
 */
export function extractTextFromHtml(html: string, maxLength = 6000): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // 連続する空白を1つに、前後トリム
  text = text.replace(/\s+/g, ' ').trim();
  return text.slice(0, maxLength);
}
