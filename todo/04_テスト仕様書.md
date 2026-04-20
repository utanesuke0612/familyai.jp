# familyai.jp 自動テスト手順書 v1

作成日: 2026-04-19
最終更新: 2026-04-20（Rev24 #①④⑤ + QA-T3 admin CRUD 反映：Vitest **79/79 PASS**。追加テスト = `shared-api.latest-related.test.ts`（3件・fetchLatest/fetchRelated）＋`adminArticlesQuerySchema.test.ts`（6件・page/pageSize/sort/search validation）＋`csrf.test.ts`（10件・Origin チェック4＋モバイル経路6）＋`test/integration/admin-articles.integration.test.ts`（14件・admin GET/POST/PUT/DELETE/PATCH-toggle × 正常系＋403/400/404/429/CSRF）。QA-T3 の `/api/ai` free/pro プラン別（OpenRouter＋db.users mock 要）、QA-T4 Playwright E2E は未着手のまま継続。）
対象範囲: Phase1 / Rev23〜Rev27 時点のコードベース
目的: 回帰防止・iOS/Android移行前の品質担保・高トラフィック対応前の信頼性検証

---

## 0. テスト戦略概要

### 0.1 4層テストピラミッド（実装実績 2026-04-20）

```
         ┌─────────────────────────┐
         │  E2E (Playwright)        │ ← QA-T4 ⏳ 未着手（主要10シナリオ・4〜6h）
         ├─────────────────────────┤
         │ 統合 (Vitest + vi.mock)  │ ← QA-T3 ✅ admin CRUD 14 件 PASS（残 /api/ai）
         ├─────────────────────────┤
         │ ユニット (Vitest)        │ ← QA-T2 ✅ 65 件 PASS（Rev24/Rev27 追加分含む）
         ├─────────────────────────┤
         │ スモーク (curl/bash)     │ ← QA-T1 ✅ 44/45 PASS（G1 は仕様通り 403）
         └─────────────────────────┘
  合計: 9 files / 79 tests PASS・Duration 約 600ms（2026-04-20 現在）
```

### 0.2 導入順序（実績 & 予定）

1. **Phase T1 (30分)**: スモークテスト（curl + bash）— ✅ 2026-04-19 完了・44/45 PASS
2. **Phase T2 (2〜3時間)**: Vitest 導入 + ユニットテスト — ✅ 2026-04-19 完了・以後 Rev24/Rev26/Rev27 で追加
3. **Phase T3 (3〜4時間)**: Vitest + `vi.mock()` で API route テスト — ✅ 2026-04-20 admin CRUD 部分完了・残 `/api/ai`
4. **Phase T4 (4〜6時間)**: Playwright 導入 + E2E主要シナリオ — ⏳ Rev24 #②③ 着手前に実施予定

---

## 1. テスト観点一覧（カテゴリ別）

### 1.1 認証・セッション（lib/auth.ts）

| # | 観点 | 期待動作 | 優先度 |
|---|------|---------|--------|
| A1 | Credentials ログイン成功 | 正しい email + password → session 発行 | High |
| A2 | Credentials ログイン失敗（パスワード誤） | null 返却・セッション未発行 | High |
| A3 | Credentials ログイン失敗（存在しないユーザー） | null 返却 | High |
| A4 | Google OAuth 新規ユーザー | users テーブルに insert される | High |
| A5 | Google OAuth 既存ローカル→Google連携 | authProvider が 'google' に更新、passwordHash が null 化 | High |
| A6 | Google OAuth 既存Googleユーザー | 再ログイン時に重複 insert されない（onConflictDoNothing） | Med |
| A7 | JWT に plan が埋め込まれる | ログイン直後のトークンに plan='free' or 'pro' | High |
| A8 | Session.user.plan が DB と一致 | `session.user.plan` が users.plan と同値 | High |
| A9 | plan 未定義トークンのフォールバック | DB未取得時に 'free' にフォールバック | Med |
| A10 | signOut 後のセッションクリア | /api/auth/session が null 返却 | High |

### 1.2 管理者認可（lib/admin-auth.ts）

| # | 観点 | 期待動作 | 優先度 |
|---|------|---------|--------|
| B1 | 未ログイン → 401 | requireAdmin() が response(401) を返す | High |
| B2 | 非管理者ログイン → 403 | response(403) を返す | High |
| B3 | 管理者ログイン → ok:true | check.ok === true | High |

### 1.3 CSRF 防御（lib/csrf.ts）

| # | 観点 | 期待動作 | 優先度 |
|---|------|---------|--------|
| C1 | 同一オリジン POST | verifyCsrf = true | High |
| C2 | 異なるオリジン POST | verifyCsrf = false → 403 | High |
| C3 | Origin ヘッダ無し | 設定に応じて false | Med |

### 1.4 レート制限（lib/ratelimit.ts）

| # | 観点 | 期待動作 | 優先度 |
|---|------|---------|--------|
| D1 | 10req/min 以内 | rl === null（通過） | High |
| D2 | 10req/min 超過 | response(429) を返す | High |
| D3 | Upstash未設定時のフォールバック | 例外スローせず通過（または deny） | Med |

### 1.5 記事リポジトリ（lib/repositories/articles.ts）

| # | 観点 | 期待動作 | 優先度 |
|---|------|---------|--------|
| E1 | listArticles(search) 部分一致 | title / body の LIKE 検索 | High |
| E2 | listArticles ILIKE エスケープ | `%` や `_` がリテラル扱い | **High**（Rev22） |
| E3 | listArticles role フィルタ | roles 配列に指定ロール含む記事のみ | High |
| E4 | listArticles cat 複数指定 | categories の OR 条件で合致 | **High**（Rev22） |
| E5 | listArticles sort 4種 | latest / oldest / popular / title が全て動作 | Med |
| E6 | getArticle(slug) 公開記事 | 記事1件返却 + viewCount++ | High |
| E7 | getArticle(slug) 非公開記事 | null 返却 | High |
| E8 | getArticleForAdmin(slug) | 非公開でも返却される | High |
| E9 | createArticle slug重複 | unique制約エラー | High |
| E10 | updateArticle 部分更新 | 未指定フィールドは保持 | High |
| E11 | deleteArticle 成功 | true 返却・DB から消える | High |
| E12 | togglePublished | published フラグ反転 + publishedAt 設定 | High |

### 1.6 API ルート: 公開エンドポイント

| # | エンドポイント | 観点 | 優先度 |
|---|---|---|---|
| F1 | GET /api/articles | 一覧取得 (200 + `{ok, data}`) | High |
| F2 | GET /api/articles?role=papa | role フィルタ反映 | High |
| F3 | GET /api/articles?cat=image-gen&cat=voice | 複数カテゴリ OR | **High**（Rev22） |
| F4 | GET /api/articles?search=xxx | 検索結果ヒット | High |
| F5 | GET /api/articles?search=%25 | ILIKE エスケープ動作 | **High**（Rev22） |
| F6 | GET /api/articles/[slug] | 単品取得 (200) | **High**（Rev23新設） |
| F7 | GET /api/articles/[slug] 非公開 | 404 | High |
| F8 | Cache-Control ヘッダ検証 | `s-maxage=60, stale-while-revalidate=600` | Med |

### 1.7 API ルート: 管理者エンドポイント

| # | エンドポイント | 観点 | 優先度 |
|---|---|---|---|
| G1 | POST /api/admin/articles CSRF欠如 | 403 | High |
| G2 | POST /api/admin/articles 未認証 | 401 | High |
| G3 | POST /api/admin/articles 非管理者 | 403 | High |
| G4 | POST /api/admin/articles 正常 | 201 + 記事作成 | High |
| G5 | POST /api/admin/articles slug重複 | 409 | High |
| G6 | POST /api/admin/articles zod違反 | 400 + details | High |
| G7 | POST /api/admin/articles 11req/min | 429 | **High**（Rev23） |
| G8 | PUT /api/admin/articles/[slug] | 部分更新 200 | High |
| G9 | PUT 存在しないslug | 404 | High |
| G10 | DELETE /api/admin/articles/[slug] | 削除成功 | High |
| G11 | PATCH /api/admin/articles/[slug]/toggle | 公開切替 | High |

### 1.8 API ルート: AI / 音声

| # | エンドポイント | 観点 | 優先度 |
|---|---|---|---|
| H1 | POST /api/ai free plan 制限 | plan='free' で上限超過時 429/403 | High |
| H2 | POST /api/ai pro plan 無制限 | plan='pro' で制限なし | High |
| H3 | POST /api/ai 未ログイン | 401 | High |
| H4 | POST /api/audio/play viewCount++ | 音声再生カウンタ加算 | Med |

### 1.9 ページ（App Router Server Components）

| # | ページ | 観点 | 優先度 |
|---|---|---|---|
| P1 | / トップページ | 200 + OG/meta 正常 | High |
| P2 | /learn 一覧 | 200 + 記事一覧表示 | High |
| P3 | /learn?role=papa | role クエリ反映 | High |
| P4 | /learn?role=common | 404にならない（Rev最新） | **High** |
| P5 | /learn revalidate=300 | ISR設定確認 | Med |
| P6 | /learn/[slug] 公開記事 | 200 + 本文表示 | High |
| P7 | /learn/[slug] 非公開 | 404 | High |
| P8 | /learn/[slug] generateMetadata cache | DB呼び出しが重複しない（React.cache） | Med |
| P9 | /admin/articles 未ログイン | redirect or 401 | High |
| P10 | /admin/articles 管理者 | 記事表示 + CRUD ボタン | High |
| P11 | /auth/signin | ログインフォーム表示 | High |
| P12 | /about, /privacy, /terms | 200 静的ページ | Med |
| P13 | 存在しないURL | 404 (not-found.tsx) | High |

### 1.10 管理画面UI（components/admin/）

| # | コンポーネント | 観点 | 優先度 |
|---|---|---|---|
| U1 | AdminArticleTable ソート | latest/oldest/popular/title | Med |
| U2 | AdminArticleTable 検索 | search クエリ反映 | Med |
| U3 | AdminArticleTable 公開切替 | 楽観更新 + 失敗時ロールバック | **High**（Rev22） |
| U4 | AdminArticleTable 削除 | 確認ダイアログ + DELETE | **High** |
| U5 | ダブルクリック防止 | pendingSlugs Set が重複リクエスト防ぐ | **High**（Rev22） |
| U6 | AdminArticleEditor 保存 | PUT 200 + toast | High |

### 1.11 共通ユーティリティ（shared/utils）

| # | 関数 | 観点 | 優先度 |
|---|---|---|---|
| V1 | buildQueryString 単一値 | `?k=v` | High |
| V2 | buildQueryString 配列 | `?cat=a&cat=b` | **High**（Rev22） |
| V3 | buildQueryString undefined | キー省略 | High |
| V4 | formatDate / formatRelativeTime | 日本語フォーマット | Med |

### 1.12 zod バリデーション

| # | スキーマ | 観点 | 優先度 |
|---|---|---|---|
| Z1 | createArticleSchema 必須欠落 | .safeParse().success === false | High |
| Z2 | createArticleSchema enum違反 | role/category/level が不正値 | High |
| Z3 | createArticleSchema 日付空文字 | null に変換 | High |
| Z4 | updateArticleSchema 全 optional | 空オブジェクトで成功 | High |

### 1.13 セキュリティ

| # | 観点 | 期待動作 | 優先度 |
|---|------|---------|--------|
| S1 | SQLインジェクション（search param） | ILIKE エスケープで無害化 | **High** |
| S2 | XSS（記事 body） | HTML エスケープ or sanitize | High |
| S3 | CSRF（異オリジン POST） | 403 | High |
| S4 | オープンリダイレクト（callbackUrl） | 自ホストのみ許可 | High |
| S5 | タイミング攻撃（bcrypt compare） | 一定時間で比較 | Med |
| S6 | パスワードハッシュ未保存（Google） | passwordHash = null | High |

### 1.14 性能・非機能

| # | 観点 | 期待動作 | 優先度 |
|---|------|---------|--------|
| N1 | /learn TTFB | < 500ms（ISR後） | Med |
| N2 | /learn/[slug] React.cache | 1リクエスト内で DB 呼び出し1回 | **High**（Rev23） |
| N3 | /api/ai 認証経由の DB 呼び出し | plan 取得が JWT 経由（DB不要） | **High**（Rev23） |
| N4 | 管理API レート制限 | 11req/min で 429 | **High**（Rev23） |

---

## 2. Phase T1: スモークテスト手順（今すぐ実施可能）

### 2.1 ツール
- `bash` + `curl` + `jq`（依存追加なし）

### 2.2 ファイル配置案
```
scripts/
├─ smoke-test.sh        # メインランナー
└─ smoke/
   ├─ public-pages.sh   # /, /learn, /learn/[slug], /about...
   ├─ public-api.sh     # /api/articles 一覧・詳細・フィルタ
   └─ admin-gate.sh     # 未認証で admin API が 401/403 返すか
```

### 2.3 実行コマンド
```bash
BASE_URL=http://localhost:3000 bash scripts/smoke-test.sh
```

### 2.4 判定基準
- 全チェック exit code 0 → 🟢
- 1件でも失敗 → 🔴 + 該当URL/期待ステータス/実際のステータスを出力

### 2.5 対象 URL リスト（初版）
```
GET  /                             → 200
GET  /learn                        → 200
GET  /learn?role=common            → 200
GET  /learn?role=papa              → 200
GET  /learn?role=mama              → 200
GET  /learn?role=kids              → 200
GET  /learn?role=senior            → 200
GET  /learn?cat=image-gen          → 200
GET  /learn?cat=image-gen&cat=voice → 200
GET  /learn?search=AI              → 200
GET  /learn/image-gen-family-photo → 200
GET  /about                        → 200
GET  /privacy                      → 200
GET  /terms                        → 200
GET  /auth/signin                  → 200
GET  /does-not-exist               → 404
GET  /api/articles                 → 200 + ok:true
GET  /api/articles?role=papa       → 200
GET  /api/articles/image-gen-family-photo → 200 + Cache-Control
GET  /api/articles/nonexistent     → 404
GET  /api/admin/articles           → 401/403
POST /api/admin/articles           → 401/403/CSRF
```

---

## 3. Phase T2: Vitest ユニットテスト手順

### 3.1 セットアップ
```bash
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```

### 3.2 ディレクトリ構造
```
test/
├─ setup.ts
├─ unit/
│  ├─ utils/
│  │  └─ buildQueryString.test.ts
│  ├─ zod/
│  │  ├─ createArticleSchema.test.ts
│  │  └─ updateArticleSchema.test.ts
│  └─ repositories/
│     └─ articles.escape.test.ts  (ILIKE エスケープのみ純粋関数化)
```

### 3.3 対象観点
- 1.11 ユーティリティ（V1〜V4）
- 1.12 zod（Z1〜Z4）
- 1.5 の ILIKE エスケープ部分のみ（DB不要）

### 3.4 実行
```bash
pnpm test           # watch
pnpm test --run     # 1回実行
pnpm test --ui      # ブラウザUI
```

---

## 4. Phase T3: API 統合テスト手順

> **方針転換（2026-04-20 Rev24 時）**: 当初は Neon test branch + supertest + DB seeding を想定していたが、
> 実装時に **外部依存ゼロの `vi.mock()` 戦略** に切り替え。Route Handler を直接 import して呼び出すため、
> CI 実行時間が 1 秒以下・Neon ブランチのコスト・接続数制限・seeding 複雑度すべてを回避できる。
> 既に admin CRUD（14件）が合格済み。残タスクは `/api/ai` プラン別の 1 ファイルのみ。

### 4.1 セットアップ
追加依存なし。Vitest と Next.js の機能のみで完結する。

```bash
# 追加 install 不要。既存の Vitest + next/server で動作する
pnpm test                                                              # 全件
pnpm test -- test/integration/admin-articles.integration.test.ts       # admin CRUD のみ
```

### 4.2 戦略
- Route Handler を `await import('@/app/api/admin/articles/route')` で動的 import
- `vi.mock('@/lib/auth')` で `auth()` の戻り値を切り替え（管理者 / 非管理者 / 未ログイン）
- `vi.mock('@/lib/repositories/articles')` で DB 呼び出しを全て vi.fn() に差替
- `vi.mock('@/lib/ratelimit')` で rate limit を制御（成功 / 429 を自在に切替）
- `new NextRequest(url, { method, headers, body })` で Origin ヘッダー込みのリクエストを生成
- CSRF 違反は `originMismatch: true` ヘルパーで再現

### 4.3 ディレクトリ構造（現状 & 予定）
```
test/integration/
├─ admin-articles.integration.test.ts  ✅ 14 件 PASS（2026-04-20 Rev24）
│    - GET    /api/admin/articles            : 200/meta, 403×2, 400
│    - POST   /api/admin/articles            : 201, 403 CSRF, 400, 429
│    - PUT    /api/admin/articles/:slug      : 200, 404
│    - DELETE /api/admin/articles/:slug      : 200, 404
│    - PATCH  /api/admin/articles/:slug/toggle: 200, 404
├─ ai.api.test.ts                       ⏳ 未作成（H1〜H3・約60分・下記 4.5 参照）
└─ public-articles.api.test.ts          ⏳ 必要に応じて（F1〜F8）
```

### 4.4 モック方針（実装実績）

| モック対象 | 方法 | 理由 |
|---|---|---|
| NextAuth | `vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))` | 各テスト内で `mockResolvedValue({user:{email}})` で管理者／非管理者／null を切替 |
| Repository | `vi.mock('@/lib/repositories/articles')` で CRUD 関数を全て `vi.fn()` に | DB 接続不要・戻り値を fixture で制御 |
| Ratelimit | `vi.mock('@/lib/ratelimit')` で `enforceAdminRateLimit` を切替 | 429 レスポンスを明示的に注入可能 |
| NextRequest | `new NextRequest(url, { method, headers, body })` | `req.nextUrl.searchParams` / `req.json()` / `req.headers.get()` が動作する |

### 4.5 残タスク: `/api/ai` プラン別テスト（H1〜H3・約60分）

必要なモック:
- `vi.mock('@/lib/ai/providers/openrouter')` で `fetchOpenRouter` を SSE 疑似ストリームに置換
- `vi.mock('@/lib/db')` で `users` テーブル SELECT（plan 取得）をモック
- `vi.mock('@/lib/ratelimit')` で free: 30/d・pro: 200/d 相当のトークン数設定

検証ケース:
1. **H1**: 未ログイン → anon 制限 10req/d で 11 回目 429
2. **H2**: free ユーザー → 30req/d で 31 回目 429
3. **H3**: pro ユーザー → 200req/d までストリーム継続

---

## 5. Phase T4: Playwright E2E 手順

### 5.1 セットアップ
```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

### 5.2 主要 E2E シナリオ
1. **ゲスト記事閲覧**: トップ → /learn → 記事詳細 → 戻る
2. **検索**: /learn で検索ボックスに入力 → 結果表示
3. **ロールフィルタ**: /learn?role=papa → papa向け記事のみ表示
4. **新規登録 (Credentials)**: メール登録 → ログイン → /mypage 表示
5. **Google OAuth**: （モックサーバー利用）→ session 発行 → 同アカウント2回目ログインで insert されない
6. **AI チャット (free)**: ログイン → /ai → 送信 → レスポンス表示 → 制限超過で 429 メッセージ
7. **管理画面 CRUD**: 管理者ログイン → 記事新規作成 → 編集 → 公開切替 → 削除
8. **ダブルクリック防止**: 公開切替ボタン連打で1回だけリクエスト
9. **CSRF**: 異オリジンから POST → 403
10. **404 / エラー画面**: 存在しないURL → 404 UI

### 5.3 ディレクトリ構造
```
e2e/
├─ playwright.config.ts
├─ fixtures/
│  ├─ auth.ts          # 管理者ログイン状態を保存
│  └─ articles.ts      # テスト記事シード
├─ guest.spec.ts
├─ auth.spec.ts
├─ ai.spec.ts
└─ admin.spec.ts
```

### 5.4 実行
```bash
pnpm exec playwright test              # ヘッドレス
pnpm exec playwright test --headed     # ブラウザ表示
pnpm exec playwright test --ui         # UI モード
pnpm exec playwright show-report       # HTML レポート
```

---

## 6. CI 統合

### 6.1 GitHub Actions ワークフロー案
`.github/workflows/test.yml`:
```yaml
name: Test
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test --run
      - run: pnpm lint
      - run: pnpm tsc --noEmit
  e2e:
    runs-on: ubuntu-latest
    needs: unit
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm build
      - run: pnpm exec playwright test
```

### 6.2 Vercel プレビューデプロイ連携
- Playwright の `baseURL` を Vercel preview URL に動的設定
- プルリクごとに preview に対して E2E 実行

---

## 7. カバレッジ目標

| 層 | 目標カバレッジ | 優先範囲 |
|---|---|---|
| ユニット | 80%+ | utils / zod / repositories純粋関数 |
| 統合 | 主要API 100% | admin API + public API |
| E2E | 主要10シナリオ | ログイン / 閲覧 / 管理 / AI |

---

## 8. 実施スケジュール案

| Phase | 作業内容 | 見積 | 実施タイミング |
|---|---|---|---|
| T1 | スモークスクリプト作成 | 30分 | **今すぐ** |
| T2 | Vitest 導入 + ユニット初版 | 2〜3時間 | Phase1 残タスクと並行 |
| T3 | API 統合テスト | 3〜4時間 | Rev24 着手前 |
| T4 | Playwright E2E | 4〜6時間 | Rev24 着手前 |
| CI | GitHub Actions 統合 | 1時間 | T2 完了後 |

---

## 9. 成功基準

- [ ] T1 スモーク: 全URL 200/期待ステータスで終了
- [ ] T2 ユニット: 80%+ カバレッジ・CI green
- [ ] T3 統合: 全 API エンドポイントで正常系 + 1件以上の異常系
- [ ] T4 E2E: 主要10シナリオ green
- [ ] CI: push/PR ごとに自動実行・失敗時マージブロック

---

## 10. リスクと対策

| リスク | 対策 |
|---|---|
| Google OAuth 実サーバー依存 | E2E ではモックサーバー or Credentials のみで代替 |
| テスト用 DB のコスト | Neon branch（無料枠）を CI 毎に create/drop |
| Upstash Ratelimit 実呼び出し | メモリフェイクで差し替え |
| Flaky E2E（タイミング） | `expect(...).toHaveText(...)` の awaitable API 使用、`waitForLoadState('networkidle')` |
| 大量画像の重さ | テスト時は `next.config.mjs` で画像最適化スキップ |

---

以上
