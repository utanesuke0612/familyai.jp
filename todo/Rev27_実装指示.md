# Rev27 実装指示書（Claude Agent 向け）

> **作成日**: 2026-04-20
> **対象**: CodingAgent（Claude Agent）
> **背景**: Rev26 で Codex v1 レビュー 11項目を実装後、Codex v2 再レビューで 4項目が「未修正／部分修正」と判明。iOS/Android 着手前（= Rev24 前）の必須解消タスク。
> **合計工数**: 約60分（検証含む）

---

## 📋 全体サマリー

| # | 優先度 | 項目 | 工数 | ファイル |
|---|---|---|---|---|
| ① | 🔴 高 | `shared/api` 契約の二重ラップ解消 | 30分 | `shared/api/index.ts`, `test/unit/shared-api.contract.test.ts`（新規） |
| ② | 🔴 高 | `fetchArticle` 未実装コメントの削除 | 5分 | `shared/api/index.ts` |
| ③ | 🟡 中 | `/og-default.png` 残存参照 2 箇所の解消 | 10分 | `app/(site)/learn/page.tsx`, `app/(site)/learn/[slug]/page.tsx` |
| ④ | 🟢 低 | Windows + OneDrive 運用ノート追記 | 10分 | `README.md` もしくは `todo/system-architecture.md` |
| ✅ | — | 検証（tsc + lint + vitest） | 5分 | — |

---

## ① 🔴 高：`shared/api` 契約の二重ラップ解消

### 問題（実バグ）

**Server 側**（`app/api/articles/route.ts:198`・`app/api/articles/[slug]/route.ts:41` 等）はすべて `{ ok: true, data: T }` 形式で返している。

```ts
// app/api/articles/route.ts:198
return NextResponse.json({ ok: true, data: { items: ..., meta: ... } });
```

**クライアント側**（`shared/api/index.ts:69-70`）は server の JSON を丸ごと受け取ってさらに `{ok, data}` で包んでいる：

```ts
// shared/api/index.ts:69-70
const data: T = await res.json();   // ← ここで { ok, data:{...} } 全体が data に入る
return { ok: true, data };           // ← さらに { ok, data } で包む
```

**結果**：`fetchArticles()` の型は `ApiResponse<PaginatedResult<ArticleSummary>>` だが、実値は二重ネストされて `{ ok: true, data: { ok: true, data: { items, meta } } }` となる。iOS/Android が型を信じて `res.data.items` でアクセスすると runtime undefined。

### 修正内容

`shared/api/index.ts` の `apiFetch<T>()` 関数を、**server の `{ok, data, error}` ラッパーを1枚剥がす**仕様に変更する。

#### 修正対象

**ファイル**: `/Users/junli/CC/familyai.jp/shared/api/index.ts`
**対象行**: L36-79（`apiFetch<T>` 関数全体）

#### 新実装

```ts
/**
 * 型安全な fetch ラッパー。
 * - Content-Type: application/json を自動付与
 * - タイムアウトを AbortController で制御
 * - サーバー側の { ok: true, data: T } / { ok: false, error: {...} } ラッパーを
 *   1枚剥がして ApiResponse<T> で返す（Rev27 #1）
 *
 * サーバ契約:
 *   - 成功: { ok: true,  data: T }
 *   - 失敗: { ok: false, error: { code: string; message: string } }
 *           もしくは { ok: false, error: string }（レガシー）
 */
export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  const { body, timeout = 15_000, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...rest.headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    clearTimeout(timer);

    // ── JSON パース（失敗しても例外にしない）
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      // ignore parse error
    }

    // ── サーバ契約のラッパーを剥がす
    // { ok: boolean; data?: T; error?: {code,message} | string }
    const wrapped = (json ?? {}) as {
      ok?: boolean;
      data?: T;
      error?: { code?: string; message?: string } | string;
    };

    if (!res.ok || wrapped.ok === false) {
      const errObj = wrapped.error;
      const message =
        typeof errObj === 'string'
          ? errObj
          : errObj?.message ?? `HTTP ${res.status}`;
      const code =
        typeof errObj === 'object' ? errObj?.code : undefined;
      return {
        ok:     false,
        error:  message,
        status: res.status,
        ...(code ? { code } : {}),
      };
    }

    // 正常系：{ ok: true, data: T } の data を取り出す
    // ※ レガシー（ラップなし）の場合は json 自体を返す
    if (wrapped.ok === true && 'data' in wrapped) {
      return { ok: true, data: wrapped.data as T };
    }
    return { ok: true, data: json as T };
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'リクエストがタイムアウトしました', code: 'TIMEOUT' };
    }
    const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
    return { ok: false, error: message, code: 'NETWORK_ERROR' };
  }
}
```

### 新規テストファイル

**ファイル**: `/Users/junli/CC/familyai.jp/test/unit/shared-api.contract.test.ts`（新規作成）

```ts
/**
 * test/unit/shared-api.contract.test.ts
 * Rev27 #1: shared/api の apiFetch が server の {ok,data,error} ラッパーを
 * 正しく1枚剥がすことを検証する。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiFetch } from '@/shared/api';

describe('apiFetch contract — Rev27 #1', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('200 { ok: true, data: T } → data が1枚剥がれて返る', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:   true,
      status: 200,
      json: async () => ({ ok: true, data: { items: [{ slug: 'a' }], meta: { page: 1 } } }),
    } as unknown as Response);

    const res = await apiFetch<{ items: Array<{ slug: string }>; meta: { page: number } }>(
      'https://x.test/api/articles',
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      // 二重ネストしていないこと（data.data.items ではなく data.items）
      expect(res.data.items[0].slug).toBe('a');
      expect(res.data.meta.page).toBe(1);
    }
  });

  it('4xx { ok: false, error: { message } } → error に message が入る', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:   false,
      status: 400,
      json: async () => ({
        ok: false,
        error: { code: 'INVALID_PARAMS', message: 'クエリパラメータが不正です。' },
      }),
    } as unknown as Response);

    const res = await apiFetch('https://x.test/api/articles');

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('クエリパラメータが不正です。');
      expect(res.status).toBe(400);
    }
  });

  it('500 + ネットワーク例外 → NETWORK_ERROR', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const res = await apiFetch('https://x.test/api/articles');

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('NETWORK_ERROR');
    }
  });
});
```

### 注意点

- `ApiResponse<T>` の型定義（`shared/types/index.ts` 内）に `code` フィールドがなければ、Rev22 で追加済みか要確認。未定義なら `shared/types/index.ts` 側も一緒に追加する（`code?: string`）。
- `shared/types/index.ts` の `ApiResponse<T>` が `{ok: true, data: T} | {ok: false, error: string, code?: string, status?: number}` であることを前提。違っていたら擬似型ガードで対処。
- **既存呼び出し側**（`AdminArticleTable.tsx` など）は直接 `fetch` を使って自前で `{ok, data}` を剥がしているため、影響なし。`shared/api` を使っているのは現状 iOS 準備の shared レイヤーのみなので、runtime regression は発生しない（テスト追加で担保）。

---

## ② 🔴 高：`fetchArticle` 未実装コメントの削除

### 問題

`shared/api/index.ts:127-131` のコメントが stale。

```ts
/**
 * 記事詳細を取得する。
 *
 * @note Web 版は Drizzle を直接呼ぶ Server Component を使用するため
 *       このエンドポイント（GET /api/articles/:slug）は現在未実装。
 *       iOS アプリ連携（Phase 4）時に app/api/articles/[slug]/route.ts を追加すること。
 */
```

実際は Rev23 #3 で `app/api/articles/[slug]/route.ts`（62行）が実装済み。

### 修正内容

**ファイル**: `/Users/junli/CC/familyai.jp/shared/api/index.ts`
**対象行**: L125-131（JSDoc コメント）

#### 新内容

```ts
/**
 * 記事詳細を取得する。
 *
 * @note Web 版の Server Component は `lib/repositories/articles.ts` の
 *       `getArticle()` を直呼びするため、このエンドポイントは主に
 *       iOS/Android モバイルクライアントおよび外部クライアント用（Rev23 #3 で実装済み・
 *       `app/api/articles/[slug]/route.ts`）。
 *       サーバは `{ ok: true, data: Article }` 形式で返し、`apiFetch` が剥がす。
 */
```

---

## ③ 🟡 中：`/og-default.png` 残存参照 2 箇所の解消

### 問題

Rev26 #4 で `app/layout.tsx` のメタデータは Next.js 14 規約（`app/opengraph-image.tsx` / `app/icon.tsx` / `app/manifest.ts`）に移行済み。しかし以下2箇所がまだ `/og-default.png` をハードコードしており、`public/og-default.png` は存在しないため本番で 404 を返す。

### 修正内容 (a)：`app/(site)/learn/page.tsx`

**ファイル**: `/Users/junli/CC/familyai.jp/app/(site)/learn/page.tsx`
**対象行**: L28-37（`metadata` の `openGraph.images`）

#### 修正前

```ts
export const metadata: Metadata = {
  title:       '記事一覧 | familyai.jp',
  description: 'パパ・ママ・子ども・シニアのためのAI活用ガイド。ChatGPT・Claude・Geminiなど、家族全員が使えるAI記事を厳選してお届けします。',
  openGraph: {
    title:       '記事一覧 | familyai.jp',
    description: 'パパ・ママ・子ども・シニアのためのAI活用ガイド。',
    url:         'https://familyai.jp/learn',
    images:      [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
};
```

#### 修正後

```ts
export const metadata: Metadata = {
  title:       '記事一覧 | familyai.jp',
  description: 'パパ・ママ・子ども・シニアのためのAI活用ガイド。ChatGPT・Claude・Geminiなど、家族全員が使えるAI記事を厳選してお届けします。',
  openGraph: {
    title:       '記事一覧 | familyai.jp',
    description: 'パパ・ママ・子ども・シニアのためのAI活用ガイド。',
    url:         'https://familyai.jp/learn',
    // images は指定しない → ルート `app/opengraph-image.tsx` が自動継承される（Next.js 14 規約・Rev27 #3）
  },
};
```

### 修正内容 (b)：`app/(site)/learn/[slug]/page.tsx`

**ファイル**: `/Users/junli/CC/familyai.jp/app/(site)/learn/[slug]/page.tsx`
**対象行**: L145（JSON-LD の `image` フィールド）

#### 修正前

```ts
image:      article.thumbnailUrl ?? `${SITE.url}/og-default.png`,
```

#### 修正後

```ts
// Rev27 #3: /og-default.png は存在しないため、Next.js 14 の動的 OGP
// エンドポイント（app/opengraph-image.tsx → /opengraph-image）を使用する
image:      article.thumbnailUrl ?? `${SITE.url}/opengraph-image`,
```

### 検証

- 修正後、ブラウザで `/learn` を開き HTML ソースを確認して `og:image` が `https://familyai.jp/opengraph-image`（もしくは記事 thumbnail）になっていること。
- `curl -I https://familyai.jp/opengraph-image` で 200 を返すこと（本番検証時）。

---

## ④ 🟢 低：Windows + OneDrive 運用ノート追記

### 問題

Codex レビュアーの環境（`C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp`）で `pnpm install` が失敗し、`gray-matter` / `vitest` の解決ができない。OneDrive 同期中のシンボリックリンク処理と Windows 長パス（260文字制限）の複合問題と推定。macOS 環境および GitHub Actions (Ubuntu) では正常動作するためコード側の問題ではない。

### 修正内容

**ファイル**: `/Users/junli/CC/familyai.jp/README.md`（なければ新規作成）

#### 追加セクション

`README.md` の末尾（もしくは「開発環境セットアップ」セクションの末尾）に以下を追記：

```markdown
### 🪟 Windows 開発者向け注意

**OneDrive 同期フォルダ配下では `pnpm install` が失敗する場合があります。**

症状:
- `gray-matter` / `vitest` など pnpm の symlink ベース依存解決が失敗する
- `npx tsc --noEmit` が型解決エラーで止まる

原因:
- OneDrive の on-demand sync が node_modules 内のシンボリックリンクを一時ファイル化する
- Windows の長パス制限（260文字）にも抵触する

対応:
```bash
# NG: OneDrive 配下
C:\Users\<user>\OneDrive-Company\projects\familyai.jp

# OK: OneDrive の外
C:\dev\familyai.jp
```

`C:\dev` などに clone し直してから `pnpm install` してください。
```

---

## ✅ 最終検証（必須）

すべての修正完了後、以下を順番に実行し、全てエラー 0 件であることを確認：

```bash
# 1. 型チェック
npx tsc --noEmit
# 期待: EXIT=0・出力なし

# 2. ESLint
npm run lint
# 期待: ✔ No ESLint warnings or errors

# 3. Vitest（Rev27 #1 の新規テスト含めて全件 PASS）
pnpm test
# 期待: 既存43テスト + 新規3テスト = 46 テスト PASS
```

### 失敗した場合の対応

- **tsc エラー**: `ApiResponse<T>` の型定義を `shared/types/index.ts` で確認。`code?: string` と `status?: number` が含まれているか。
- **lint エラー**: `@typescript-eslint/no-unused-vars` は `_` プレフィックス追加もしくは comment disable で対応。
- **vitest エラー**: `import { apiFetch } from '@/shared/api';` のパスエイリアスが `vitest.config.ts` で解決されているか確認。解決されていない場合は `import { apiFetch } from '../../shared/api';` に変更。

---

## 📝 コミットメッセージ（想定）

```
Rev27: Codex v2 再レビューで判明した shared/api 契約バグほか 4 点を修正

Rev26 実装後の Codex 再レビュー（v2）で指摘された未解消項目を解消。
iOS/Android 着手前（Phase 4・Rev24 前）の必須作業。

【高優先度 2件】
- #1 shared/api 二重ラップ解消：apiFetch<T>() が server の {ok, data, error}
     ラッパーを1枚剥がす仕様に変更。fetchArticles / fetchArticle の実値が
     {ok:true, data:{ok:true, data:{...}}} と二重化していた実バグを解消。
     test/unit/shared-api.contract.test.ts に 3 ケース追加（200/4xx/network）
- #2 fetchArticle の JSDoc を更新：Rev23 #3 で /api/articles/[slug] 実装済み

【中優先度 1件】
- #3 /og-default.png 残存参照 2 箇所を解消：
  - app/(site)/learn/page.tsx の openGraph.images を削除
    （ルート opengraph-image.tsx が自動継承される Next.js 14 規約）
  - app/(site)/learn/[slug]/page.tsx の JSON-LD image フォールバックを
    /og-default.png → /opengraph-image に変更

【低優先度 1件・ドキュメント】
- #4 README.md に Windows + OneDrive 配下での pnpm install 失敗対策を追記

【検証】
- npx tsc --noEmit         → EXIT=0
- npm run lint             → 0 warnings / 0 errors
- pnpm test                → 46/46 PASS（既存 43 + 新規 3）

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 🎯 完了条件（Definition of Done）

- [ ] `shared/api/index.ts` の `apiFetch<T>` が `{ok,data,error}` ラッパーを剥がす形に書き換わっている
- [ ] `test/unit/shared-api.contract.test.ts` が新規追加されている（3 テスト）
- [ ] `shared/api/index.ts:127-131` の stale コメントが更新されている
- [ ] `app/(site)/learn/page.tsx` の `openGraph.images` が削除されている
- [ ] `app/(site)/learn/[slug]/page.tsx` の JSON-LD `image` が `/opengraph-image` フォールバックに変更されている
- [ ] `README.md` に Windows + OneDrive 運用ノートが追記されている
- [ ] `npx tsc --noEmit` → EXIT=0
- [ ] `npm run lint` → 0 件
- [ ] `pnpm test` → 46/46 PASS
- [ ] `todo/familyai_coding_agent_v5.md` の Rev27 行のステータスを `⏳未着手` → `✅完了` に更新
- [ ] 実装ファイル・行番号・検証ログを Rev27 行に追記（Rev26 と同じ体裁）

---

以上。**不明点があれば実装前に Claude（レビュー担当）に質問してから着手すること。**
