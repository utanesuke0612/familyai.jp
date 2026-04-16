# junli ToDo — 人間がやること一覧

# かかった費用

- DNS 設定費用　1356円 と Domain名費用：2,339円年間
# familyai.jp プロジェクト

> CodingAgent（Claude Code / Codex）に任せられない、
> アカウント登録・支払い・申請など「人間の手」が必要な作業だけをまとめています。

---

## ✅ 今すぐやること（2026年5月8日リリースまで）

---

### 0. OpenRouter 設定（OpenRouter First のため最優先）
**所要時間: 約10〜15分**
**状態: 未着手**

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

**👆@2026/4/14 できたところ、Refreshのところはまだで！！**
#### STEP 4: SSL証明書（HTTPS）有効化の確認
1. Vercel ダッシュボード → Project → `Settings` → `Domains` を開く
2. `familyai.jp` / `www.familyai.jp` の HTTPS ステータスが有効（証明書発行済み）であることを確認
3. ブラウザで `https://familyai.jp` と `https://www.familyai.jp` を開き、鍵マークが表示されることを確認
4. `http://familyai.jp` にアクセスしたとき、`https://familyai.jp` へリダイレクトされることを確認
**👆@2026/4/15 できた！！**
---

### 2. Vercel アカウント作成・プロジェクト設定
**所要時間: 約20分**
#### 手順
1. https://vercel.com にアクセス
2. 「Sign Up」→ GitHub アカウントでログイン（GitHubがない場合は先に作成）
3. 「New Project」→ GitHubリポジトリと連携
4. Hobby プラン（無料）で開始
5. Environment Variables（環境変数）画面で以下を入力
   ```
   DATABASE_URL          = （Neonから取得）
   NEXTAUTH_SECRET       = （下記コマンドで生成）
   NEXTAUTH_URL          = https://familyai.jp
   BLOB_READ_WRITE_TOKEN = （Vercel Blobから取得）
   ```
   ※ NEXTAUTH_SECRET の生成コマンド（ターミナルで実行）:
   ```bash
   openssl rand -base64 32
   ```

---

### 3. Neon PostgreSQL（DB）セットアップ
**所要時間: 約15分**
**状態: 未着手（要確認）**

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
**状態: 未着手（要確認）**

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

> 無料枠: 5GB まで無料。50GBになっても月額約60円と格安。

#### 手順
1. Vercel ダッシュボード → Storage → 「Create Database」
2. 「Blob」を選択 → 名前: `familyai-blob`
3. 作成後、`BLOB_READ_WRITE_TOKEN` が自動生成される
4. Vercel の環境変数に自動で追加されることを確認

---

### 5b. Upstash Redis 設定（レート制限）
**所要時間: 約10分**

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

### 5d. プライバシーポリシー・利用規約の確認
**所要時間: 約30〜60分**

> App Store・Google Play・Stripe審査に必須。
> CodingAgentがテンプレートを作成するので、内容を確認・修正すること。

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

#### 手順
1. https://search.google.com/search-console にアクセス
2. 「プロパティを追加」→ `familyai.jp` を入力
3. 所有権確認: Vercel に HTML ファイルを配置する方法が簡単
4. サイトマップを送信: `https://familyai.jp/sitemap.xml`

---

### 8. Google Analytics 設定
**所要時間: 約15分**

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

## 📅 Phase 2（6〜8月）でやること

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

## 📱 Phase 4（2026年 Q3〜Q4）でやること

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

## 🤖 Phase 5（2027年 Q1）でやること

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

| タイミング | 項目 | 費用 |
|---|---|---|
| 支払済み | DNS設定費用 | 1,356円（済） |
| 支払済み | ドメイン（familyai.jp） | 2,339円/年（済） |
| 毎月 | Vercel・Neon・Blob | 0〜2,000円（利用量次第） |
| 毎月 | Upstash Redis（無料枠内） | 0円 |
| 毎月 | OpenRouter AI API使用料 | 約100〜1,000円/月 |
| Phase 2〜 | Stripe 決済手数料 | 売上の3.6% |
| Phase 4 | Apple Developer 年会費 | $99/年（約15,000円） |
| Phase 5 | Google Play 登録料 | $25 初回のみ（約3,800円） |

> ⚠️ 特に Blob の音声配信（Data Transfer）が増えると上振れします。
> MVPでは「月300〜1,500円程度」を目安にし、利用量アラートを必ず設定してください。

---

## ⚡ 今日からの優先順序（最新版）

```
✅ 完了済み:
  ① Vercel アカウント作成・プロジェクト設定
  ② ドメイン取得（familyai.jp / お名前ドットコム）
  ③ DNS設定（Aレコード・CNAMEレコード）← 途中
  ④ SSL/HTTPS 有効化確認 ✅

🔥 今週中に完了（〜4月20日）:
  ⑤ DNS Refresh確認（Vercelダッシュボードで ✅ になるまで待つ）
     証跡: Vercel Domains画面のスクリーンショット
  ⑥ OpenRouter APIキー取得・Vercel環境変数に設定
     証跡: 環境変数名 OPENROUTER_API_KEY が Vercel に追加されたことを確認
  ⑦ Neon PostgreSQL セットアップ・DATABASE_URL設定
     証跡: 環境変数名 DATABASE_URL が Vercel に追加されたことを確認

📅 来週中に完了（〜4月30日）:
  ⑧ Google OAuth クライアントID・シークレット設定
     証跡: 環境変数名 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が設定済み
  ⑨ Upstash Redis セットアップ（レート制限用）
     証跡: 環境変数名 UPSTASH_REDIS_REST_URL / TOKEN が設定済み
  ⑩ OGP デフォルト画像作成（Canvaで1200×630px）
     証跡: public/og-default.png がリポジトリに追加済み

📅 5月8日直前までに完了:
  ⑪ プライバシーポリシー・利用規約の内容確認・修正
     証跡: /privacy と /terms が familyai.jp で表示できる
  ⑫ 初期記事10本・語学音声MP3の準備
     証跡: Vercel Blob に音声ファイルがアップロード済み
```

> 💡 各タスクが完了したら、証跡（スクリーンショットのURL・環境変数名）を
> このToDo ファイルに書き込んでおくと、後から確認しやすくなります。

---

## 📞 困ったときの連絡先

- Vercel サポート: https://vercel.com/support
- Neon ドキュメント: https://neon.com/docs
- Stripe サポート（日本語）: https://support.stripe.com/ja
- Apple Developer サポート: https://developer.apple.com/support
- Google Play ヘルプ: https://support.google.com/googleplay/android-developer
