/**
 * app/(site)/mypage/vocab/page.tsx
 * familyai.jp — Rev34: 旧単語帳ページ → 新マイブックマーク（単語タブ）にリダイレクト
 *
 * 本来の単語一覧 UI は `/mypage/bookmarks?tab=words` に統合された。
 * このファイルはブックマーク・既存共有 URL の互換性のためのみ残してある。
 * Server Component で同期 redirect を行うため、ハイドレーション コストはゼロ。
 */

import { redirect } from 'next/navigation';

export default function LegacyVocabRedirect() {
  redirect('/mypage/bookmarks?tab=words');
}
