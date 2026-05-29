# 記事コメント機能実装（Phase 1）

## 実装完了項目

### 1. データベース層
- ✅ Migration: `drizzle/0022_article_comments.sql`
  - テーブル: `article_comments`
  - カラム: id, article_slug, user_id, body, created_at, updated_at
  - インデックス: (article_slug, created_at DESC), (user_id)
  - 外部キー: user_id → users.id (ON DELETE CASCADE)

- ✅ Drizzle Schema: `lib/db/schema.ts`
  - `articleComments` テーブル定義
  - `ArticleComment` 型エクスポート
  - `NewArticleComment` 型エクスポート

### 2. ビジネスロジック層
- ✅ Repository: `lib/repositories/comments.ts`
  - `getComments(slug, opts)` — 記事別コメント一覧取得（新着順・ページネーション対応）
  - `createComment(slug, userId, body)` — コメント新規作成
  - `CommentItem` インターフェース（API レスポンス型）

### 3. API層
- ✅ Route: `app/api/articles/[slug]/comments/route.ts`
  - `GET /api/articles/:slug/comments` — コメント一覧（認証不要・no-store キャッシュ）
  - `POST /api/articles/:slug/comments` — コメント投稿
    - 認証必須（NextAuth session）
    - CSRF チェック（verifyCsrf）
    - Rate limiting（ユーザー単位：5回/分）
    - Zod バリデーション（body: 1-2000 字）
    - Slug バリデーション（正規表現: `^[a-z0-9]+(?:-[a-z0-9]+)*$`）

### 4. フロントエンド層
- ✅ Components:
  - `ArticleCommentForm.tsx` — 入力フォーム
    - 簡易ツールバー（太字・斜体・リスト）
    - ログイン誘導（未ログイン時）
    - エラーハンドリング
    - 送信中ローディング状態
  
  - `ArticleCommentList.tsx` — コメント一覧表示
    - Markdown レンダリング（MarkdownContent 使用）
    - ユーザー情報表示（名前・プロフィール画像）
    - 日付表示（formatDateJa で日本語フォーマット）
    - ページネーション（1-20 件/ページ）
    - リロード機能
  
  - `ArticleComments.tsx` — 統合コンポーネント
    - フォーム＋一覧の統合表示
    - 投稿後の自動リロード（reloadTrigger）

### 5. ページ統合
- ✅ `app/(site)/learn/[slug]/page.tsx`
  - `ArticleComments` をインポート
  - `FloatingShareButtons` の直後に挿入
  - `article.slug` を props として渡す

## 実装の特徴

### セキュリティ
- ✅ XSS 対策: Markdown 本文は既存の rehype-sanitize パイプラインで描画
- ✅ CSRF 対策: verifyCsrf で Origin チェック
- ✅ スパム対策: Rate limiting（ユーザー単位 5/分）
- ✅ GDPR: ユーザー削除時にコメントも cascade 削除

### パフォーマンス
- ✅ キャッシング: コメント一覧は `Cache-Control: no-store`
- ✅ インデックス: article_slug + created_at で高速取得
- ✅ ページネーション: 1-20 件単位

### UX
- ✅ Markdown 編集: 太字・斜体・リスト装飾
- ✅ リアルタイム反映: 投稿後に自動リロード
- ✅ 未ログイン時: ログイン誘導表示
- ✅ エラーハンドリング: バリデーション・ネットワークエラーメッセージ

## 次のステップ（Phase 2）

- [ ] コメント管理画面（admin）
- [ ] コメント編集・削除機能
- [ ] いいね・リアクション
- [ ] コメント返信（ネスト）
- [ ] モデレーション・スパムフィルター
- [ ] メール通知

## Database Migration 実行

```bash
# Neon 側で 0022_article_comments.sql を実行する必要があります
# または drizzle-kit push で自動適用できます
npx drizzle-kit push
```

## TypeScript コンパイル状態

✅ 0 errors（tsc --noEmit）

## テスト手順

1. ローカル dev server 起動: `npm run dev`
2. 記事ページを開く: http://localhost:3000/learn/[slug]
3. ページ下部に「コメント」セクションが表示される
4. 未ログイン: ログイン誘導メッセージを確認
5. ログイン後: フォーム表示 → コメント投稿テスト
6. API リスポンス確認: Network tab で `/api/articles/*/comments` を確認
