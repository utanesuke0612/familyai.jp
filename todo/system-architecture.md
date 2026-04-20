# familyai.jp — システム構成図（保守ガイド）

> 最終更新: 2026-04-19 23:00（Rev23 完了＋Rev23.1/23.2 Vercel hotfix／Phase QA-T1 スモーク 44/45 PASS＋QA-T2 Vitest 43/43 PASS＋QA-CI ワークフロー配置）
> 目的: 全体構造・外部サービス連携・データフローを一目で把握し、保守・拡張を容易にする

---

## 🎯 プロジェクト定義（最重要）

> **familyai.jp は「記事メディア」ではなく「メディア × インタラクティブWebアプリ」のプラットフォームです。**
> Web版は将来の iOS・Android アプリへの「最初のクライアント」として設計します。

### サービス全体像

```
familyai.jp
  │
  ├── 📰 メディア（/learn）            ← Phase 1 MVP ✅ 実装済み
  │     └── 記事・音声・AIチャット
  │
  ├── 🛠️ Webアプリ（/tools）           ← Phase 2 以降で追加
  │     ├── /tools/dictation          ディクテーション練習（音声→書き取り→AI採点）
  │     ├── /tools/homework           子どもの宿題ヘルパー（ヒント方式・答えは教えない）
  │     ├── /tools/meal-plan          献立プランナー（食材入力→献立提案）
  │     └── /tools/image-gen          家族向け画像生成スタジオ
  │
  └── 👤 マイページ（/dashboard）       ← Phase 2 以降
        └── 学習履歴・ブックマーク・設定
```

### Phase 2 Webアプリ詳細

| アプリ | ルート | 概要 | 主なAI | 対象 |
|-------|--------|------|--------|------|
| **ディクテーション** | `/tools/dictation` | 音声→書き取り→AIが採点・解説 | Whisper + Gemini | 子ども・語学学習者 |
| **宿題ヘルパー** | `/tools/homework` | 問題を入力→答えではなくヒントで導く | Claude | 子ども・パパママ |
| **献立プランナー** | `/tools/meal-plan` | 冷蔵庫食材入力→栄養バランス献立提案 | Gemini Flash | ママ・パパ |
| **画像生成スタジオ** | `/tools/image-gen` | テキストから家族向けイラスト生成 | FLUX 1.1 Pro | 全員 |

---

## 📐 0. 全体レイヤー図（超要約）

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ユーザー（PC・スマホ）                        │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ HTTPS
┌───────────────────────────────▼────────────────────────────────────────┐
│                        Vercel（ホスティング）                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   Next.js 14 App Router                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │  │
│  │  │  app/(site) │  │  components │  │  app/api (Route Handler)│   │  │
│  │  │  (ページ)   │  │  (UIパーツ) │  │  /ai /articles /audio   │   │  │
│  │  │             │  │             │  │  /og /auth              │   │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘   │  │
│  │         │                │                      │                │  │
│  │         ▼                ▼                      ▼                │  │
│  │  ┌──────────────────────────────────────────────────────────┐    │  │
│  │  │  shared/ (universal) + lib/ (server-only)                │    │  │
│  │  │  types / constants / utils / api  |  db / ai / auth / csrf│   │  │
│  │  └────────────────┬─────────────────────────────────────────┘    │  │
│  └───────────────────┼──────────────────────────────────────────────┘  │
└──────────────────────┼─────────────────────────────────────────────────┘
                       │
   ┌───────────────────┼───────────────────────────────────────────────┐
   │     外部 SaaS（全てEnvKeyで制御）                                 │
   │                   │                                               │
   │   ┌───────────────▼─────────────┐  ┌──────────────────────────┐  │
   │   │  Neon PostgreSQL (DB)       │  │  Vercel Blob (CDN)       │  │
   │   │  articles / users /         │  │  MP3音声 / OGP画像       │  │
   │   │  bookmarks / apps /         │  │  将来: avatar            │  │
   │   │  audio_play_logs            │  │                          │  │
   │   └─────────────────────────────┘  └──────────────────────────┘  │
   │                                                                    │
   │   ┌─────────────────────────────┐  ┌──────────────────────────┐  │
   │   │  Upstash Redis (KV)         │  │  OpenRouter (AIゲートウェイ)│
   │   │  ・/api/ai レート制限       │  │  全生成AI呼び出しの集約  │  │
   │   │  ・再生カウント24h重複防止  │  │  （下記モデル表参照）    │  │
   │   └─────────────────────────────┘  └──────────────┬───────────┘  │
   │                                                    │              │
   │   ┌─────────────────────────────┐  ┌──────────────▼───────────┐  │
   │   │  Google OAuth (認証)        │  │  Google / Anthropic /    │  │
   │   │  Googleログイン             │  │  OpenAI / BFL / FishAudio│  │
   │   └─────────────────────────────┘  │  （OpenRouter経由で利用）│  │
   │                                    └──────────────────────────┘  │
   │   ┌─────────────────────────────┐  ┌──────────────────────────┐  │
   │   │  Google Analytics / GSC     │  │  Voicevox（任意・将来）  │  │
   │   │  アクセス解析・SEO          │  │  日本語TTS直結           │  │
   │   └─────────────────────────────┘  └──────────────────────────┘  │
   └────────────────────────────────────────────────────────────────────┘
```

---

## 📋 1. 外部サービス一覧（保守キーとなる表）

### 1-1. ストレージ系

| サービス | 役割 | 環境変数 | 使う場所 | Phase |
|---|---|---|---|---|
| **Neon PostgreSQL** | RDB本体<br>記事・ユーザー・ブックマーク・再生ログ | `DATABASE_URL` | `lib/db/index.ts` 経由で全API | Phase1 |
| **Vercel Blob** | CDN付きオブジェクト保存<br>MP3音声 / OGP画像 / 将来アバター | `BLOB_READ_WRITE_TOKEN` | `app/api/audio/route.ts`（読取）<br>直接アップロードは管理者のみ | Phase1 |

### 1-2. キャッシュ・レート制限系

| サービス | 役割 | 環境変数 | 使う場所 | Phase |
|---|---|---|---|---|
| **Upstash Redis** | KVストア<br>①AI API の日次レート制限<br>②音声再生カウントの24h重複防止 | `UPSTASH_REDIS_REST_URL`<br>`UPSTASH_REDIS_REST_TOKEN` | `app/api/ai/route.ts`<br>`app/api/audio/play/route.ts` | Phase1 |

### 1-3. AI 生成系（**OpenRouter First**）

| サービス | 役割 | 環境変数 | 使う場所 | Phase |
|---|---|---|---|---|
| **OpenRouter** | 全生成AIのゲートウェイ（HTTP直叩き） | `OPENROUTER_API_KEY`<br>`OPENROUTER_BASE_URL`<br>`OPENROUTER_APP_URL`<br>`OPENROUTER_APP_NAME` | `lib/ai/providers/openrouter.ts` | Phase1 |
| **Voicevox**（任意） | 日本語TTS直結（例外ルート） | `VOICEVOX_API_BASE` | 未実装・予約 | Phase2+ |

**OpenRouter 経由で呼ぶモデル**（`shared/constants/index.ts` の `MODEL_ROUTER`）:

| 用途タイプ            | モデル                              | 提供元               |
| ---------------- | -------------------------------- | ----------------- |
| `text-simple`    | `google/gemini-2.0-flash-001`    | Google            |
| `text-quality`   | `anthropic/claude-3-5-haiku`     | Anthropic         |
| `math-reasoning` | `anthropic/claude-3-5-sonnet`    | Anthropic         |
| `transcribe`     | `openai/whisper-large-v3`        | OpenAI            |
| `image-gen`      | `black-forest-labs/flux-1.1-pro` | Black Forest Labs |
| `tts-japanese`   | `fishaudio/fish-speech-1.5`      | Fish Audio        |
| `fallback`       | `google/gemini-2.0-flash-001`    | Google            |

> 🔑 **保守ポイント**: モデル入替は `MODEL_ROUTER` のみ編集すれば完結。`lib/ai/router.ts` は切替のみ・ビジネスロジック無し。

### 1-4. 認証・解析系

| サービス | 役割 | 環境変数 | 使う場所 | Phase |
|---|---|---|---|---|
| **Google OAuth** | Googleログイン | `GOOGLE_CLIENT_ID`<br>`GOOGLE_CLIENT_SECRET` | `lib/auth.ts` (NextAuth v5) | Phase1 |
| **NextAuth v5** | Credentials認証（メール+パス）<br>セッション (JWT) | `NEXTAUTH_SECRET` / `AUTH_SECRET`<br>`NEXTAUTH_URL` / `AUTH_URL` | `lib/auth.ts` | Phase1 |
| **管理画面認証** | ADMIN_EMAIL による単一管理者制御 | `ADMIN_EMAIL` | `lib/admin-auth.ts`<br>`app/admin/layout.tsx` | Phase1 |
| **Google Analytics 4** | PV・イベント解析 | `NEXT_PUBLIC_GA_ID` | `components/analytics/GoogleAnalytics.tsx` | Phase1 |
| **Google Search Console** | SEO診断・sitemap送信 | — (認証ファイル) | `app/sitemap.ts`<br>`app/robots.ts` | Phase1 |

### 1-5. 将来フェーズ

| サービス | 役割 | 環境変数 | Phase |
|---|---|---|---|
| **Stripe** | 有料会員決済 | `STRIPE_SECRET_KEY`<br>`STRIPE_WEBHOOK_SECRET`<br>`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Phase2 |
| **Apple Developer** | Sign in with Apple | `APPLE_ID`/`APPLE_TEAM_ID`/`APPLE_KEY_ID`/`APPLE_PRIVATE_KEY` | Phase4 |

---

## 🔀 2. 主要データフロー（機能ごとの詳細図）

### 2-1. AI チャット（記事詳細サイドバー）

```
[User (ブラウザ)]
     │  ①  ユーザーが質問を入力
     ▼
[components/article/AIChatWidget.tsx]
     │  ②  POST /api/ai  body={type, messages, articleTitle}
     ▼
[app/api/ai/route.ts]
     │
     │  ③  CSRF チェック (lib/csrf.ts → Origin 一致確認)
     │  ④  zod バリデーション (prompt最大2000文字)
     │  ⑤  auth() でセッション取得 (lib/auth.ts)
     │  ⑥  プラン判定 → Upstash Redis でレート制限
     │     ・anon 10/日 ・free 30/日 ・pro 200/日
     │
     ├──────────────► [Upstash Redis]
     │                 prefix: ratelimit:ai:*
     │
     │  ⑦  buildArticleSystemPrompt() でプロンプト構築
     │  ⑧  routeAI(type, messages)
     ▼
[lib/ai/router.ts]
     │  ⑨  MODEL_ROUTER から model 選択 (text-simple/quality等)
     ▼
[lib/ai/providers/openrouter.ts]
     │  ⑩  fetch POST https://openrouter.ai/api/v1/chat/completions
     │     stream: true・Bearer OPENROUTER_API_KEY
     ▼
[OpenRouter] ──► [Gemini/Claude/etc.]
     │  SSE ストリーム
     ▼
[transformStream] OpenRouter SSE → familyai SSE 形式変換
     │  data: {"delta":"..."}  /  data: [DONE]
     ▼
[AIChatWidget] ストリーム表示
```

### 2-2. 音声再生（MP3・再生カウント）

```
[記事詳細ページ /learn/[slug]]
     │  article.audioUrl を Server Component で DB 取得
     ▼
[components/article/AudioPlayer.tsx]
     │  <audio src={article.audioUrl} />  ← Vercel Blob CDN URL 直指定
     │
     │  ユーザーが ▶ ボタン押下
     ▼
[AudioPlayer.togglePlay]
     │  ①  reportPlay() でカウント送信 ※Rev13 で30秒条件に修正予定
     │  ②  audio.play()
     │
     ├─① POST /api/audio/play ─────────┐
     │                                  ▼
     │                         [app/api/audio/play/route.ts]
     │                              │  zod バリデーション (articleId: UUID)
     │                              │  Redis で 24h 重複チェック
     │                              │  key: audio:played:{id}:{ipHash}
     │                              │
     │                              ├──► [Upstash Redis]
     │                              │
     │                              │  記事存在チェック
     │                              │  articles.audioPlayCount += 1
     │                              │  audio_play_logs INSERT
     │                              ▼
     │                         [Neon PostgreSQL]
     │
     └─② <audio> 要素が直接 fetch
          https://*.public.blob.vercel-storage.com/audio/*.mp3
          HTTP Range リクエスト対応（シーク可能）
          ▼
     [Vercel Blob CDN]
```

### 2-3. OGP 動的画像生成（SNSシェア時）

```
[SNS クローラー (Twitter/Facebook)]
     │  OGP メタ取得: <meta property="og:image" content="/api/og?title=...&role=papa">
     ▼
[app/api/og/route.tsx]  ※Edge Runtime
     │
     │  ①  loadFont() でNoto Sans JP TTF を読み込み
     │      キャッシュあり（_fontData 変数）
     │
     ├──────────► [GET /fonts/NotoSansJP-VariableFont_wght.ttf]
     │            (Vercel 静的配信)
     │
     │  ②  @vercel/og の ImageResponse でPNG生成
     │      ・1200×630 ・ロール別カラー
     │
     │  ③  CDN キャッシュ: max-age=3600 + s-maxage=3600
     │                    + stale-while-revalidate=86400
     ▼
[SNS クローラー] OGP 画像表示
```

### 2-4. ログイン・登録

```
[/auth/signin ページ]
     │
     ├──[Googleでログイン] ─► NextAuth.js → Google OAuth
     │                           │
     │                           ▼
     │                     [lib/auth.ts signIn() callback]
     │                        既存メール確認
     │                        ・local 登録済み → google に自動連携
     │                        ・新規 → users INSERT (authProvider: 'google')
     │                           │
     │                           ▼
     │                     [Neon PostgreSQL users]
     │
     └──[メール+パスワード]─► NextAuth Credentials provider
                                 │  bcrypt.compare でパス検証
                                 ▼
                           [Neon PostgreSQL users]

[/auth/register ページ]
     │  POST /api/auth/register
     ▼
[app/api/auth/register/route.ts]
     │  zod: email + password(8文字以上)
     │  bcrypt.hash(saltRounds: 12)
     │  users INSERT
     ▼
[Neon PostgreSQL users]
```

### 2-5. 記事一覧・詳細・トップページ（サーバー側レンダリング）

```
[/ トップページ]
     ▼
[app/(site)/page.tsx]
     │  COMING_SOON=true → ComingSoon 表示
     │  COMING_SOON=false/未設定 → 実際のホームページ表示
     │
     ├─ HeroSection / StatsRow / RolePicker（静的）
     │
     └─ <Suspense> → NewArticlesSection (async Server Component)
              │  db.select().from(articles)
              │  .where(eq(articles.published, true))
              │  .orderBy(desc(articles.publishedAt)).limit(6)
              ▼
         [Neon PostgreSQL articles]
              ▼
         [ArticleGrid（最新6件）]

[/learn?role=papa&cat=education&page=2]
     ▼
[app/(site)/learn/page.tsx]  (Server Component)
     │  Drizzle ORM で直接 DB 取得
     │  WHERE + ORDER BY + LIMIT/OFFSET + COUNT(*)
     ▼
[Neon PostgreSQL articles]
     │
     ▼
[ArticleGrid + Pagination]
     クライアントサイド検索/フィルタ変更時:
     router.push('?role=mama') → Server Component 再実行

[/learn/[slug]]
     ▼
[app/(site)/learn/[slug]/page.tsx]  (revalidate: 3600)
     │  getArticle(slug) → Drizzle 取得
     │  getRelatedArticles() → 関連3件
     │  バックグラウンドで viewCount += 1
     │  JSON-LD 埋め込み (Article + AudioObject)
     ▼
[ArticleBody + AudioPlayer + AIChatWidget + 関連記事]
```

**記事の追加・管理フロー**

```
[content/articles/*.md]  ← Git 管理（GitHub Desktop でコミット）
     │  npm run db:sync（scripts/sync-articles.ts）
     ▼
[Neon PostgreSQL articles]  ← published=true で公開・false で非公開
     ▼
[familyai.jp/learn] に自動反映
```

---

## 📁 3. ディレクトリ構造（役割マップ）

```
familyai.jp/
│
├── app/                          📱 Next.js App Router (Web専用)
│   ├── (site)/                   一般ユーザー向けページ群
│   │   ├── layout.tsx            サイト共通レイアウト（Header + Footer をここで管理）
│   │   ├── page.tsx              トップ (Hero/StatsRow/RolePicker/新着・DB直取得)
│   │   ├── learn/
│   │   │   ├── page.tsx          記事一覧（フィルタ・ページネーション）
│   │   │   ├── loading.tsx       スケルトン
│   │   │   └── [slug]/
│   │   │       ├── page.tsx      記事詳細（JSON-LD・音声・チャット）
│   │   │       ├── loading.tsx
│   │   │       └── not-found.tsx
│   │   ├── tools/                    🛠️ Webアプリ群（Phase 2 以降）
│   │   │   ├── dictation/page.tsx    ディクテーション練習
│   │   │   ├── homework/page.tsx     子どもの宿題ヘルパー
│   │   │   ├── meal-plan/page.tsx    献立プランナー
│   │   │   └── image-gen/page.tsx    家族向け画像生成
│   │   ├── dashboard/page.tsx        マイページ（Phase 2）
│   │   ├── auth/
│   │   │   ├── signin/page.tsx   ログイン
│   │   │   └── register/page.tsx 会員登録
│   │   ├── about / common / privacy / terms / page.tsx
│   │   ├── error.tsx / loading.tsx / not-found.tsx
│   │
│   ├── admin/                    🔐 管理画面（ADMIN_EMAIL 認証必須）
│   │   ├── layout.tsx            管理者認証ガード + AdminNav
│   │   ├── page.tsx              記事一覧（検索・ソート・公開トグル・削除）
│   │   └── articles/
│   │       ├── new/page.tsx      記事新規作成（ArticleForm）
│   │       └── [slug]/edit/page.tsx  記事編集（ArticleForm・非公開記事も取得）
│   │
│   ├── api/                      🔌 Route Handler（サーバー側API）
│   │   ├── ai/route.ts           ❶ AI生成SSE（OpenRouter+Upstash+Auth）← メディア＆Webアプリ共用
│   │   ├── articles/route.ts     ❷ 記事一覧API（Neon）
│   │   ├── admin/articles/
│   │   │   ├── route.ts          ❸ 管理者用記事 GET一覧+POST作成
│   │   │   └── [slug]/
│   │   │       ├── route.ts      ❹ 管理者用記事 PUT更新+DELETE削除
│   │   │       └── toggle/route.ts  ❺ 公開/非公開トグル PATCH
│   │   ├── audio/
│   │   │   ├── route.ts          ❻ 音声メタデータGET（Neon）
│   │   │   └── play/route.ts     ❼ 再生カウントPOST（Neon+Upstash）
│   │   ├── og/route.tsx          ❽ OGP画像（@vercel/og・Edge）
│   │   ├── tools/                ❾ Webアプリ用API（Phase 2 以降）
│   │   │   ├── dictation/route.ts    音声採点・フィードバック
│   │   │   └── homework/route.ts     宿題ヒント生成（教育特化プロンプト）
│   │   └── auth/
│   │       ├── [...nextauth]/    ❿ NextAuth標準エンドポイント
│   │       └── register/route.ts ⓫ ローカル登録（bcrypt+Neon）
│   │
│   ├── layout.tsx                ルートレイアウト（フォント・OGP・GA のみ・Header/Footerなし）
│   ├── globals.css               CSS変数・アニメ・prose-warm
│   ├── sitemap.ts / robots.ts    SEO
│   └── favicon.ico / fonts/      静的アセット
│
├── components/                   🎨 Web専用UIコンポーネント
│   ├── layout/ Header Footer MobileNav
│   ├── home/   HeroSection RolePicker CategoryFilter StatsRow ComingSoon
│   ├── article/ArticleCard ArticleGrid ArticleBody AudioPlayer AIChatWidget
│   ├── learn/  SortLevelBar
│   ├── tools/  （Phase 2 追加予定）
│   │   ├── DictationPlayer       音声再生＋書き取り入力＋採点表示
│   │   ├── HomeworkChat          宿題ヒント専用チャットUI
│   │   ├── MealPlanForm          食材入力フォーム＋献立表示
│   │   └── ImageGenStudio        プロンプト入力＋画像表示
│   ├── admin/  AdminNav AdminArticleTable ArticleForm
│   ├── analytics/GoogleAnalytics
│   └── ui/     button (shadcn/ui)
│
├── shared/                       🌐 Web + iOS 共通層 (pure TypeScript)
│   ├── types/    FamilyRole / ContentCategory / Article / User / Tool 型定義
│   ├── constants/SITE / ROLE_* / MODEL_ROUTER / RATE_LIMIT / BLOB_PATH / ROUTES
│   │             （ROUTES.tools.dictation / ROUTES.tools.homework 等を Phase 2 で追加）
│   ├── utils/    formatDateJa / estimateReadingMin / buildQueryString
│   └── api/      apiFetch / fetchArticles / streamChat / buildOgImageUrl
│                 （streamDictation / streamHomework 等を Phase 2 で追加）
│
├── lib/                          ⚙️  サーバー側ユーティリティ（Next.js専用）
│   ├── db/
│   │   ├── schema.ts             Drizzle スキーマ定義
│   │   ├── index.ts              Proxy で lazy 初期化された db
│   │   └── seed.ts               初期データ投入
│   ├── repositories/
│   │   └── articles.ts           Repository Pattern（全DB アクセスを集約）
│   │                             getArticle / getArticleForAdmin /
│   │                             getArticleList / getLatestArticles /
│   │                             getRelatedArticles / incrementViewCount /
│   │                             listAllArticles(ILIKEエスケープ) / createArticle /
│   │                             updateArticle / deleteArticle / togglePublished /
│   │                             escapeLike（export・テスト用）
│   ├── schemas/                  🧪 zod スキーマ（独立ファイル・ユニットテスト対象）
│   │   └── articles.ts           createArticleSchema / updateArticleSchema / optionalDate
│   ├── ai/
│   │   ├── router.ts             routeAI() - MODEL_ROUTER切替
│   │   └── providers/openrouter.ts  HTTP直叩き+SSE変換
│   ├── auth.ts                   NextAuth v5 設定（JWT に plan 埋込・Rev23）
│   ├── admin-auth.ts             ADMIN_EMAIL による管理者認証ヘルパー（isAdmin / requireAdmin）
│   ├── csrf.ts                   Origin チェック
│   ├── ratelimit.ts              Upstash Ratelimit 共通ヘルパー（enforceAdminRateLimit 10req/min・Rev23）
│   └── utils.ts                  cn() (tailwind-merge)
│
├── hooks/
│   └── useScrollReveal.ts        IntersectionObserver
│
├── drizzle/                      🗄️  マイグレーション
│   └── 0000_nappy_golden_guardian.sql
│
├── content/                      📄 記事 Markdown ファイル（Git 管理）
│   └── articles/
│       ├── chatgpt-meal-planning.md         ← housework
│       ├── ai-homework-helper.md            ← education
│       ├── ai-picture-book-kids.md          ← image-gen / education
│       ├── english-learning-voice-ai.md     ← voice
│       └── image-gen-family-photo.md        ← image-gen
│           （新しい記事はここに追加 → npm run db:sync で Neon DB に反映）
│
├── scripts/                      🔧 運用スクリプト
│   ├── sync-articles.ts          content/articles/*.md → Neon DB upsert
│   └── smoke-test.sh             Phase QA-T1 スモークテスト（curl で37エンドポイント検証）
│
├── test/                         🧪 Vitest ユニットテスト（Phase QA-T2）
│   └── unit/
│       ├── buildQueryString.test.ts      shared/utils 配列対応（Rev22）
│       ├── escapeLike.test.ts            ILIKE メタ文字エスケープ（Rev22）
│       ├── createArticleSchema.test.ts   zod 必須欠落・enum・NaN・日付変換
│       └── updateArticleSchema.test.ts   zod 全 optional・null 上書き
│
├── vitest.config.ts              Vitest 設定（node env・@/ alias・test/**/*.test.ts）
│
├── .github/
│   └── workflows/
│       └── test.yml              GitHub Actions（push/PR で tsc + lint + Vitest 自動実行）
│
├── public/                       静的ファイル
│   └── fonts/NotoSansJP-*.ttf    ✅ 配置済み（OGP日本語フォント）
│
└── todo/                         📝 仕様・作業管理
    ├── familyai_coding_agent_v5.md   CodingAgent 実装依頼書
    ├── junliToDo_v4.md               人間作業手順書
    ├── system-architecture.md        このドキュメント
    ├── test-plan_v1.md               テスト観点14カテゴリ・80+項目（Phase QA）
    ├── TestResult_202604192224.md    Phase QA-T1 スモーク結果（44/45 PASS）
    └── TestResult_202604192243.md    Phase QA-T2/CI 結果（Vitest 43/43 PASS）
```

---

## 🗄️ 4. データベーススキーマ概要

```
┌──────────────────────────┐
│ articles                 │  ← 記事本体 + 音声メタ + 統計
│  id, slug, title, body   │
│  roles[], categories[]   │
│  level                   │
│  audio_url/transcript/   │
│   duration/language      │
│  audio_play_count        │
│  view_count, is_featured │
│  published, published_at │
└─────────┬────────────────┘
          │
          │ 1:N
          ▼
┌──────────────────────────┐       ┌──────────────────────────┐
│ bookmarks                │◄──────┤ users                    │
│  user_id, article_id     │ N:1   │  id, email, name, image  │
│  (UNIQUE composite)      │       │  auth_provider           │
└──────────────────────────┘       │   ('google'|'local'|     │
                                   │    'apple'将来)           │
┌──────────────────────────┐       │  password_hash (bcrypt)  │
│ audio_play_logs          │◄──────┤  plan ('free'|'premium') │
│  article_id              │       │  stripe_customer_id      │
│  user_id (nullable)      │       │  preferred_role          │
│  ip_hash (sha256+salt)   │       └──────────────────────────┘
│  played_at               │
└──────────────────────────┘

┌──────────────────────────┐
│ apps  (Phase 2 で活用)   │  ← Webアプリ一覧・カタログ管理
│  name, description, url  │    /tools/* の各アプリのメタ情報
│  categories[], roles[]   │    is_pro=true → 有料会員のみ
│  is_pro, published       │    published=false → 開発中
└──────────────────────────┘

┌──────────────────────────┐
│ tool_logs  (Phase 2 追加)│  ← Webアプリ利用ログ（将来追加）
│  user_id, tool_name      │    レート制限・利用統計に使用
│  used_at                 │
└──────────────────────────┘
```

**プライバシー配慮**: `audio_play_logs` は生IPを保存せず `sha256(IP_HASH_SALT + ip)` のハッシュのみ。

---

## 🔑 5. 環境変数マップ（.env.local.example 準拠）

| カテゴリ | 変数名 | 必須 | 用途 |
|----------|--------|------|------|
| **DB** | `DATABASE_URL` | ✅ | Neon 接続文字列 |
| **認証** | `NEXTAUTH_SECRET` | ✅ | JWT 署名鍵（32文字+）NextAuth v4 互換 |
| | `AUTH_SECRET` | ✅ | NextAuth v5 用（NEXTAUTH_SECRET と同値） |
| | `NEXTAUTH_URL` | ✅ | 本番 URL（NextAuth v4 互換） |
| | `AUTH_URL` | ✅ | NextAuth v5 用（NEXTAUTH_URL と同値） |
| | `GOOGLE_CLIENT_ID` | ✅ | Google OAuth |
| | `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth |
| **管理者** | `ADMIN_EMAIL` | ✅ | `/admin` にアクセスできるメールアドレス（1名） |
| **ストレージ** | `BLOB_READ_WRITE_TOKEN` | ✅ | Vercel Blob 書込み権限 |
| **レート制限** | `UPSTASH_REDIS_REST_URL` | ✅ | Upstash エンドポイント |
| | `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash 認証 |
| | `IP_HASH_SALT` | 推奨 | IPハッシュ用（デフォルト: `familyai_ip_salt_v1`）|
| **AI** | `OPENROUTER_API_KEY` | ✅ | OpenRouter API |
| | `OPENROUTER_BASE_URL` | ✅ | `https://openrouter.ai/api/v1` |
| | `OPENROUTER_APP_URL` | ✅ | `https://familyai.jp` |
| | `OPENROUTER_APP_NAME` | ✅ | `familyai.jp` |
| **AI（任意）** | `VOICEVOX_API_BASE` | ⚪ | 日本語TTS直結時のみ |
| **解析** | `NEXT_PUBLIC_GA_ID` | 推奨 | Google Analytics 4 |
| **公開API** | `NEXT_PUBLIC_API_URL` | ✅ | `https://familyai.jp` |
| **Phase2決済** | `STRIPE_SECRET_KEY` | ⚪ | Phase2以降 |
| | `STRIPE_WEBHOOK_SECRET` | ⚪ | Phase2以降 |
| | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⚪ | Phase2以降 |
| **Phase4 Apple** | `APPLE_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | ⚪ | Phase4以降 |

---

## 🔐 6. セキュリティ境界

| 境界 | 実装 | 場所 |
|---|---|---|
| **XSS** | `rehype-sanitize` + `rehype-highlight` | `components/article/ArticleBody.tsx` |
| **CSRF** | Origin ヘッダー検証 | `lib/csrf.ts` → `/api/ai` / `/api/admin/articles/*`（POST/PUT/DELETE/PATCH）で呼び出し |
| **HTTP ヘッダー** | X-Frame-Options DENY / X-Content-Type-Options nosniff / Referrer-Policy | `next.config.mjs` |
| **認証** | JWT（NextAuth v5 デフォルト `SameSite=Lax`）| `lib/auth.ts` |
| **パスワード** | bcrypt saltRounds: 12 + 8文字以上 zod検証 | `app/api/auth/register/route.ts` |
| **レート制限** | sliding window / anon 10・free 30・pro 200 per day | `app/api/ai/route.ts` |
| **入力検証** | 全API zod スキーマ（`z.object`, `z.enum`, `z.string().max()`）| 各 `route.ts` |
| **IPハッシュ** | sha256(salt + ip) — 生IPは保存禁止 | `app/api/audio/play/route.ts` |

---

## 🚦 7. リクエストフロー早見表

| エンドポイント | メソッド | 用途 | 呼ぶ外部サービス |
|----------------|----------|------|-----------------|
| `/api/ai` | POST | AIチャットSSE（メディア＆Webアプリ共用） | OpenRouter + Upstash + Neon(plan取得) |
| `/api/articles` | GET | 記事一覧（公開記事のみ） | Neon |
| `/api/audio?slug=` | GET | 音声メタ | Neon |
| `/api/audio/play` | POST | 再生カウント | Neon + Upstash |
| `/api/og` | GET | OGP画像 | Vercel(fonts静的) |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth | Google OAuth + Neon |
| `/api/auth/register` | POST | ローカル登録 | Neon + bcrypt |
| `/api/admin/articles` | GET | 管理者：記事一覧（全件・非公開含む） | Neon（ADMIN_EMAIL 認証必須） |
| `/api/admin/articles` | POST | 管理者：記事新規作成（CSRF + zod） | Neon（ADMIN_EMAIL 認証必須） |
| `/api/admin/articles/[slug]` | PUT | 管理者：記事更新（CSRF + zod） | Neon（ADMIN_EMAIL 認証必須） |
| `/api/admin/articles/[slug]` | DELETE | 管理者：記事削除（CSRF） | Neon（ADMIN_EMAIL 認証必須） |
| `/api/admin/articles/[slug]/toggle` | PATCH | 管理者：公開/非公開切替（CSRF） | Neon（ADMIN_EMAIL 認証必須） |
| `/api/tools/dictation` | POST | 音声採点・フィードバック（Phase 2） | OpenRouter(Whisper+Gemini) |
| `/api/tools/homework` | POST | 宿題ヒント生成・教育特化（Phase 2） | OpenRouter(Claude) |

---

## 🧭 8. 保守時のチートシート

### 「AIモデルを入れ替えたい」
→ `shared/constants/index.ts` の `MODEL_ROUTER` のみ編集。他ファイル変更不要。

### 「レート制限を変えたい」
→ `app/api/ai/route.ts` の `getRatelimiters()` 内数値。または `shared/constants/index.ts` の `RATE_LIMIT`。

### 「新しいページを追加したい」
→ `app/(site)/` にディレクトリ作成。`Header.tsx` の `NAV_LINKS` に追加。`shared/constants/index.ts` の `ROUTES` にも追加。

### 「新しいWebアプリ（ツール）を追加したい」
→ `app/(site)/tools/[ツール名]/page.tsx` を作成。  
→ `components/tools/` に対応するUIコンポーネントを作成（表示専用・ロジック不含）。  
→ AIが必要なら `app/api/tools/[ツール名]/route.ts` を作成し `/api/ai` の型を拡張。  
→ `shared/constants/index.ts` の `ROUTES.tools` にルートを追加。  
→ `lib/db/schema.ts` の `apps` テーブルにエントリを追加（管理用メタデータ）。  
→ モバイル対応: AI呼び出しは必ず `/api/tools/*` 経由にし、iOS からも叩けるよう REST 設計を守ること。

### 「新しいDB カラムを追加したい」
→ `lib/db/schema.ts` を編集 → `pnpm db:generate` → `pnpm db:migrate`。型は `typeof articles.$inferSelect` で自動反映。

### 「外部API呼び出しを追加したい」
→ サーバー側処理: `lib/ai/providers/*.ts` 形式で追加。  
→ shared から呼ぶ: `shared/api/index.ts` に `apiFetch` ラッパーを追加（iOS再利用可能に保つ）。

### 「環境変数を追加したい」
→ 必ず `.env.local.example` と Vercel Dashboard の両方に追加。参照は `process.env.*` で lazy に（モジュールロード時 throw は禁止）。

### 「iOSアプリで流用したい」
→ `shared/` の該当ファイルだけ import。`components/` / `lib/` / `app/` は import 禁止（Next.js 依存のため）。

---

## 🔄 9. デプロイメントフロー

```
[GitHub main ブランチ push]
         │
         ▼
[Vercel 自動ビルド]
   ├─ pnpm install
   ├─ pnpm build (Next.js)
   ├─ 環境変数を Vercel Dashboard から注入
   └─ Edge / Serverless Functions を各ルートに配備
         │
         ▼
[familyai.jp (Production)]
         │
         ├─ DNS: お名前.com → Vercel A/CNAME レコード
         ├─ SSL: Vercel 自動発行 (Let's Encrypt)
         └─ CDN: Vercel Edge Network（全世界配信）

[DB マイグレーション]
   ローカル: pnpm db:generate → pnpm db:migrate
   本番:    同じコマンドを別途実行（自動化はされていない）
```

---

## 📌 10. 重要メモ・制約（表形式）

| #   | 項目                             | 制約・上限値                                                            | 影響                        | 対策・備考                                   |
| --- | ------------------------------ | ----------------------------------------------------------------- | ------------------------- | --------------------------------------- |
| 1   | **Vercel Hobby** `maxDuration` | 10秒                                                               | `/api/ai` 長文応答がタイムアウト     | Rev15 で 8秒タイムアウト設定（バッファ2秒）              |
| 2   | **Neon 無料枠**                   | 0.5GB ストレージ / 100 CU時間/月                                          | 超過で課金                     | MVPは十分。記事本文はテキストなので当分 0.5GB 未到達         |
| 3   | **Upstash 無料枠**                | 500,000 req/月 / 256MB                                             | 超過で課金                     | AIレート + 再生カウントで10万req/月想定。十分            |
| 4   | **Vercel Blob 無料枠**            | 5GB 保存 + Data Transfer 従量                                         | **コスト支配要因**               | 音声配信量が増えるとここが一番高くなる。ビットレート・再生計測を注視      |
| 5   | **OpenRouter 課金**              | pay-as-you-go                                                     | モデル利用量 = 直接コスト            | OpenRouter ダッシュボードで **月間上限 $20** を設定推奨  |
| 6   | **Vercel Functions**           | Hobby 100 GB-Hours/月                                              | 超過で停止                     | 通常MVPでは到達しない                            |
| 7   | **ISR revalidate**             | 記事詳細 3600秒 / 一覧 60秒CDN                                            | DB更新が最大1時間遅延              | 記事公開直後に反映させたい場合は `revalidatePath()` を呼ぶ |
| 8   | **Next.js 14 App Router**      | `searchParams` は同期オブジェクト                                          | Next.js 15 移行時は Promise 化 | アップグレード時は `LearnPage` 等の型を修正            |
| 9   | **NextAuth v5 beta**           | バージョン固定必須                                                         | 破壊的変更リスク                  | `5.0.0-beta.25` 固定。CHANGELOG を確認してから更新。型拡張は `next-auth/jwt` を使う（Rev23.2・`@auth/core/jwt` は Vercel pnpm strict で解決不可） |
| 10  | **shared/層の鉄則**                | `next/*` `react-dom` `document` `window` / Tailwind文字列 / HTMLタグ禁止 | iOSで動かない                  | 新規ファイル追加時は必ず pure TypeScript のみ         |
| 11  | **Edge Runtime**               | `/api/og` は Node API 不可                                           | crypto や fs が使えない         | Blob フォント読込は `fetch` のみ                 |
| 12  | **prefers-reduced-motion**     | すべてのアニメに対応必須                                                      | シニア・VR利用者の健康影響            | `globals.css` で一括抑制済み                   |
| 13  | **pnpm-lock.yaml 同期**         | `package.json` 変更後は必ず `pnpm install` で再生成                            | Vercel `frozen-lockfile` で CI 失敗  | Rev23.1 で `gray-matter` 未同期事件あり。依存追加後は push 前に再生成必須 |
| 14  | **依存追加後の `.next` 破棄**    | `vitest` 等の devDep 追加後はローカル `.next` 削除が必要                          | `Cannot find module 'vendor-chunks/*'` やクライアント Hook エラー | `rm -rf .next node_modules/.cache` してから `pnpm dev` |

---

## 🩺 11. 定期チェック必要サービス（ダッシュボード URL 付き）

> ⚠️ 月次またはリリース直後は必ず確認。消費量・エラー・アラートを見逃すと**突然止まる/課金される**。

### 11-1. コスト・使用量モニタリング（月次確認）

| サービス | 何を見るか | ダッシュボード URL | 頻度 | 警戒閾値 |
|---|---|---|---|---|
| **OpenRouter** | AI使用量・モデル別コスト・残高 | https://openrouter.ai/activity | 週次 | 月額 $15 に達したら `text-quality` をダウングレード |
| **OpenRouter 設定** | 月間予算上限・キー管理 | https://openrouter.ai/settings/credits<br>https://openrouter.ai/settings/keys | 初期設定時+漏洩時 | 月間上限 $20 固定 |
| **Vercel Blob** | 保存量・Data Transfer 量 | https://vercel.com/utafamily/familyai-jp/stores | 週次 | 保存 4GB・転送 100GB/月 |
| **Vercel Usage** | Functions実行時間・帯域・ビルド回数 | https://vercel.com/utafamily/usage | 月次 | Functions 80 GB-Hours/月 |
| **Neon PostgreSQL** | ストレージ・CU時間・スロークエリ | https://console.neon.tech/ | 月次 | 0.4GB ・90 CU時間 |
| **Upstash Redis** | リクエスト数・帯域 | https://console.upstash.com/ | 月次 | 400,000 req/月 |

### 11-2. 運用・品質モニタリング（週次・随時）

| サービス | 何を見るか | ダッシュボード URL | 頻度 |
|---|---|---|---|
| **Vercel Logs** | ランタイムエラー・5xx 発生 | https://vercel.com/utafamily/familyai-jp/logs | 随時（デプロイ後） |
| **Vercel Domains** | DNS ✅ / SSL 期限 / リダイレクト | https://vercel.com/utafamily/familyai-jp/settings/domains | 月次 |
| **Google Analytics 4** | PV・UU・セッション・直帰率 | https://analytics.google.com/analytics/web/ | 週次 |
| **Google Search Console** | インデックス状況・検索クエリ・Core Web Vitals | https://search.google.com/search-console | 週次 |
| **Google Cloud Console** | OAuth 使用量・クォータ・同意画面ステータス | https://console.cloud.google.com/apis/dashboard | 月次 |

### 11-3. セキュリティ・監査（随時・インシデント時）

| サービス | 何を見るか | ダッシュボード URL | 頻度 |
|---|---|---|---|
| **OpenRouter Keys** | 発行キーの漏洩確認・無効化 | https://openrouter.ai/settings/keys | 漏洩疑義時 |
| **Vercel Env Vars** | 環境変数の棚卸し（不要キー削除） | https://vercel.com/utafamily/familyai-jp/settings/environment-variables | 四半期 |
| **Google OAuth Consent** | 承認済みドメイン・リダイレクトURI | https://console.cloud.google.com/apis/credentials | 四半期 |
| **お名前.com DNS** | DNS レコード整合・更新期限 | https://www.onamae.com/ | 年次（更新期前） |
| **Neon Role 管理** | DB ロール・接続許可IP | https://console.neon.tech/app/projects → Roles | 四半期 |

### 11-4. Phase2以降追加予定

| サービス | 何を見るか | ダッシュボード URL | Phase |
|---|---|---|---|
| **Stripe Dashboard** | 決済状況・失敗トランザクション・Payout | https://dashboard.stripe.com/ | Phase2 |
| **Stripe Webhooks** | `/api/webhooks/stripe` の配信成功率 | https://dashboard.stripe.com/webhooks | Phase2 |
| **Apple App Store Connect** | 審査状況・売上・クラッシュレポート | https://appstoreconnect.apple.com/ | Phase4 |
| **Google Play Console** | 審査状況・インストール数・ANR | https://play.google.com/console | Phase5 |

### 11-5. アラート設定チェックリスト

```
□ OpenRouter ダッシュボードで月間予算 $20 を設定
□ Vercel Dashboard → Settings → Billing → Usage Alerts で Data Transfer 80GB/月
□ Neon Dashboard → Settings → Alerts で CU時間 80%通知
□ Upstash Dashboard → Database → Alerts でリクエスト80%通知
□ Google Search Console → カバレッジエラーのメール通知を有効化
□ Stripe Dashboard（Phase2）→ 失敗率 5% 以上で通知
```

---

---

## 📱 12. モバイルアプリ移行戦略（スマホアプリ化前提）

> **前提**: familyai.jp は将来 iOS・Android アプリへの展開を前提に設計されています。
> Web 版はその「最初のクライアント」という位置づけです。
> CodingAgent は新規コードを書く際、常にこの前提を意識してください。

---

### 12-1. レイヤー別・流用可能性マップ

| レイヤー | モバイルで流用できる？ | 理由・備考 |
|---------|-----------------|-----------|
| `shared/types` | ✅ **そのまま** | pure TypeScript。Next.js 依存ゼロ |
| `shared/constants` | ✅ **そのまま** | pure TypeScript |
| `shared/utils` | ✅ **そのまま** | ブラウザ・Node・React Native すべてで動作 |
| `shared/api` | ✅ **そのまま** | fetch ベース。React Native / Swift でも利用可 |
| `app/api/` Route Handlers | ✅ **REST API として流用** | iOS・Android から同じエンドポイントを叩ける |
| `lib/db` / `lib/auth` / `lib/ai` | ⚠️ **サーバー側専用** | Next.js サーバー上で動く。モバイルからは `/api/` 経由でアクセス |
| `components/` UI コンポーネント | ❌ **作り直し** | React + Tailwind CSS は Web 専用。React Native では動かない |
| `app/(site)/` ページ | ❌ **作り直し** | Next.js App Router は Web 専用 |

---

### 12-2. `shared/` 層の鉄則（モバイル流用を守るルール）

CodingAgent は `shared/` 以下のファイルを新規作成・編集する際、以下を**絶対に守ること**：

```
❌ 禁止（モバイルで動かなくなる）          ✅ OK
─────────────────────────────────────────
import { useRouter } from 'next/router'    import type { ... } from './types'
import Link from 'next/link'               const url = ROUTES.article(slug)
import Image from 'next/image'             export function formatDateJa(...) {}
document.querySelector(...)               export async function fetchArticles(...)
window.location.href = ...                fetch('/api/articles')
<div className="text-orange-500">          純粋な TypeScript の型・関数・定数のみ
Tailwind クラス文字列を含む関数
```

---

### 12-3. モバイル化の3ルート

#### ルート① PWA（Progressive Web App）— Phase 2 推奨

```
現在の Web サイト + Service Worker = インストール可能なアプリ
```

- `manifest.json` は**すでに実装済み** ✅（`app/manifest.json`）
- App Store / Google Play への掲載は不可（ホーム画面追加のみ）
- 追加作業: Service Worker（オフライン対応）のみ
- **所要時間: 数日〜1週間**

#### ルート② React Native + Expo — Phase 4 推奨

```
shared/ + app/api/ をそのまま使い、UIだけ React Native で作り直す
```

**流用できるもの（コピーまたは npm パッケージ化）:**
- `shared/` 全体（型・定数・fetch 関数）
- バックエンド API（Neon DB・Upstash・OpenRouter）は `/api/` 経由でそのまま利用

**作り直すもの:**
- 全 UI コンポーネント（Tailwind CSS → `StyleSheet.create()`）
- 認証（NextAuth → Expo Auth Session + OAuth）
- 音声再生（`<audio>` → `expo-av`）
- ナビゲーション（Next.js App Router → React Navigation）

**所要時間: 2〜3ヶ月**

#### ルート③ Swift（iOS）/ Kotlin（Android）ネイティブ — Phase 5 以降

```
app/api/* を REST API として叩く。UI はフルネイティブ構築。
```

- 最高のパフォーマンス・UX
- `shared/api/index.ts` の fetch ロジックを Swift / Kotlin に移植
- **所要時間: 半年以上**

---

### 12-4. フェーズ別ロードマップ

```
Phase 1（2026年5月）  Web 公開（現在）
     ↓
Phase 2（2026年夏）   PWA 対応（Service Worker・ホーム画面追加・オフライン）
                      管理画面（/admin）・Stripe 決済
     ↓
Phase 3（2026年秋）   有料会員機能・語学コンテンツ拡充
     ↓
Phase 4（2027年前半） React Native + Expo でアプリ化
                      App Store（iOS）/ Google Play（Android）申請
                      Apple Sign In 実装（App Store 規約上必須）
     ↓
Phase 5（2027年後半〜）Swift / Kotlin ネイティブ検討（必要に応じて）
```

---

### 12-5. API 設計の原則（モバイル対応を意識した REST 設計）

`app/api/` の Route Handlers は Web だけでなく、将来のモバイルアプリからも叩かれることを前提に設計する：

```
✅ 守ること
  - レスポンスは必ず JSON（{ data, error } 形式）
  - HTTP ステータスコードを正しく使う（200/400/401/403/404/500）
  - ページネーションは { items, meta: { total, page, perPage } } 形式に統一（Rev17 対応）
  - CORS ヘッダーを将来追加できるように next.config.mjs で管理

❌ やってはいけないこと
  - HTML を返す API エンドポイント
  - Cookie 専用の認証（Authorization Bearer ヘッダーも対応すること）
  - Next.js 固有の機能（redirect()等）を API Route 内で使う
```

---

### 12-6. 今から守るべき実装ルール（CodingAgent へ）

| ルール | 理由 |
|--------|------|
| `shared/` には Next.js・React DOM・HTML を一切入れない | React Native / Swift から import できなくなる |
| API レスポンスは `{ items, meta }` 形式に統一（Rev17） | iOS SDK・Android SDK で共通利用するため |
| 環境変数は `process.env.*` で lazy 参照（モジュールロード時 throw 禁止） | サーバーレス・モバイルバックエンド両対応 |
| `app/api/` の全エンドポイントに zod バリデーションを必須化 | モバイルクライアントからの不正リクエスト対策 |
| コンポーネントにビジネスロジックを書かない（表示専用に保つ） | Phase 4 の React Native 移行時にロジックを流用できる |

---

## 🧪 13. テスト戦略（Phase QA）

### 13-1. 4層テストピラミッド

```
         ┌──────────────────────┐
         │  E2E  (Playwright)    │ ← QA-T4（未着手・4〜6h・chromium install 必要）
         ├──────────────────────┤
         │  統合  (Vitest + DB)  │ ← QA-T3（未着手・3〜4h・Neon branch + auth mock 必要）
         ├──────────────────────┤
         │  ユニット (Vitest)     │ ← QA-T2 ✅ 完了（43/43 PASS・363ms）
         ├──────────────────────┤
         │  スモーク (curl/bash)  │ ← QA-T1 ✅ 完了（44/45 PASS・G1 は仕様通り 403）
         └──────────────────────┘
```

### 13-2. 各層の責務と実体

| 層 | 場所 | 対象 | 依存 | コマンド |
|---|---|---|---|---|
| **スモーク (T1)** | `scripts/smoke-test.sh` | 37 エンドポイント（ページ19・公開API7・admin API 未認証5・CSRF 1・auth 3・misc 2） | dev server（port 3000）稼働 | `BASE_URL=http://localhost:3000 pnpm test:smoke` |
| **ユニット (T2)** | `test/unit/*.test.ts` | `shared/utils` / `lib/schemas/articles` / `lib/repositories.escapeLike` | なし（pure 関数のみ） | `pnpm test` |
| **統合 (T3)** | `test/integration/` (未作成) | admin API CRUD・rate limit 429・AI plan分岐 | Neon branch + NextAuth モック | (未整備) |
| **E2E (T4)** | `e2e/*.spec.ts` (未作成) | ログイン／閲覧／AI／管理画面／CSRF／404 の主要10シナリオ | `@playwright/test` + chromium | (未整備) |

### 13-3. テスト可能性を担保するための実装ルール

| ルール | 配置例 | 理由 |
|---|---|---|
| **zod スキーマは独立ファイル** | `lib/schemas/articles.ts` | Next.js route.ts は HTTP method 以外を export できないため、テストから import できる別ファイルに置く |
| **純粋関数は export** | `lib/repositories/articles.ts` の `escapeLike` | DB に依存しない部分だけ切り出してユニットテスト可能に |
| **ビジネスロジックを Repository へ集約**（Rev19 の原則再掲） | `lib/repositories/*.ts` | API route はバリデーション＋リポジトリ呼び出しだけにして、Repository 単位でテストを書けるようにする |
| **外部サービスは DI or 抽象化** | `lib/ratelimit.ts` (TODO) | Upstash 呼び出しをインターフェイス化してフェイク実装に差し替え可能にする |

### 13-4. CI / CD 連携（`.github/workflows/test.yml`）

```
push (main) / pull_request (main → *)
    ↓
┌──────────────────────────────────┐
│ static-and-unit  ✅ 有効           │
│ ├─ pnpm install --frozen-lockfile │
│ ├─ pnpm exec tsc --noEmit         │
│ ├─ pnpm lint                      │
│ └─ pnpm test                      │
└──────────────────────────────────┘
           ↓ (将来拡張)
   ┌────────┬──────────┬──────────┐
   │ smoke  │ integration│  e2e    │
   │ 準備中 │ QA-T3後   │ QA-T4後  │
   └────────┴──────────┴──────────┘
```

### 13-5. テスト実行コマンド早見表

| 用途 | コマンド |
|---|---|
| ユニットテスト（1回） | `pnpm test` |
| ウォッチモード | `pnpm test:watch` |
| UI モード（ブラウザ） | `pnpm test:ui` |
| スモーク（要 dev server） | `pnpm test:smoke` |
| 型検査 | `npx tsc --noEmit` |
| Lint | `pnpm lint` |

### 13-6. モバイル移行時のテスト流用性

| 層 | iOS/Android 流用性 | 備考 |
|---|---|---|
| ユニット（T2） | 🟢 高 | `shared/utils` や zod スキーマは pure TS なので React Native でもそのまま実行可能 |
| 統合（T3） | 🟡 中 | API 契約テストは React Native クライアントでも流用可能（base URL 差し替え） |
| E2E（T4） | 🔴 低 | Playwright は Web 専用。iOS/Android は Detox や XCUITest で別途構築 |
| スモーク（T1） | 🟢 高 | curl ベースなので CI から実行可能（URL リストを追加するだけ） |

---

## 🔗 関連ドキュメント

- 実装依頼書: [todo/familyai_coding_agent_v5.md](./familyai_coding_agent_v5.md)
- 人間作業手順: [todo/junliToDo_v4.md](./junliToDo_v4.md)
- テスト計画: [todo/test-plan_v1.md](./test-plan_v1.md)
- テスト結果（T1 スモーク）: [todo/TestResult_202604192224.md](TestResult_202604192224.md)
- テスト結果（T2 Vitest + CI）: [todo/TestResult_202604192243.md](TestResult_202604192243.md)
- 残課題: CodingAgent タスクは Step 01〜22・Rev01〜23.2・Phase QA-T1/T2/CI まで全完了 🎉
