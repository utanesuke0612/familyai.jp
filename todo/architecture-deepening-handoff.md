# Architecture Deepening Handoff — familyai.jp

## Codex確認コメント（2026-05-15）

このレビュー結果は、全体として **70〜80%程度は妥当** と判断します。ただし、これはバグ修正レビューではなく、アーキテクチャ改善・中長期リファクタ計画として扱うべき内容です。別AI Agentへ渡す場合は、この文書だけで優先順位を上書きせず、既存のSecurity / UI / 不要物整理レビューのP1/P2指摘を先に扱ってください。

特に妥当性が高い候補は、`Candidate #1 Admin Route Protection`、`Candidate #2 Article List Duplicate`、`Candidate #4 AI Router Feature分離`、`Candidate #6 Rate Limit統合` です。これらは現コード上でも重複・責務漏れ・エラー形式のdriftが確認でき、段階的に実装する価値があります。

一方で、`Candidate #3 MappersをRepositoriesに内包` は「公開GET API向けRepositoryはDTOを返す」程度に限定するのが安全です。mapperを完全削除する必要はなく、内部純関数として残して構いません。Admin編集系や内部処理ではDB rowを返す方が自然な場面があります。

`Candidate #5 VOA Lesson Session Module` は方向性は理解できますが、提案範囲が大きく退行リスクも高いです。いきなり全store / API / UI状態を統合せず、まずは `LessonProvider` など読み取り・状態共有の薄い段階導入に留めるべきです。全面実装は別PRまたは別Phaseで扱ってください。

この文書では、以前の重要指摘である 3D admin限定ページと公開APIの不整合、3D metadataの認可漏れ、ArticleBodyの任意HTTPS iframe許可、AI風UI・レイアウト改善、`next.config.mjs` の旧アニメーション設定、同期API clientの先頭200件問題などは十分に扱われていません。したがって、本ドキュメントはそれらの代替ではなく、追加のアーキテクチャ改善候補として位置づけます。

推奨実装順序は、まず既存P1/P2のSecurity/UI指摘を解消し、その後この文書の中では `#1 → #6 → #2/#3の小範囲 → #4 → #5検討のみ` の順です。各候補は小さくコミットし、`npm run lint`、`npx tsc --noEmit`、`npm test`、可能なら `npm run build` を必ず確認してください。

> 別エージェントがこの 1 ファイルだけで「判断 → 実装」まで進められるように、
> `/Users/junli/.agents/skills/improve-codebase-architecture/` の SKILL に沿って
> familyai.jp のソースコードを精査した結果をまとめたものです。
>
> 作成日: 2026-05-15 / 対象 commit ベース: `bebd586` 周辺
> Skill 参照: `SKILL.md` / `DEEPENING.md` / `INTERFACE-DESIGN.md` / `LANGUAGE.md`

---

## 0. 用語（Glossary）— 全候補で厳守

- **Module**: interface と implementation を持つ単位（関数 / クラス / パッケージ / 縦割りスライス）
- **Interface**: caller が正しく使うために知るべき全て — 型 / 不変条件 / 順序 / エラーモード / 必須設定
- **Implementation**: Module の中身
- **Depth**: interface あたりのレバレッジ。**Deep** = 小さい interface で大量のふるまいを内包
- **Seam**: interface の置き場所。書き換えなしで挙動を差し替えられる位置
- **Adapter**: seam で interface を満たす具体物
- **Leverage**: caller が depth から得る価値
- **Locality**: maintainer が depth から得る価値（変更 / バグ / 知識の集中）
- **Deletion test**: 「この Module を消したら complexity はどうなる？」消える=pass-through だった。N 箇所に再出現=earning its keep。
- **Interface is the test surface**: caller も test も同じ seam を超える。
- **1 adapter = 仮の seam / 2 adapter = 本物の seam**

ドメイン語彙（CONTEXT.md は未整備のため、コード内で実際に使われる語を採用）:
**Article / Tutor3d Model / Lesson / Sentence Bookmark / Vocab Bookmark / AI Echo / AI Chat Config / Lesson Progress**

---

## 1. 共通の重要観察 — 「深いリポジトリ」と「浅いリポジトリ」が同居している

リファクタの方向を決定づける**最重要観察**:

| Module | 戻り値 | mapper の呼び出し位置 | 形 |
|---|---|---|---|
| `lib/repositories/3d-models.ts` | DTO (`Tutor3dModelSummary`, `Tutor3dModel`) | **repository 内部** (L54, L64, L162, L196, L276) | **Deep（理想形）** |
| `lib/repositories/articles.ts` | 生 row (`ArticleRow`) | **caller (route) 側** で 7 route が個別に | **Shallow** |
| `lib/repositories/lessons-progress.ts` | 生 row (`LessonProgressRow`) | mapper 自体が存在しない | Shallow |
| `lib/repositories/ai-echo.ts` | 生 row | mapper 自体が存在しない | Shallow |

→ **同じ codebase 内に既に「深い形」の前例（3d-models）がある**。Candidate #3 はその形を articles 系・lessons-progress 系・ai-echo 系にコピーするだけで完結する。新規設計を起こす必要はない。

候補 #3 はその他の候補（特に #2）の前提になります。**実装順序の推奨は §10 を参照**。

---

## 2. Candidate #1 — Admin Route Protection（CSRF + Auth + Ratelimit）

### 2.1 現状

#### Module / 関連ファイル

```
lib/admin-auth.ts          (48L)  — requireAdmin()
lib/csrf.ts                (44L)  — verifyCsrf()
lib/ratelimit.ts           (126L) — enforceAdminRateLimit(), rateLimitedResponse()
```

#### 呼び出し側（route 8 ファイル）

```
app/api/admin/articles/route.ts                     GET=Auth only / POST=三和音
app/api/admin/articles/[slug]/route.ts              PATCH/DELETE=三和音
app/api/admin/articles/[slug]/toggle/route.ts       三和音
app/api/admin/3d-models/route.ts                    GET=Auth only / POST=三和音
app/api/admin/3d-models/[slug]/route.ts             三和音
app/api/admin/3d-models/upload-token/route.ts       三和音
app/api/admin/ai-config/route.ts                    GET=Auth only / POST/DELETE=三和音
app/api/admin/users/route.ts                        Auth only
```

#### Friction の現物（`app/api/admin/articles/route.ts:52-65`）

```ts
export async function POST(req: NextRequest) {
  const log = withRequest(req, '/api/admin/articles');
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 });
  }
  const check = await requireAdmin();
  if (!check.ok) return check.response;
  const rl = await enforceAdminRateLimit(req, 'admin');
  if (rl) return rl;
  // ...
}
```

8 ルートで同型のコピペ。**さらにエラーボディの形が drift**:

- `requireAdmin` の reject: `{ error: '管理者権限が必要です' }` （`admin-auth.ts:41`）
- `verifyCsrf` 失敗: `{ error: 'CSRF check failed' }` （route が手書き）
- `enforceAdminRateLimit` 失敗: `{ ok: false, error: { code: 'RATE_LIMIT_EXCEEDED', message } }` （`ratelimit.ts:88-95`）

→ 3 つのうち 1 つだけが `{ ok: false, error: {...} }` の新形式、残り 2 つは旧形式の素朴 `{ error }`。

#### Deletion test

3 つの helper を消す → 8 route に同じガード 5 行が再出現する → **earning its keep**。
ただし「3 つを別 Module に切り出した状態」は浅い: caller が順序とエラー形を知る必要がある。
**統合した 1 つの deep Module に置き換える**のが正解。

### 2.2 依存カテゴリ

- 全て **in-process**（`auth()` は NextAuth セッション読み取り = 同プロセスの Cookie / JWT パース）
- Upstash Redis は **local-substitutable**（`isRateLimitFailClosed` の null フォールバックがすでに dev/test の seam として機能）

→ 新規 adapter 不要。in-process で単純に統合できる。

### 2.3 既存の前例（このプロジェクト内）

なし。新規 Module を作る。

### 2.4 Interface 案（3 つ、INTERFACE-DESIGN.md パターン）

#### 案 A — Higher-order handler（Minimize interface / 推奨）

```ts
// lib/api/admin-guard.ts （新規・~80L 想定）
type AdminContext = { adminEmail: string };

export function protectAdminRoute<TArgs extends unknown[]>(
  handler: (req: NextRequest, ctx: AdminContext, ...args: TArgs) => Promise<Response>,
  opts: {
    requireCsrf?:      boolean;   // default: true for POST/PATCH/PUT/DELETE
    requireRateLimit?: boolean;   // default: true for POST/PATCH/PUT/DELETE
    identity?:         string;    // default: 'admin'
  } = {},
): (req: NextRequest, ...args: TArgs) => Promise<Response>;
```

使い方:
```ts
// app/api/admin/articles/route.ts
export const POST = protectAdminRoute(async (req, ctx) => {
  const body = await req.json();
  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);
  const article = await createArticle({ ...parsed.data, viewCount: 0 });
  return NextResponse.json({ ok: true, data: article }, { status: 201 });
});

export const GET = protectAdminRoute(async (req) => { /* ... */ }, {
  requireCsrf: false, requireRateLimit: false,
});
```

**Trade-off**: interface 1 つ・実装最小。HTTP method からの自動推定 (GET=read, POST=write) を opts で制御。
**Leverage**: 8 route が body ロジックだけに専念できる。

#### 案 B — Builder（Maximize flexibility）

```ts
adminRoute()
  .csrf()
  .rateLimit('admin', 10, '1m')
  .auth()
  .handle(async (req, ctx) => { /* ... */ });
```

**Trade-off**: 柔軟だが浅い（caller が順序を組み立てる = interface に invariants がない）。**推奨しない**（採用すると今と本質的に変わらない）。

#### 案 C — Decorator chain（Optimize for default case）

```ts
export const POST = withAdmin(withCsrf(withRateLimit(async (req, ctx) => { /* ... */ })));
```

**Trade-off**: composable だが順序が caller の責務に残る → 案 A より浅い。

### 2.5 推奨

**案 A**。HTTP method ヒューリスティック (`req.method` を見る) でデフォルト動作を固定し、必要時のみ opts で override。エラーレスポンスは `lib/api/error-response.ts` （新規 or 既存の `errorResponse` を昇格）に統一する。

### 2.6 移行手順

1. `lib/api/admin-guard.ts` を新規作成し `protectAdminRoute` を export
2. `lib/api/error-response.ts` を新規作成し、`{ ok: false, error: { code, message } }` 形式を統一形として export
3. `requireAdmin` / `verifyCsrf` / `enforceAdminRateLimit` のエラー応答を新形式に揃える（**互換性確認**: クライアント側で `error.code` を見ているコードがあれば壊さない）
4. route を 1 ファイルずつ書き換え（8 ファイル・各 5–10 行減）
5. 古い `requireAdmin / verifyCsrf / enforceAdminRateLimit` の export 自体は残し、deprecated コメントを付ける（将来削除）

### 2.7 テスト戦略

- 新規: `lib/api/__tests__/admin-guard.test.ts` — Interface に対する契約テスト
  - admin でない → 403 + 新形式 error
  - CSRF 不正 → 403
  - rate limit 超過 → 429
  - 全てクリア → handler に渡る
  - GET と POST のデフォルト挙動の差
- 各 route の重複ガードテストは削除（**replace, don't layer** — DEEPENING.md §Testing strategy）

### 2.8 互換性リスク / Invariants

- ⚠️ **rate-limit key**: 現状 `'admin' + ':' + IP` （`ratelimit.ts:121`）。仕様維持必須。
- ⚠️ **CSRF localhost 例外**: `csrf.ts:32-39` の `localhost` / `127.0.0.1` 完全一致ロジック（`localhost.attacker.com` バイパス防止）を必ず継承
- ⚠️ **Fail-closed**: `isRateLimitFailClosed()` の振る舞いを保つ。`production && Redis 未設定 → 429`、`dev/test && Redis 未設定 → スキップ`

### 2.9 Open questions（実装者へ）

- 既存 client が `{ error: '...' }` 旧形式を期待していないか？ `/admin/*` 配下の fetch 呼び出しで `data.error` を文字列として読んでいる箇所を grep して確認すべし: `grep -rn "\.error" app/admin components/admin`

---

## 3. Candidate #2 — Article List Duplicate（route が repo を bypass している）

### 3.1 現状

#### Module / 関連ファイル

```
lib/repositories/articles.ts        L138-201  — getArticleList(filter, pagination)
app/api/articles/route.ts           L82-219   — ほぼ同一の query を再実装
lib/mappers/articles.ts             L66       — toArticleSummary
```

#### Friction の現物

```ts
// lib/repositories/articles.ts:148-191（repo 側・正本）
const conditions = [eq(articles.published, true)];
if (categories.length > 0) {
  const catConditions = categories.map(
    (c) => sql`${articles.categories} @> ARRAY[${c}]::text[]`,
  );
  conditions.push(catConditions.length === 1 ? catConditions[0]! : or(...catConditions)!);
}
// ... level / search も同様
const [items, countRows] = await Promise.all([
  db.select().from(articles).where(whereClause).orderBy(orderByClause).limit(pageSize).offset(offset),
  db.select({ total: count() }).from(articles).where(whereClause),
]);
```

```ts
// app/api/articles/route.ts:131-180（route 側・同型の重複実装）
const conditions = [eq(articles.published, true)];
if (cat && cat.length > 0) {
  const catConditions = cat.map((c) => sql`${articles.categories} @> ARRAY[${c}]::text[]`);
  conditions.push(catConditions.length === 1 ? catConditions[0]! : or(...catConditions)!);
}
// ... level / search も同様
const [countResult, rows] = await Promise.all([
  db.select({ total: count() }).from(articles).where(where).then((r) => r[0]?.total ?? 0),
  db.select(SELECT_FIELDS).from(articles).where(where).orderBy(orderBy).limit(limit).offset(offset),
]);
const res = NextResponse.json({ ok: true, data: { items: rows.map(toArticleSummary), meta } });
```

#### Deletion test

route 側 inline ロジックを消す → `getArticleList` を呼ぶだけになる → complexity は移動せず**消える**。
**pass-through だった**。

### 3.2 依存カテゴリ

- **In-process** （Drizzle DB セッション）。adapter 不要。

### 3.3 違い（route 側にだけある責務）

1. クエリパラメータのパース（`searchParams`）
2. レスポンスの `meta` 形式（`hasNext / hasPrev` を含む）
3. `Cache-Control` ヘッダ（CDN キャッシュ 60s）
4. DTO 変換（`toArticleSummary`）— Candidate #3 で repo に内包される予定

→ 1 / 2 / 3 のみ route に残し、4 と DB アクセスは repo に集約する。

### 3.4 提案（Interface 案は単一・自明なので案は出さない）

```ts
// lib/repositories/articles.ts （既存関数の戻り値を DTO に変更）
export interface ArticleListResult {
  items:      ArticleSummary[];  // ← 現在は ArticleRow[]
  total:      number;
  totalPages: number;
}
export async function getArticleList(
  filter:     ArticleListFilter,
  pagination: ArticleListPagination,
): Promise<ArticleListResult>;
```

```ts
// app/api/articles/route.ts （簡素化後・想定）
export async function GET(req: NextRequest) {
  const parsed = articlesQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return badRequest(parsed.error);
  const { cat, level, page, limit, sort, search } = parsed.data;

  const result = await getArticleList(
    { categories: cat, level, sort, search },
    { page, pageSize: limit },
  );
  const total = result.total;
  const res = NextResponse.json({
    ok: true,
    data: {
      items: result.items,
      meta: { page, perPage: limit, total, totalPages: result.totalPages,
              hasNext: page < result.totalPages, hasPrev: page > 1 },
    },
  });
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  return res;
}
```

### 3.5 移行手順

1. Candidate #3 を先に実施し `getArticleList` の戻り値型を `ArticleListResult { items: ArticleSummary[] }` に変更
2. route から query 構築コード（L82–180 のほとんど）を削除し、`getArticleList` を呼ぶだけにする
3. `SELECT_FIELDS` 定数（route 内で定義されたカラム列挙）を削除
4. route 内の `escapeLike` import を削除（不要になる）

### 3.6 テスト戦略

- 既存: `lib/repositories/__tests__/articles.test.ts` — `getArticleList` の query テストは継続
- 新規: route 側は HTTP I/O テスト（`meta` 形式 / `Cache-Control` ヘッダ）に絞る
- **削除**: route 内の query を直接検証するテスト（あれば）

### 3.7 互換性リスク

- ⚠️ **API レスポンス形は不変**（`{ items, meta: {...} }`）。**外部クライアント（iOS/Android）の契約**。回帰必須。
- ⚠️ **CDN キャッシュヘッダ**を route 側に残す。
- ⚠️ `escapeLike` ロジックの完全一致（`/[\\%_]/g`）を repo 側で維持。

### 3.8 Open questions

- repo 側 `getArticleList` は **全カラム select**（`db.select()` のみ）、route 側は **SELECT_FIELDS で絞っている**。パフォーマンス目的で route が body を除外しているなら、repo 側にも `select` 列指定を導入すべき（または `body` を別関数に分離）。要パフォーマンス計測。

---

## 4. Candidate #3 — Mappers を Repositories に内包する

### 4.1 現状

#### Module / 関連ファイル

```
lib/mappers/articles.ts             (88L)  — toArticleSummary, toArticleDetail
lib/mappers/3d-models.ts            (50L)  — toTutor3dModelSummary, toTutor3dModelDetail
lib/mappers/sentence-bookmarks.ts   (42L)  — toSentenceBookmarkItem
lib/mappers/vocab-bookmarks.ts      (36L)  — toVocabItem
lib/mappers/ai-memos.ts             (30L)  — toAiMemoItem
```

#### Mapper import が散らばっている route（7 件）

```
app/api/articles/route.ts                       toArticleSummary
app/api/articles/[slug]/route.ts                toArticleDetail
app/api/articles/[slug]/related/route.ts        toArticleSummary
app/api/articles/latest/route.ts                toArticleSummary
app/api/user/sentence-bookmarks/route.ts        toSentenceBookmarkItem
app/api/user/vocab-bookmarks/route.ts           toVocabItem
app/api/user/ai-memos/route.ts                  toAiMemoItem
```

#### 既存の前例（深い形）

```ts
// lib/repositories/3d-models.ts:42-54  ★ 既に内包されている ★
export async function listPublishedModels(opts): Promise<Tutor3dModelSummary[]> {
  const rows = await db.select().from(tutor3dModels)...;
  return rows.map(toTutor3dModelSummary);   // ← repository 内部で mapper を適用
}
```

route は `repository → DTO` を 1 ステップで受け取り、`.map(toX)` を書かない。

#### Friction の現物（articles 系の route）

```ts
// app/api/articles/latest/route.ts
const rows = await getLatestArticles(10);
return NextResponse.json({ ok: true, data: { items: rows.map(toArticleSummary) } });
//                                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^
// 同じパターンが 4 route で繰り返される。mapper を呼び忘れた route があれば
// shared/types 契約違反のレスポンスが流出する。
```

#### Deletion test

mapper module を消す → 純関数を repository 内の private 関数として吸収できる → **complexity は消える**（移動しない）。
mapper 自体は test しやすい純関数だが、それは repository の **internal seam**（test 用）で十分。external interface に出す必要はない。

### 4.2 依存カテゴリ

- **In-process**（純関数）。

### 4.3 提案

すべての repository を「DTO を返す」形に揃える:

| Repository | 現状の戻り値 | 目標の戻り値 |
|---|---|---|
| `articles.ts` (`getArticleList`, `getLatestArticles`, `getArticle`, `getRelatedArticles`) | `ArticleRow` / 配列 | `ArticleSummary` / `Article` / 配列 |
| `lessons-progress.ts` | `LessonProgressRow` | `LessonProgressDto`（新規 mapper or 純データのまま） |
| `ai-echo.ts` | `AiEchoEntry` 生 row | `AiEchoEntryDto` |

**ただし注意**: admin route（書き込み系）は **DB schema 型（row 型）** を直接扱う方が便利な場合がある（`createArticle` の戻り値で更新後の row が欲しい等）。**公開 API（GET）= DTO を返す**、**内部書き込み = row を返す**、の二系統で良い。3d-models repo がすでにこの折衷を採用している。

### 4.4 移行手順

ファイル単位で進める。1 ファイルずつコミット推奨。

1. **articles.ts**:
   - `ArticleListResult.items` を `ArticleSummary[]` に変更
   - `getArticleList` / `getLatestArticles` / `getRelatedArticles` 内で `rows.map(toArticleSummary)` を呼ぶ
   - `getArticle(slug)` の戻り値を `Article | null` に変更し `toArticleDetail` を呼ぶ
   - route 側から `import { toArticleSummary, toArticleDetail }` を削除
2. **sentence-bookmarks / vocab-bookmarks / ai-memos** の repository が無いため、新規作成 or 既存 store 側でカプセル化（→ Candidate #5 と統合される）
3. mapper ファイルは**まだ削除しない**（client 側 `useVocabBookmark` 等が直接 import している可能性 — grep で確認）

### 4.5 テスト戦略

- **mapper 単体テストは internal seam として保持**（純関数で書きやすい）
- **新規 repository interface テスト**を追加し、「DTO の形が壊れていない」を検証
- route テストは body の形を見るだけで十分（mapper の中身は知らなくて良い）

### 4.6 互換性リスク

- ⚠️ **iOS/Android shared client の DTO 契約**（`shared/types`）を変更しない。`toX` 関数の出力形は不変が保証されている (これらは shared/types を import している) ので、内包しても契約は破れない。
- ⚠️ **`toArticleDetail` 内の `estimateReadingMin(body)` 副作用**（mapper 内で計算）を継承。

### 4.7 Open questions

- `lib/mappers/sentence-bookmarks.ts` / `vocab-bookmarks.ts` / `ai-memos.ts` の row 型は `lib/db/schema.ts` の inferSelect 由来か、route 内で手書きしているか? → `app/api/user/sentence-bookmarks/route.ts` 等を読んで row 構築箇所を確認。同期処理の seam が repository に切り出されていない可能性。

---

## 5. Candidate #4 — AI Router を Feature まで内包する

### 5.1 現状

#### Module / 関連ファイル

```
lib/ai/router.ts                  (170L)  — routeAI, streamByModelId, completeByModelId,
                                            buildArticleSystemPrompt
lib/ai/ai-echo-prompt.ts          (106L)  — buildAiEchoSystemPrompt
lib/ai/provider-registry.ts       (102L)
lib/ai/providers/openrouter.ts    (216L)
lib/ai/providers/openrouter-tts.ts (62L)
lib/ai/providers/openai-compatible.ts (179L)
app/api/ai/route.ts               (268L)  — feature 分岐が route に漏れている
```

#### Friction の現物

```ts
// app/api/ai/route.ts:204-217  — system prompt の分岐が route 側にある
const systemContent = feature === 'ai-echo' && level
  ? buildAiEchoSystemPrompt(level, lessonContext)
  : buildArticleSystemPrompt({ articleTitle, articleExcerpt, lessonContext });

const fullMessages = [
  { role: 'system' as const, content: systemContent },
  ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
];

// L229-231: type の対応有無も route 側で判断
if (type !== 'text-simple' && type !== 'text-quality' && type !== 'math-reasoning') {
  clearTimeout(timeoutId);
  return errorResponse('UNSUPPORTED_TYPE', 'このAI機能は現在準備中です。', 400);
}

const stream = await routeAI(type, fullMessages, { signal: ac.signal });
```

**Caller の責務として漏れているもの**:
1. feature とそれに対応する system prompt の選択
2. `type` がストリーミング対応か非対応か（`transcribe / image-gen / tts-japanese` の振り分け）
3. messages 配列の組み立て（system を先頭に挿入する規約）

#### Deletion test

`routeAI` を消す → モデル選択 / downgrade / admin override が route に再出現 → earning its keep。
ただし**現状は半分の interface**。feature 分岐を内包すれば完全 deep に。

### 5.2 依存カテゴリ

- **Remote but owned** (OpenRouter / DeepSeek / Qwen はサードパーティ API だが、router は既に provider 抽象を持つ)
- 既に `streamOpenRouter` / `streamOpenAICompat` が **adapter 2 つ**を構成しており、seam は本物
- AI config 取得 (`getAiChatConfig`) は **in-process**（DB→Drizzle）

→ adapter 構造は変えない。interface だけ拡張する。

### 5.3 Interface 案（3 つ、INTERFACE-DESIGN.md パターン）

#### 案 A — Feature-first API（推奨・Minimize interface）

```ts
// lib/ai/router.ts （拡張後）
type AiFeature =
  | { kind: 'article-chat';     articleTitle?: string; articleExcerpt?: string;
                                 lessonContext?: string; messages: UserMessage[] }
  | { kind: 'ai-echo';          level: 1|2|3; lessonContext?: string; userInput: string }
  | { kind: 'aictation-chat';   lessonContext: string; messages: UserMessage[] };

export interface AiStreamOptions {
  signal?:         AbortSignal;
  allowDowngrade?: boolean;
}

export async function streamAiFeature(
  feature: AiFeature,
  options: AiStreamOptions = {},
): Promise<ReadableStream<Uint8Array>>;
```

Implementation 内:
- feature.kind に応じて prompt builder を選択
- `type`（'text-simple' / 'text-quality' / 'math-reasoning'）の決定もここ
- messages の組み立て（system 先頭挿入）もここ
- 既存 `routeAI(type, messages, options)` を private 化（後方互換のために stay でも可）

#### 案 B — Plugin registry（Maximize flexibility）

```ts
registerAiFeature('ai-echo', { type: 'text-quality', buildPrompt: (input) => ... });
const stream = await streamAiFeature('ai-echo', input, { signal });
```

**Trade-off**: 動的拡張に強いが、prompt builder が外部に露出（caller が feature 仕様を知る）→ 浅い。

#### 案 C — 既存 routeAI を keep + 薄いラッパー（Optimize for migration）

```ts
export async function streamArticleChat(opts: { articleTitle?, ..., messages }): Promise<Stream>;
export async function streamAiEcho(opts: { level, lessonScript, userInput }): Promise<Stream>;
```

**Trade-off**: 各 feature が独立関数。caller は feature 単位で呼ぶだけ。route の if/else が消える。
**案 A より分かりやすく、案 B より深い。実装も最小。**

### 5.4 推奨

**案 C** をベースに、**案 A の判別 union 型**を内部表現として持つハイブリッド。

```ts
// 公開 interface
export async function streamArticleChat(opts: ArticleChatInput, options?: AiStreamOptions): Promise<ReadableStream<Uint8Array>>;
export async function streamAiEcho(opts: AiEchoInput, options?: AiStreamOptions): Promise<ReadableStream<Uint8Array>>;

// 共通実装
async function streamForFeature(feature: AiFeature, options: AiStreamOptions): Promise<ReadableStream<Uint8Array>>;
```

route 側:
```ts
// app/api/ai/route.ts (簡素化後)
const stream = feature === 'ai-echo' && level !== null
  ? await streamAiEcho({ level, lessonScript: lessonContext, userInput: messages[messages.length-1].content }, { signal: ac.signal })
  : await streamArticleChat({ articleTitle, articleExcerpt, lessonContext, messages }, { signal: ac.signal });
```

route の if/else は最後の 2 行のみに圧縮。

### 5.5 移行手順

1. `lib/ai/router.ts` に `streamArticleChat`, `streamAiEcho` を追加
2. 内部で既存 `buildArticleSystemPrompt` / `buildAiEchoSystemPrompt` を呼ぶ
3. system prompt の `slice(0, 8000)` 等の invariants を Implementation に保持
4. route から `buildArticleSystemPrompt` / `buildAiEchoSystemPrompt` の import を削除
5. `routeAI` は private 化 or `@deprecated` 化

### 5.6 テスト戦略

- 新規: `lib/ai/__tests__/router.test.ts`
  - feature 単位の prompt 構成（lessonContext truncation 含む）
  - admin override が効く / 効かない条件
  - downgrade が `text-quality → text-simple` で発火する条件
- 削除: route 側で prompt 構築をスタブして検証していたテスト

### 5.7 互換性リスク

- ⚠️ **system prompt の文面は厳格に保つ**（`ai-echo-prompt.ts` のフォーマット指定はモデル出力に強い影響あり）
- ⚠️ **AI Chat config の admin override 仕様**（`AI_CHAT_DEFAULTS` と異なる時のみ override）を保つ
- ⚠️ **コスト超過ダウングレード**（`allowDowngrade=true && type==='text-quality' → 'text-simple'`）の閾値ロジックを継承
- ⚠️ **OpenRouter ↔ OpenAI-compatible provider 切り替え**は `findAiModel(modelId).provider` 経由。既存 adapter 構造は変えない。

### 5.8 Open questions

- `transcribe / image-gen / tts-japanese` は未実装で route が UNSUPPORTED_TYPE を返す。これらも feature として interface に含めるか? → 含めるなら implementation 側で `throw new UnsupportedFeatureError()` を出し、route が translate する形が clean。

---

## 6. Candidate #5 — VOA に Lesson Session Module を導入

### 6.1 現状

これは**最大の depth gain** だが、**最大の範囲**でもあります。段階移行が必須。

#### Module / 関連ファイル（散在状況）

```
データ層:
  content/voaenglish/**/*.md                     — Lesson のソース（frontmatter + body）
  lib/voaenglish/lessons.ts             (172L)  — fs.readFileSync ベースの読み込み
  lib/voaenglish/sentences.ts            (67L)
  lib/repositories/lessons-progress.ts  (122L)  — DB: lessonsProgress テーブル

Client store:
  lib/voaenglish/progress-store.ts      (104L)  — localStorage 専用（ゲスト）
  lib/voaenglish/sentence-bookmark-store.ts (314L) — localStorage + DB ハイブリッド
  lib/voaenglish/vocab-store.ts         (273L)  — DB 専用（ログイン必須）

API:
  app/api/user/lessons-progress/route.ts        — recordAttempt / markCompleted
  app/api/user/sentence-bookmarks/route.ts
  app/api/user/vocab-bookmarks/route.ts

UI:
  app/(site)/tools/voaenglish/[course]/[lesson]/page.tsx   — Server Component
  components/voaenglish/SentencePlayer.tsx          (305L 程度)
  components/voaenglish/AIEchoPanel.tsx             (521L 程度・Level × state を全部 useState)
  components/voaenglish/SentenceList.tsx
  components/voaenglish/DictationPanel.tsx
  components/voaenglish/CompletionDialog.tsx
  components/voaenglish/NextLessonCta.tsx           (~121L)
  components/voaenglish/SelfReport.tsx
  components/voaenglish/HandwritingNote.tsx
```

#### Friction の本質

「`(userId, lessonKey)` 単位で 1 つの session」というドメイン上の単位が、**永続層が 3 つに分かれている**（lesson コンテンツ=fs / progress=DB / bookmark=DB+localStorage）ため、**component 群がそれぞれ独立にデータを引き当てに行く**。

具体的に:
- `AIEchoPanel.tsx:90-94` で `Record<Level, LevelState>` を component の useState で持つ
- `useSentenceBookmark(id)` (`sentence-bookmark-store.ts:236`) は module-level cache + window CHANGE_EVENT で同期
- `useVocabBookmark(id)` (`vocab-store.ts:183`) も同じパターンだが**ゲスト未対応**（`isLoggedIn` チェックで no-op）
- `progress-store.ts` は ID と何の同期もしない localStorage 直書き
- 「次のレッスン解放」「現在 lesson の進捗 + bookmark 数」を統合的に取得する関数が**どこにも無い**

→ 「ある user の Lesson X についての全状態を一つの Interface で取得する」という Module が無い。

#### Deletion test

3 つの store を消す → 各 component で API 呼び出し + useState + 楽観的更新ロジックが 3 セット再出現
→ store 自体は earning its keep。
ただし**現状は 3 つに分散**しており、それぞれが浅い。1 つの deep Module（Lesson Session）に統合する余地がある。

### 6.2 依存カテゴリ

- **Local-substitutable**: localStorage は test で `jsdom` / `happy-dom` の adapter がある
- **In-process**: DB は通常の Drizzle
- **In-process**: fs（lesson md ファイル）は build-time / runtime で読み込み、React.cache でメモ化済み
- → 全て in-process / local-substitutable。新規 port-adapter は不要。

### 6.3 Interface 案（3 つ、INTERFACE-DESIGN.md パターン）

#### 案 A — `LessonSession` Module（Minimize / 推奨方向）

```ts
// lib/voaenglish/lesson-session.ts （新規・~250L 想定）

export interface LessonSession {
  // 不変な lesson メタ
  lesson:        Lesson;                         // frontmatter + body
  sentences:     Sentence[];                     // sentences.json
  audioUrl:      string | null;
  navigation:    { prev: Lesson | null; next: Lesson | null };

  // ユーザー固有の動的状態
  progress:      LessonProgressView;             // { status, attempts, completedAt }
  bookmarks: {
    vocab:     Set<string>;                      // 単語 id
    sentence:  Set<string>;                      // sentence id
  };

  // ふるまい
  recordAttempt():    Promise<void>;
  markCompleted():    Promise<void>;
  toggleVocab(item:    Omit<VocabItem,'addedAt'>):    Promise<void>;
  toggleSentence(item: Omit<SentenceBookmarkItem,'addedAt'>): Promise<void>;
}

// React 用フック
export function useLessonSession(course: string, slug: string): {
  session: LessonSession | null;   // ロード中は null
  loading: boolean;
};
```

**Trade-off**: depth が最大。component は session を受け取って表示するだけ。
caller は「次のレッスン解放ルール」を知らなくて良い。

#### 案 B — Hooks 群を残しつつ `useLessonContext` Provider（Maximize flexibility）

```tsx
<LessonProvider lessonKey={key}>
  <SentencePlayer />
  <AIEchoPanel />
  <DictationPanel />
</LessonProvider>
```

各 hook（`useLessonProgress`, `useSentenceBookmarks`, ...）は残すが、`LessonContext` が render-time に集約する。
**Trade-off**: 既存 hook を残せる（移行コスト低）が、interface が増えるだけで深さが増えない。**案 A の段階導入として有効**。

#### 案 C — Server-side `getLessonSession(userId, lessonKey)` のみ（Optimize for SSR）

Server Component（`[course]/[lesson]/page.tsx`）で SSR 時に session オブジェクトを構築し、props として渡す。Client side は表示専念。
**Trade-off**: bookmark / progress の楽観的更新が SSR には収まらない → 結局 client 側で hook が必要。**単独では不十分**。

### 6.4 推奨

**案 B を中間段階として実装し、最終形は案 A に収束**。

#### Phase 1 (案 B)
1. `lib/voaenglish/lesson-session.ts` を作成し `LessonContext` を export
2. Provider が内部で既存 3 つの hook を呼び `useLessonSession()` で全部取れるようにする
3. component を 1 つずつ provider 利用に書き換え（`AIEchoPanel` / `SentencePlayer` / `DictationPanel` / `SentenceList` / `NextLessonCta`）

#### Phase 2 (案 A への昇格)
4. `LessonProvider` の内部実装を、3 つの store を**直接統合した単一の状態機械**に置き換え
5. 既存 hook (`useVocabBookmark`, `useSentenceBookmark`, `saveLocalProgress`) を internal seam に格下げ（または削除）
6. **新規ふるまい**を追加: `nextUnlockedLesson()`, `progressInCourse()`, `bookmarkCountByLesson()` 等

### 6.5 移行手順（Phase 1 を細分化）

| Step | 作業 | 関連ファイル | 影響行数 |
|---|---|---|---|
| 1 | `lesson-session.ts` 新規・型定義 + Provider 雛形 | 新規 1 ファイル | +150 |
| 2 | `AIEchoPanel.tsx` の `byLevel` state を Session に移譲（最大の利得） | -100, +30 |
| 3 | `SentencePlayer` の bookmark/progress 呼び出しを Session 経由に | ~-20, +10 |
| 4 | `NextLessonCta` の next-lesson 計算を Session 経由に | ~-15, +5 |
| 5 | `DictationPanel` / `SentenceList` も同様 | ~-20, +10 |
| 6 | 既存 store の React hook を internal export に降格 | -0, comment 化 |

### 6.6 テスト戦略

- 新規: `lib/voaenglish/__tests__/lesson-session.test.ts`
  - **Interface = test surface**: session の振る舞いを記述
  - `markCompleted` 後 `progress.status === 'completed'`
  - `toggleVocab(item)` 後 `bookmarks.vocab.has(item.id) === true`
  - `recordAttempt` 後 `progress.attempts` 増加
  - ゲストモード: localStorage への write が起きる / DB API call が起きない
- 削除: `vocab-store.test.ts` 等の単体 hook テスト（**replace, don't layer**）

### 6.7 互換性リスク

- ⚠️ **localStorage キー**を変更しない（既存ユーザーのデータ消失を防ぐ）:
  - `'familyai:voa-progress'`
  - `'familyai:sentence-bookmarks'`
- ⚠️ **CHANGE_EVENT 名**は内部詳細 — 移行中は維持
- ⚠️ **DB API 形式**は不変
- ⚠️ **AI Echo の Level × state 保持**（タブ切替で消えない仕様）を必ず維持。`AIEchoPanel:32-57` の `LEVEL_META` 定数を session に移譲する際、設計書 `todo/aictation_page_design_aiecho.md` を参照
- ⚠️ **DB sync 後の楽観的更新失敗時のロールバック**ロジック（`sentence-bookmark-store.ts:276-281`, `vocab-store.ts:222-232`）を保つ

### 6.8 Open questions

- AI Echo の **保存** （`isSaved`）は別 entity (`ai_echo_entries` DB table) — session に含めるか別 Module か? 推奨は **session に含める**（同じ lesson に紐づくため locality 高）。`lib/repositories/ai-echo.ts` を session の中で呼ぶ形。
- **ゲスト → ログイン時の bookmark / progress 移行**は既存実装が `clearLocalProgress` のスケルトンしか持っていない（`progress-store.ts:97`）。Session 統合の機会に migration を実装すべきか? → 別 candidate として切り出し可能。
- **fs ベースの lesson 読み込み** (`lessons.ts`) は **将来 DB 化**の余地。session の interface はファイル/DB どちらでも対応できる shape にすべき (`lesson: Lesson` をどう取得するかは Implementation 詳細)。

---

## 7. Candidate #6 — Rate Limit を 2 系統から 1 系統に統合

### 7.1 現状

#### Module / 関連ファイル

```
lib/ratelimit.ts                  (126L)  — getRateLimiter, getClientIp,
                                            isRateLimitFailClosed, enforceAdminRateLimit,
                                            rateLimitedResponse
app/api/ai/route.ts:73-202        (130L)  — Upstash Redis / Ratelimit の lazy init と
                                            plan 別 limiter (anon/free/pro) を route 内に直書き
```

#### Friction の現物

```ts
// app/api/ai/route.ts:73-97 — lib/ratelimit.ts の getRedis と同型のシングルトンが route 内に存在
let _redis: Redis | null = null;
let _rlAnon: Ratelimit | null = null;
let _rlFree: Ratelimit | null = null;
let _rlPro:  Ratelimit | null = null;

function getRedis(): Redis | null { /* lib/ratelimit.ts と同じ実装 */ }

function getRatelimiters() {
  const redis = getRedis();
  if (!redis) return null;
  if (!_rlAnon) {
    _rlAnon = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10,  '1 d'), prefix: 'ratelimit:ai:anon' });
    _rlFree = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30,  '1 d'), prefix: 'ratelimit:ai:free' });
    _rlPro  = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(200, '1 d'), prefix: 'ratelimit:ai:pro'  });
  }
  return { anon: _rlAnon!, free: _rlFree!, pro: _rlPro! };
}
```

`lib/ratelimit.ts:48-76` は **既に汎用 `getRateLimiter(prefix, tokens, window)` を提供している**のに、AI route はこれを使わず自前で init。
**コメント**: `ratelimit.ts:20` に `※ /api/ai の /d 制限は専用ロジック（プラン別）があるため本ヘルパーとは独立。` と明記されている — つまり**意図的な分離**であり、それが正しいかを判断するべき。

#### Deletion test

route 内の自前 Redis init を消す → `getRateLimiter` を 3 回呼ぶだけになる → complexity は移動せず**消える**。

### 7.2 依存カテゴリ

- **Local-substitutable**（Upstash Redis 未設定時の null フォールバックが seam）

### 7.3 提案

`lib/ratelimit.ts` に **AI 用ヘルパー**を追加し、route 内の自前 Redis init を削除:

```ts
// lib/ratelimit.ts に追加
export type AiPlan = 'anon' | 'free' | 'premium';

export async function enforceAiRateLimit(
  req:    NextRequest,
  plan:   AiPlan,
  userId: string | null,   // null = anon
): Promise<NextResponse | null> {
  const ratesByPlan: Record<AiPlan, { tokens: number; prefix: string }> = {
    anon:    { tokens: 10,  prefix: 'ratelimit:ai:anon' },
    free:    { tokens: 30,  prefix: 'ratelimit:ai:free' },
    premium: { tokens: 200, prefix: 'ratelimit:ai:pro'  },
  };
  const { tokens, prefix } = ratesByPlan[plan];
  const rl = getRateLimiter(prefix, tokens, '1 d');
  if (!rl) {
    if (isRateLimitFailClosed()) {
      return rateLimitedResponse('AI は一時的に利用できません。');
    }
    return null;
  }
  const key = userId ?? getClientIp(req);
  const { success } = await rl.limit(key);
  if (!success) {
    const message = userId
      ? '本日の利用上限に達しました。明日またお試しください。'
      : '1日の利用上限に達しました。ログインするとより多く使えます。';
    return rateLimitedResponse(message);
  }
  return null;
}
```

route 側:
```ts
// app/api/ai/route.ts （簡素化後）
const session = await auth();
const plan: AiPlan = !session?.user?.id ? 'anon'
                   : (session.user.plan === 'premium' ? 'premium' : 'free');
const rl = await enforceAiRateLimit(req, plan, session?.user?.id ?? null);
if (rl) return rl;
```

route から `_redis / _rlAnon / _rlFree / _rlPro / getRedis / getRatelimiters / getClientIp` を全て削除 (約 30 行減)。

### 7.4 移行手順

1. `lib/ratelimit.ts` に `enforceAiRateLimit` と `AiPlan` を追加
2. `app/api/ai/route.ts` の lazy init を削除し、新 helper を呼ぶ
3. `prefix` 名（`ratelimit:ai:anon|free|pro`）を完全一致で継承 — **既存の Redis key を維持**（過去 24h のカウントを失わない）
4. message 文面も維持

### 7.5 テスト戦略

- 新規: `lib/__tests__/ratelimit.test.ts` (拡張) — plan ごとの token / prefix / key 戦略
- AI route の integration test は不変

### 7.6 互換性リスク

- ⚠️ **Redis prefix の文字列を変えると本番で window がリセットされる**（過去 24h の使用量が失われ、悪用される可能性）。完全一致必須。
- ⚠️ **fail-closed 挙動**（production && Redis 未設定 → 429）を継承
- ⚠️ `getClientIp` は route 内に重複定義があるが `lib/ratelimit.ts:79` の方を残す

### 7.7 Open questions

- TTS 用 rate limit (`app/api/tts/route.ts` があれば) も同じパターンで統合できる? → 一度 grep して確認: `grep -rn "Ratelimit\|@upstash" app/api/`

---

## 8. テスト戦略（横断・DEEPENING.md §Testing strategy 準拠）

各 candidate 共通:

| 原則 | 実装方針 |
|---|---|
| **The interface is the test surface** | repository / router / session の **公開関数**に対して契約テストを書く |
| **Replace, don't layer** | shallow module の単体テストは新 interface テストの追加後に**削除** |
| **Tests survive internal refactors** | DB 行や middleware の中身を assert しない。観測可能な outcome のみ。 |
| **Internal seams ≠ external seams** | mapper 関数の純関数テスト等は **internal seam として保持**（test 用） |

**現状の test 体制** (要確認):
- `pnpm test` (Vitest) が 164 tests pass（前回の commit `bebd586` 直後の状態）
- `test/` ディレクトリの構成は本ハンドオフ未調査 — 実装者は最初に `find test lib -name '*.test.ts'` で全体像を把握すること

---

## 9. ADR 候補（実装時に記録すべき決定）

このプロジェクトは `docs/adr/` を持たないが、以下は ADR 化すべき load-bearing decision:

- **ADR-0001**: 「Repository は DTO を返す（mapper は internal seam）」 — Candidate #3 を採用した場合
- **ADR-0002**: 「Admin route は protectAdminRoute で wrap する」 — Candidate #1
- **ADR-0003**: 「AI Router の interface は feature 単位（streamArticleChat / streamAiEcho）」 — Candidate #4
- **ADR-0004**: 「VOA は `LessonSession` を介して状態を統合する」 — Candidate #5
- **ADR-0005**: 「Rate Limit は `lib/ratelimit.ts` に集約し、subject (admin / ai-anon / ai-free / ai-premium) で分岐」 — Candidate #6

実装者は **ADR テンプレ**を `docs/adr/` 配下に作って 1 candidate = 1 ADR で記録することを推奨。
書式は `/Users/junli/.agents/skills/grill-with-docs/ADR-FORMAT.md` を参照。

---

## 10. 推奨実装順序

依存関係を考慮した順序（実装者は順守推奨）:

```
順序     候補    理由
─────    ────    ─────────────────────────────────────────────
Phase 1  #1      admin guard 統合: 影響範囲が局所・他候補と独立・即効性高
Phase 2  #6      rate limit 統合: #1 で揃えたエラー形式を再利用
Phase 3  #3      mapper を repository に内包: #2 の前提
Phase 4  #2      article list の duplicate 削除: #3 後すぐ
Phase 5  #4      AI router の feature 内包: 影響範囲が AI 周辺のみ
Phase 6  #5      Lesson Session: 最大規模・他候補と独立に進められるが
                  最後に回すと #3 の lesson-progress repository 統一を活かせる
```

**並列化**: #4 と #5 は #1〜#3 完了後に並列可能。
**スコープ縮小**: #5 は **Phase 1（案 B = LessonProvider のみ）**まで実装してそこで一旦コミット可能。

---

## 11. Pre-flight チェックリスト（実装者向け）

実装開始前に以下を確認:

- [ ] `git status` がクリーン
- [ ] `pnpm install` 完了
- [ ] `pnpm test` が全 pass（baseline: 164 tests）
- [ ] `pnpm exec tsc --noEmit` がエラーゼロ
- [ ] `pnpm lint` がエラーゼロ
- [ ] `.env.local` の `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` が設定済み（candidate #1/#6 のローカル動作確認に必要）
- [ ] `ADMIN_EMAIL` 環境変数で自分のメールが admin として認証される
- [ ] 開発サーバー `pnpm dev` が起動し `/admin` `/api/admin/articles` で動作確認可能

**実装中の品質ゲート（candidate ごと）**:
- [ ] `pnpm exec tsc --noEmit` パス
- [ ] `pnpm lint` パス
- [ ] `pnpm test` パス（**増えるべき・減るべきテストを明示**して回帰）
- [ ] 手動: 影響する route を curl or ブラウザで叩いてレスポンス形を確認
- [ ] commit message に `refactor(deepen):` プレフィックス推奨

---

## 12. 参考リンク（このリポジトリ内）

- 既存の深い repository の例: `lib/repositories/3d-models.ts`
- 既存の AI router: `lib/ai/router.ts`
- AI 設定（admin override）: `lib/repositories/ai-config.ts`, `lib/config/ai-config.ts`
- VOA ドメイン設計書: `todo/aictation_page_design_v2.md`, `todo/aictation_page_design_aiecho.md`
- システム設計書: `todo/01_システム設計書.md`
- Coding agent 指示書: `todo/02_CodingAgent指示書.md`

---

## 13. このドキュメントの使い方（次のエージェントへ）

1. **Glossary（§0）を遵守**: `LANGUAGE.md` の用語を全提案で使うこと
2. **§10 の順序で進める**: 依存があるため
3. **各 candidate の §x.6 移行手順を 1 step ずつコミット**: revert しやすくする
4. **§x.7 互換性リスク**を必ずレビュー: 本番運用中の DTO 契約・rate-limit key・localStorage key などは破壊禁止
5. **§9 の ADR を書く**: 採用した決定 / 却下した代替案を `docs/adr/` に記録
6. **§x.8 Open questions** は実装前にユーザーに確認するか、判明したらこのドキュメントに追記
7. **テスト**: §8 の方針で **replace, don't layer**

不明点があればこのドキュメントの末尾に `## Q&A` セクションを追加して質問を蓄積してください。
