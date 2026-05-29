# Code Review: FamilyAI.jp — 2026-05-27

## 対象

今回の差分（`git diff HEAD`）+ 全体構造レビュー

変更ファイル:
- `components/admin/AdminArticleTable.tsx`
- `components/admin/ArticleForm.tsx`
- `components/article/ArticleBody.tsx`
- `components/article/MermaidDiagram.tsx`
- `components/admin/MarkdownEditor.tsx`（新規）
- `package.json` / `pnpm-lock.yaml`

## Summary

今回の変更は「管理画面の記事エディタを CodeMirror ベースの `MarkdownEditor` に刷新し、リアルタイムプレビュー・下書き保存・アクセシビリティ対応を追加」した大型改修。全体的に品質は高く、セキュリティの多層防御（CSRF / rateLimit / Zod 検証 / iframe allowlist / Mermaid strict mode）は適切に設計されている。

---

## Critical Issues（必ず修正）

### 🔴 [1] 全画面ボタンの両状態で同じアイコンを使用

**File**: `components/admin/ArticleForm.tsx` line 475

```tsx
// 現状: ON も OFF も同じ文字
{isFullscreen ? '⛶' : '⛶'}
```

全画面状態と通常状態で `'⛶'` が同一のため、ユーザーが現在の状態を視覚的に判断できない。一方を縮小アイコン（例: `'⛶'` → CSS 回転 or 別の文字/SVG）にすること。

---

### 🔴 [2] `applyEdit` の完全重複

**File**: `components/admin/MarkdownEditor.tsx` lines 105–133

`applyEdit` が `useImperativeHandle` 内 (lines 105–116) とローカル関数 (lines 119–133) で **完全に同一のロジックで重複**している。ツールバーのボタンはローカル版を使用し、ref 経由では imperativeHandle 版が呼ばれる。将来の修正が片方にしか適用されないリスクがある。

**修正方針**: ローカル関数を削除し、ツールバーボタンの `onClick` を `editorRef.current?.applyEdit(kind)` に統一する（imperativeHandle の実装のみ残す）。

---

## Suggestions（推奨修正）

### ⚠️ [3] `extensions` の useMemo 依存配列が誤り

**File**: `components/admin/MarkdownEditor.tsx` line 87–88  
**Category**: Performance

```tsx
// 現状
const extensions = useMemo(() => [...], [height]);
// height は extension に影響しない（wrapper div のスタイルにのみ使われる）
// 修正
const extensions = useMemo(() => [...], []);
```

---

### ⚠️ [4] `categories` の dirty 判定が順序依存

**File**: `components/admin/ArticleForm.tsx` line 105  
**Category**: Correctness

```tsx
// 現状: join(',') は順序に依存する
categories.join(',') !== ((article.categories ?? []) as ContentCategory[]).join(',')

// 修正例
[...categories].sort().join(',') !== [...((article.categories ?? []) as ContentCategory[])].sort().join(',')
```

`['education', 'work']` vs `['work', 'education']` で false positive が発生し、未変更なのに dirty と判定される。

---

### ⚠️ [5] 新規記事の下書きキーがタブ間で衝突する

**File**: `components/admin/ArticleForm.tsx` lines 86–89  
**Category**: Correctness

```tsx
// 現状: 複数タブで新規作成中は同一キー "familyai:admin:article-draft:new" を上書きし合う
const keySlug = isEdit ? article!.slug : slug.trim() || 'new';
```

マウント時に `crypto.randomUUID()` でセッション識別子を生成し、`new-{uuid}` とすることで衝突を防ぐ。

---

### ⚠️ [6] `draftStatus: 'saved'` が永続的に表示される

**File**: `components/admin/ArticleForm.tsx` lines 78–79  
**Category**: UX

一度「下書き保存済み」と表示されると、ユーザーが変更を加えない限り永続的に表示され続ける。3 秒後に `'idle'` にリセットする `setTimeout` を追加すること。

---

### ⚠️ [7] 複数 Markdown エクスポートがブラウザにブロックされる可能性

**File**: `components/admin/AdminArticleTable.tsx` lines 216–226  
**Category**: UX

`exportSelectedAsMarkdown` は複数ファイルを同時にダウンロードトリガーするため、多くのブラウザで 2 件目以降がブロックされる。`setTimeout` を挟む（例: 各 200ms 遅延）か、zip にまとめる実装を検討。

---

### ⚠️ [8] `thumbnailUrl` のサーバー側 URL 検証なし

**File**: `lib/schemas/articles.ts` line 67  
**Category**: Security

```ts
// 現状
thumbnailUrl: z.string().nullable().optional().transform((v) => v ?? null),

// 修正
thumbnailUrl: z.string().url().nullable().optional().transform((v) => v ?? null),
```

フロントエンドでは `type="url"` を設定しているが、サーバー側の Zod スキーマに URL 形式検証がないため、任意の文字列を保存できてしまう。

---

### ℹ️ [9] `filtered` 変数が意味をなさない

**File**: `components/admin/AdminArticleTable.tsx` line 133  
**Category**: Maintainability

```ts
const filtered = articles; // client-side フィルタリング廃止後の残留コード
```

`filtered` は単なる `articles` のエイリアス。変数を廃止して `articles` を直接使うか、より意味のある名前（例: `rows`）に変更すること。

---

### ℹ️ [10] `:::message` ブロック内の見出しに ToC アンカーがない

**File**: `components/article/ArticleBody.tsx` lines 858–869  
**Category**: Correctness

`:::message` ブロック内の `ReactMarkdown` は `components`（ID なし）を使用するため、メッセージブロック内の `h2/h3` は ToC にアンカーを持たない。意図的な設計ならコメントで明記することを推奨。

---

## Security Assessment

### ✅ 適切に対処済み

| 項目 | 実装 |
|------|------|
| CSRF | Origin ヘッダー照合 (`lib/csrf.ts`) — admin 専用として許容範囲 |
| iframe 埋め込み | VOA / YouTube / Blob のみ allowlist で許可（SSRF 抑制） |
| Mermaid | `securityLevel: 'strict'` でスクリプト挿入防止 |
| HTML サニタイズ | `rehype-sanitize` が `rehype-raw` の**後**に実行（正しい順序） |
| 入力検証 | Zod による API 入力検証（slug 正規表現含む） |
| Rate limiting | Redis fail-closed |
| SQL インジェクション | Drizzle ORM のパラメータバインディング |

### ⚠️ 要確認

- `thumbnailUrl` のサーバー側 URL 検証なし（上記 #8）
- CSRF は Origin ヘッダーのみ（管理者専用のため実用上のリスクは低い）

---

## What Looks Good

- **アクセシビリティ**: `role="alert"`, `aria-live`, `aria-pressed`, `fieldset/legend`, `useId()` による label 関連付けが丁寧
- **セキュリティ多層防御**: `protectAdminRoute` で CSRF → Auth → RateLimit の順序を一元管理
- **エラーハンドリング**: AbortController でリクエストキャンセル、二重クリック防止の `pendingSlugs`
- **パフォーマンス**: highlight.js を必要な言語のみインポート、Mermaid を動的インポート
- **コードの分離**: Zod スキーマを `lib/schemas/` に独立させユニットテスト可能な設計
- **Markdown バリデーション**: 閉じられていないフェンスブロックを `analyzeMarkdown` で検出する仕組み
- **YAML インジェクション防止**: `toMarkdown` ヘルパーが `JSON.stringify` で frontmatter 値をエスケープ

---

## Verdict

**Request Changes** — Critical の 2 件（全画面ボタンのアイコンバグ、`applyEdit` の重複）を修正すること。`thumbnailUrl` の URL 検証追加も強く推奨。それ以外は Suggestions として次の PR で対処可能。

---

## 優先修正サマリー

| 優先度 | File | 修正内容 |
|--------|------|----------|
| 🔴 必須 | `ArticleForm.tsx:475` | 全画面ボタンの ON/OFF アイコンを区別する |
| 🔴 必須 | `MarkdownEditor.tsx:119-133` | ローカルの `applyEdit` 関数を削除し imperativeHandle に一本化 |
| ⚠️ 推奨 | `lib/schemas/articles.ts:67` | `thumbnailUrl` に `z.string().url()` を追加 |
| ⚠️ 推奨 | `MarkdownEditor.tsx:88` | `useMemo` 依存配列を `[]` に修正 |
| ⚠️ 推奨 | `ArticleForm.tsx:105` | categories dirty 判定をソート後 join で比較 |
