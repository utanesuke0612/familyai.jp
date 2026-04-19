# junli ToDo — 人間がやること一覧

> 最終更新: 2026-04-19 22:30（Rev23 完了・Rev23.1/23.2 Vercel hotfix 完了・Vercel 本番デプロイ成功・Phase QA-T1 スモークテスト完了 44/45 PASS）

# かかった費用

- DNS 設定費用　1356円 と Domain名費用：2,339円年間

# familyai.jp プロジェクト

> CodingAgent（Claude Code / Codex）に任せられない、
> アカウント登録・支払い・申請など「人間の手」が必要な作業だけをまとめています。

---

## ✅ 今すぐやること（2026年5月8日リリースまで）

> 📅 2026-04-19 時点で**残り約19日**。
> CodingAgent タスクは全完了 🎉。残りは junli さんの人間タスクのみです。
> 「🔥 今すぐ」の Vercel 環境変数追加を最優先で対応してください。

---

### 0. OpenRouter 設定（OpenRouter First のため最優先）
**所要時間: 約10〜15分**
**状態: ✅ 完了**

> 2026/4/15時点の実装は「OpenRouter First（例外のみ直結）」です。  
> まずここを設定しないと `/api/ai` が本番応答できません。

#### 手順
1. https://openrouter.ai にログイン（未登録なら登録）
2. Dashboard で API Key を作成
3. Vercel → Project → `Settings` → `Environment Variables` で以下を追加:
   ```bash
   OPENROUTER_API_KEY=（発行したキー）
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   OPENROUTER_APP_URL=https://familyai.jp
   OPENROUTER_APP_NAME=familyai.jp
   ```
   > 補足: 実装はHTTP直叩きで `/api/v1/chat/completions` を利用しますが、
   > 環境変数にはベースURL（`/api/v1`）を設定してください。
4. 保存後、デプロイ再実行（`Redeploy`）または最新コミットで再デプロイ
5. 動作確認: `https://familyai.jp/learn/ai-english-email` で AI質問を送信し、エラーが出ないことを確認

---

### 1. ドメイン・DNS設定（お名前ドットコム専用手順）
**所要時間: 約30分**
**状態: ✅ 完了（2026-04-18 Vercel Domains 全項目 Valid Configuration 確認済み）**

#### STEP 1: Vercel でドメインを追加してDNS値を確認する
1. https://vercel.com にログイン
2. プロジェクト → `Settings` → `Domains`
3. `familyai.jp` を入力して「Add」をクリック
4. 画面に表示される以下の値をメモする（プロジェクト専用の値）:
   ```
   【Aレコード】
   タイプ: A
   値:     76.76.21.21（※Vercel画面に表示された値を使うこと）

   【CNAMEレコード】
   タイプ: CNAME
   名前:   www
   値:     cname.vercel-dns.com（※Vercel画面に表示された値を使うこと）
   ```

#### STEP 2: お名前ドットコムでDNSレコードを設定する
1. https://www.onamae.com にログイン（お名前ID・パスワード）
2. 上部メニューの **「ネームサーバー/DNS」** にマウスを合わせる
3. 表示されたメニューから **「ドメインDNS設定」** をクリック
   > ⚠️「更新手続きをお忘れではございませんか？」が表示されたら
   > 「更新画面から移動する」をクリックしてスキップ
4. `familyai.jp` の **「ドメインDNS」** をクリック
5. **「DNSレコード設定」** をクリック
6. **「レコード追加」タブ** をクリック
7. **Aレコード**を以下の通り入力して「追加」をクリック:
   ```
   ホスト名: （空欄のまま）
   TYPE:     A
   VALUE:    76.76.21.21（Vercel画面の値）
   TTL:      3600
   優先:     （空欄のまま）
   ```
8. 続けて **CNAMEレコード**を入力して「追加」をクリック:
   ```
   ホスト名: www
   TYPE:     CNAME
   VALUE:    cname.vercel-dns.com（Vercel画面の値）
   TTL:      3600
   優先:     （空欄のまま）
   ```
9. 「確認画面へ進む」→ 内容を確認 → **「設定する」** をクリック
10. 完了メールがお名前ドットコム登録メールアドレスに届く

> ⚠️ 反映まで最大72時間かかる場合があります（通常は数時間）
> 設定前に現在のDNS設定をスクリーンショットで記録しておくと安心です

#### STEP 3: 反映確認
- https://www.whatsmydns.net で `familyai.jp` を検索して確認
- Vercelダッシュボードの Domains 画面が ✅ に変わればOK
https://vercel.com/utafamily/familyai-jp/settings/domains

#### STEP 4: SSL証明書（HTTPS）有効化の確認
1. Vercel ダッシュボード → Project → `Settings` → `Domains` を開く
2. `familyai.jp` / `www.familyai.jp` の HTTPS ステータスが有効（証明書発行済み）であることを確認
3. ブラウザで `https://familyai.jp` と `https://www.familyai.jp` を開き、鍵マークが表示されることを確認
4. `http://familyai.jp` にアクセスしたとき、`https://familyai.jp` へリダイレクトされることを確認
**👆@2026/4/15 できた！！**
---

### 2. Vercel アカウント作成・プロジェクト設定
**所要時間: 約20分**
**状態: アカウント作成・プロジェクト設定済み ✅ / 環境変数は順次追加中**

#### 手順
1. https://vercel.com にアクセス
2. 「Sign Up」→ GitHub アカウントでログイン（GitHubがない場合は先に作成）
3. 「New Project」→ GitHubリポジトリと連携
4. Hobby プラン（無料）で開始
5. Environment Variables（環境変数）画面で以下を入力

#### 必須環境変数チェックリスト（実装完走に必要なすべて）

| 変数名 | 取得元 | 状態 |
|--------|--------|------|
| `DATABASE_URL` | Neon PostgreSQL | ✅ 設定済み |
| `NEXTAUTH_SECRET` | ターミナルで生成（下記） | ✅ 設定済み |
| `AUTH_SECRET` | NextAuth v5 用（NEXTAUTH_SECRET と同値） | ✅ ローカル設定済み / ⚠️ Vercel 本番に要追加 |
| `NEXTAUTH_URL` | 固定値 `https://familyai.jp` | ✅ 設定済み |
| `AUTH_URL` | NextAuth v5 用（NEXTAUTH_URL と同値） | ✅ ローカル設定済み / ⚠️ Vercel 本番に要追加 |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | ✅ 設定済み |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | ✅ 設定済み |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob（Marketplace） | ✅ 設定済み |
| `UPSTASH_REDIS_REST_URL` | Upstash | ✅ 設定済み |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | ✅ 設定済み |
| `OPENROUTER_API_KEY` | OpenRouter | ✅ 設定済み |
| `OPENROUTER_BASE_URL` | 固定値 `https://openrouter.ai/api/v1` | ✅ 設定済み |
| `OPENROUTER_APP_URL` | 固定値 `https://familyai.jp` | ✅ 設定済み |
| `OPENROUTER_APP_NAME` | 固定値 `familyai.jp` | ✅ 設定済み |
| `NEXT_PUBLIC_API_URL` | 固定値 `https://familyai.jp` | ✅ 設定済み |
| `NEXT_PUBLIC_GA_ID` | Google Analytics | ⚠️ 未設定（Todo15 完了後に追加） |
| `ADMIN_EMAIL` | 管理者メールアドレス | ✅ ローカル設定済み / ⚠️ Vercel 本番に要追加 |
| `VOICEVOX_API_BASE` | Voicevox サーバー | — MVP では任意 |

> ✅ 固定値の変数は下記コマンドを使わず、そのままコピペしてOK。

※ `NEXTAUTH_SECRET` の生成コマンド（ターミナルで実行）:
```bash
openssl rand -base64 32
```

---

### 3. Neon PostgreSQL（DB）セットアップ
**所要時間: 約15分**
**状態: ✅ 完了**

> ⚠️ 注意（2025年以降の変更点）:
> NeonはDatabricksに買収され、無料枠・料金が変わりました。
> 最新の無料枠: ストレージ 0.5GB / 月100CU時間 / 最大20プロジェクト
> familyai.jpのMVP段階では無料枠で十分対応できます。

#### 手順
1. https://neon.com にアクセス（neon.tech でも同じ）
2. 「Sign Up」→ GitHub でログイン（クレジットカード不要）
3. 「Create Project」→ プロジェクト名: `familyai`・リージョン: `AWS Asia Pacific (Tokyo)` を選択
4. 接続文字列をコピー（`postgresql://...` から始まる文字列）
5. Vercel の環境変数 `DATABASE_URL` に貼り付ける
6. または Vercel Marketplace から直接連携可能（Vercel → Storage → Browse Marketplace → Neon）

#### 実装に合わせた最終確認（必須）
1. Vercel 環境変数一覧で `DATABASE_URL` が `Production/Preview/Development` に入っているか確認
2. 値の末尾に余計なスペースや改行がないか確認
3. 接続文字列を更新した場合は、再デプロイする

---

### 4. Google OAuth 設定（ログイン機能）
**所要時間: 約20〜30分**
**状態: ✅ 完了（ローカル動作確認済み）**

> ⚠️ 重要（2025年以降の変更点）:
> Google Cloud Consoleでは「OAuth同意画面」の設定が先に必要になりました。
> また、クライアントシークレットは**作成時の一度しか表示されない**ので
> 必ずすぐにコピーして安全な場所に保存してください。

#### 手順
1. https://console.cloud.google.com にアクセス
2. 新しいプロジェクトを作成（名前: `familyai`）
3. 「APIとサービス」→「OAuth同意画面」を先に設定
   - ユーザーの種類: 「外部」を選択
   - アプリ名: `familyai.jp`
   - サポートメール: 自分のメールアドレス
   - 承認済みドメイン: `familyai.jp` を追加
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアントID」
5. アプリケーションの種類: `ウェブアプリケーション`
6. 承認済みのリダイレクトURIに追加:
   ```
   http://localhost:3000/api/auth/callback/google
   https://familyai.jp/api/auth/callback/google
   ```
7. 「作成」をクリック → **クライアントIDとシークレットが表示される**
   > ⚠️ シークレットはこの画面でしか確認できません。必ずすぐコピー！
8. Vercel 環境変数に追加:
   ```
   GOOGLE_CLIENT_ID     = （コピーしたID）
   GOOGLE_CLIENT_SECRET = （コピーしたシークレット）
   ```

#### 実装に合わせた最終確認（必須）
1. Google Cloud の OAuth クライアントに本番リダイレクトURIが入っていることを確認
   - `https://familyai.jp/api/auth/callback/google`
2. Vercel の `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` が設定済みか確認
3. 設定後、`https://familyai.jp/auth/signin` で Google ログインが開始できるか確認

---

### 4b. ローカルアカウント設定（メール＋パスワード）
**所要時間: 約5分（追加設定なし）**

> ✅ ローカルアカウントはNextAuth.js の Credentials Provider で実装します。
> **追加のAPIキーや外部サービス契約は不要です。**
> CodingAgentが実装を担当します。

#### junliさんが決めること
1. パスワードの最低文字数（推奨: 8文字以上）
2. 会員登録時にメール確認を必須にするか（Phase1はスキップ推奨）
3. パスワードリセット機能の優先度（Phase2推奨）

#### ログイン画面のイメージ
```
┌────────────────────────────┐
│  familyai.jp にログイン    │
│                            │
│  [G] Googleでログイン      │
│                            │
│  ─────── または ───────   │
│                            │
│  メール:  [____________]   │
│  パスワード: [__________]  │
│  [ログイン]                │
│                            │
│  → 新規登録はこちら        │
└────────────────────────────┘
```

---



>**2026年5月8日までにここです！**
---------
### 4c. Apple ID ログイン設定（Phase 4以降・iOSアプリ時）
**所要時間: 約1時間（Apple Developer登録後）**

> ⚠️ Apple ID ログインは **Phase 4（iOSアプリリリース時）** に実装します。
> iOSアプリでサードパーティログイン（Googleなど）を使う場合、
> Appleは「Sign in with Apple」の実装を**義務付けています**。
> 今はまだ何もしなくてOKです。

#### Phase 4 になったらやること
1. Apple Developer Program に登録済みであること（$99/年）
2. https://developer.apple.com/account にログイン
3. 「Certificates, Identifiers & Profiles」→「Identifiers」
4. 「Services IDs」を新規作成
   - Description: `familyai.jp Sign In`
   - Identifier: `jp.familyai.web`（例）
5. 「Sign In with Apple」を有効化
6. リダイレクトURLを追加:
   ```
   https://familyai.jp/api/auth/callback/apple
   ```
7. 「Keys」→ 新しいキーを作成 → 「Sign in with Apple」にチェック
8. `.p8` ファイル（秘密鍵）をダウンロード
   > ⚠️ この.p8ファイルも**一度しかダウンロードできない**ので安全に保管！
9. Vercel 環境変数に追加（CodingAgentに作業依頼）:
   ```
   APPLE_ID=         （Services ID）
   APPLE_TEAM_ID=    （Apple Developer チームID）
   APPLE_KEY_ID=     （作成したキーのID）
   APPLE_PRIVATE_KEY= （.p8ファイルの内容）
   ```

---

### 5. Vercel Blob 設定（音声・画像ファイル保存）
**所要時間: 約10分**
**状態: ✅ 完了（familyai-blob 作成・BLOB_READ_WRITE_TOKEN 設定済み）**

> 無料枠: 5GB まで無料。50GBになっても月額約60円と格安。

#### 手順
1. Vercel ダッシュボード → Storage → 「Create Database」
2. 「Blob」を選択 → 名前: `familyai-blob`
3. 作成後、`BLOB_READ_WRITE_TOKEN` が自動生成される
4. Vercel の環境変数に自動で追加されることを確認

---

### 5b. Upstash Redis 設定（レート制限）
**所要時間: 約10分**
**状態: ✅ 完了（UPSTASH_REDIS_REST_URL / TOKEN 設定済み）**

> AIの無制限利用によるコスト爆発を防ぐために必須。
> 無料枠: **500,000リクエスト/月**（日次ではなく月次ベース）・256MB
> ※ 旧情報（10,000/日）は誤りです。現行は月次での計算です。

#### 手順
1. https://upstash.com にアクセス
2. 「Sign Up」→ GitHub でログイン
3. 「Create Database」→ 名前: `familyai-ratelimit`・リージョン: `ap-northeast-1（Tokyo）`
4. 「REST API」タブから以下をコピー:
   ```
   UPSTASH_REDIS_REST_URL=（コピー）
   UPSTASH_REDIS_REST_TOKEN=（コピー）
   ```
5. Vercel の環境変数に追加

> ⚠️ OpenRouterキーが漏洩したと思ったら:
> 1. https://openrouter.ai/settings/keys でキーを即座に無効化
> 2. 新しいキーを発行
> 3. Vercel環境変数 `OPENROUTER_API_KEY` を更新して Redeploy

---

### 5c. OGP デフォルト画像の作成
**所要時間: 約20分**
**状態: ⚠️ 未着手（今週中に対応）**

> SNSシェア時に表示される画像。必ず用意すること。

#### 手順
1. Canva（https://canva.com）にアクセス
2. 「カスタムサイズ」→ 1200×630px で新規作成
3. 以下のデザインで作成:
   ```
   背景色: #FDF6ED（クリーム）
   右上: オレンジのblobグラデーション装飾
   左: familyai.jp（大きめのテキスト）
   下: 「AI = 愛 — 家族みんなのAI活用メディア」
   フォント: Kaisei Opti（または近いもの）
   ```
4. PNG形式でダウンロード
5. ファイル名を `og-default.png` にリネーム
6. プロジェクトの `public/og-default.png` に配置
   （CodingAgentに「public/に配置して」と伝える）

---

### 5c-2. OGP 用日本語フォントファイルの配置
**所要時間: 約5分**
**状態: ✅ 完了（public/fonts/NotoSansJP-Bold.ttf 配置済み）**

> `/api/og` の動的OGP画像に日本語を表示するために必要。
> フォントがないと日本語が文字化けします。

#### 手順
1. Google Fonts から `Noto Sans JP Bold`（TTF形式）をダウンロード
   - https://fonts.google.com/noto/specimen/Noto+Sans+JP → 「Download family」
   - ダウンロードした ZIP を解凍 → `NotoSansJP-Bold.ttf` を探す
2. プロジェクトの `public/fonts/NotoSansJP-Bold.ttf` に配置
3. CodingAgent に「public/fonts/ に NotoSansJP-Bold.ttf を配置しました」と伝える
   （CodingAgent が `/api/og/route.tsx` でこのファイルを参照します）

> ⚠️ このファイルは約 4MB あります。Git にコミットして問題ありません（Vercel の静的ファイルとして配信）。

---

### 5d. プライバシーポリシー・利用規約の確認
**所要時間: 約30〜60分**
**状態: ⚠️ ページ実装済み・内容の最終確認が未完了（5月初旬までに対応）**

> App Store・Google Play・Stripe審査に必須。
> CodingAgentがテンプレートを作成済み。内容を確認・修正すること。

#### 手順
1. CodingAgentが `/privacy` と `/terms` のページを作成する
2. 内容を読んで、以下を自分の状況に合わせて修正:
   - 運営者名（本名 or 屋号）
   - 連絡先メールアドレス
   - 所在地（任意）
3. 法的な確認が必要な場合は専門家に相談
4. 修正後、CodingAgentにページ内容を更新してもらう

---

### 6. AI API キー取得
**所要時間: 各10〜15分**
**状態: OpenRouter優先のため手順更新**

> ⚠️ 現在の実装は OpenRouter First です。  
> 下記「Anthropic / Google / OpenAI 個別キー」は **直接実装時は必須ではありません**。  
> まずは「0. OpenRouter 設定」を完了してください。

#### Anthropic（Claude）
1. https://console.anthropic.com にアクセス
2. サインアップ → APIキーを作成
3. Vercel 環境変数: `ANTHROPIC_API_KEY`

#### Google（Gemini）
1. https://aistudio.google.com にアクセス
2. 「Get API key」→ キーを作成
3. Vercel 環境変数: `GOOGLE_GENERATIVE_AI_API_KEY`

#### OpenAI（Whisper・音声文字起こし）
1. https://platform.openai.com にアクセス
2. 「API Keys」→ 「Create new secret key」
3. Vercel 環境変数: `OPENAI_API_KEY`

#### 6b. Voicevox 直結を使う場合のみ（任意）
**所要時間: 約5分**
**状態: 未着手（必要時のみ）**

1. Voicevox サーバー（ローカルまたはクラウド）を準備
2. ベースURLを確認（例: `http://127.0.0.1:50021`）
3. Vercel 環境変数に追加:
   ```bash
   VOICEVOX_API_BASE=（VoicevoxのベースURL）
   ```
4. TTS機能を使う時だけ有効化（使わないなら未設定でOK）

---

### 7. Google Search Console 登録（SEO）
**所要時間: 約15分**
**状態: ⚠️ 未着手（5月初旬までに対応）**

#### 手順
1. https://search.google.com/search-console にアクセス
2. 「プロパティを追加」→ `familyai.jp` を入力
3. 所有権確認: Vercel に HTML ファイルを配置する方法が簡単
4. サイトマップを送信: `https://familyai.jp/sitemap.xml`

---

### 8. Google Analytics 設定
**所要時間: 約15分**
**状態: ⚠️ 未着手（5月初旬までに対応）**

#### 手順
1. https://analytics.google.com にアクセス
2. 「測定を開始」→ アカウント名: `familyai`
3. プロパティ名: `familyai.jp` → タイムゾーン: 日本
4. 測定ID（`G-XXXXXXXXXX`）をコピー
5. Vercel 環境変数に追加:
   ```
   NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX
   ```

---

## 🗺️ 全体ロードマップ（メディア × Webアプリ × スマホアプリ）

> **familyai.jp は「記事メディア」だけでなく、インタラクティブなWebアプリも提供するプラットフォームです。**
> また将来は iOS・Android アプリへの展開も確定しています。Web版はその「最初のクライアント」です。

| フェーズ | 時期 | 内容 | 担当 |
|---------|------|------|------|
| **Phase 1** | 〜2026年5月 | **記事メディア公開**（記事・音声・AIチャット） | junli + CodingAgent |
| **Phase 2** | 2026年夏 | **Webアプリ追加**（ディクテーション・宿題ヘルパー・献立プランナー等）<br>+ PWA対応・管理画面・Stripe決済 | junli + CodingAgent |
| **Phase 3** | 2026年秋 | **有料会員機能**（Webアプリの高度機能を有料化）<br>+ コンテンツ拡充・語学コース | junli + CodingAgent |
| **Phase 4** | 2027年前半 | **スマホアプリ化**（React Native + Expo）<br>App Store / Google Play 申請 | junli + CodingAgent |
| **Phase 5** | 2027年後半〜 | Swift / Kotlin ネイティブ検討（必要に応じて） | 要検討 |

> 📌 CodingAgent は常に「shared/ 層を iOS でも使える設計」「Webアプリを追加しやすいAPI設計」で実装しています。

---

## 📅 Phase 2（6〜8月）でやること

> Phase 2 の主な目標：**インタラクティブWebアプリの追加** + PWA対応 + Stripe決済

### Phase 2 で追加するWebアプリ一覧（CodingAgent が実装）

| アプリ | ルート | junli さんがやること |
|-------|--------|-------------------|
| **ディクテーション** | `/tools/dictation` | 練習用の音声素材（MP3）を準備して Vercel Blob にアップロード |
| **宿題ヘルパー** | `/tools/homework` | 対象学年・科目の範囲を CodingAgent に伝える |
| **献立プランナー** | `/tools/meal-plan` | 特になし（CodingAgent が実装） |
| **画像生成スタジオ** | `/tools/image-gen` | OpenRouter で FLUX モデルの利用枠を確認 |

---

### 9. Stripe 設定（有料会員・決済）
**所要時間: 約1〜2時間 + 審査数日**

> ⚠️ 日本でのStripe注意事項:
> - Stripe Japan, Inc. が日本でサービスを提供しています
> - 本人確認書類（運転免許証・パスポートなど）が必要
> - 銀行口座の登録が必要（売上の振り込み先）
> - インボイス制度対応が必要な場合は適格請求書発行事業者番号の登録も必要
> - テスト用APIキーで先に開発を進めて、本番審査は後でOK

#### 手順
1. https://stripe.com/jp にアクセス
2. アカウント作成 → 本人確認書類の提出（必須）
3. 銀行口座を登録（売上振り込み先）
4. ダッシュボード → 「製品」→ 月額プランを作成
   - プラン名: `familyai Pro`
   - 金額: 月額980円（例）
5. APIキーをコピー（テスト用・本番用の2種類）
6. Vercel 環境変数に追加:
   ```
   STRIPE_SECRET_KEY                  = sk_live_...
   STRIPE_WEBHOOK_SECRET              = whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
   ```
7. Webhook エンドポイントを登録:
   ```
   https://familyai.jp/api/webhooks/stripe
   ```

---

### 10. 語学音声ファイルのアップロード
**所要時間: コンテンツ量による**

#### 手順
1. MP3ファイルを準備（AI音声合成またはネイティブ録音）
2. Vercel Blob にアップロード（管理画面 or CLIで可能）
   ```bash
   # CLIでのアップロード例
   npx vercel blob upload ./audio/lesson-01.mp3
   ```
3. 取得したURLをDBの `audio_url` カラムに登録

---

## 📱 Phase 4（2027年前半）でやること — React Native + Expo アプリ化

> **CodingAgent がやること（Phase 4 で追加実装）**
> - React Native + Expo プロジェクトの初期設定
> - `shared/` 層（型・定数・fetch関数）をそのまま流用
> - 全 UI コンポーネントを React Native 用に作り直し
> - 音声再生を `expo-av` に置き換え
> - 認証を Expo Auth Session に置き換え
>
> **junli さんがやること（下記）**

---

### 11. Apple Developer 登録（iOSアプリ）
**所要時間: 約1〜4週間（審査あり）**

> ⚠️ 重要な注意事項（最新情報）:
> - 個人で登録する場合: 自分の本名がApp Storeに「販売者名」として表示されます
> - 法人・ブランド名を表示したい場合: 組織として登録が必要
>   → 組織登録にはD-U-N-S番号（Dun & Bradstreet社が発行する企業識別番号）が必要
>   → D-U-N-S番号の取得に別途1〜2週間かかる場合あり
> - 審査は通常3〜5営業日（個人）/ 1〜4週間（組織）

#### App Store Connect の権限要件
個人登録の場合、自動的に以下の権限が付与されます:
```
Account Holder （最高権限・すべての操作が可能）
  ↓ 兼任
Admin
  ↓ 兼任
App Manager（アプリの提出・審査提出が可能）
```
> ✅ 個人登録ならすべて自分1人で対応できます。
> 他の人を追加したい場合は App Store Connect の「ユーザーと権限」から招待できます。

#### 手順（個人として登録する場合）
1. https://developer.apple.com にアクセス
2. Apple ID でサインイン（2ファクタ認証を有効にしておくこと）
3. 「Enroll」→ 「Individual / Sole Proprietor」を選択
4. 年会費 $99（約15,000円・日本円で表示される）をクレジットカードで支払い
   > ⚠️ 自分名義のクレジットカードを使うこと（他人名義だと審査が遅れる）
5. 審査完了後、App Store Connect にアクセス可能になる
6. アプリ情報を登録:
   - アプリ名: `familyai`
   - バンドルID: `jp.familyai.app`
   - カテゴリ: 教育

---

### 12. iOSアプリ 申請・審査
**所要時間: 1〜3日（Apple審査）**

#### 手順
1. EAS Build でビルド（CodingAgentが実施）
2. App Store Connect でアプリ情報・スクリーンショットを登録（自分で実施）
   - iPhone用スクリーンショット: 6.7インチ・6.1インチ（必須）
   - アプリの説明文（日本語）
   - プライバシーポリシーURL: `https://familyai.jp/privacy`
   - サポートURL: `https://familyai.jp/support`
3. 「審査に提出」→ Apple の審査を待つ（1〜3日）
4. 承認後、App Store に公開

---

## 🤖 Phase 5（2027年後半〜）でやること — Android 対応・ネイティブ検討

---

### 13. Google Play Developer 登録（Androidアプリ）
**所要時間: 約1〜2日（審査あり）**

#### 手順
1. https://play.google.com/console にアクセス
2. 「デベロッパーアカウントを作成」
3. 登録料 $25（約3,800円）を支払い（初回のみ・以後不要）
4. アプリ情報を登録:
   - アプリ名: `familyai`
   - パッケージ名: `jp.familyai.app`
   - カテゴリ: 教育

---

### 14. Androidアプリ 申請・審査
**所要時間: 数時間〜1日（Google審査）**
#### 手順
1. EAS Build でAndroidビルド（CodingAgentが実施）
2. Google Play Console で情報・スクリーンショットを登録（自分で実施）
   - スクリーンショット（縦向き・横向き）
   - アプリの説明文（日本語）
   - フィーチャーグラフィック（1024x500px）
3. 「リリースを作成」→ 本番トラックで提出
4. Google の審査（数時間〜1日・iOSより大幅に早い）
5. 承認後、Google Play に公開 🎉

---

## 💰 費用まとめ

| タイミング    | 項目                   | 費用                |
| -------- | -------------------- | ----------------- |
| 支払済み     | DNS設定費用              | 1,356円（済）         |
| 支払済み     | ドメイン（familyai.jp）    | 2,339円/年（済）       |
| 毎月       | Vercel・Neon・Blob     | 0〜2,000円（利用量次第）   |
| 毎月       | Upstash Redis（無料枠内）  | 0円                |
| 毎月       | OpenRouter AI API使用料 | 約100〜1,000円/月     |
| Phase 2〜 | Stripe 決済手数料         | 売上の3.6%           |
| Phase 4  | Apple Developer 年会費  | $99/年（約15,000円）   |
| Phase 5  | Google Play 登録料      | $25 初回のみ（約3,800円） |

> ⚠️ 特に Blob の音声配信（Data Transfer）が増えると上振れします。
> MVPでは「月300〜1,500円程度」を目安にし、利用量アラートを必ず設定してください。

---

## ⚡ 残タスク優先順序（2026-04-19 更新版）

> 残り **約19日**（〜5月8日）。CodingAgent タスクは全完了 🎉
> 残りは junli さんの人間タスクのみです。

```
✅ 完了済み（2026-04-19 時点）:
  ① Vercel アカウント作成・プロジェクト設定 ✅
  ② ドメイン取得（familyai.jp / お名前ドットコム） ✅
  ③ DNS設定（Aレコード・CNAMEレコード）✅（2026-04-18 Valid Configuration 確認）
  ④ SSL/HTTPS 有効化確認 ✅（2026-04-15）
  ⑤ Coming Soon ページ実装・Vercel 本番設定済み ✅（2026-04-17〜18）
  ⑥ OpenRouter APIキー取得・全4件設定 ✅
  ⑦ Neon PostgreSQL セットアップ・DATABASE_URL 設定 ✅
  ⑧ NEXTAUTH_SECRET / NEXTAUTH_URL 設定 ✅
  ⑨ NEXT_PUBLIC_API_URL 設定 ✅
  ⑩ Google OAuth クライアントID・シークレット設定 ✅
  ⑪ Upstash Redis セットアップ ✅
  ⑫ Vercel Blob セットアップ ✅
  ⑭ OGP 用日本語フォント（NotoSansJP-Bold.ttf）配置 ✅
  ★ ホームページ新着記事を Neon DB から取得に差し替え ✅（2026-04-18）
  ★ Repository Pattern 実装完了 ✅（2026-04-19）
  ★ デザインレビュー修正（WCAG AA 対応・CTA 整理）✅（2026-04-19）
  ★ 管理画面 /admin 実装・ローカル動作確認済み ✅（2026-04-19）

🔥 今すぐやること（最優先）:
  ★ Vercel 本番環境に ADMIN_EMAIL を追加する
     手順: Vercel → Settings → Environment Variables → Add
       Key:   ADMIN_EMAIL
       Value: lijun.kawasaki@gmail.com
       Environment: Production（にチェック）
     → Save → Redeploy
     ⚠️ これがないと本番の /admin にアクセスできない

  ★ Vercel 本番環境に AUTH_SECRET / AUTH_URL を追加する（NextAuth v5 対応）
     手順: Vercel → Settings → Environment Variables → Add
       AUTH_SECRET = （NEXTAUTH_SECRET と同じ値）
       AUTH_URL    = https://familyai.jp
     → Save → Redeploy
     ⚠️ これがないと本番で Google ログインが 404 エラーになる

📅 今週中に完了（〜4月27日）:
  ⑬ OGP デフォルト画像作成（Canvaで1200×630px → public/og-default.png）
     手順: 5c 参照（Canva → PNG → public/og-default.png に配置）
     証跡: public/og-default.png がリポジトリに追加済み

  ⑮ 初期記事10本・語学音声MP3の執筆・録音【⚠️ コンテンツ準備】
     現状: 5本投入済み・残り5本以上が必要
     手順: content/articles/*.md を追加 → npm run db:sync
     ⚠️ コンテンツ準備は時間がかかる。4月末までに揃えること

📅 5月1日〜8日（最終週）に完了:
  ⑯ Google Analytics 測定ID取得・NEXT_PUBLIC_GA_ID 設定
     手順: 8番参照（analytics.google.com → G-XXXXXXXXXX → Vercel 環境変数に追加）
     証跡: 環境変数 NEXT_PUBLIC_GA_ID が設定済み

  ⑰ Google Search Console 登録・sitemap.xml 送信
     手順: 7番参照（search.google.com/search-console → familyai.jp 登録）
     証跡: サイトマップ https://familyai.jp/sitemap.xml が送信済み

  ⑱ プライバシーポリシー・利用規約の内容確認・修正
     現状: ページは実装済み・法務文言の最終確認が未完了
     証跡: /privacy と /terms の内容を自分で確認・承認済み

  ⑲ Vercel Blob に音声MP3ファイルをアップロード・DBにURL登録
     手順: 10番参照（音声ファイル準備 → Vercel Blob → DB の audioUrl に登録）
     証跡: Vercel Blob に音声ファイルがアップロード済み・記事の音声が再生できる

  ⑳ Coming Soon → 本番公開切り替え
     手順: 「本番公開手順」セクション参照
     ⚠️ ⑮⑱⑲ が揃ってから実行すること
```

> 💡 各タスクが完了したら、証跡（スクリーンショットのURL・環境変数名）を
> このToDo ファイルに書き込んでおくと、後から確認しやすくなります。

---

## ⚠️ リスク一覧（2026-04-19 更新）

| リスク | 重要度 | 対策 | 状態 |
|--------|--------|------|------|
| Vercel 本番に `ADMIN_EMAIL` 未追加 | **高** | Vercel → Env Vars に追加 → Redeploy | ⚠️ 要対応 |
| Vercel 本番に `AUTH_SECRET` / `AUTH_URL` 未追加 | **高** | Vercel → Env Vars に追加 → Redeploy（本番 OAuth 404 防止） | ⚠️ 要対応 |
| 初期記事・音声素材が5本止まり（残り5本以上） | **高** | content/articles/ に追加 → npm run db:sync | 🔄 進行中 |
| og-default.png 未作成 | 中 | Canva 1200×630px → public/og-default.png に配置 | ⚠️ 未着手 |
| Google Analytics 未設定（アクセス数計測不可） | 中 | analytics.google.com → G-ID → Vercel Env Vars | ⚠️ 未着手 |
| Google Search Console 未登録（SEO インデックス遅延） | 中 | search.google.com → sitemap.xml 送信 | ⚠️ 未着手 |
| プライバシーポリシー法務確認未完了 | 中 | /privacy と /terms の内容を最終確認 | ⚠️ 未着手 |
| Vercel Blob 音声配信コスト増 | 低 | 利用量アラートを設定・適切なビットレートで録音 | — |
| NextAuth v5 beta の破壊的変更 | 低 | `5.0.0-beta.25` 以降でバージョン固定済み | ✅ 対応済み |
| DNS / SSL 設定 | — | — | ✅ 完了（2026-04-18）|
| 外部サービス未設定（Neon・Google OAuth・Upstash・OpenRouter・Blob） | — | — | ✅ 全て完了 |

---

## 📝 記事の書き方・管理手順（日常運用）

> 記事は `content/articles/` フォルダに **1記事 = 1ファイル（.md）** で管理します。
> DB への反映は `npm run db:sync` を実行するだけです。

---

### 記事ファイルの場所

```
familyai.jp/
  content/
    articles/
      chatgpt-account-setup.md   ← 既存記事
      meal-planning-ai.md
      （新しい記事はここに追加）
```

---

### 新しい記事を追加するとき

**STEP 1：ファイルを新規作成**

`content/articles/` の中に新しい `.md` ファイルを作る。
ファイル名（英数字・ハイフンのみ）が記事のURL になる。

例：`chatgpt-recipe-tips.md` → URL: `familyai.jp/learn/chatgpt-recipe-tips`

**STEP 2：以下のテンプレートで書く**

```
---
title: 記事タイトル
description: 一行説明（SNSシェア時にも表示される）
roles:
  - mama          ← papa / mama / kids / senior / common から選ぶ
categories:
  - housework     ← image-gen / voice / education / housework から選ぶ（この4種類のみ有効）
level: beginner   ← beginner（初心者） / intermediate（中級） / advanced（上級）
published: true   ← false にすると非公開（DBには入るが表示されない）
publishedAt: 2026-05-01   ← 公開日（YYYY-MM-DD形式）
audioUrl: ~       ← 音声ファイルがある場合のみURLを記入。なければ ~ のまま
---

## 見出し（##で書く）

本文をここに書く。普通の文章でOK。

## 次の見出し

- 箇条書きはハイフン
- このように書く

**太字**はアスタリスク2つで囲む

```プロンプト例（コードブロック）```

```

**STEP 3：ターミナルで同期コマンドを実行**

```bash
npm run db:sync
```

実行すると自動でDBに保存される。

**STEP 4：GitHub Desktop でコミット & Push**

ファイルをGitHubに保存しておく（バックアップ）。

---

### 既存記事を修正するとき

1. `content/articles/` の該当 `.md` ファイルを開いて編集
2. `npm run db:sync` を実行（変更がDBに反映される）
3. GitHub Desktop でコミット & Push

---

### 記事を一時的に非公開にするとき

該当ファイルの frontmatter を変更するだけ：
```
published: false   ← true → false に変更
```
→ `npm run db:sync` を実行

---

### ロール・カテゴリの選択肢

| 種類 | 選択肢 |
|------|--------|
| **roles**（対象者） | `papa` / `mama` / `kids` / `senior` / `common`（全員向け） |
| **categories**（ジャンル） | `image-gen`（画像生成）/ `voice`（音声AI）/ `education`（学習・教育）/ `housework`（家事・育児） |
| **level**（難易度） | `beginner`（初心者）/ `intermediate`（中級）/ `advanced`（上級） |

> ⚠️ categories は**上記4種類のみ**です。それ以外の値（cooking・study・health 等）を使うと
> カテゴリフィルターに表示されません。必ず4種類から選んでください。

---

### ✅ 管理画面（/admin）— 実装完了（2026-04-19）
ブラウザ上から記事を追加・編集・削除できる `/admin` ページが実装済みです。
- `http://localhost:3002/admin` でアクセス確認済み
- Google アカウント（`ADMIN_EMAIL` で指定したメール）でログインが必要
- 記事一覧（検索・ソート・公開トグル・閲覧数）・新規作成・編集（Markdown 分割エディタ）・削除が可能
- **⚠️ Vercel 本番環境に `ADMIN_EMAIL=lijun.kawasaki@gmail.com` を追加すること**

---

## 🚧 Coming Soon ページを本番（familyai.jp）に表示する手順

> コードの変更後、GitHub Desktop でコミット・Push してから以下を実施します。

### STEP 1：GitHub Desktop でコミット & Push

1. GitHub Desktop を開く
2. 変更されているファイルにチェックが入っていることを確認
3. コメント欄に「Add Coming Soon page」などと入力して **Commit**
4. **Push origin** をクリック

---

### STEP 2：Vercel に環境変数 `COMING_SOON=true` を追加

1. https://vercel.com にログイン
2. プロジェクト `familyai-jp` → **`Settings`** → **`Environment Variables`**
3. 以下を入力して **`Save`**：
   ```
   Key:         COMING_SOON
   Value:       true
   Environment: Production（にチェック）
   ```

---

### STEP 3：Redeploy（再デプロイ）

1. Vercel → **`Deployments`** タブ
2. 最新デプロイの右端「**…**」→ **`Redeploy`** をクリック
3. 確認ダイアログ → **`Redeploy`** ボタンをクリック
4. デプロイ完了まで待つ（通常 1〜2 分）

---

### STEP 4：確認

- `https://familyai.jp` を開いて Coming Soon ページが表示されることを確認 ✅
- カウントダウンが動いていることを確認 ✅
- Header のリンクをクリックして他ページに飛ばないことを確認 ✅

---

## 🚀 本番公開手順（Coming Soon → 実際のサイトへ切り替え）

> 現在 familyai.jp は「Coming Soon」ページを表示しています。
> 本番公開の準備ができたら、以下の手順で切り替えます。
> **コードの変更は一切不要です。Vercel の管理画面だけで完結します。**

### 切り替えの仕組み

```
【現在】Vercel 環境変数 COMING_SOON=true → Coming Soon ページ表示
【公開後】COMING_SOON を削除 or false → 実際のホームページ表示

ローカル（npm run dev）→ COMING_SOON 未設定 → 常に実際のホームページ
```

---

### 事前準備（公開前にやること）

以下がすべて✅になってから切り替えること：

```
□ 記事10本以上が DB に投入済み（Todo13）
□ 音声MP3ファイルが Vercel Blob にアップロード済み（Todo13）
□ Google OAuth ログインが動作確認済み（Todo08）
□ プライバシーポリシー・利用規約を確認済み（Todo12）
□ OGP画像（public/og-default.png）が配置済み（Todo10）
□ Google Analytics が設定済み（Todo15）
```

---

### 当日の手順（所要時間: 約5分）

#### STEP 1: Vercel 環境変数から COMING_SOON を削除

1. https://vercel.com にログイン
2. プロジェクト `familyai-jp` → **`Settings`** → **`Environment Variables`**
3. `COMING_SOON` を探して **`Edit`** → 値を **`true` から `false` に変更**  
   （または行右端の「…」→「**Remove**」で削除してもOK）
4. **`Save`** をクリック

#### STEP 2: 再デプロイ

1. Vercel ダッシュボード → `Deployments` タブ
2. 最新のデプロイ右端の「…」→ **`Redeploy`** をクリック
3. 「Redeploy」確認ダイアログ → **`Redeploy`** ボタンをクリック
4. デプロイが完了するまで待つ（通常1〜2分）

#### STEP 3: 公開確認

1. `https://familyai.jp` を開いてホームページが表示されることを確認
2. `https://www.familyai.jp` も同様に確認
3. 記事一覧 `/learn`、記事詳細 `/learn/（スラッグ）` が表示されることを確認
4. Google Analyticsでページビューが計測されていることを確認（数分後）

---

### もし Coming Soon に戻したいとき

1. Vercel → Settings → Environment Variables
2. 新しい変数を追加: `COMING_SOON` = `true`（Environments: `Production` にチェック）
3. Save → Redeploy

---

### ⚠️ 注意事項

- **ローカル開発には影響しません**（`npm run dev` は常に実際のホームページ）
- Vercel の環境変数変更は**Redeploy をしないと反映されません**（必ず再デプロイ）
- `COMING_SOON` は `Production` 環境にのみ設定してください（`Preview`・`Development` は不要）

---

## 📞 困ったときの連絡先

- Vercel サポート: https://vercel.com/support
- Neon ドキュメント: https://neon.com/docs
- Stripe サポート（日本語）: https://support.stripe.com/ja
- Apple Developer サポート: https://developer.apple.com/support
- Google Play ヘルプ: https://support.google.com/googleplay/android-developer
