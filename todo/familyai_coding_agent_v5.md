# familyai.jp — CodingAgent 実装依頼書 v2.0

## 2026/5/8 までの実行整理（進捗テーブル）

> 最終更新: 2026-04-17（Step 01〜14, 13b, 16, 18 完了・Rev01〜11 完了・Rev12〜17 追加：Codex レビュー指摘）

| タスク（1行1タスク）                                                                                                                           | 担当          | 期限           | 推定時間 | 依存                                                                     | 状態  |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------ | ---- | ---------------------------------------------------------------------- | --- |
| Step 00: Skills `frontend-design` を読み込みデザイン方針を確定・`index.html` デザイン確認                                                                  | CodingAgent | 2026-05-08まで | —    | —                                                                      | ✅完了 |
| Step 01: Next.js + TypeScript + Tailwind + shadcn/ui を初期設定・`.env.local.example` 作成                                                    | CodingAgent | 2026-05-08まで | 30分  | —                                                                      | ✅完了 |
| Step 01b: `shared/`（types/constants/utils/api）を作成                                                                                     | CodingAgent | 2026-05-08まで | 40分  | —                                                                      | ✅完了 |
| Step 02: `globals.css` にCSS変数/全アニメーション/ノイズ背景/`prose-warm`/`reveal`クラスを実装                                                              | CodingAgent | 2026-05-08まで | 30分  | —                                                                      | ✅完了 |
| Step 03: `tailwind.config.ts` にブランドカラー/フォント変数を追加                                                                                      | CodingAgent | 2026-05-08まで | 20分  | —                                                                      | ✅完了 |
| Step 04: Drizzle + Neon 接続と `schema.ts` `drizzle.config.ts` とマイグレーションを実装                                                              | CodingAgent | 2026-05-08まで | 40分  | Todo07                                                                 | ✅完了 |
| Step 05: `Header.tsx` `Footer.tsx` `MobileNav.tsx` を実装                                                                                | CodingAgent | 2026-05-08まで | 60分  | —                                                                      | ✅完了 |
| Step 06: `app/layout.tsx` にフォント/メタデータ/スクロール演出を実装・`hooks/useScrollReveal.ts` 作成・`next.config.ts` セキュリティヘッダー追加                          | CodingAgent | 2026-05-08まで | 30分  | —                                                                      | ✅完了 |
| Step 07: `HeroSection.tsx`（blob背景+家族カード）を実装                                                                                           | CodingAgent | 2026-05-08まで | 60分  | —                                                                      | ✅完了 |
| Step 07c: `app/(site)/page.tsx`（トップページ）を組み立て・`StatsRow.tsx` を実装（⚠️ 旧版に欠番）                                                             | CodingAgent | 2026-05-08まで | 30分  | —                                                                      | ✅完了 |
| Step 08: `RolePicker.tsx` `CategoryFilter.tsx` を実装                                                                                    | CodingAgent | 2026-05-08まで | 40分  | —                                                                      | ✅完了 |
| Step 09: `ArticleCard.tsx` `ArticleGrid.tsx` を実装                                                                                      | CodingAgent | 2026-05-08まで | 40分  | —                                                                      | ✅完了 |
| Step 10: `app/(site)/learn/page.tsx`（一覧/フィルタ）を実装                                                                                      | CodingAgent | 2026-05-08まで | 40分  | Todo07                                                                 | ✅完了 |
| Step 11: `app/(site)/learn/[slug]/page.tsx`（詳細+JSON-LD）を実装・`ArticleBody.tsx` `AIChatWidget.tsx` を追加                                   | CodingAgent | 2026-05-08まで | 60分  | Todo07                                                                 | ✅完了 |
| Step 12: `AudioPlayer.tsx`（速度/リピート/シーク/transcript表示）を実装                                                                               | CodingAgent | 2026-05-08まで | 50分  | —                                                                      | ✅完了 |
| **Rev01** 🔴: `shared/constants/index.ts` の `ROUTES.articles` / `ROUTES.article` / `ROUTES.roleArticles` を `/articles` → `/learn` に修正（Footer 4リンクが 404 確定） | CodingAgent | 2026-05-08まで | 10分  | —                                                                      | ✅完了 |
| **Rev02 🔴: `ArticleBody.tsx` に `rehypeSanitize` を追加。XSS標準防御。 | CodingAgent | 2026-05-08まで | 5分   | —                                                                      | ✅完了 |
| **Rev03 🟠: `lib/db/index.ts` DATABASE_URL lazy初期化（Vercel Preview クラッシュ防止）。 | CodingAgent | 2026-05-08まで | 15分  | —                                                                      | ✅完了 |
| **Rev04 🟠: `AudioPlayer.tsx` シークバーを pointer イベント対応（iOS/Android シーク解消）。 | CodingAgent | 2026-05-08まで | 20分  | —                                                                      | ✅完了 |
| **Rev05 🟡: 全コンポーネントの `transition-all` を限定化（17箇所・モバイル体感改善）。 | CodingAgent | 2026-05-08まで | 30分  | —                                                                      | ✅完了 |
| **Rev06 🟡: `shared/types/index.ts` ArticleSummary を roles/categories 配列型に修正。 | CodingAgent | 2026-05-08まで | 15分  | —                                                                      | ✅完了 |
| **Rev07 🟡: `shared/constants/index.ts` の `AI_MODELS` を仕様書の `MODEL_ROUTER` 構造（`text-simple`/`text-quality`/`math-reasoning`/`transcribe`/`image-gen`/`tts-japanese` + fallback）に再定義。Step 17 実装時の書き換えコストを事前解消。 | CodingAgent | 2026-05-08まで | 20分  | —                                                                      | ✅完了 |
| **Rev08 🟡: `shared/constants/index.ts` の `ROUTES.api.chat`・`shared/api/index.ts` の `streamChat`・`components/article/AIChatWidget.tsx` の呼び出し先を `/api/chat` → `/api/ai` に統一（仕様書 `/api/ai` に準拠）。 | CodingAgent | 2026-05-08まで | 10分  | —                                                                      | ✅完了 |
| **Rev09 🟡: `app/(site)/learn/[slug]/page.tsx` の JSON-LD に AudioObject スキーマを追加（`audioUrl` がある記事のみ・`duration` / `inLanguage` / `transcript` 含める）。音声SEO対応。 | CodingAgent | 2026-05-08まで | 15分  | —                                                                      | ✅完了 |
| **Rev10 🟢: `.gitignore` に `.claude/settings.local.json` を追加（個人設定をバージョン管理から除外）。 | CodingAgent | 2026-05-08まで | 2分   | —                                                                      | ✅完了 |
| **Rev11 🟢: `app/fonts/GeistVF.woff`・`app/fonts/GeistMonoVF.woff` を削除（create-next-app 残骸・Kaisei Opti + Zen Maru Gothic に統一済み）。 | CodingAgent | 2026-05-08まで | 2分   | —                                                                      | ✅完了 |
| **Rev12 🔴: `shared/constants/index.ts` の `ROUTES.login` を `/login` → `/auth/signin` に修正（`Header.tsx:92`・`MobileNav.tsx:115` の「✨ 無料で始める」CTA が 404 になる・実ページは `app/(site)/auth/signin/`）。MVP登録動線のリリースブロッカー。 | CodingAgent | 2026-05-08まで | 5分   | —                                                                      | 未着手 |
| **Rev13 🔴: `AudioPlayer.tsx` と `/api/audio/play` に「30秒再生後のみカウント」ルールを実装。クライアント側で `timeupdate` を監視し、累計30秒経過後に初めて `POST /api/audio/play` を送る。サーバー側は現状の24時間デデュープに加え、`elapsedSec >= 30` をリクエストボディに追加して検証。仕様書 line 1257 準拠。 | CodingAgent | 2026-05-08まで | 30分  | —                                                                      | 未着手 |
| **Rev14 🟠: `app/api/ai/route.ts` の `errorStream()` を 200 固定から見直し。ストリーム開始前のエラー（`INVALID_BODY`・`INVALID_PARAMS`・`UNSUPPORTED_TYPE`・`FORBIDDEN`）は HTTP 400/403 の JSON レスポンスで返す。ストリーム途中エラーのみ SSE 200 + `{error}` で送る。仕様書検収項目「2001文字以上で400エラー」準拠。 | CodingAgent | 2026-05-08まで | 10分  | —                                                                      | 未着手 |
| **Rev15 🟠: `/api/ai` に 8秒サーバータイムアウトを実装。`route.ts` で `setTimeout(() => ac.abort(), 8000)` を設定し、`lib/ai/providers/openrouter.ts` の fetch にも適用。Vercel Hobby の maxDuration=10s バッファ 2秒を守る。仕様書 `OPENROUTER_CONFIG.timeout = 8_000` 準拠。 | CodingAgent | 2026-05-08まで | 15分  | —                                                                      | 未着手 |
| **Rev16 🟡: `app/(site)/learn/[slug]/page.tsx` のタグ導線を修正。`[...article.roles, ...article.categories]` を一律 `cat=` に流しているため、`papa` 等のロールが `cat=papa` となり空振りする。ロールは `?role=`、カテゴリは `?cat=` に分岐させる。 | CodingAgent | 2026-05-08まで | 10分  | —                                                                      | 未着手 |
| **Rev17 🟡: `shared/api/index.ts` と `app/api/articles/route.ts` の契約を整合。現状サーバーは `{ articles, pagination }` を返すが shared は `PaginatedResult<T> = { items, meta }` を期待。どちらかに統一（推奨: サーバー側を `{ items, meta }` に変更し shared 層の再利用性を守る）。また `fetchArticle` の `/api/articles/:slug` を使うなら対応 route を追加、使わないなら shared 層から削除。 | CodingAgent | 2026-05-08まで | 20分  | —                                                                      | 未着手 |
| Step 13: `/api/audio` をVercel Blob署名URL方式で実装・再生カウント重複防止（`/api/audio/play`）を追加                                                         | CodingAgent | 2026-05-08まで | 40分  | Todo01 ✅, Todo09 ✅, Todo18 ✅                                          | ✅完了 |
| Step 13b: `/api/articles` をページネーション/ソート/閲覧数仕様で実装                                                                                      | CodingAgent | 2026-05-08まで | 40分  | Todo07                                                                 | ✅完了 |
| Step 14: `/common` `/about` `/privacy` `/terms` を実装                                                                                   | CodingAgent | 2026-05-08まで | 40分  | —                                                                      | ✅完了 |
| Step 15: `/api/og`（@vercel/og・日本語フォント対応）を実装                                                                                           | CodingAgent | 2026-05-08まで | 30分  | Todo11 ✅                                                               | ✅完了 |
| Step 16: `sitemap.ts` `robots.ts` SEOメタデータ JSON-LD を実装                                                                                | CodingAgent | 2026-05-08まで | 20分  | Todo07                                                                 | ✅完了 |
| Step 17: Upstash Redis でレート制限・`lib/ai/router.ts`・`lib/ai/providers/openrouter.ts`・`lib/csrf.ts` を実装・`runVoicevox` ダミー応答を実際のTTS呼び出しへ置換 | CodingAgent | 2026-05-08まで | 60分  | Todo02, Todo03, Todo09 ✅                                               | ✅完了 |
| Step 18: `loading.tsx` `error.tsx` `not-found.tsx` を実装（全階層）                                                                           | CodingAgent | 2026-05-08まで | 30分  | —                                                                      | ✅完了 |
| Step 19: `lib/db/seed.ts` で初期データ投入・`lib/auth.ts`（NextAuth v5）実装・`/auth/signin` `/auth/register` 作成・`seedArticles` 依存をDB取得へ置換          | CodingAgent | 2026-05-08まで | 60分  | Todo07, Todo08                                                         | ✅完了 |
| Step 22: Vercelデプロイ最終確認・環境変数反映・Google Analytics 設定・OpenRouter 用途別処理の実運用検証                                                             | CodingAgent | 2026-05-08まで | 30分  | Todo02, Todo03, Todo04, Todo05, Todo07 ✅, Todo08, Todo09 ✅             | ✅完了 |
| **Todo01**: Vercel・Neon・GitHub の各アカウント作成を完了                                                                                           | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | ✅完了 |
| **Todo02**: OpenRouter でAPIキーを発行し `OPENROUTER_API_KEY` を設定（**AI呼び出しの最優先経路。OpenRouterで不足する場合のみ個別キーを追加取得**）                             | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | ✅完了 |
| **Todo03**: `OPENROUTER_APP_URL` と `OPENROUTER_APP_NAME` を本番値で設定                                                                      | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | ✅完了 |
| **Todo04**: `NEXTAUTH_SECRET` を生成し・`NEXTAUTH_URL` を本番値で設定                                                                             | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | ✅完了 |
| **Todo05**: `NEXT_PUBLIC_API_URL` を本番値で設定                                                                                             | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | ✅完了 |
| **Todo06**: （Voicevox直結を使う場合のみ）`VOICEVOX_API_BASE` を設定                                                                                | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | 未着手 |
| **Todo07**: Neon接続文字列 `DATABASE_URL` を設定                                                                                              | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | ✅完了 |
| **Todo08**: Google OAuth クライアント情報を設定（`GOOGLE_CLIENT_ID/SECRET`）                                                                       | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | ✅完了 |
| **Todo09**: Upstash Redis を作成し `UPSTASH_REDIS_REST_URL/TOKEN` を設定                                                                     | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | ✅完了 |
| **Todo10**: `public/og-default.png` を作成して配置する（Canva 1200×630px）                                                                       | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | 未着手 |
| **Todo11**: `public/fonts/NotoSansJP-Bold.ttf` を配置する（OGP日本語表示に必須）                                                                     | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | ✅完了 |
| **Todo12**: `https://familyai.jp/privacy` と `/terms` の法務文言を最終確認                                                                       | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | 未着手 |
| **Todo13**: 初期記事10本と語学音声MP3素材を準備し入稿可能状態にする                                                                                            | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | 未着手 |
| **Todo14**: Google Search Console 登録と `sitemap.xml` 送信を完了                                                                             | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | 未着手 |
| **Todo15**: Google Analytics の測定ID発行と `NEXT_PUBLIC_GA_ID` 設定を完了                                                                       | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | 未着手 |
| **Todo16**: ドメイン/DNS 設定を完了（Vercel Refresh待ち）                                                                                          | 人間（junli）   | 2026-04-14   | —    | —                                                                      | 途中  |
| **Todo17**: SSL/HTTPS 有効化確認を完了                                                                                                        | 人間（junli）   | 2026-04-15   | —    | —                                                                      | ✅完了 |
| **Todo18**: Vercel Blob を作成し `BLOB_READ_WRITE_TOKEN` を設定（Vercel Marketplace → Storage → Blob → `familyai-blob`）                       | 人間（junli）   | 2026-05-08まで | —    | —                                                                      | ✅完了 |

> **CodingAgent 合計推定時間: 約 1009分（16.8時間）** ※Rev07〜11・Rev12〜17 を含む

## あなたの役割

あなたはプロダクショングレードのフルスタックエンジニア兼UIデザイナーです。
以下の仕様に従い `familyai.jp` をゼロから実装してください。
**質問は不要**です。不明点は合理的なデフォルト値を選んで進めてください。

---

## ⚠️ 最初に必ず読むこと（Skills参照）

フロントエンドのUI・コンポーネント・ページを作成する際は、**必ず事前に以下のSkillsファイルを読んでから実装を開始すること。**

```
Skills名: frontend-design
```

**読み込みタイミング（厳守）:**

| タイミング | 理由 |
|---|---|
| Step 02（globals.css作成）の前 | アニメーション・カラー設計の方針を把握するため |
| 各コンポーネント作成の前 | タイポグラフィ・スペーシング・インタラクションの方針を確認するため |
| デザインで迷ったとき | 常にSkillsに立ち返り、「Warm Organic Joy」コンセプトを軸に判断すること |

**Skillsの活用ポイント:**

- **タイポグラフィ**: 汎用フォント（Inter・Roboto・Arial）は絶対に使わない。Kaisei Opti + Zen Maru Gothic を使うこと
- **カラー**: 紫グラデーションなどありきたりな配色は禁止。本指示書のブランドカラー（peach・orange・cream）を忠実に使うこと
- **モーション**: ページ読み込み時のstaggered reveal、ホバーのmicro-interactionを必ず実装すること
- **レイアウト**: 予測可能な格子状レイアウトを避け、非対称・重なり・余白を活かした構成にすること
- **背景**: 単色背景に逃げず、ノイズテクスチャ・blobグラデーション・layered transparencyで奥行きを出すこと
- **差別化**: 「汎用AIサイト感」を出さない。familyai.jpだけの温かく記憶に残るデザインを目指すこと

> **Skills参照なしでのUI実装は禁止です。** 必ずSkillsを読んだ上で、その方針に沿ったコードを書いてください。

---

## プロジェクト概要

| 項目 | 内容 |
|---|---|
| サイト名 | familyai.jp |
| コンセプト | 「AI = 愛」— 家族全員がAIを活用できる日本語メディアサイト |
| ターゲット | パパ・ママ・子ども・シニア・AI初心者（全世代） |
| MVPリリース | 2026年5月8日（運営者の結婚18周年記念日） |
| 言語 | 日本語メイン（将来的に多言語対応予定） |

---

## 技術スタック（厳守）

| レイヤー | 技術 | バージョン |
|---|---|---|
| フレームワーク | Next.js App Router | 14系最新 |
| 言語 | TypeScript strict mode | 5系最新 |
| スタイル | Tailwind CSS + shadcn/ui | 最新 |
| データベース | Neon PostgreSQL（Vercel Marketplace） | 最新 |
| ORM | Drizzle ORM | 最新 |
| 認証 | NextAuth.js v5 | `5.0.0-beta.25` 以降・**バージョン固定必須**（後述） |
| ファイル | Vercel Blob（MP3・画像、最大50GB想定） | 最新 |
| 決済 | Stripe（Phase2以降） | 最新 |
| ホスティング | Vercel | - |
| パッケージ管理 | pnpm | 最新 |

---

## ═══════════════════════════════════
## フロントエンド デザイン仕様（最重要）
## ═══════════════════════════════════

### デザインコンセプト：「Warm Organic Joy」

このサイトの核心は「家族の愛」。テクノロジーを「怖いもの」ではなく「温かい家族の道具」として見せるデザインを実現すること。

**キーワード**: やわらかい / 温かい / 親しみやすい / 全世代に優しい / 日本らしい繊細さ

---

### デザイン参照元（index.htmlを基準に統一）

`/todo/index.html`（リポジトリルートからの相対パス）は **familyai.jp の公式デザインリファレンス（正）** とする。  
今後作成する全ページ（トップ以外も含む）は、以下を `index.html` に合わせて実装すること。

1. **フォント統一**: Kaisei Opti（見出し）+ Zen Maru Gothic（本文）を維持する  
2. **色統一**: cream / peach / orange / beige / brown 系のブランドカラーを優先し、近似色への勝手な置換をしない  
3. **質感統一**: ノイズテクスチャ、柔らかいblob背景、角丸、暖色系シャドウのトーンを維持する  
4. **モーション統一**: fadeUp・float・pulse・blink など、`index.html` の挙動に近いアニメーション速度と強度を使う  
5. **コンポーネント統一**: pill型バッジ/チップ、roundedカード、やわらかい境界線（beige-dark）を基本パターンにする

禁止事項:
- ページごとに別ブランドのような配色・フォント・UIトーンへ逸脱すること
- `index.html` の世界観と矛盾する、冷たい無機質デザインへの変更

---

### タイポグラフィ（必須）

```typescript
// app/layout.tsx に必ず実装
import { Zen_Maru_Gothic, Kaisei_Opti } from 'next/font/google';

const zenMaruGothic = Zen_Maru_Gothic({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const kaiseiOpti = Kaisei_Opti({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
```

| 用途 | フォント | サイズ / ウェイト |
|---|---|---|
| 大見出し（Hero・セクションタイトル） | Kaisei Opti | clamp(36px,5vw,58px) / 700 |
| 中見出し（カード・ナビ） | Zen Maru Gothic | 20〜24px / 700 |
| 本文 | Zen Maru Gothic | 16px / 400 |
| キャプション・タグ | Zen Maru Gothic | 12〜13px / 500 |

---

### カラーシステム（CSS変数で管理・厳守）

```css
/* globals.css または tailwind.config.ts に定義 */
:root {
  /* ── ブランドカラー ── */
  --color-cream:        #FDF6ED;   /* 背景ベース */
  --color-peach:        #FFAD80;   /* メインアクセント */
  --color-peach-light:  #FFD4B2;   /* 薄いアクセント */
  --color-orange:       #FF8C42;   /* CTAボタン・強調 */
  --color-beige:        #F5E6D0;   /* セクション背景 */
  --color-beige-dark:   #E8CFA8;   /* ボーダー・区切り */
  --color-brown:        #8B5E3C;   /* テキストメイン */
  --color-brown-light:  #B5896A;   /* テキストサブ */

  /* ── ロールカラー ── */
  --color-papa:         #FFF0E6;   /* パパ: 暖かいオレンジ系 */
  --color-mama:         #FFF0F5;   /* ママ: やさしいピンク系 */
  --color-kids:         #F0FFF4;   /* 子ども: 元気なグリーン系 */
  --color-senior:       #F5F0FF;   /* シニア: 落ち着いたパープル系 */
  --color-common:       #E6F4FF;   /* 共通: 清潔なブルー系 */

  /* ── ロールアクセント（ボーダー・アイコン用） ── */
  --color-papa-accent:   #E07030;
  --color-mama-accent:   #D04070;
  --color-kids-accent:   #30A060;
  --color-senior-accent: #7030C0;
  --color-common-accent: #3060D0;
}
```

---

### アニメーション・インタラクション

以下のアニメーションを `globals.css` に定義し、全体で統一使用すること。

```css
/* ── ページ読み込みアニメーション ── */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(30px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* ── フロート（カードや装飾要素） ── */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-8px); }
}

/* ── パルス（背景ブロブ） ── */
@keyframes pulse-blob {
  0%, 100% { transform: scale(1);    opacity: 0.6; }
  50%       { transform: scale(1.1); opacity: 0.9; }
}

/* ── 点滅（バッジのドット） ── */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

/* ── スクロールリビール ── */
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

**Tailwindのホバークラス統一ルール:**
```
カード:      hover:-translate-y-2 hover:shadow-lg
            transition-[transform,box-shadow,border-color] duration-200
ボタン:      hover:-translate-y-1 hover:shadow-md
            transition-[transform,box-shadow] duration-200
ロールカード: hover:-translate-y-2 hover:border-[var(--color-orange)]
            transition-[transform,box-shadow,border-color] duration-200
```
<!-- ⚠️ transition-all は全プロパティを監視するためパフォーマンスに影響する。 -->
<!-- transform / box-shadow / border-color のみ明示列挙すること。              -->

---

### 背景テクスチャ（noise overlay）

`body::before` にノイズテクスチャを追加し、デジタルすぎない温かみを演出すること。

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}
```

---

## ═══════════════════════════════════
## コンポーネント別 実装仕様
## ═══════════════════════════════════

### 1. ナビゲーション（Header.tsx）

```
外観:
- 背景: rgba(253,246,237,0.88) + backdrop-blur(12px)
- 下ボーダー: 2px solid var(--color-beige-dark)
- position: sticky top-0 z-50
- padding: 14px 40px

左: ロゴ（🏠アイコン + "familyai.jp"）
  - アイコン: グラデーション背景(peach→orange)の角丸正方形、浮遊アニメーション
  - テキスト: Kaisei Opti, "family" brown色 + "ai" orange色

右: ナビリンク（PC）
  - 共通ガイド / パパ / ママ / 子ども / シニア
  - ホバー: 下線アニメーション（width 0→100%）
  - CTAボタン「✨ 無料で始める」: orange背景・pill形状・shadow付き

モバイル: ハンバーガーメニュー（shadcn/ui Sheet使用）
```

---

### 2. ヒーローセクション（HeroSection.tsx）

```
レイアウト: 2カラムグリッド（テキスト左・ビジュアル右）
最小高さ: 92vh

背景装飾（絶対配置・pointer-events:none）:
- blob1: w-600px h-600px, radial-gradient(peach-light→transparent), 右上, pulse-blobアニメーション
- blob2: w-400px h-400px, radial-gradient(sky→transparent), 左下, pulse-blobアニメーション逆再生

左カラム（テキスト）:
① バッジ: 白背景・pill形状・「● AI = 愛 — 家族の幸せのために」
   - ●ドット: orange色・blinkアニメーション
② タイトル（Kaisei Opti）:
   「AIは、家族を
    もっと幸せに
    する道具。」
   ※「もっと幸せに」に yellow highlight（::after疑似要素）
③ サブコピー（Zen Maru Gothic）:
   「難しくない。怖くない。
    パパも、ママも、お子さんも、シニアも。
    家族みんなで使えるAI活用法をお届けします。」
④ CTAボタン2つ:
   - Primary: 「🚀 まず読んでみる」orange gradient, pill, shadow
   - Secondary: 「🎯 自分に合った使い方を探す」white, pill, border

右カラム（ビジュアル）:
- 420x420pxの相対配置コンテナ
- 中央: AIカード（🤖 / 「AI = 愛」/ orange背景）
- 四隅に家族カード（絶対配置・floatアニメーション・異なるdelay）
  - 左上: パパ👨 「仕事効率化」
  - 右上: ママ👩 「家事・育児」
  - 左下: 子ども🧒「勉強・創作」
  - 右下: シニア👴👵「スマホ活用」
- 各カードホバー: scale(1.06) rotate(-1deg)
```

---

### 3. ロール選択UI（RolePicker.tsx）

```
コンテナ: beige背景・rounded-5xl・padding-80px
中央揃えテキスト

ロールグリッド: 5カラム（モバイル: 3カラム）、gap-16px

ロールカード（各）:
- 白背景・rounded-2xl・padding-28px 16px 24px
- border: 3px solid transparent → 選択時: var(--color-orange)
- 内容: 絵文字（44px）/ 役割名（bold）/ 説明文（12px muted）
- ホバー・選択時: translateY(-6px) + orange shadow

カテゴリフィルター（ロールカードの下）:
- チップ形式（pill shape）
- 8種類: 💼仕事・Office / 🎨デザイン / 🌏外国語 / 📚勉強 / 🍳家事 / 💰お金 / 🏥健康 / ✍️ライティング
- 非選択: 白背景・beige border
- 選択時: orange背景・white text
- ホバー: translateY(-2px)

状態管理:
- selectedRole: string | null
- selectedCategories: string[]
- 変更時にuseRouter().push()でURLクエリパラメータ更新
```

---

### 4. 記事カード（ArticleCard.tsx）

```typescript
interface ArticleCardProps {
  article: {
    slug: string;
    title: string;
    description: string;
    roles: Role[];
    categories: Category[];
    level: Level;
    audioUrl?: string;      // 音声あり = 語学コンテンツ
    publishedAt: Date;
  };
}
```

```
外観:
- 白背景・rounded-2xl・border 2px transparent
- ホバー: translateY(-6px) + shadow-xl + border: var(--color-peach-light)

サムネイル部分（h-140px）:
- ロールに対応した背景色（--color-{role}）
- 中央に大きな絵文字（カテゴリ対応）

ボディ部分（padding-20px）:
- ロールタグ + カテゴリタグ（pill・各色対応）
- タイトル（15px bold）
- 日付 + レベルバッジ + 音声マーク（audioUrlある場合）🎵
```

---

### 5. 音声プレイヤー（AudioPlayer.tsx）

```typescript
interface AudioPlayerProps {
  src: string;
  title: string;
  transcript?: string;
  durationSec?: number;
}
```

**必須機能（すべて実装すること）:**
- ▶️ / ⏸ 再生・一時停止
- シークバー（カスタムスタイル・進捗色orange）
- 速度変更: `[0.5, 0.75, 1.0, 1.25, 1.5, 2.0]` ボタン切り替え
- 🔁 リピートトグル
- 残り時間 / 総時間表示（MM:SS形式）
- transcript表示切り替えボタン（「📝 テキストを表示」）

**デザイン:**
- beige背景・rounded-2xl・padding-20px
- シークバー高さ 6px・orange fill・thumb hover拡大
- 速度ボタン: pill形状、現在速度orange・その他gray

---

### 6. AIチャットウィジェット（AIChatWidget.tsx）

記事詳細ページ右サイドバーに配置する浮かびあがるウィジェット。

```
外観:
- 白背景・rounded-2xl・shadow-xl
- ヘッダー: 「🤖 AIに質問する」 orange accent
- 入力欄: textarea（3行）+ 送信ボタン（orange）
- レスポンス表示エリア（スクロール可能）
- ローディング: 3点ドットアニメーション

API呼び出し先: POST /api/ai
type: 記事のカテゴリに応じて自動選択
  - language系 → 'text-quality'（Claude Haiku）
  - その他    → 'text-simple'（Gemini Flash）
```

---

### 7. フッター（Footer.tsx）

```
背景: var(--color-brown)
テキスト: rgba(255,255,255,0.8)

4カラムグリッド:
① ブランド: ロゴ + サイト説明（「AI = 愛、家族の幸せのために」）
② ロール別: パパ向け / ママ向け / 子ども向け / シニア向け
③ カテゴリ: Office / デザイン / 語学 / 勉強 / 家事 / お金
④ サイト情報: Aboutページ / お問い合わせ / プライバシーポリシー

ボトム:
- 細いボーダー区切り
- 「© 2026 familyai.jp — AI = 愛」
```

---

## ═══════════════════════════════════
## フォルダ構成
## ═══════════════════════════════════

### 設計方針：iOSアプリへの将来的な拡張を見据えた構成

**今はWebのみで実装するが、将来のiOSアプリ（React Native / Expo）への流用を最大化するため、`shared/` 層を必ず分離して作ること。**

将来のフォルダ構成イメージ（参考・今は不要）：
```
familyai-monorepo/
├── apps/
│   ├── web/      ← 今作るNext.jsサイト
│   └── mobile/   ← 将来のExpo（iOSアプリ）
└── shared/       ← 両方で使う共通コード
```

今回（Web単体）はこの構造を1つのリポジトリに統合した形で作る。
ただし `shared/` ディレクトリを明示的に設け、**将来そのままモバイルに持ち出せる**ように設計すること。

```
familyai/
│
├── shared/                           # ★ iOSアプリと共用する層（最重要）
│   ├── types/
│   │   └── index.ts                  # Role・Category・Level 型定義
│   ├── constants/
│   │   ├── roles.ts                  # ロール名・絵文字・説明文
│   │   ├── categories.ts             # カテゴリ名・絵文字
│   │   └── colors.ts                 # ブランドカラー定数（hex値）
│   ├── utils/
│   │   ├── filter.ts                 # 記事フィルタリングロジック
│   │   ├── format.ts                 # 日付・時間フォーマット（MM:SS等）
│   │   └── validate.ts               # バリデーション関数
│   └── api/
│       ├── client.ts                 # APIクライアント（fetch wrapper）
│       ├── articles.ts               # 記事取得API関数
│       └── ai.ts                     # AI APIリクエスト関数
│
├── app/                              # Next.js App Router（Web専用）
│   ├── (site)/
│   │   ├── page.tsx                  # トップページ
│   │   ├── learn/
│   │   │   ├── page.tsx              # 記事一覧
│   │   │   └── [slug]/page.tsx       # 記事詳細
│   │   ├── common/page.tsx           # 共通ガイド
│   │   ├── apps/page.tsx             # 自作アプリ（Phase2）
│   │   └── about/page.tsx            # About
│   ├── api/
│   │   ├── ai/route.ts               # AIルーター（Web・App共通で叩く）
│   │   └── audio/route.ts            # 音声配信
│   ├── globals.css                   # アニメーション・CSS変数
│   ├── layout.tsx                    # フォント・メタデータ
│   └── sitemap.ts / robots.ts
│
├── components/                       # Web専用UIコンポーネント
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── MobileNav.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── RolePicker.tsx            # ← shared/constants/roles.ts を参照
│   │   ├── CategoryFilter.tsx        # ← shared/constants/categories.ts を参照
│   │   └── StatsRow.tsx
│   ├── article/
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleGrid.tsx           # ← shared/utils/filter.ts を使用
│   │   ├── AudioPlayer.tsx
│   │   └── AIChatWidget.tsx          # ← shared/api/ai.ts を呼び出す
│   └── ui/                           # shadcn/uiコンポーネント
│
├── lib/
│   ├── db/
│   │   ├── schema.ts                 # DBスキーマ（shared/types/ と整合）
│   │   └── index.ts
│   ├── ai/router.ts                  # サーバー側AIルーター
│   └── utils.ts                      # Web専用ユーティリティ
│
├── hooks/
│   └── useScrollReveal.ts            # Web専用フック
│
├── tailwind.config.ts
├── drizzle.config.ts
└── .env.local.example
```

### shared/ 層の実装ルール（厳守）

**① `shared/` 内では以下を絶対に使わないこと:**

| 禁止事項                  | 理由                  |
| --------------------- | ------------------- |
| `next/*` のimport      | Next.js専用・Appでは動かない |
| `react-dom/*` のimport | Web専用               |
| `document` / `window` | ブラウザ専用API           |
| Tailwind クラス名の文字列     | App側にTailwindはない    |
| HTMLタグ（`<div>` 等）     | React Nativeでは使えない  |

**② `shared/` 内で使って良いもの:**

```typescript
// ✅ OK: 純粋なTypeScript・ユニバーサルなもの
export const ROLES = ['papa', 'mama', 'kids', 'senior', 'common'] as const;
export type Role = typeof ROLES[number];

// ✅ OK: fetch()はWeb・React Native両方で動く
export async function fetchArticles(role?: Role) {
  const res = await fetch(`${API_BASE_URL}/api/articles?role=${role ?? ''}`);
  return res.json();
}

// ✅ OK: 純粋な計算・フォーマット関数
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ✅ OK: ブランドカラー定数（hex値）
export const COLORS = {
  orange:  '#FF8C42',
  peach:   '#FFAD80',
  cream:   '#FDF6ED',
  brown:   '#8B5E3C',
} as const;
```

**③ components/ は Web 専用と明示する:**

```typescript
// components/article/ArticleCard.tsx の先頭コメント
// [Web専用] iOSアプリではshared/を参照してReact Nativeで再実装すること
```

### iOSアプリ化の将来イメージ（参考）

```typescript
// 将来のExpoアプリ側（mobile/components/ArticleCard.tsx）では
// shared/ からロジックをそのままimportして、UIだけ書き直す

import { ROLES, COLORS } from '../../shared/constants';
import { formatDuration }  from '../../shared/utils/format';
import { fetchArticles }   from '../../shared/api/articles';

// UIだけReact Native用に書き直す（30%の作業）
export function ArticleCard({ article }: Props) {
  return (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.title}>{article.title}</Text>
    </TouchableOpacity>
  );
}
```

---

## ═══════════════════════════════════
## データベーススキーマ
## ═══════════════════════════════════

```typescript
// lib/db/schema.ts
// ⚠️ ROLES / CATEGORIES / LEVELS の定義は shared/ 層が唯一の正とする。
// ここでは shared/ からimportすること。直接定義しないこと（二重管理防止）。
import { ROLES, CATEGORIES, LEVELS } from '../shared/types';
export type { Role, Category, Level } from '../shared/types';

export const articles = pgTable('articles', {
  id:               uuid('id').defaultRandom().primaryKey(),
  slug:             varchar('slug', { length: 255 }).notNull().unique(),
  title:            varchar('title', { length: 255 }).notNull(),
  description:      text('description'),
  body:             text('body').notNull(),             // Markdown形式（react-markdownでレンダリング）
  roles:            text('roles').array().notNull(),
  categories:       text('categories').array().notNull(),
  level:            varchar('level', { length: 20 }).notNull().default('beginner'),
  audioUrl:         text('audio_url'),
  audioTranscript:  text('audio_transcript'),           // SEO用テキスト・ページ本文にも表示する
  audioDurationSec: integer('audio_duration_sec'),
  audioLanguage:    varchar('audio_language', { length: 10 }), // 語学コンテンツの言語: 'en'|'zh'|'ko'|'fr' 等
  audioPlayCount:   integer('audio_play_count').notNull().default(0), // 音声再生回数
  thumbnailUrl:     text('thumbnail_url'),
  viewCount:        integer('view_count').notNull().default(0),        // 閲覧数（人気記事表示に使用）
  isFeatured:       boolean('is_featured').notNull().default(false),   // トップページおすすめ表示フラグ
  published:        boolean('published').notNull().default(false),
  publishedAt:      timestamp('published_at'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id:               uuid('id').defaultRandom().primaryKey(),
  email:            varchar('email', { length: 255 }).notNull().unique(),
  name:             varchar('name', { length: 255 }),
  image:            text('image'),
  // 認証プロバイダー: 'google' | 'local' | 'apple'（将来追加）
  authProvider:     varchar('auth_provider', { length: 20 }).notNull().default('local'),
  // ローカルアカウント用（Google/Appleログイン時はnull）
  // パスワードポリシー: 8文字以上・bcrypt saltRounds:12 でハッシュ化
  passwordHash:     text('password_hash'),
  plan:             varchar('plan', { length: 20 }).notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(), // プラン変更・プロフィール更新時に更新
});

export const bookmarks = pgTable('bookmarks', {
  id:        uuid('id').defaultRandom().primaryKey(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // 同一ユーザーによる同一記事の二重ブックマークを防ぐ
  uniqUserArticle: unique().on(table.userId, table.articleId),
}));

export const apps = pgTable('apps', {
  id:           uuid('id').defaultRandom().primaryKey(),
  name:         varchar('name', { length: 255 }).notNull(),
  description:  text('description'),
  url:          text('url').notNull(),
  categories:   text('categories').array().notNull(),
  roles:        text('roles').array().notNull(),
  thumbnailUrl: text('thumbnail_url'),
  isPro:        boolean('is_pro').notNull().default(false),
  published:    boolean('published').notNull().default(false),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(), // 運用更新監査用
});
```

---

## ═══════════════════════════════════
## URLと検索設計
## ═══════════════════════════════════

```
/learn                          # 全記事
/learn?role=papa                # パパ向け全記事
/learn?role=mama&cat=cooking    # ママ×料理
/learn?cat=language             # 語学全記事
/learn?level=beginner           # 初心者向け
```

Server Components + `searchParams` prop でサーバーサイドフィルタリング。
クライアント側の状態変更時は `router.push()` でURLを更新。

---

## ═══════════════════════════════════
## /api/articles エンドポイント仕様
## ═══════════════════════════════════

```typescript
// app/api/articles/route.ts

// GET /api/articles
// クエリパラメータ:
//   role      : Role（任意）
//   cat       : Category（任意）
//   level     : Level（任意）
//   page      : number（デフォルト: 1）
//   limit     : number（デフォルト: 12・最大: 50）
//   sort      : 'latest' | 'popular'（デフォルト: 'latest'）

// レスポンス形式（成功時 200）:
interface ArticlesResponse {
  articles: Article[];
  pagination: {
    page:       number;
    limit:      number;
    total:      number;
    totalPages: number;
    hasNext:    boolean;
    hasPrev:    boolean;
  };
}

// エラー形式（失敗時）:
interface ErrorResponse {
  error: {
    code:    string;   // 例: 'INVALID_ROLE' | 'DB_ERROR'
    message: string;   // 日本語メッセージ（ユーザー表示用）
  };
}

// 実装ルール:
// - published: true の記事のみ返す
// - sort='popular' のとき viewCount の降順
// - sort='latest'  のとき publishedAt の降順
// - viewCount は記事詳細ページへのアクセス時に +1 インクリメント
// - audioPlayCount は AudioPlayer の再生開始時に +1 インクリメント
```

---

## ═══════════════════════════════════
## レート制限（Rate Limiting）
## ═══════════════════════════════════

```typescript
// app/api/ai/route.ts に実装すること

// AI API（/api/ai）のレート制限:
// - 未ログインユーザー: IP単位で 10回/日
// - ログイン済みユーザー（無料）: userId単位で 30回/日
// - ログイン済みユーザー（有料）: userId単位で 200回/日

// ⚠️ IPのみ判定だと共有回線（オフィス・学校）で誤検知が起きる。
//    userId + IP のハイブリッド判定を使うこと。

import { Ratelimit } from '@upstash/ratelimit';
import { Redis }     from '@upstash/redis';

const redis = Redis.fromEnv();

// プランごとに別インスタンスを作成
const rateLimitAnon = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 d'),
  prefix:  'ratelimit:anon',
});
const rateLimitFree = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 d'),
  prefix:  'ratelimit:free',
});
const rateLimitPro = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, '1 d'),
  prefix:  'ratelimit:pro',
});

// 判定キー:
// 未ログイン → IP アドレス
// ログイン済み → userId（IPより安定・共有回線問題を回避）
// ※ IPとuserIdを組み合わせる場合: `${userId}:${ip}` をキーにする

// レート制限超過時のレスポンス（日本語）:
// HTTP 429 Too Many Requests
// { error: { code: 'RATE_LIMIT_EXCEEDED', message: '1日の利用上限に達しました。明日またお試しください。' } }

// 環境変数に追加:
// UPSTASH_REDIS_REST_URL=
// UPSTASH_REDIS_REST_TOKEN=
```

### 入力バリデーション（zod）

```typescript
// すべての API Route で zod によるスキーマバリデーションを実装すること

// shared/utils/validate.ts
import { z } from 'zod';

// /api/ai への入力スキーマ
export const aiRequestSchema = z.object({
  type:    z.enum(['text-simple', 'text-quality', 'math-reasoning', 'transcribe', 'image-gen', 'tts-japanese']),
  prompt:  z.string().min(1).max(2000),  // 最大2000文字（≒500トークン）
  options: z.record(z.unknown()).optional(),
});

// /api/articles への入力スキーマ
export const articlesQuerySchema = z.object({
  role:  z.enum(['papa', 'mama', 'kids', 'senior', 'common']).optional(),
  cat:   z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort:  z.enum(['latest', 'popular']).default('latest'),
});

// 共通エラーフォーマット
export type ApiError = {
  error: {
    code:    string;
    message: string;  // 日本語・ユーザー表示用
  };
};
```

> ⚠️ Upstash Redis の無料枠は **500,000リクエスト/月**（日次ではなく月次）。
> junliToDo の表記を修正済み。

---

## ═══════════════════════════════════
## コスト管理・上限アラート
## ═══════════════════════════════════

月額費用は利用量次第で大きく変動します。以下を必ず設定すること。

### 月額費用の現実的な見積もり

| 項目 | 最小（ほぼ無利用） | 通常（月100〜300記事PV） | 最大（音声大量再生） |
|---|---|---|---|
| Vercel | 0円 | 0円 | 0〜2,000円 |
| Neon PostgreSQL | 0円 | 0円 | 0円（無料枠内） |
| Vercel Blob（転送量） | 0円 | 100〜500円 | 2,000円〜 |
| OpenRouter AI | 0円 | 200〜1,000円 | 3,000円〜 |
| Upstash Redis | 0円 | 0円 | 0円（無料枠内） |
| **合計** | **0円** | **300〜1,500円** | **5,000円〜** |

> ⚠️ 音声ファイルの配信量（Data Transfer）がコスト支配になりやすい。
> CDNキャッシュ戦略・適切なビットレート設計が必要。

### コスト上限アラート設定（必須）

CodingAgentは以下のアラート設定を実装すること:

```typescript
// OpenRouter: ダッシュボードで月間予算上限を設定
// https://openrouter.ai/settings/billing → 月間上限: $20 を設定

// Vercel: 利用量アラートを設定
// Vercel Dashboard → Settings → Billing → Usage Alerts

// 超過時の自動劣化モード:
// OpenRouterの月間コストが上限に近づいたら
// text-quality → text-simple に自動ダウングレード
const isNearCostLimit = await checkMonthlyCost() > 15; // $15超えたら
const effectiveType = isNearCostLimit && type === 'text-quality'
  ? 'text-simple'  // 低コストモデルに自動切り替え
  : type;
```

---

## ═══════════════════════════════════
## 記事本文のMarkdownレンダリング
## ═══════════════════════════════════

```typescript
// 採用ライブラリ: react-markdown + remark-gfm + rehype-highlight + rehype-sanitize

// インストール:
// pnpm add react-markdown remark-gfm rehype-highlight rehype-sanitize

// components/article/ArticleBody.tsx
import ReactMarkdown   from 'react-markdown';
import remarkGfm       from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize  from 'rehype-sanitize';  // ⚠️ XSS対策・必須

export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="article-body prose prose-warm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSanitize,   // 必ずrehype-highlightより前に実行すること
          rehypeHighlight,
        ]}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

// ⚠️ rehype-sanitize を外すと、記事本文にスクリプトを仕込まれた場合に
//    XSS攻撃が成立する。管理者が記事を書く場合でも必ず適用すること。

// globals.css に prose-warm スタイルを定義:
// - 見出し: Kaisei Opti フォント・brownカラー
// - リンク: orangeカラー
// - コードブロック: beige背景
// - 引用: beige-dark左ボーダー
```

---

## ═══════════════════════════════════
## ローディング・エラーUIの仕様
## ═══════════════════════════════════

```
Next.js App Router の規約ファイルを必ず作成すること:

app/(site)/
├── loading.tsx          # ページ全体のローディング（スケルトンUI）
├── error.tsx            # エラー境界（日本語エラーメッセージ）
├── not-found.tsx        # 404ページ
└── learn/
    ├── loading.tsx      # 記事一覧のスケルトン（カード3×3のgray枠）
    └── [slug]/
        └── loading.tsx  # 記事詳細のスケルトン

スケルトンUIのデザイン:
- 背景: var(--color-beige) / 角丸: rounded-2xl
- アニメーション: animate-pulse（Tailwind標準）
- カードスケルトン: サムネイル部分（h-140px）＋タイトル行（h-4）×2

エラーページのデザイン:
- 中央揃え・絵文字アイコン（😢）
- 日本語メッセージ:
  - 404: 「このページは見つかりませんでした」
  - 500: 「申し訳ありません。しばらくしてからもう一度お試しください。」
- 「トップページへ戻る」ボタン（orange）

AI応答エラー時の日本語メッセージ一覧:
- RATE_LIMIT_EXCEEDED : 「1日の利用上限に達しました。明日またお試しください。」
- AI_UNAVAILABLE      : 「AIが一時的に利用できません。しばらくしてからお試しください。」
- INVALID_REQUEST     : 「入力内容を確認してもう一度お試しください。」
```

---

## ═══════════════════════════════════
## OGP画像の生成方法
## ═══════════════════════════════════

```typescript
// app/api/og/route.tsx
// @vercel/og を使って記事別OGP画像を動的生成する

// インストール:
// pnpm add @vercel/og

import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

// ⚠️ @vercel/og はデフォルトで日本語フォントを持っていない。
// Noto Sans JP（または Kaisei Opti）をfetchして渡さないと日本語が文字化けする。
// 以下のフォント読み込みを必ず実装すること:
//
// const fontData = await fetch(
//   new URL('../../../public/fonts/NotoSansJP-Bold.ttf', import.meta.url)
// ).then(res => res.arrayBuffer());
//
// そして ImageResponse の options に渡す:
// { width: 1200, height: 630, fonts: [{ name: 'NotoSansJP', data: fontData, weight: 700 }] }
//
// フォントファイルは public/fonts/ に配置し、Gitにコミットすること。

// GET /api/og?title=記事タイトル&role=papa
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') ?? 'familyai.jp';
  const role  = searchParams.get('role')  ?? 'common';

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        background: '#FDF6ED',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: '80px',
      }}>
        <div style={{ fontSize: 24, color: '#B5896A', marginBottom: 24 }}>
          familyai.jp
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, color: '#8B5E3C', lineHeight: 1.3 }}>
          {title}
        </div>
        <div style={{ fontSize: 22, color: '#FF8C42', marginTop: 32 }}>
          AI = 愛 — 家族みんなのAI活用メディア
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

// 記事詳細ページのメタデータ:
// openGraph.images: [{ url: `/api/og?title=${article.title}&role=${article.roles[0]}` }]

// デフォルトOGP画像（og-default.png）:
// public/og-default.png として1200×630pxのPNG画像を配置すること
// → 上記のデザインをCanvaで作成してpublicに置く（junliさんの作業）
```

---

## ═══════════════════════════════════
## 構造化データ（JSON-LD）仕様
## ═══════════════════════════════════

```typescript
// 記事詳細ページ（/learn/[slug]）に必ず実装すること

// ① Article スキーマ（全記事共通）
const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline:      article.title,
  description:   article.description,
  datePublished: article.publishedAt?.toISOString(),
  dateModified:  article.updatedAt.toISOString(),
  author: {
    '@type': 'Person',
    name: 'AIおじさん',
    url:  'https://familyai.jp/about',
  },
  publisher: {
    '@type':  'Organization',
    name:     'familyai.jp',
    url:      'https://familyai.jp',
    logo: { '@type': 'ImageObject', url: 'https://familyai.jp/logo.png' },
  },
};

// ② AudioObject スキーマ（audioUrlがある記事のみ追加）
const audioJsonLd = article.audioUrl ? {
  '@context': 'https://schema.org',
  '@type': 'AudioObject',
  name:            article.title,
  description:     article.description,
  contentUrl:      article.audioUrl,
  duration:        `PT${Math.floor((article.audioDurationSec ?? 0) / 60)}M${(article.audioDurationSec ?? 0) % 60}S`,
  inLanguage:      article.audioLanguage ?? 'ja',
  transcript:      article.audioTranscript,
} : null;

// 実装方法:
// <script type="application/ld+json">
//   {JSON.stringify(articleJsonLd)}
// </script>

// 音声コンテンツのtranscriptはページ本文にも表示すること:
// → audioTranscriptがある場合、記事本文の下に「📝 音声テキスト」セクションとして表示
// → SEOにも効果的・アクセシビリティ向上にもなる
```

---

## ═══════════════════════════════════
## プライバシーポリシー・利用規約
## ═══════════════════════════════════

```
以下のページを必ず作成すること:

app/(site)/
├── privacy/page.tsx   # プライバシーポリシー（/privacy）
└── terms/page.tsx     # 利用規約（/terms）

必須記載事項（プライバシーポリシー）:
- 収集する情報: メールアドレス・Google アカウント情報・閲覧履歴
- 利用目的: サービス提供・改善・メルマガ配信
- 第三者提供: Stripe・Vercel・Google Analytics
- Cookie・アクセス解析（Google Analytics）の利用
- お問い合わせ先

必須記載事項（利用規約）:
- サービスの説明
- 禁止事項
- 免責事項
- 著作権
- 変更・終了

> ⚠️ App Store・Google Play・Stripe の審査に必須。
> junliさんがご自身の状況に合わせて内容を確認・修正すること。
> CodingAgentはテンプレートを作成するが、法的確認はjunliさん本人が行うこと。
```

---

## ═══════════════════════════════════
## AI APIルーター仕様
## ═══════════════════════════════════

### /api/ai 運用仕様（必須）

```typescript
// app/api/ai/route.ts

// ── 入力制限 ──
// prompt: 最大2,000文字（zodでバリデーション・超過時は400エラー）
// リクエストボディ: 最大10KB
// 同時接続: Vercelの制限に依存（Hobby: 最大10並列）

// ── タイムアウト ──
// Vercel Hobby プランの最大実行時間: 10秒
// → OpenRouter呼び出しタイムアウト: 8秒（バッファ2秒）
// ⚠️ Vercel Proなら60秒まで延長可能。MVPはHobbyで進める。
// ⚠️ OPENROUTER_CONFIG.timeout（後述）と必ず整合させること: timeout = maxDuration - 2秒
export const maxDuration = 10; // Vercel Edge Runtime用（Hobbyプラン上限）

// ── エラーコード一覧（日本語メッセージ付き）──
const AI_ERRORS = {
  RATE_LIMIT_EXCEEDED:  '1日の利用上限に達しました。明日またお試しください。',
  INPUT_TOO_LONG:       '入力が長すぎます。2,000文字以内で入力してください。',
  AI_TIMEOUT:           'AIの応答に時間がかかっています。しばらくしてからお試しください。',
  AI_UNAVAILABLE:       'AIが一時的に利用できません。しばらくしてからお試しください。',
  INVALID_REQUEST:      '入力内容を確認してもう一度お試しください。',
  COST_LIMIT_EXCEEDED:  '今月の利用上限に達しました。来月またお試しください。',
} as const;

// ── OpenRouterキー漏洩時の緊急対応 ──
// 1. https://openrouter.ai/settings/keys でキーを即座に無効化
// 2. 新しいキーを発行
// 3. Vercel環境変数 OPENROUTER_API_KEY を更新してRedeploy
// ⚠️ junliToDo にもこの手順を記載済み
```

type AIRequestType =
  | 'text-simple'    // 一般質問・要約
  | 'text-quality'   // 高品質回答（語学・複雑相談）
  | 'math-reasoning' // 数学・論理推論（例: DeepSeek）
  | 'transcribe'     // 音声→テキスト
  | 'image-gen'      // 画像生成（例: Gemini Image）
  | 'tts-japanese'   // 日本語音声合成
  // TODO: Phase3 - Seedance動画生成（有料会員限定）

interface AIRequest {
  type: AIRequestType;
  prompt: string;
  options?: Record<string, unknown>;
}

// Provider抽象化（必須）
// 原則は openrouter。例外が必要な場合のみ direct provider を使う。
type Provider = 'openrouter' | 'voicevox-direct';

interface ModelRoute {
  primary: { provider: Provider; model: string };
  fallback?: { provider: Provider; model: string }[];
}

const MODEL_ROUTER: Record<AIRequestType, ModelRoute> = {
  'text-simple': {
    primary: { provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
    fallback: [{ provider: 'openrouter', model: 'anthropic/claude-3.5-haiku' }],
  },
  'text-quality': {
    primary: { provider: 'openrouter', model: 'anthropic/claude-3.5-haiku' },
    fallback: [{ provider: 'openrouter', model: 'google/gemini-2.0-pro' }],
  },
  'math-reasoning': {
    primary: { provider: 'openrouter', model: 'deepseek/deepseek-r1' },
    fallback: [{ provider: 'openrouter', model: 'openai/gpt-4o-mini' }],
  },
  'transcribe': {
    primary: { provider: 'openrouter', model: 'openai/whisper-1' },
  },
  'image-gen': {
    primary: { provider: 'openrouter', model: 'google/gemini-2.5-flash-image-preview' },
    fallback: [{ provider: 'openrouter', model: 'openai/gpt-image-1' }],
  },
  'tts-japanese': {
    primary: { provider: 'voicevox-direct', model: 'voicevox-jp' }, // 例外直結
  },
};

---

### /api/audio 運用仕様（必須）

```typescript
// app/api/audio/route.ts

// ── 署名URL方式 ──
// Vercel Blob から署名付きURLを発行し、クライアントに返す。
// 音声ファイルを直接ストリームしないこと（Vercel関数の実行時間超過リスク）。

// GET /api/audio?slug=article-slug
// レスポンス: { url: '署名付きURL', expiresAt: ISO8601 }

// 署名URL有効期限: 1時間（3,600秒）
// ⚠️ 有効期限切れ後は再度 /api/audio を叩いて新しいURLを取得する

// ── HTTP Range リクエスト対応 ──
// 音声ファイルのシーク（途中から再生）にはRangeヘッダーが必要。
// Vercel Blobの署名URLはRangeリクエストをサポートしているため、
// クライアント（AudioPlayer）から直接署名URLに対してRangeリクエストを送ること。
// サーバー側でRange対応を実装する必要はない。

// ── 再生カウント重複防止ルール ──
// audioPlayCount のインクリメントは以下のルールで行うこと:
// - 再生開始から30秒以上聴いた場合のみカウント
// - 同一ユーザー（または同一IP）の同一記事は1日1カウントまで
// - クライアント側で30秒経過時に POST /api/audio/play { slug } を送信
// - サーバー側でRedisを使って重複チェック（key: `play:${userId}:${slug}:${date}`）

// ── エラーハンドリング ──
const AUDIO_ERRORS = {
  NOT_FOUND:      'この音声コンテンツは見つかりませんでした。',
  EXPIRED:        '再生リンクの有効期限が切れました。ページを再読み込みしてください。',
  UNAVAILABLE:    '音声の読み込みに失敗しました。しばらくしてからお試しください。',
} as const;
```

### 用途別モデル選択ポリシー（必須）

| 用途 | `AIRequestType` | 第1候補 | 第2候補（Fallback） |
|---|---|---|---|
| 一般Q&A・要約 | `text-simple` | OpenRouter経由 Gemini Flash | OpenRouter経由 Claude Haiku |
| 語学・丁寧な文章改善 | `text-quality` | OpenRouter経由 Claude Haiku | OpenRouter経由 Gemini Pro |
| 数学・論理推論 | `math-reasoning` | OpenRouter経由 DeepSeek R1 | OpenRouter経由 OpenAI小型モデル |
| 音声文字起こし | `transcribe` | OpenRouter経由 Whisper | - |
| 画像生成 | `image-gen` | OpenRouter経由 Gemini Image | OpenRouter経由 OpenAI Image |
| 日本語TTS | `tts-japanese` | Voicevox直結（例外） | - |

実装ルール:
- **ルーティングは `type` で固定**し、UIやページから直接モデル名を指定しないこと
- **原則はOpenRouter経由**で呼び出すこと（HTTP直叩きで実装・`lib/ai/providers/openrouter.ts` に集約）
- `lib/ai/providers/openrouter.ts` に以下を設定ファイルとして定義すること:
  ```typescript
  export const OPENROUTER_CONFIG = {
    timeout:      8_000,    // ms: 8秒でタイムアウト（Vercel Hobby maxDuration:10秒に対してバッファ2秒）
    maxRetries:   2,        // タイムアウト/5xx時のリトライ回数
    maxInputChars: 2_000,   // ユーザー入力の最大文字数（≒500トークン相当）
    fallbackOrder: ['text-simple', 'text-quality'] as const,
    // 月間コスト上限（超過時は text-simple に強制切り替え）
    monthlyCostLimitUSD: 20,
  } as const;
  ```
- 例外provider（例: Voicevox直結）は `lib/ai/providers/*-direct.ts` で明示的に分離すること
- `lib/ai/router.ts` は provider/model/fallback の切替のみ担当し、ビジネスロジックを持たせないこと
- 失敗時は `fallback` を順に試行し、最終失敗時のみエラーを返す
- どのモデルが使われたか（provider/model/latency/token）をサーバーログに記録する
- 将来のモデル入替は `MODEL_ROUTER` のみ編集して完結させる

---

## ═══════════════════════════════════
## SEO設定
## ═══════════════════════════════════

### app/layout.tsx（サイト全体）

```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://familyai.jp'),
  title: {
    default: 'familyai.jp — 家族みんなのAI活用サイト',
    template: '%s | familyai.jp',
  },
  description: 'AI（愛）で家族をもっと幸せに。パパ・ママ・子ども・シニアに向けたAI活用事例とガイドをお届け。',
  keywords: ['AI活用', '家族', 'ChatGPT', 'Claude', '子育て', 'シニア', '語学学習'],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'familyai.jp',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
};
```

### app/sitemap.ts（自動生成）
全公開記事のURLをDBから取得して返すこと。

### app/robots.ts
```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://familyai.jp/sitemap.xml',
  };
}
```

---

## ═══════════════════════════════════
## スクロールリビールフック
## ═══════════════════════════════════

```typescript
// hooks/useScrollReveal.ts
// Intersection Observerを使い、.reveal クラスの要素が
// ビューポートに入ったとき .visible クラスを付与する

export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
```

トップページのレイアウトコンポーネントで `useScrollReveal()` を呼び出し、
各セクションに `className="reveal"` を付けること。

---

## ═══════════════════════════════════
## Aboutページ必須文言
## ═══════════════════════════════════

`app/(site)/about/page.tsx` に以下の文言を必ず含めること。

> 「このサイトは、18年間支えてくれた妻への感謝と、
>  家族の幸せへの想いから生まれました。
>  AI（愛）は、企業の効率化のためだけでなく、
>  家族の笑顔のためにあると信じています。」

---

## ═══════════════════════════════════
## 初期シードデータ（lib/db/seed.ts）
## ═══════════════════════════════════

```typescript
const seedArticles = [
  { slug: 'chatgpt-account-setup',      title: 'ChatGPTのアカウント作成〜最初の会話まで',          roles: ['common'],          categories: ['basic'],              level: 'beginner'     },
  { slug: 'claude-install-guide',       title: 'Claudeのインストールと使い方【完全ガイド】',         roles: ['common'],          categories: ['basic'],              level: 'beginner'     },
  { slug: 'excel-ai-automation-papa',   title: 'ExcelをAIで自動化する方法【パパ向け】',              roles: ['papa'],             categories: ['office'],             level: 'intermediate' },
  { slug: 'meeting-minutes-ai',         title: '議事録を10秒で作るAI活用術',                       roles: ['papa'],             categories: ['office', 'writing'],  level: 'intermediate' },
  { slug: 'ai-english-email',           title: 'AIで英語メールを書く【ビジネス対応】',               roles: ['papa', 'mama'],     categories: ['language', 'office'], level: 'beginner'     },
  { slug: 'meal-planning-ai',           title: '献立を毎日AIに考えてもらう方法',                    roles: ['mama'],             categories: ['cooking'],            level: 'beginner'     },
  { slug: 'ai-homework-helper',         title: '子どもの宿題をAIで楽しく教える方法',                roles: ['mama', 'kids'],     categories: ['study'],              level: 'beginner'     },
  { slug: 'ai-picture-book-kids',       title: 'AIで絵本を作ってみよう【子ども向け】',               roles: ['kids'],             categories: ['design', 'study'],    level: 'beginner'     },
  { slug: 'smartphone-ai-senior',       title: 'スマホでAIを使う方法【シニア・超丁寧解説】',         roles: ['senior'],           categories: ['basic'],              level: 'beginner'     },
  { slug: 'ai-health-check-senior',     title: '薬の説明をAIに聞いてみよう【シニア向け】',           roles: ['senior'],           categories: ['health'],             level: 'beginner'     },
];
```

---

## ═══════════════════════════════════
## 環境変数（.env.local.example）
## ═══════════════════════════════════

```bash
# Database（Vercel Neon）
DATABASE_URL=

# Auth（NextAuth.js）
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# ── Phase 1: Google ログイン ──
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Phase 1: ローカルアカウント ──
# （NextAuth.js の Credentials Provider で実装・追加キー不要）

# ── Phase 4以降: Apple ID ログイン（TODO）──
# APPLE_ID=
# APPLE_TEAM_ID=
# APPLE_PRIVATE_KEY=
# APPLE_KEY_ID=

# File Storage（Vercel Blob）
BLOB_READ_WRITE_TOKEN=

# Rate Limiting（Upstash Redis）
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# AI APIs（OpenRouter First）
OPENROUTER_API_KEY=           # 必須: 原則すべての生成AI呼び出しを集約
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1  # ベースURL（/chat/completions は付けない）
# ⚠️ OpenRouterはHTTP直叩き（fetch）で実装すること。
# SDKのbaseURLは /api/v1 を期待するが、直叩きは /api/v1/chat/completions になる。
# 混在を防ぐため、lib/ai/providers/openrouter.ts でHTTP直叩きに統一すること。
OPENROUTER_APP_URL=           # 例: https://familyai.jp
OPENROUTER_APP_NAME=          # 例: familyai.jp

# Exception route（必要時のみ）
VOICEVOX_API_BASE=            # 日本語TTSを直結する場合のみ設定
# SEEDANCE_API_KEY=          # TODO: Phase3 動画生成（有料会員限定）

# Payment（Phase2以降）
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Public（フロントエンドから参照可能）
NEXT_PUBLIC_API_URL=https://familyai.jp  # shared/api/ の fetch で使用
```

---

## ═══════════════════════════════════
## 認証設計（ログイン方式）
## ═══════════════════════════════════

### フェーズ別ログイン対応方針

| フェーズ | ログイン方式 | 実装方法 | 備考 |
|---|---|---|---|
| Phase 1（MVP） | Googleアカウント連携 | NextAuth.js Google Provider | ソーシャルログイン |
| Phase 1（MVP） | ローカルアカウント | NextAuth.js Credentials Provider | メール＋パスワード |
| Phase 4以降 | Apple ID | NextAuth.js Apple Provider | iOSアプリリリース時に追加 |

---

### Phase 1 実装内容（必須）

#### ① Google ログイン
```typescript
// lib/auth.ts（NextAuth.js v5 設定）
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // ── Google ログイン ──
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── ローカルアカウント（メール＋パスワード）──
    Credentials({
      credentials: {
        email:    { label: 'メールアドレス', type: 'email' },
        password: { label: 'パスワード',     type: 'password' },
      },
      async authorize(credentials) {
        // DBからユーザー取得・bcryptでパスワード検証
        const user = await getUserByEmail(credentials.email as string);
        if (!user || !user.passwordHash) return null;
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        return isValid ? user : null;
      },
    }),
  ],
  // TODO: Phase4 - Apple ID Provider を追加予定
  // Apple({
  //   clientId:   process.env.APPLE_ID!,
  //   clientSecret: { ... },
  // }),
});
```

#### ② ログインUI の要件
```
ログインページ（/auth/signin）に以下を表示すること:

┌────────────────────────────────┐
│  familyai.jp にログイン        │
│                                │
│  [G] Googleでログイン          │  ← Google OAuth
│                                │
│  ──────── または ────────      │
│                                │
│  メールアドレス: [_________]   │  ← ローカルアカウント
│  パスワード:    [_________]   │
│  [ログイン]                    │
│                                │
│  アカウント登録はこちら        │
└────────────────────────────────┘
```

#### ③ ローカルアカウントの要件
- パスワードポリシー: **8文字以上・英数字混在を推奨**（CodingAgentはzodでバリデーション実装）
- パスワードは `bcrypt`（saltRounds: 12）でハッシュ化して保存
- 会員登録ページ（`/auth/register`）を作成すること
- メールアドレス確認メール送信（`nodemailer` または `Resend`）は Phase2 以降でOK
- パスワードリセット機能も Phase2 以降でOK

#### ⑤ 同一メールアドレスのOAuth/ローカル連携ポリシー（必須）

同じメールアドレスで「Googleログイン」と「ローカルアカウント」が衝突するケースを必ず定義すること。

```typescript
// ポリシー: 「メールアドレスが同じ = 同一ユーザー」として扱う
// 衝突パターン別の挙動:

// ① Googleで登録済み → 同じメールでローカル登録しようとした場合
//    → エラー: 「このメールアドレスはGoogleログインで登録済みです。Googleでログインしてください。」

// ② ローカルで登録済み → 同じメールでGoogleログインしようとした場合
//    → 自動連携: authProviderを'google'に更新し、passwordHashはnullに設定
//    → ログイン後メッセージ: 「Googleアカウントと連携しました。」

// ③ 両方で新規登録 → メールアドレスはUNIQUE制約で物理的に防止済み

// NextAuth.js v5 の設定:
// callbacks.signIn() でこのポリシーを実装する
```

> ⚠️ このポリシーを未定義のままにすると、同一メールで複数アカウントが
> 作成され、ブックマーク・履歴データが分断するリスクがある。

#### ④ CSRF対策
- NextAuth.js v5 はデフォルトで CSRF トークンを使用する（認証エンドポイントは保護済み）
- カスタム API Route（`/api/articles`・`/api/ai`・`/api/audio` 等）には以下を実装すること:

```typescript
// lib/csrf.ts — カスタムAPIルートのCSRF対策
export function validateOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    'https://familyai.jp',
    'https://www.familyai.jp',
    'http://localhost:3000',  // 開発環境のみ
  ];
  // originヘッダーがない場合（サーバー間通信）は許可
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

// 各APIルートの冒頭で呼び出す
// if (!validateOrigin(req)) {
//   return Response.json({ error: { code: 'FORBIDDEN', message: '不正なリクエストです。' } }, { status: 403 });
// }
```

- `next.config.ts` に以下のセキュリティヘッダーを追加すること:
```typescript
headers: [
  { key: 'X-Frame-Options',        value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
]
```
- Cookie は `SameSite=Lax`（NextAuth.js v5 デフォルト）で設定される。変更しないこと。
- 環境変数 `NEXTAUTH_SECRET` は必ず32文字以上のランダム文字列を使用すること。

---

### Phase 4 以降: Apple ID（TODO）

```typescript
// iOSアプリリリース時に追加する
// Apple Developer Program 登録後に設定が必要

// 必要なもの:
// - Apple Developer でSign in with Apple を有効化
// - Services ID（App ID）の作成
// - Private Key（.p8ファイル）の取得

// TODO: Phase4 - Apple ID ログインを追加
// import Apple from 'next-auth/providers/apple';
// Apple({
//   clientId:   process.env.APPLE_ID!,       // Services ID
//   clientSecret: generateAppleSecret({      // JWT生成
//     teamId:     process.env.APPLE_TEAM_ID!,
//     keyId:      process.env.APPLE_KEY_ID!,
//     privateKey: process.env.APPLE_PRIVATE_KEY!,
//   }),
// }),
```

> ⚠️ Apple ID ログインを実装する際の注意点:
> Apple Developer Program（$99/年）への登録が必須。
> iOSアプリでサードパーティログインを使う場合、Appleは
> 「Sign in with Apple」の実装を義務付けている。

---

## ═══════════════════════════════════
## 実装順序（この順番で進めること）
## ═══════════════════════════════════

```
Step 00: 【必須】Skills「frontend-design」を読み込み、デザイン方針を把握する
Step 01: pnpm create next-app + TypeScript + Tailwind + shadcn/ui 初期設定
Step 01b: shared/ ディレクトリ作成（types・constants・utils・api）← iOSアプリ流用層
Step 02: globals.css（CSS変数・アニメーション・ノイズテクスチャ）
Step 03: tailwind.config.ts（ブランドカラー・フォント変数追加）
Step 04: Drizzle ORM + Neon PostgreSQL 接続・schema.ts・マイグレーション
Step 05: Header.tsx + Footer.tsx + MobileNav.tsx
Step 06: app/layout.tsx（フォント・メタデータ・スクロールリビール）
Step 07: HeroSection.tsx（ブロブ背景・家族カードビジュアル）
Step 08: RolePicker.tsx + CategoryFilter.tsx（インタラクション）
Step 09: ArticleCard.tsx + ArticleGrid.tsx
Step 10: app/(site)/learn/page.tsx（一覧・フィルター）
Step 11: app/(site)/learn/[slug]/page.tsx（記事詳細 + ArticleBody + JSON-LD）
Step 12: AudioPlayer.tsx（速度変更・リピート・シーク）← MVP必須・5月8日までに完成させること
Step 13: app/api/audio/route.ts（Vercel Blob からの音声配信・署名URL発行）
Step 13a: app/api/audio/play/route.ts（再生カウント POST・30秒以上 + 1日1回制限）
Step 13b: app/api/articles/route.ts（ページネーション・フィルター・viewCountインクリメント）
Step 14: app/(site)/common/page.tsx + about/page.tsx + privacy/page.tsx + terms/page.tsx
Step 15: app/api/og/route.tsx（@vercel/og による動的OGP画像生成）
Step 16: app/sitemap.ts + robots.ts + SEOメタデータ + JSON-LD
Step 17: レート制限実装（Upstash Redis + @upstash/ratelimit）
Step 18: loading.tsx + error.tsx + not-found.tsx（スケルトンUI・エラーUI）
Step 19: lib/db/seed.ts でシードデータ投入（語学音声記事を含めること）
Step 20: useScrollReveal.ts + StatsRow.tsx（統計行）
Step 21: AIChatWidget.tsx + app/api/ai/route.ts（Phase2 先行実装・余裕があれば）
Step 22: Vercel デプロイ確認・環境変数設定
```

---

## ═══════════════════════════════════
## 全体の段取りと役割分担
## ═══════════════════════════════════

### 概要：誰が何をやるか

| 作業カテゴリ | 担当 |
|---|---|
| コード実装・DB設計・デプロイ設定 | CodingAgent（Claude Code / Codex） |
| アカウント登録・APIキー取得・課金 | junli さん本人 |
| コンテンツ執筆・音声素材準備 | junli さん本人 |
| ストア申請・スクリーンショット準備 | junli さん本人（Phase 4・5） |

---

### フェーズ別 全体スケジュール

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【準備期間】今日（4月14日）〜 5月7日
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
junli さん:
  ① Vercel・Neon・GitHub アカウント作成
  ② Google OAuth / AI APIキー取得
  ③ familyai.jp ドメイン → Vercel 接続
  ④ 初期記事10本・語学音声MP3を準備

CodingAgent:
  ① Next.js プロジェクト構築（Step 00〜09）
  ② 記事一覧・詳細ページ実装
  ③ 音声プレイヤー実装（Step 12〜13）
  ④ SEO・シードデータ投入

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【Phase 1】2026年 5月8日（結婚記念日）🎉 Web リリース
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
公開機能:
  ✅ トップページ（ロール選択・カテゴリフィルター）
  ✅ 記事一覧・詳細ページ（パパ・ママ・子ども・シニア・共通）
  ✅ 語学音声プレイヤー（MP3再生・速度変更・リピート）← 5月8日必須
  ✅ 共通ガイド（AI導入・インストール方法）
  ✅ Aboutページ（奥様への感謝メッセージ）
  ✅ SEO設定・スマホ完全対応
  ✅ Google Analytics / Search Console

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【Phase 2】2026年 6〜8月 — 収益化・AI機能追加
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
junli さん:
  ① Stripe アカウント作成・本人確認
  ② 有料プラン価格・特典を決める
  ③ 音声コンテンツを追加制作・アップロード

CodingAgent:
  ① Stripe 有料会員機能実装
  ② AI質問ウィジェット実装（Gemini Flash・Claude Haiku）
  ③ AI画像生成機能（FLUX.1）
  ④ マイページ・ブックマーク機能
  ⑤ メルマガ配信機能

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【Phase 3】2026年 9〜12月 — 動画・コミュニティ・多言語
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
junli さん:
  ① Seedance API 申し込み
  ② 多言語コンテンツ（中国語・英語）を準備

CodingAgent:
  ① Seedance 動画生成機能（有料会員限定）
  ② コミュニティQ&A機能
  ③ 多言語対応（i18n）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【Phase 4】2026年 Q3〜Q4 — iOSアプリ リリース
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
junli さん:
  ① Apple Developer 登録（$99/年）
  ② App Store Connect でアプリ情報登録
  ③ スクリーンショット・説明文を準備
  ④ 審査提出・リリース

CodingAgent:
  ① Expo プロジェクト作成
  ② shared/ 層を流用してNative UI実装
  ③ Push通知（APNs）設定
  ④ EAS Build でビルド

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【Phase 5】2027年 Q1 — Androidアプリ リリース 🏁ゴール
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
junli さん:
  ① Google Play Developer 登録（$25・初回のみ）
  ② Google Play Console でアプリ情報登録
  ③ スクリーンショット・説明文を準備
  ④ 審査提出・リリース

CodingAgent:
  ① iOSコードの98%をそのまま流用
  ② Push通知を FCM に切り替え（数行の変更）
  ③ EAS Build で Android ビルド
```

---

### CodingAgent への依頼タイミング

```
今すぐ依頼 → Step 00〜19（Web全体実装）
5月8日以降 → Phase 2 機能（Stripe・AI・メルマガ）
2026年末   → Phase 3 機能（動画・コミュニティ・多言語）
2026年後半 → Phase 4（iOSアプリ実装）
2027年初   → Phase 5（Androidアプリ実装）
```

---

## ═══════════════════════════════════
## 初回ユーザー導線仕様（3クリック以内）
## ═══════════════════════════════════

「家族全員向け」サイトとして、初めて訪れたユーザーが **3クリック以内に価値を体験できる** 導線を必ず設計すること。

### 導線フロー

```
【クリック1】トップページでロールを選ぶ
  → 「パパ」「ママ」「子ども」「シニア」「共通」

【クリック2】おすすめ記事をタップする
  → 各ロールの「まずこれを読んで」記事を最上部に固定表示

【クリック3】記事を読む or 音声を再生する
  → ここで「価値の体験」が完了
```

### 実装要件

```typescript
// トップページの RolePicker でロールを選択したとき:
// → 即座に「このロール向けおすすめ3本」を下部に表示する
// → 「もっと見る → /learn?role=papa」リンクを表示する

// 各ロールに「おすすめ記事」を1本指定できるフラグをDBに追加すること:
// articles テーブルに isFeatured boolean を追加
// → トップページで featuredArticles を優先表示する

// ヒーローセクションの CTAボタン:
// 「🚀 まず読んでみる」→ /learn?level=beginner（初心者向け一覧）
// 「🎯 自分に合った使い方を探す」→ ロール選択セクションへスクロール（#role-picker）
```

### ファーストビューで必ず伝えること（コンテンツ要件）

```
✅ このサイトで何ができるか（1行で）
✅ 自分に関係あるか（ロール別カード）
✅ 難しくないという安心感（「難しくない。怖くない。」コピー）
✅ 今すぐ始められること（CTAボタン）

❌ 技術的な説明
❌ 長い説明文
❌ 登録・ログインの強制
```

---

## ═══════════════════════════════════
## NextAuth.js v5 バージョン固定方針
## ═══════════════════════════════════

```bash
# package.json に明示的にバージョンを固定すること
# "next-auth": "5.0.0-beta.25"  ← 執筆時点での最新beta
# ⚠️ "latest" や "^5.0.0" は破壊的変更を拾う可能性があるため禁止

# インストールコマンド:
pnpm add next-auth@5.0.0-beta.25

# バージョンアップ時の手順:
# 1. CHANGELOGで破壊的変更がないか確認
# 2. ローカルでテスト（特にGoogle OAuth・Credentialsログイン）
# 3. 問題なければpackage.jsonのバージョンを更新
```

> ⚠️ NextAuth.js v5 は2026年4月時点でまだbeta段階です。
> 本番環境では必ずバージョンを固定してください。
> 参考: https://www.npmjs.com/package/next-auth/v/beta

---

## ═══════════════════════════════════
## shared/層の認証付きAPIクライアント境界
## ═══════════════════════════════════

```typescript
// shared/api/client.ts
// ⚠️ shared/層はWeb・React Native両方で動くユニバーサルコードにすること
// Cookie認証はブラウザ専用のため、認証ヘッダーの付与は呼び出し元が担当する

// ✅ shared/に置けるもの: 認証なしのfetch（公開API）
export async function fetchPublic<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json();
}

// ✅ shared/に置けるもの: トークンを受け取るfetch
export async function fetchWithToken<T>(
  url: string,
  token: string,   // ← 呼び出し元（WebまたはApp）がトークンを渡す
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json();
}

// ❌ shared/に置いてはいけないもの: Cookie依存のfetch
// export async function fetchWithCookie() {
//   credentials: 'include' // ← ブラウザ専用・React Nativeでは動かない
// }

// Web側（components/）でのみ使う認証クライアント:
// → app/ または components/ 内で Cookie/session を使ってfetch
```

---

## ═══════════════════════════════════
## 品質要件
## ═══════════════════════════════════

| 項目 | 要件 |
|---|---|
| TypeScript | strict mode・型エラーゼロ |
| レスポンシブ | モバイルファースト（320px〜）|
| アクセシビリティ | 下記の詳細仕様を参照（必須） |
| パフォーマンス | next/image使用・next/font使用・LCP最適化 |
| エラーハンドリング | API Route全てtry/catch・適切なHTTPステータス |
| 環境変数 | ハードコード禁止・全て.env.localから読む |
| コメント | 日本語で記述 |
| コンポーネント設計 | 単一責任原則・再利用可能な小さい単位 |

### アクセシビリティ 詳細仕様（必須）

#### ① スキップリンク（skip link）
```tsx
// app/layout.tsx の <body> 直後に必ず追加すること
// キーボードユーザー・スクリーンリーダーユーザーが
// ナビゲーションをスキップしてメインコンテンツに飛べるようにする

<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
             focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-orange)]
             focus:text-white focus:rounded-lg focus:font-bold"
>
  メインコンテンツへスキップ
</a>

// メインコンテンツの先頭要素に id="main-content" を付けること
<main id="main-content">
  {children}
</main>
```

#### ② focus-visible スタイル（具体仕様）
```css
/* globals.css に必ず追加 */

/* キーボードフォーカス時のみ表示される輪郭（マウス操作時は非表示） */
:focus-visible {
  outline: 3px solid var(--color-orange);
  outline-offset: 3px;
  border-radius: 4px;
}

/* ブラウザデフォルトのfocusアウトラインは消さないこと */
/* ❌ 絶対禁止: outline: none / outline: 0 */
```

#### ③ 見出し階層（h1→h2→h3 の順序を守ること）
```
各ページの見出し構造:
  h1: ページタイトル（1ページに1つのみ）
  h2: セクション見出し
  h3: サブセクション見出し

NG例: h1 → h3（h2をスキップしてはいけない）
OK例: h1 → h2 → h3

トップページの例:
  h1: 「AIは、家族をもっと幸せにする道具。」
  h2: 「あなたはどのロール？」
  h2: 「新着記事」
  h2: 「familyai.jpとは」
```

#### ④ scroll-margin-top（sticky ヘッダーとアンカーリンクの干渉防止）
```css
/* globals.css に追加 */
/* sticky ヘッダー（約64px）の高さ分だけアンカー位置をずらす */

[id] {
  scroll-margin-top: 80px; /* ヘッダー高さ + 余白 */
}
```

---

## ═══════════════════════════════════
## スマホ対応（モバイル最優先・厳守）
## ═══════════════════════════════════

familyai.jpのターゲットは全世代の家族です。**スマホからのアクセスが主流**になることを前提に、以下をすべて実装すること。

### 基本方針：モバイルファースト

全てのCSSをモバイル基準で書き、PC向けに `md:` / `lg:` で上書きする。PC向けから書いて後でスマホに対応する逆順は禁止。

### viewport・メタタグ

```html
<!-- app/layout.tsx の <head> に必ず含めること -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<!-- ⚠️ maximum-scale=1.0 は絶対に追加しないこと。                      -->
<!-- ユーザーのピンチズームを無効化するアクセシビリティ違反（WCAG 2.1）。 -->
<!-- シニア・視覚障害者がテキストを拡大できなくなる。                      -->
<meta name="theme-color" content="#FDF6ED" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

### フォントサイズ：clamp() で流動的に

固定pxは禁止。全ての見出し・本文に `clamp()` を使用すること。

```css
/* 参考: globals.css での定義例 */
--text-hero:    clamp(28px, 7vw, 64px);   /* ヒーロー見出し */
--text-title:   clamp(22px, 5vw, 42px);   /* セクションタイトル */
--text-body:    clamp(14px, 3.5vw, 17px); /* 本文 */
--text-caption: clamp(11px, 2.5vw, 13px); /* キャプション・タグ */
```

### レイアウトブレークポイント

| ブレークポイント | 幅 | 主な変化 |
|---|---|---|
| base（スマホ） | 320px〜 | 1カラム・縦積み |
| sm | 480px〜 | チップ・カードが少し大きく |
| md | 768px〜 | 2カラムレイアウト開始 |
| lg | 1024px〜 | 3カラム・サイドバー出現 |
| xl | 1280px〜 | 最大幅固定・余白拡大 |

### コンポーネント別スマホ対応ルール

**ナビゲーション（Header.tsx）:**
- PC: 横並びリンク表示
- スマホ（md未満）: ハンバーガーメニュー → shadcn/ui の `Sheet` コンポーネントでスライドドロワー表示
- ドロワー内のリンクは `min-height: 48px` 以上のタップターゲットを確保すること

**ヒーローセクション（HeroSection.tsx）:**
- PC: 2カラム（テキスト左・ビジュアル右）
- スマホ: 1カラム縦積み（テキスト上・ビジュアル下）
- 家族カードビジュアルはスマホでは `max-width: 320px` に縮小

**ロール選択（RolePicker.tsx）:**
- PC: 5カラム横並び
- スマホ: 3カラム（2-2-1 または wrap）
- カードの最小タップエリア: `min-height: 80px`

**カテゴリフィルター（CategoryFilter.tsx）:**
- 横スクロール可能なチップ列にすること（`overflow-x: auto; white-space: nowrap`）
- スクロールバーは非表示（`scrollbar-width: none`）

**記事グリッド（ArticleGrid.tsx）:**
- PC: 3カラム
- タブレット（md）: 2カラム
- スマホ: 1カラム

**音声プレイヤー（AudioPlayer.tsx）:**
- ボタン・シークバーのタップエリアを十分に確保（`min-height: 44px`）
- 速度変更ボタンはスマホでも横並び表示できるサイズに

**記事詳細（/learn/[slug]）:**
- PC: 本文 + 右サイドバー（AIチャットウィジェット）
- スマホ: 本文のみ縦積み、AIウィジェットは本文下部に配置

### タッチ操作の最適化

```css
/* globals.css に必ず追加 */

/* タップ時のハイライト除去（iOS） */
* { -webkit-tap-highlight-color: transparent; }

/* touch-action: manipulation                                              */
/* ダブルタップズームを無効化しつつ、スクロール・パン操作は許可する。       */
/* これによりタップの応答速度が約300ms改善される（シニア・子ども向けに重要）*/
button, a, [role="button"], input, select, textarea {
  touch-action: manipulation;
}

/* タッチデバイスではホバーを無効化 */
@media (hover: none) {
  .card:hover   { transform: none; box-shadow: none; }
  .chip:hover   { transform: none; border-color: var(--beige-dark); }
  /* active（タップ中）だけアニメーション */
  .card:active  { transform: translateY(-2px); }
  .chip:active  { border-color: var(--orange); }
}

/* タップターゲット最小サイズ（Apple HIG・Google Material 推奨） */
button, a, [role="button"] { min-height: 44px; min-width: 44px; }
```

### iOS Safari 固有の対応

```css
/* globals.css に追加 */

/* iPhoneのアドレスバーを考慮した正確な高さ */
.full-height {
  min-height: 100vh;
  min-height: 100dvh; /* dynamic viewport height */
}

/* Safe Area（ノッチ・ホームバー）対応 */
.page-wrapper {
  padding-left:  env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
}

/* iOS でのフォントサイズ自動拡大を防ぐ */
html { -webkit-text-size-adjust: 100%; }
```

### パフォーマンス（スマホ回線対応）

- 全画像を `next/image` で配信（WebP自動変換・遅延読み込み）
- 音声ファイルは `preload="none"` で初期ロードを回避
- 不要なアニメーションは `@media (prefers-reduced-motion: reduce)` で停止

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 動作確認必須デバイス（実装後にチェック）

| デバイス | 幅 | 確認方法 |
|---|---|---|
| iPhone SE（最小） | 375px | Chrome DevTools / 実機 |
| iPhone 15 Pro | 393px | Chrome DevTools / 実機 |
| iPad mini | 768px | Chrome DevTools |
| Android 標準 | 360px | Chrome DevTools |
| PC（標準） | 1280px | ブラウザ直接 |

---

## ═══════════════════════════════════
## 完了チェックリスト
## ═══════════════════════════════════

```
[ ] pnpm dev でローカル起動できる（エラーなし）
[ ] トップページのロール選択UIが動作する
[ ] カテゴリフィルターが複数選択できる
[ ] URLクエリパラメータでフィルタリングが反映される
[ ] /learn?role=papa で記事が絞り込まれる
[ ] 記事詳細ページが表示される（/learn/[slug]）
[ ] 記事本文がMarkdownとして正しくレンダリングされる
[ ] 記事本文にスクリプトタグを入れてもXSSが発生しない（rehype-sanitize確認）
[ ] 音声プレイヤーがMP3を再生・速度変更できる
[ ] 音声再生カウントが30秒後に+1される（重複防止あり）
[ ] /api/ai にPOSTリクエストが成功する
[ ] /api/ai に2001文字以上入力すると400エラーになる
[ ] /api/ai が8秒以内に応答しない場合タイムアウトエラーになる
[ ] /api/articles がページネーション付きで記事を返す
[ ] 記事閲覧時にviewCountが+1される
[ ] 音声再生時にaudioPlayCountが+1される
[ ] pnpm db:push でDBスキーマが反映される
[ ] pnpm db:seed でシードデータが投入される
[ ] Vercel にデプロイできる
[ ] OGP画像（/api/og）が記事別に動的生成される
[ ] og-default.png が public/ に配置されている
[ ] SNSシェア時にOGP画像が表示される
[ ] JSON-LD（Article + AudioObject）がソースに含まれている
[ ] スクロールリビールアニメーションが動作する
[ ] loading.tsx のスケルトンUIが表示される
[ ] error.tsx の日本語エラー画面が表示される
[ ] not-found.tsx の404ページが表示される
[ ] Aboutページに感謝の文言が表示される
[ ] /privacy（プライバシーポリシー）が表示される
[ ] /terms（利用規約）が表示される
[ ] レート制限: 未ログインで11回目のAI質問がブロックされる
[ ] 同じ記事への二重ブックマークができない
[ ] トップページ → ロール選択 → 記事タップ が3クリック以内で完結する
[ ] isFeaturedな記事がトップページに優先表示される
[ ] next.config.tsにセキュリティヘッダーが設定されている
[ ] /api/* への不正なOriginからのリクエストが403になる

--- 認証チェック（Phase 1必須） ---
[ ] Googleアカウントでログインできる
[ ] Googleログイン後にユーザー情報がDBに保存される
[ ] ローカルアカウントで新規登録できる（/auth/register）
[ ] ローカルアカウントでログインできる（メール＋パスワード）
[ ] パスワード8文字未満でバリデーションエラーが出る
[ ] パスワードがbcryptでハッシュ化されDBに保存される
[ ] ログアウトが正常に動作する
[ ] 未ログイン状態で会員限定ページにアクセスするとリダイレクトされる
[ ] Googleで登録済みメールにローカル登録しようとするとエラーになる
[ ] ローカル登録済みメールにGoogleログインすると自動連携される
[ ] usersテーブルに auth_provider・updatedAt カラムが存在する
[ ] Apple ID ログインのTODOコメントがlib/auth.tsに記載されている

--- スマホ対応チェック ---
[ ] iPhone SE（375px）でレイアウトが崩れない
[ ] iPhone 15 Pro（393px）で全機能が使える
[ ] Android（360px）でフォントが読める
[ ] iPad（768px）で2カラムに切り替わる
[ ] ハンバーガーメニューが開閉できる
[ ] カテゴリチップが横スクロールできる
[ ] ロール選択カードがタップできる（48px以上）
[ ] 音声プレイヤーのボタンがタップしやすい（44px以上）
[ ] iPhoneのノッチ・ホームバーにコンテンツが被らない
[ ] iOS Safariでページ全体が正常に表示される
[ ] タップ時の青いハイライトが出ない
[ ] ボタン・リンクにtouch-action: manipulationが設定されている
[ ] スマホ回線（3G相当）でも3秒以内に表示開始される
[ ] ピンチズーム（拡大）がiOS・Androidで正常に動作する
[ ] maximum-scale=1.0 がviewportメタタグに含まれていないことを確認

--- アクセシビリティチェック ---
[ ] スキップリンク（#main-content）がキーボードTab操作で表示される
[ ] キーボードのみで全ページ操作できる（マウス不要）
[ ] focus-visibleのオレンジ輪郭がキーボード操作時に表示される
[ ] outline: none / outline: 0 がどこにも設定されていない
[ ] 各ページのh1が1つのみで、h1→h2→h3の見出し順序が守られている
[ ] 全ての画像にalt属性が設定されている
[ ] 全てのボタンにaria-labelが設定されている（アイコンのみの場合）
[ ] アンカーリンクがstickyヘッダーに隠れない（scroll-margin-top設定済み）

--- iOSアプリ将来対応チェック（shared/層） ---
[ ] shared/types/index.ts に Role・Category・Level が定義されている
[ ] shared/constants/ にロール・カテゴリ・カラー定数がまとまっている
[ ] shared/utils/ のフィルター・フォーマット関数が next/* に依存していない
[ ] shared/api/ のfetch関数がブラウザ専用APIに依存していない
[ ] shared/ 内に document / window / HTMLタグ が存在しないこと
[ ] components/ の各ファイル先頭に「Web専用」コメントが記載されている
[ ] shared/ の関数に対してユニットテストが1件以上ある（vitest推奨）
```

---

## ═══════════════════════════════════
## 備考・拡張方針
## ═══════════════════════════════════

- **Phase2（6〜8月）**: Stripe有料会員・画像生成（FLUX.1）・語学音声コンテンツ拡充・AI質問ウィジェット
- **Phase3（9〜12月）**: Seedance動画生成（有料会員限定）・コミュニティQ&A・多言語対応
- 動画生成（Seedance API）は現時点でスキップ。`// TODO: Phase3 - Seedance動画生成` コメントのみ残すこと
- Stripe決済もPhase2のため現時点ではスキップ。スキーマの `plan` フィールドは定義しておくこと
- コミュニティ機能はPhase3のためスキップ。Supabase Realtimeへの移行を想定した設計にしておくこと
- **`shared/` 層は常にユニバーサルに保つこと**。next/* ・ react-dom・ブラウザ専用APIのimportを混入させないこと

---

## ═══════════════════════════════════
## モバイルアプリ展開計画（iOS → Android）
## ═══════════════════════════════════

### 基本方針

**優先順位: iOS → Android**

Expo（React Native）を採用することで、iOSアプリ完成後に**ほぼ追加コストなし**でAndroidアプリも同時リリースできる。`shared/` 層のロジックはWeb・iOS・Android全てで共通使用。

---

### フェーズ別 モバイルアプリロードマップ

```
Web リリース
2026年5月8日
    │
    ▼
Phase 4（2026年 Q3〜Q4）— iOSアプリ
    │  ├── Expo プロジェクト作成
    │  ├── shared/ 層をそのまま流用
    │  ├── iOS向けUI実装（React Native）
    │  ├── EAS Build でビルド
    │  └── App Store 申請・リリース
    │       費用: $99/年（Apple Developer）
    │
    ▼
Phase 5（2027年 Q1）— Androidアプリ
       ├── iOSコードの約98%をそのまま流用
       ├── Push通知をAPNs → FCMに切り替え（数行の変更）
       ├── EAS Build でAndroidビルド
       └── Google Play 申請・リリース
            費用: $25（初回のみ・Google Play）
```

---

### iOSアプリ（Phase 4）実装内容

| 項目 | 内容 |
|---|---|
| フレームワーク | Expo SDK（最新）+ Expo Router |
| 言語 | TypeScript（Webと同じ） |
| UI | React Native（View / Text / TouchableOpacity） |
| 状態管理 | Zustand（Webと共通ライブラリ） |
| 認証 | Expo AuthSession（NextAuth APIを流用） |
| 音声再生 | expo-av（AudioPlayerを再実装） |
| Push通知 | expo-notifications + APNs |
| ストレージ | AsyncStorage（ブックマーク・設定の保存） |
| ビルド | EAS Build（クラウドビルド） |
| 配布 | App Store Connect |

**iOSで追加実装が必要なもの（Web流用不可・新規作成）:**
```
mobile/
├── app/                        # Expo Router（ページ構成）
│   ├── (tabs)/
│   │   ├── index.tsx           # トップ（ロール選択）
│   │   ├── learn/
│   │   │   ├── index.tsx       # 記事一覧
│   │   │   └── [slug].tsx      # 記事詳細
│   │   └── profile.tsx         # マイページ
│   └── _layout.tsx
├── components/                 # React Native UI（新規作成）
│   ├── RolePickerNative.tsx    # ← shared/constants/roles.ts を流用
│   ├── ArticleCardNative.tsx   # ← shared/types/ を流用
│   └── AudioPlayerNative.tsx   # ← expo-av で再実装
└── app.json                    # Expo設定
```

**shared/ からそのまま流用できるもの（新規作成不要）:**
```typescript
// iOSアプリ側でのimport例
import { ROLES, CATEGORIES }    from '../../shared/constants';
import { Role, Category }       from '../../shared/types';
import { formatDuration }       from '../../shared/utils/format';
import { filterArticles }       from '../../shared/utils/filter';
import { fetchArticles }        from '../../shared/api/articles';
import { callAI }               from '../../shared/api/ai';
// ↑ これらは一行も書き直し不要
```

---

### AndroidアプリはiOSの後に自動対応（Phase 5）

Expoの特性上、iOSアプリが完成した時点でAndroidも**ほぼそのまま動く**。
主な差分対応は以下の2点のみ：

**① Push通知の切り替え（数行の変更）:**
```typescript
// expo-notifications が内部で自動判定するため、
// 実際はコード変更ほぼ不要。
// EAS の credentials 設定で FCM キーを追加するだけ。
```

**② Google Play ストア申請（手続きのみ）:**
- Google Play Console でアプリ登録（$25一回のみ）
- EAS Build で `android` ビルドを実行
- AAB（Android App Bundle）を提出
- 審査：数時間〜1日（iOSより大幅に早い）

---

### iOS・Android 比較表

| 項目 | iOS（Phase 4） | Android（Phase 5） |
|---|---|---|
| コード流用率 | shared/ 70% + 新規UI 30% | iOSから 98% 流用 |
| 追加開発工数 | 約2〜3ヶ月 | 約1〜2週間 |
| ストア登録費用 | $99/年 | $25（初回のみ） |
| 審査期間 | 1〜3日 | 数時間〜1日 |
| Push通知設定 | APNs証明書 | FCM キー追加のみ |
| ビルドツール | EAS Build | EAS Build（同じ） |
| 最小対応OS | iOS 16以上 推奨 | Android 10以上 推奨 |

---

### Web実装時に必ずやっておくこと（モバイル対応の準備）

```typescript
// 1. shared/constants/roles.ts（例）
//    ← Webもアプリも同じファイルをimport
export const ROLE_CONFIG = {
  papa:   { label: 'パパ',   emoji: '👨', desc: '仕事・副業・資産管理' },
  mama:   { label: 'ママ',   emoji: '👩', desc: '家事・育児・自分時間' },
  kids:   { label: '子ども', emoji: '🧒', desc: '勉強・趣味・将来設計' },
  senior: { label: 'シニア', emoji: '👴', desc: 'スマホ・健康・趣味活用' },
  common: { label: '共通',   emoji: '🏠', desc: 'AI基礎・インストール' },
} as const;

// 2. shared/api/articles.ts（例）
//    ← fetch() はブラウザ・React Native 両方で動く
export async function fetchArticles(params: {
  role?: Role;
  category?: Category;
  level?: Level;
}) {
  const query = new URLSearchParams(params as Record<string, string>);
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/articles?${query}`);
  if (!res.ok) throw new Error('fetch failed');
  return res.json() as Promise<Article[]>;
}

// 3. shared/utils/format.ts（例）
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

---

## ═══════════════════════════════════
## 課題解決
## ═══════════════════════════════════

### 🐛 #001 Vercel デプロイ後に全 URL が 404 NOT_FOUND になる（2026-04-17）

**症状**
- `familyai.jp` / `www.familyai.jp` / `familyai-jp-git-main-utafamily.vercel.app` すべてで `404: NOT_FOUND` が返る
- Vercel のビルドログは `✓ Generating static pages (18/18)` `Build Completed` `Deployment completed` と全て成功
- `x-vercel-error: NOT_FOUND` ヘッダーが付いており、Next.js レベルではなく Vercel インフラレベルの 404

**調査過程**
1. DNS 確認 → `familyai.jp` A レコード・`www.familyai.jp` CNAME ともに Vercel を正しく向いていた（問題なし）
2. ドメイン競合確認 → Vercel プロジェクトは `familyai-jp` 1 つのみ（問題なし）
3. Deployment Protection 確認 → Vercel Authentication・Password Protection ともに Disabled（問題なし）
4. ビルドキャッシュクリア再デプロイ → 変わらず 404
5. `curl https://familyai-jp-git-main-utafamily.vercel.app` → 同じく `NOT_FOUND`（Vercel URL 直打ちでも 404）
6. **Vercel → Project Settings → General → Framework Settings を確認 → `Framework Preset: Other` になっていた** ← 根本原因

**根本原因**
Vercel の `Framework Preset` が `Other`（汎用 Node.js サーバー）に設定されており、Next.js のビルド出力（`.next/` ディレクトリ）を正しく認識・配信できていなかった。
ビルド自体は `next build` コマンドが `package.json` の `build` スクリプトで実行されるため成功するが、Vercel がその出力をルーティングに使えず全 URL が 404 になる。

**解決方法**
Vercel → Project Settings → General → Framework Settings →  
`Framework Preset` を `Other` → **`Next.js`** に変更して Save → Redeploy

**補足: sitemap.ts の副次的バグも同時修正**
同デプロイ調査中に、`app/sitemap.ts` の `export const revalidate = 3600` が  
`lib/db/index.ts` の `fetchOptions: { cache: 'no-store' }` と競合してビルド時エラーを出していたことも判明。  
`export const dynamic = 'force-dynamic'` に変更して解消。

```typescript
// app/sitemap.ts — 修正前
export const revalidate = 3600;

// app/sitemap.ts — 修正後
export const dynamic = 'force-dynamic'; // no-store fetch との競合を避ける
```
```
