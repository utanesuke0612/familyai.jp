# Full Codebase Review: FamilyAI.jp — 2026-05-28

## スコープ

ソースコード全体（変更差分 + 既存コード）の包括的レビュー。

対象領域:
- セキュリティ・認証 (`lib/auth.ts`, `lib/csrf.ts`, `lib/ratelimit.ts`, `lib/admin-auth.ts`)
- データベース・リポジトリ層 (`lib/db/schema.ts`, `lib/repositories/`)
- API ルート (`app/api/`)
- フロントエンド・コンポーネント (`components/`, `app/`)
- 共有ライブラリ (`shared/`, `lib/`)

---

## Verdict: Request Changes

**Critical 2 件・High 2 件・Medium 5 件・Low 8 件**。Critical と High を修正すればマージ可。残りは次 PR 以降で対処可能。

---

## Critical Issues（リリース前に必ず修正）

### 🔴 [C-1] 全画面ボタンの ON/OFF アイコンが同一

**File**: `components/admin/ArticleForm.tsx:475`

```tsx
// 現状: 両状態で同じ文字 ⛶
{isFullscreen ? '⛶' : '⛶'}
```

全画面中か否かをユーザーが視覚的に判断できない。一方に縮小アイコン（別の文字 or SVG）を使うこと。

---

### 🔴 [C-2] `applyEdit` の完全重複

**File**: `components/admin/MarkdownEditor.tsx:105–133`

`applyEdit` が `useImperativeHandle` 内（lines 105–116）とローカル関数（lines 119–133）で**完全に同一ロジックで重複**している。ツールバーはローカル版、`ref` 経由は imperativeHandle 版を使用。将来の修正が片方にしか適用されないリスクがある。

**修正**: ローカル関数を削除し、ツールバーの `onClick` を `editorRef.current?.applyEdit(kind)` に統一する。

---

## High Issues（早期に修正推奨）

### 🟠 [H-1] credentials ログインにブルートフォース対策がない

**File**: `lib/auth.ts`（NextAuth credentials provider）

メールアドレス + パスワードのログインエンドポイントに試行回数制限がない。IP またはメールアドレス単位で Redis レートリミットを追加すること。

```ts
// 修正例（NextAuth signIn callback 内）
const rl = await enforceRateLimit(req, `login:${email}`);
if (rl) throw new Error('Too many login attempts');
```

---

### 🟠 [H-2] セッション無効化チェックの Promise に catch がない

**File**: `lib/auth.ts:188–189`

```ts
// 現状: catch なし
.then((u) => u?.id === token.id)
```

DB 接続エラー時に unhandled rejection が発生し、セッションが予期せず無効化または維持される可能性がある。明示的な `.catch(() => false)` を追加すること。

---

## Medium Issues（次の PR で対応推奨）

### 🟡 [M-1] 管理者アクセス失敗のログが記録されない

**File**: `lib/admin-auth.ts`

`requireAdmin()` が失敗した際のログが存在しない。不正アクセス試行の監査証跡として、`log.warn` で identity + timestamp + IP を記録すること。

---

### 🟡 [M-2] AI API エラーメッセージが環境変数名を漏洩する

**File**: `app/api/ai/route.ts:192`

エラーメッセージ内に `'OPENROUTER_API_KEY'` という文字列が含まれるケースがある。クライアントへのレスポンスには汎用エラーメッセージのみを返し、詳細はサーバーログにのみ記録すること。

---

### 🟡 [M-3] `thumbnailUrl` のサーバー側 URL バリデーションなし

**File**: `lib/schemas/articles.ts:67`

```ts
// 現状
thumbnailUrl: z.string().nullable().optional()

// 修正
thumbnailUrl: z.string().url().nullable().optional()
```

フロントでは `type="url"` を設定しているが、サーバー側 Zod スキーマに URL 形式検証がなく任意の文字列を保存できる。

---

### 🟡 [M-4] `categories` の dirty 判定が順序依存

**File**: `components/admin/ArticleForm.tsx:105`

```ts
// 現状（順序依存）
categories.join(',') !== ((article.categories ?? []) as ContentCategory[]).join(',')

// 修正
[...categories].sort().join(',') !== [...((article.categories ?? []) as ContentCategory[])].sort().join(',')
```

---

### 🟡 [M-5] 新規記事の下書きキーが複数タブで衝突する

**File**: `components/admin/ArticleForm.tsx:86–89`

新規作成時の `draftKey` が `"familyai:admin:article-draft:new"` に固定されるため、複数タブで新規作成中に互いの下書きを上書きする。マウント時に `crypto.randomUUID()` で識別子を生成すること。

---

## Low Issues（バックログで対応可）

| # | File | Issue | Category |
|---|------|-------|----------|
| L-1 | `components/admin/MarkdownEditor.tsx:88` | `extensions` の useMemo 依存配列が `[height]` だが height は extension に影響しない → `[]` に修正 | Performance |
| L-2 | `components/admin/ArticleForm.tsx:78` | `draftStatus: 'saved'` が永続表示される（リセットなし）→ 3 秒後に `'idle'` へ戻す | UX |
| L-3 | `components/admin/AdminArticleTable.tsx:216` | 複数 Markdown エクスポートをブラウザがブロックする可能性 → ダウンロード間に遅延を挟む | UX |
| L-4 | `components/admin/AdminArticleTable.tsx:133` | `const filtered = articles` は無意味なエイリアス（クライアントフィルタ廃止後の残留）→ 削除 | Maintainability |
| L-5 | `app/api/3d-models/[slug]/route.ts` | slug 正規表現 `/^[a-z0-9-]{1,120}$/` が先頭・末尾ハイフンを許可 → `^[a-z0-9]+(?:-[a-z0-9]+)*$` に変更 | Validation |
| L-6 | `lib/repositories/articles.ts:458` | `incrementViewCount()` が fire-and-forget でエラーをサイレント無視 → `log.warn` を追加 | Observability |
| L-7 | `lib/db/schema.ts` | `user3dBookmarks` テーブルは DB・リポジトリ実装済みだが API/UI 未接続（既知）→ 接続するか削除する | Tech Debt |
| L-8 | `lib/db/schema.ts` | `userAnimations` テーブルは "Phase 2 reserved" で保持ポリシーが不明確 → コメントで期限を明記する | Tech Debt |

---

## Security Assessment（全体）

### ✅ 適切に対処済み

| 項目 | 実装 |
|------|------|
| CSRF | Origin ヘッダー照合（admin 専用として許容範囲） |
| 管理者認証 | `protectAdminRoute` HOF で CSRF → Auth → RateLimit を一元管理 |
| Rate Limiting | Upstash Redis fail-closed（本番で Redis 未設定 → 429） |
| SQL インジェクション | Drizzle ORM パラメータバインディング + LIKE エスケープ |
| iframe 埋め込み | VOA / YouTube / Vercel Blob のみ allowlist（SSRF 抑制） |
| Mermaid | `securityLevel: 'strict'` でスクリプト挿入防止 |
| HTML サニタイズ | `rehype-sanitize` が `rehype-raw` の後に実行（正しい順序） |
| 入力バリデーション | Zod による全 API 入力検証（slug 正規表現含む） |
| セッション管理 | JWT + stale session 検知（DB から削除されたユーザーを無効化） |
| 外部リンク | `rel="noopener noreferrer"` を自動付与 |

### ⚠️ 要対応

- credentials ログインのブルートフォース対策なし（**H-1**）
- 管理者アクセス失敗の監査ログなし（**M-1**）
- `thumbnailUrl` URL バリデーションなし（**M-3**）

---

## Architecture Assessment

### ✅ 良い設計

- **Repository パターン**: DB アクセスを `lib/repositories/` に集約し、API ルートがビジネスロジックを持たない
- **protectAdminRoute HOF**: 8 つの admin ルートのボイラープレートを排除し、ガード順序を一元保証
- **Zod スキーマの独立化**: `lib/schemas/` でスキーマを独立ファイル化し、ユニットテスト可能
- **環境変数の lazy バリデーション**: ビルド時ではなく実行時に検証し、Vercel ダミー env を許容
- **JWT plan キャッシュ**: AI レートリミット判定を毎リクエスト DB 参照せず JWT から取得
- **構造化ログ**: `lib/log.ts` が JSON 形式で Vercel Logs / 外部プラットフォーム対応
- **fail-closed rate limit**: Redis 未設定の本番環境で 429 を返す（誤設定による解放を防止）

### ⚠️ 改善余地

- `user3dBookmarks` / `userAnimations` テーブルが半完成状態で残留（**L-7**, **L-8**）
- Admin rate limit が全エンドポイントで同一設定（エンドポイントごとに調整する余地あり）

---

## What Looks Good（特筆すべき良い実装）

- **アクセシビリティ**: `role="alert"`, `aria-live`, `aria-pressed`, `fieldset/legend`, `useId()` による label 関連付けが丁寧（ArticleForm）
- **Markdown バリデーション**: 未閉フェンスブロック・空 URL リンク・alt 空画像を `analyzeMarkdown` で検出しリアルタイム警告
- **YAML インジェクション防止**: `toMarkdown` が `JSON.stringify` で frontmatter 値をエスケープ
- **二重クリック防止**: `pendingSlugs` で API 実行中の slug をトラッキング
- **同期スクロール**: エディタ scroll ratio をプレビューに伝播（`onScrollRatioChange`）
- **Mermaid 動的インポート**: バンドル分割で初期ロードに影響しない
- **highlight.js 言語限定**: 200+ 言語を全部バンドルせず必要な言語のみ登録

---

## 優先修正リスト（Agent に渡す場合の作業順）

```
Priority 1 (Critical — ブロッカー):
  [ ] C-1: ArticleForm.tsx:475 — 全画面ボタンの ON/OFF アイコンを区別する
  [ ] C-2: MarkdownEditor.tsx:119-133 — ローカル applyEdit を削除し imperativeHandle に統一

Priority 2 (High — セキュリティ):
  [ ] H-1: lib/auth.ts — credentials ログインに Redis rate limit を追加
  [ ] H-2: lib/auth.ts:188-189 — stale session チェックの Promise に .catch(() => false) を追加

Priority 3 (Medium — 品質):
  [ ] M-1: lib/admin-auth.ts — 失敗時に log.warn で監査ログを記録
  [ ] M-2: app/api/ai/route.ts — エラーメッセージから環境変数名を除外
  [ ] M-3: lib/schemas/articles.ts:67 — thumbnailUrl に z.string().url() を追加
  [ ] M-4: ArticleForm.tsx:105 — categories dirty 判定をソート後 join で比較
  [ ] M-5: ArticleForm.tsx:86-89 — 新規記事の下書きキーに UUID を付与

Priority 4 (Low — バックログ):
  [ ] L-1: MarkdownEditor.tsx:88 — useMemo 依存配列を [] に修正
  [ ] L-2: ArticleForm.tsx:78 — draftStatus を 3 秒後に idle にリセット
  [ ] L-3: AdminArticleTable.tsx:216 — 複数エクスポートに遅延を挟む
  [ ] L-4: AdminArticleTable.tsx:133 — filtered エイリアスを削除
  [ ] L-5: app/api/3d-models/[slug]/route.ts — slug 正規表現を強化
  [ ] L-6: lib/repositories/articles.ts:458 — incrementViewCount にエラーログを追加
  [ ] L-7: lib/db/schema.ts — user3dBookmarks を接続するか削除
  [ ] L-8: lib/db/schema.ts — userAnimations の保持ポリシーを明記
```
