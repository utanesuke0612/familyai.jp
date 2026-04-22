# 20260422 Claude Review v1

> **目的**: 本ドキュメントは、別の Coding Agent がソースコードを改修するための指示書として利用する。
> **前提レビュー観点**: [20260421-Codexレビュー.md](./20260421-Codexレビュー.md) の 10 領域（正しさ / 保守性 / 可読性 / 拡張性 / UI 操作性 / 運用性 / SEO / セキュリティ / パフォーマンス / テスト容易性）に準拠。
> **レビュー実施**: Claude Opus 4.7 (1M) — 2026-04-22
> **レビュー範囲**: `claude/serene-stonebraker-503306` ブランチ時点の全コードベース
> **作業ルール**:
> - 変更は必要最小限
> - 既存の設計方針（Next.js App Router / Drizzle / NextAuth v5 / shared モバイル再利用）を壊さない
> - コメントと実装の矛盾は解消する
> - エラーレスポンス形式は既存方針に寄せる

---

## 0. Executive Summary

Next.js App Router・Drizzle ORM・NextAuth v5・Zod 検証による骨格は堅牢で、Repository パターンと ISR/SWR キャッシュ設計も妥当。ただし本番運用・iOS/Android 展開に向けては **HIGH 9 件** の課題があり、放置すると外部クライアント実装・監視・セキュリティ境界・アクセシビリティで実害が出る。

- **Backend / 契約 / セキュリティ / SEO / 運用スコア**: **72/100**
- **UI / UX / Accessibility スコア**: **62/100**
- **総合**: **67/100** — HIGH 9 件を片付ければ 85 付近まで到達可能な位置取り

---

## 1. Findings（優先度順・修正用タスクリスト）

### [HIGH-1] `shared/api` に `search` パラメータ未追随
- **Category**: 正しさ / API 契約 / 拡張性
- **File**:
  - `shared/api/index.ts:113-124`（`ArticlesQuery` interface）
  - `shared/api/index.ts`（`fetchArticles()` クエリ組み立て）
  - `app/api/articles/route.ts:78` (search 受け付け実装)
- **Issue**: `/api/articles` は `?search=` を受け付けるが、`shared/api/index.ts` の `ArticlesQuery` 型に `search` が無く、`fetchArticles()` の QS 組み立てにも含まれない。
- **Evidence**: 公開 API 側は既に Rev26 #2 で `search` 実装済み。shared 側は未追随。
- **Impact**: iOS/Android が shared 経由で検索できない。Phase 4 展開時に契約逸脱。
- **修正方針**:
  1. `ArticlesQuery` に `search?: string` を追加
  2. `fetchArticles()` の QS 組み立てに `search` を含める（空文字時は送らない）
  3. 既存 shared テストがあれば更新、無ければ簡潔に追加
  4. コメントを実装と一致させる
- **受け入れ条件**:
  - shared client から `search` が渡せる
  - 空文字/undefined では QS に出ない
  - 既存 `/api/articles` 正常系を壊さない

---

### [HIGH-2] JSON-LD が存在しない `logo.png` を参照
- **Category**: SEO / メタデータ
- **File**:
  - `app/(site)/learn/[slug]/page.tsx`（`generateMetadata` / JSON-LD 生成部）
  - `public/`（logo.png が存在しない — 現状 `fonts/` のみ）
- **Issue**: publisher.logo.url が `${SITE.url}/logo.png` を参照するが `public/logo.png` が実在しない。
- **Impact**: Rich Results Test / Schema.org validator で警告。構造化データ品質低下。
- **修正方針（どちらかを選択）**:
  - **A案（推奨）**: 実在するアイコン/OGP 画像（例: `public/og-default.png` や app router の `icon.png`）に差し替え
  - **B案**: publisher.logo を省略可能な形に修正（存在しない URL を出さない）
- **受け入れ条件**:
  - JSON-LD で 404 になる URL を参照しない
  - SEO メタデータが今より不正確にならない
- **注意**: 実在する画像の確認は必ず `public/` を `ls` で行うこと。Glob で実体確認を。

---

### [HIGH-3] SSE エラーが HTTP 200 固定
- **Category**: 運用性 / API 契約 / セキュリティ
- **File**: `app/api/ai/route.ts:92-98`（`errorStream()` ）
- **Issue**: `errorStream()` が `status: 200` を固定で返す。TIMEOUT / RATE_LIMIT_EXCEEDED / AI_UNAVAILABLE も HTTP 200。
- **Impact**:
  - 外部監視（DataDog, Sentry 等）が失敗を検知できない
  - Vercel Edge / LB のヘルスチェックが成功判定
  - iOS/Android URLSession/OkHttp が成功扱い → stream 読んで初めてエラー検知
- **修正方針**:
  - **ストリーム確立前**（例: `UNSUPPORTED_TYPE`, `VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`）は JSON ボディで適切な HTTP status（400 / 429 等）
  - **ストリーム確立後**のエラー（OpenRouter 側 timeout, provider failure）は SSE 内に error イベントを流しつつ、可能なら status は適切化
  - `shared/types/` に `ChatStreamDelta | ChatStreamError` の discriminated union 型を定義（HIGH-7 と合わせて対応）
- **受け入れ条件**:
  - エラー時に外部監視で検知可能な HTTP status を返す
  - 既存 Web クライアントの挙動を壊さない（SSE stream 内 error でも parse できるよう互換レイヤを残す）

---

### [HIGH-4] 管理画面削除後に `total` / `totalPages` がズレる
- **Category**: 正しさ / UI 状態 / 保守性
- **File**: `components/admin/AdminArticleTable.tsx:133-145`（`handleDelete()`）
- **Issue**: 削除時 `setArticles(prev => prev.filter(...))` のみで `total` を更新しない。最終ページ最終行削除時に pagination 矛盾。
- **再現**: `totalPages=5` で page=5 に 1 件しかない状態で削除 → 「0 件 / 5 ページ」表示。
- **修正方針**:
  1. 削除成功後に `setTotal(prev => prev - 1)` を呼ぶ
  2. 現在ページが空になったら `setPage(Math.max(1, page - 1))` で戻す
  3. または削除後に再フェッチ（`router.refresh()` もしくは list API 再実行）でサーバ真実に同期
- **受け入れ条件**:
  - 最終ページで最終行削除しても表示が整合
  - ページング計算に矛盾が起きない

---

### [HIGH-5] `verifyCsrf()` の mobile 経路が形骸化
- **Category**: セキュリティ / 保守性
- **File**: `lib/csrf.ts:60-88`（`verifyCsrf()`, `verifyMobileClient()`）
- **Issue**:
  - コメント設計では「`allowMobile: true` + `X-Client-Platform` + `X-Mobile-Api-Key` で許可」
  - 実装は `origin === null` で無条件 `return true`
  - `allowMobile: true` を実際に指定しているルートが見当たらない
- **修正方針（推奨: A 案に寄せる）**:
  - **A 案（推奨）**: 厳密化
    - Origin 不在時、`opts.allowMobile === true` かつ `verifyMobileClient()` が真の場合のみ通す
    - それ以外で Origin 不在は 403
    - 管理 API（admin articles 等）は `allowMobile: false` を明示
  - **B 案**: ドキュメント側を現実運用に合わせる（非ブラウザ許可を明文化、admin だけは Origin 必須）
- **受け入れ条件**:
  - mobile 経路の仕様がコードで明確
  - admin API の保護が弱くならない
  - コメントと実装が一致する

---

### [HIGH-6] `ArticleForm` の label / input 未関連付け
- **Category**: Accessibility / Forms
- **File**:
  - `components/admin/ArticleForm.tsx:483-501`（`Field` コンポーネント）
  - `components/admin/ArticleForm.tsx:160-181`（Slug / Title / Description 等 input）
- **Issue**: `Field` が `<label>` を描画するだけで `htmlFor`/`id` が無い。子 input も id が無い。
- **Impact**: スクリーンリーダーが項目名を読めない。label クリックでフォーカス移動しない。
- **修正方針**:
  1. `Field` コンポーネントを `useId()` ベースにして `htmlFor` を生成
  2. children に id を注入（`React.cloneElement` or props drilling）、もしくは Context で提供
  3. もしくは API を `<Field label="..." id="slug">{(id) => <input id={id} />}</Field>` に変更
- **受け入れ条件**:
  - 全フォームフィールドで `<label htmlFor="X">` と input の id が一致
  - label クリックで対応 input にフォーカス

---

### [HIGH-7] エラー通知が上部バナーのみ・`aria-live` 欠落
- **Category**: Accessibility
- **File**: `components/admin/ArticleForm.tsx:144-151`
- **Issue**: 送信失敗エラーがトップバナー表示のみ。`aria-live` も inline error も無く、SR ユーザが失敗に気付けない。
- **修正方針**:
  1. バナーに `role="alert"` + `aria-live="polite"` + `aria-atomic="true"` を付与
  2. フィールド単位のエラーは input 近傍に inline 表示、input に `aria-invalid` / `aria-describedby` を結線
  3. 失敗時にエラー領域にフォーカス移動（`ref.focus()`）
- **受け入れ条件**:
  - SR で送信失敗が読み上げられる
  - どのフィールドが原因か分かる

---

### [HIGH-8] 管理テーブルの検索/ソートに label 無し
- **Category**: Accessibility / Forms
- **File**: `components/admin/AdminArticleTable.tsx:156-187`
- **Issue**: `<input type="search">` と `<select>` が label/`aria-label` 無しで独立配置。
- **修正方針**:
  - 検索: `aria-label="記事タイトルで検索"` を追加、または `<label>` で視覚的にも結ぶ
  - ソート: `aria-label="ソート順序"` を追加
  - 併せて、検索実行中は `aria-busy={loading}` を付けてもよい
- **受け入れ条件**:
  - SR でコントロール用途が読み上げられる

---

### [HIGH-9] 失敗通知が `alert()` 依存
- **Category**: Accessibility / UI State
- **File**: `components/admin/AdminArticleTable.tsx:122,139`
- **Issue**: 更新/削除失敗が `alert('更新に失敗しました')` / `alert('削除に失敗しました')`。
- **修正方針**:
  1. `role="status"` or `role="alert"` + `aria-live="assertive"` のトースト領域を追加
  2. 失敗時はそこにメッセージを表示（数秒で自動消去 or クローズボタン）
  3. 既存 UI（既存のトーストコンポーネントがあれば流用）
- **受け入れ条件**:
  - alert ダイアログが立たない
  - 失敗が SR で通知される

---

### [MEDIUM-10] `/api/auth/register` に CSRF / rate limit 無し
- **Category**: セキュリティ / 運用性
- **File**: `app/api/auth/register/route.ts`
- **Issue**: body validation と email 重複チェックのみ。`verifyCsrf()` 未使用、rate limit なし。
- **修正方針**:
  1. `verifyCsrf(req)` を先頭で呼び、失敗時は 403
  2. `lib/ratelimit.ts` を流用し、IP 単位で 5–10 req/5min
  3. エラーレスポンス形式を既存 API（例: `{ error: string }` / zod エラー形式）に揃える
- **受け入れ条件**:
  - bot 大量登録が抑止される
  - 正常系登録フローは壊れない

---

### [MEDIUM-11] `/api/audio/play` の abuse 耐性不足
- **Category**: セキュリティ / パフォーマンス
- **File**: `app/api/audio/play/route.ts:36,40-52`
- **Issue**:
  - `listenedSec` がクライアント申告値のみ
  - Redis デデュープは 24h だが、明確な rate limit 無し
  - Origin / bot 判定も無い
- **修正方針**:
  1. **Rate limit**: `articleId + IP hash` 単位で短時間制限（例: 1 req/10s）
  2. **改ざん耐性**: 可能ならサーバ側でセッション開始時に time-token（HMAC 署名 or Redis に session 保存）を発行し、再生完了時に突合
  3. 最低限、`Origin` チェック or Referer 確認で Web 経由かを簡易判定
- **受け入れ条件**:
  - curl / スクリプトから `counted:true` を量産できない
  - 正常な Web/iOS 再生は妨げない

---

### [MEDIUM-12] `outline:'none'` / `outline-none` で focus-visible を潰す
- **Category**: Focus / Accessibility
- **File**:
  - `components/home/RolePicker.tsx:91`（inline `outline: 'none'`）
  - `components/article/AIChatWidget.tsx:453`（textarea `outline-none`）
  - `components/learn/LearnSearchBar.tsx:77`（`focus:outline-none focus-visible:ring-2` の ring-color 未指定）
- **Issue**: `app/globals.css:129-133` の `:focus-visible` がコンポーネント側の上書きで無効化される箇所あり。
- **修正方針**:
  - `outline: 'none'` を削除し、focus-visible ring/outline を明示
  - RolePicker: `outline: 'none'` を外す（globals の :focus-visible に任せる）
  - AIChatWidget textarea: `focus-visible:ring-2 focus-visible:ring-[var(--color-orange)]` を追加
  - LearnSearchBar: `focus-visible:ring-[var(--color-orange)]` 等ブランド色指定
- **受け入れ条件**:
  - Tab 操作で全要素にフォーカス可視
  - ring の色がブランドに調和

---

### [MEDIUM-13] インライン hover が `prefers-reduced-motion` を迂回
- **Category**: Motion / Accessibility
- **File**: `components/article/ArticleCard.tsx:87-98`
- **Issue**: `onMouseEnter` / `onMouseLeave` で直接 `transform` / `boxShadow` を書き換え、CSS media query が効かない。
- **修正方針**:
  - CSS の `:hover` 擬似クラスに移動
  - `@media (prefers-reduced-motion: reduce)` で transform を 0 / transition none に
  - もしくは styled-jsx / CSS module / Tailwind `hover:` で同等表現
- **受け入れ条件**:
  - OS の reduce-motion 設定で hover 時 transform が無効化

---

### [MEDIUM-14] API limit 境界値の不統一
- **Category**: 正しさ / 保守性
- **File**:
  - `app/api/articles/route.ts`（max 50）
  - `app/api/articles/latest/route.ts`（max 20）
  - `app/api/articles/[slug]/related/route.ts`（max 10）
  - `app/api/audio/play/route.ts`（`listenedSec` max 7200）
- **修正方針**:
  - `shared/constants.ts`（新規 or 既存）に `MAX_ARTICLES_LIMIT = 50`, `MAX_LATEST_LIMIT = 20`, `MAX_RELATED_LIMIT = 10` 等を定義
  - 各 route の zod schema でこの定数を参照
  - shared/api でも同じ定数を import
- **受け入れ条件**:
  - 各エンドポイントの上限値が 1 箇所で管理される

---

### [MEDIUM-15] SSE の `delta` / `error` 共通型が shared に無い
- **Category**: 拡張性 / API 契約
- **File**:
  - `app/api/ai/route.ts`
  - `shared/types/`（追加先）
- **Issue**: mobile 実装が error の判別仕様を持たない。
- **修正方針**:
  - `shared/types/ai-stream.ts` に
    ```ts
    export type ChatStreamDelta = { type: 'delta'; content: string };
    export type ChatStreamError = { type: 'error'; code: string; message: string };
    export type ChatStreamEvent = ChatStreamDelta | ChatStreamError;
    ```
    を定義
  - `/api/ai` の送信側で同じ型を使用
  - HIGH-3 の対応と合わせて実施
- **受け入れ条件**:
  - mobile/Web 両方で同じ型定義を import できる

---

### [LOW-16] ログの stack trace 欠落・フォーマット不統一
- **Category**: 運用性
- **File**: `lib/repositories/articles.ts:194`, `app/api/articles/route.ts:221`, `app/api/audio/play/route.ts:162` 他
- **修正方針**:
  - `lib/logger.ts` に統一ロガーを作成（console.error の薄いラッパ + stack 出力 + context tag）
  - 既存 `console.error('[xxx]')` 呼び出しを段階的に置換（今回は新規ログのみ統一で可）
- **受け入れ条件**:
  - 新規エラーログは統一フォーマット

---

## 2. Spec / Design Drift（設計書との差分）

- `shared/api` の `ArticlesQuery` が `/api/articles` の search 実装に追随していない → **Phase 4 iOS/Android 前提に反する**
- `lib/csrf.ts` のコメント設計（allowMobile + mobile API key）と実装（Origin 不在で即通過）が矛盾
- `Todo/01_システム設計書.md` で前提の JSON-LD logo が `public/` に存在しない
- SSE エラー仕様が `Todo/04_テスト仕様書.md` のエラーハンドリング要件と HTTP status 観点で未定義

---

## 3. What Looks Good（触らない方がよい良質な部分）

1. **Zod + safeParse を全 route で実行** — 入力境界の型/値保証が堅い
2. **Repository パターン** — `lib/repositories/articles.ts` が page/route から共通利用可能、shared 移植容易
3. **CDN/ISR 戦略** — `s-maxage=60, stale-while-revalidate=600` と `React.cache()` の併用
4. **NextAuth v5 JWT + plan 焼き込み** — セッション毎の DB ヒットを回避
5. **`app/globals.css` の `:focus-visible` / safe-area / reduce-motion / high-contrast** — WCAG AA を意識
6. **fluid typography（`clamp()`）と 44px タップ領域のグローバル指定**
7. **SSE + AbortController + rehype-sanitize** — タイムアウト制御と XSS 防止

---

## 4. 推奨実施順序（PR 分割案）

別 Agent への提案分割:

- **PR-1 (Backend / 契約 / セキュリティ)**: HIGH-1, HIGH-3, HIGH-5, MEDIUM-15
- **PR-2 (SEO)**: HIGH-2
- **PR-3 (管理画面整合性)**: HIGH-4, HIGH-8, HIGH-9（UI セット）
- **PR-4 (フォーム A11y)**: HIGH-6, HIGH-7
- **PR-5 (Focus / Motion)**: MEDIUM-12, MEDIUM-13
- **PR-6 (API 強化)**: MEDIUM-10, MEDIUM-11, MEDIUM-14
- **PR-7 (運用性)**: LOW-16

PR ごとに tsc / vitest を走らせ、テストが通ることを受け入れ条件とする。

---

## 5. 改修時の厳守事項

- 既存の UI リファクタは目的外なので行わない
- エラーレスポンス形式は既存方針に寄せる（`{ error: string, code?: string }` 等）
- shared 層は iOS/Android 再利用前提で、ブラウザ API に依存しない
- 修正対象ファイルに関係ない改行・空白・import 並び替えは混ぜない
- コメントは非自明な「なぜ」のみ、実装を説明するコメントは書かない
- HIGH 修正後は必ず `npx tsc --noEmit` および `npm test -- --run` で回帰確認（実行不可なら理由を明記）

---

## 6. Open Questions（改修前に確認推奨）

1. `MOBILE_API_KEYS` は本番で実在する想定か（`allowMobile: true` が未使用の理由）
2. `public/logo.png` はデザイン側から供給待ちか、JSON-LD 側を落とす判断か
3. SSE エラーを 4xx/5xx に寄せる方針で良いか、現行 Web クライアントとの互換維持はどこまで必要か
4. `npx tsc --noEmit` / `npm test -- --run` が Codex 環境で失敗した件は CI 側で通っているか（lockfile / node_modules 再現性）

---

**最終確認**: 本ドキュメントの指示に従って改修する Agent は、実装前に `Todo/01_システム設計書.md`, `Todo/02_CodingAgent指示書.md`, `Todo/04_テスト仕様書.md` と突き合わせ、設計書の前提が更新されている場合はそちらを優先すること。
