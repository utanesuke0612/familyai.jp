# familyai.jp — CodingAgent 実装依頼書 v2.0

## 2026/5/8 までの実行整理（進捗テーブル）

| 区分        | タスク（1行1タスク）                                                   | 担当        | 期限           | 状態  |
| --------- | ------------------------------------------------------------- | --------- | ------------ | --- |
| 実施済み      | `web/` に Next.js プロジェクトを作成                                    | Codex     | 2026-04-15   | 未完了 |
| 実施済み      | `index.html` 準拠のフォント/色/アニメーションを `layout/globals` に反映          | Codex     | 2026-04-15   | 未完了 |
| 実施済み      | Coming Soon トップページを Next.js に移植                               | Codex     | 2026-04-15   | 未完了 |
| 実施済み      | `/learn`・`/learn/[slug]`・`/about`・`/common`・`/apps` のページ骨格を実装 | Codex     | 2026-04-15   | 未完了 |
| 実施済み      | `/api/articles`・`/api/ai`・`/api/audio` ルートを追加                 | Codex     | 2026-04-15   | 未完了 |
| 実施済み      | AIルーターを OpenRouter First（例外のみ直結）へ切替                           | Codex     | 2026-04-15   | 未完了 |
| 実施済み      | ドメイン/DNS 設定を完了                                                | 人間（junli） | 2026-04-14   | 未完了 |
| 実施済み      | SSL/HTTPS 有効化確認を完了                                            | 人間（junli） | 2026-04-15   | 未完了 |
| 人間Todo    | OpenRouter でAPIキーを発行し `OPENROUTER_API_KEY` を設定                | 人間（junli） | 2026-05-08まで | 未着手 |
| 人間Todo    | `OPENROUTER_APP_URL` と `OPENROUTER_APP_NAME` を本番値で設定          | 人間（junli） | 2026-05-08まで | 未着手 |
| 人間Todo    | （Voicevox直結を使う場合のみ）`VOICEVOX_API_BASE` を設定                    | 人間（junli） | 2026-05-08まで | 未着手 |
| 人間Todo    | Neon接続文字列 `DATABASE_URL` を設定                                  | 人間（junli） | 2026-05-08まで | 未着手 |
| 人間Todo    | Google OAuth クライアント情報を設定（`GOOGLE_CLIENT_ID/SECRET`）           | 人間（junli） | 2026-05-08まで | 未着手 |
| CodexTodo | `runVoicevox` のダミー応答を実際のTTS呼び出しへ置換                            | Codex     | 2026-05-08まで | 未着手 |
| CodexTodo | `/api/audio` の土台実装を Vercel Blob 署名URL発行へ置換                    | Codex     | 2026-05-08まで | 未着手 |
| CodexTodo | `seedArticles` 依存を Drizzle + Neon のDB取得へ置換                    | Codex     | 2026-05-08まで | 未着手 |
| CodexTodo | `lib/db/schema.ts` のプレースホルダを実スキーマ定義へ置換                        | Codex     | 2026-05-08まで | 未着手 |
| CodexTodo | NextAuth v5（Google + Credentials）を本番接続                        | Codex     | 2026-05-08まで | 未着手 |
| CodexTodo | OpenRouter の用途別処理（画像/音声/文字起こし）の実運用検証とフォールバック調整                | Codex     | 2026-05-08まで | 未完了 |

## あなたの役割

あなたはプロダクショングレードのフルスタックエンジニア兼UIデザイナーです。
以下の仕様に従い `familyai.jp` をゼロから実装してください。
**質問は不要**です。不明点は合理的なデフォルト値を選んで進めてください。

---

## ⚠️ 最初に必ず読むこと（Skills参照）

フロントエンドのUI・コンポーネント・ページを作成する際は、**必ず事前に以下のSkillsファイルを読んでから実装を開始すること。**

```
Skills名: frontend-design
場所：C:\Users\jun.li\.claude\plugins\cache\claude-plugins-official\frontend-design\unknown\skills\frontend-design
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
| 認証 | NextAuth.js v5 | 最新（Google・ローカル・将来Apple ID対応） |
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

`/files/index.html` は **familyai.jp の公式デザインリファレンス（正）** とする。  
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
カード:      hover:-translate-y-2 hover:shadow-lg transition-all duration-200
ボタン:      hover:-translate-y-1 hover:shadow-md transition-all duration-200
ロールカード: hover:-translate-y-2 hover:border-[var(--color-orange)] transition-all duration-200
```

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

export const ROLES = ['papa', 'mama', 'kids', 'senior', 'common'] as const;
export type Role = typeof ROLES[number];

export const CATEGORIES = [
  'office', 'design', 'language', 'study',
  'cooking', 'money', 'health', 'writing', 'basic',
] as const;
export type Category = typeof CATEGORIES[number];

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type Level = typeof LEVELS[number];

export const articles = pgTable('articles', {
  id:               uuid('id').defaultRandom().primaryKey(),
  slug:             varchar('slug', { length: 255 }).notNull().unique(),
  title:            varchar('title', { length: 255 }).notNull(),
  description:      text('description'),
  body:             text('body').notNull(),
  roles:            text('roles').array().notNull(),
  categories:       text('categories').array().notNull(),
  level:            varchar('level', { length: 20 }).notNull().default('beginner'),
  audioUrl:         text('audio_url'),
  audioTranscript:  text('audio_transcript'),
  audioDurationSec: integer('audio_duration_sec'),
  thumbnailUrl:     text('thumbnail_url'),
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
  passwordHash:     text('password_hash'),
  plan:             varchar('plan', { length: 20 }).notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
});

export const bookmarks = pgTable('bookmarks', {
  id:        uuid('id').defaultRandom().primaryKey(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
## AI APIルーター仕様
## ═══════════════════════════════════

```typescript
// app/api/ai/route.ts

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
    fallback: [{ provider: 'openrouter', model: 'openai/gpt-5-mini' }],
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
- **原則はOpenRouter経由**で呼び出すこと（SDK/HTTP実装は `lib/ai/providers/openrouter.ts` に集約）
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

# AI APIs（OpenRouter First）
OPENROUTER_API_KEY=           # 必須: 原則すべての生成AI呼び出しを集約
OPENROUTER_BASE_URL=          # 例: https://openrouter.ai/api/v1/chat/completions
OPENROUTER_APP_URL=           # 例: https://familyai.jp
OPENROUTER_APP_NAME=          # 例: familyai.jp

# Exception route（必要時のみ）
VOICEVOX_API_BASE=            # 日本語TTSを直結する場合のみ設定
# SEEDANCE_API_KEY=          # TODO: Phase3 動画生成（有料会員限定）

# Payment（Phase2以降）
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
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
- パスワードは `bcrypt`（saltRounds: 12）でハッシュ化して保存
- 会員登録ページ（`/auth/register`）を作成すること
- メールアドレス確認メール送信（`nodemailer` または `Resend`）は Phase2 以降でOK
- パスワードリセット機能も Phase2 以降でOK

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
Step 11: app/(site)/learn/[slug]/page.tsx（記事詳細）
Step 12: AudioPlayer.tsx（速度変更・リピート・シーク）← MVP必須・5月8日までに完成させること
Step 13: app/api/audio/route.ts（Vercel Blob からの音声配信）
Step 14: app/(site)/common/page.tsx + about/page.tsx
Step 15: app/sitemap.ts + robots.ts + SEOメタデータ
Step 16: lib/db/seed.ts でシードデータ投入（語学音声記事を含めること）
Step 17: useScrollReveal.ts + StatsRow.tsx（統計行）
Step 18: AIChatWidget.tsx + app/api/ai/route.ts（Phase2 先行実装・余裕があれば）
Step 19: Vercel デプロイ確認・環境変数設定
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
## 品質要件
## ═══════════════════════════════════

| 項目 | 要件 |
|---|---|
| TypeScript | strict mode・型エラーゼロ |
| レスポンシブ | モバイルファースト（320px〜）|
| アクセシビリティ | img alt属性・button aria-label・focus visible |
| パフォーマンス | next/image使用・next/font使用・LCP最適化 |
| エラーハンドリング | API Route全てtry/catch・適切なHTTPステータス |
| 環境変数 | ハードコード禁止・全て.env.localから読む |
| コメント | 日本語で記述 |
| コンポーネント設計 | 単一責任原則・再利用可能な小さい単位 |

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
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
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
[ ] 音声プレイヤーがMP3を再生・速度変更できる
[ ] /api/ai にPOSTリクエストが成功する
[ ] pnpm db:push でDBスキーマが反映される
[ ] pnpm db:seed でシードデータが投入される
[ ] Vercel にデプロイできる
[ ] OGP画像が設定されSNSシェア時に表示される
[ ] スクロールリビールアニメーションが動作する
[ ] Aboutページに感謝の文言が表示される

--- 認証チェック（Phase 1必須） ---
[ ] Googleアカウントでログインできる
[ ] Googleログイン後にユーザー情報がDBに保存される
[ ] ローカルアカウントで新規登録できる（/auth/register）
[ ] ローカルアカウントでログインできる（メール＋パスワード）
[ ] パスワードがbcryptでハッシュ化されDBに保存される
[ ] ログアウトが正常に動作する
[ ] 未ログイン状態で会員限定ページにアクセスするとリダイレクトされる
[ ] usersテーブルに auth_provider カラムが存在する
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
[ ] スマホ回線（3G相当）でも3秒以内に表示開始される

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
```
