# AIctation ページ設計書
# 用途: CodingAgentへの実装指示書
# 対象ページ: /tools/aictation/[lessonId]
# バージョン: 1.0

---

## ページ概要

| 項目 | 内容 |
|---|---|
| ページ名 | AIctation — レッスン詳細ページ |
| URL | /tools/aictation/[lessonId] |
| 目的 | VOA素材を使った英語聴写学習 |
| ターゲット | 全年齢・全英語レベル |
| デバイス優先 | スマホ優先（PC対応） |

---

## デザイン仕様（familyai.jp統一）

```css
/* フォント */
--font-display: 'Kaisei Opti', serif;      /* 見出し */
--font-body:    'Zen Maru Gothic', sans-serif; /* 本文 */

/* ブランドカラー */
--bg:         #FDF6ED;   /* クリーム背景 */
--text:       #8B5E3C;   /* ブラウン・メインテキスト */
--text-soft:  #B5896A;   /* サブテキスト */
--cta:        #FF8C42;   /* CTAボタン・強調 */
--border:     #E8CFA8;   /* ボーダー */

/* AIctation専用カラー */
--water:      #2D78C8;   /* 音声プレイヤー・リンク */
--water-light: #E6F2FB;  /* 音声プレイヤー背景 */

/* 自己申告カラー */
--retry:      #E05050;   /* 😓 もう一度（赤） */
--good:       #E8A020;   /* 💪 頑張った（オレンジ） */
--perfect:    #2D9B6F;   /* 🌟 完璧（緑） */
```

---

## ページ全体構成

```
┌────────────────────────────────────────┐
│              A. ページヘッダー          │
│         （タイトル・説明・バッジ）       │
├────────────────────────────────────────┤
│                                        │
│  B. 左カラム（70%）  │ C. 右カラム（30%）│
│                      │                 │
│  B-1. 概要           │  AI チャット     │
│  B-2. 動画           │  ウィジェット    │
│  B-3. 聴写プレイヤー  │                 │
│  B-4. 参考資料       │  （スクロール    │
│  B-5. 自己申告       │   追従・sticky） │
│                      │                 │
├────────────────────────────────────────┤
│              D. 次のレッスンへ          │
└────────────────────────────────────────┘

モバイル（768px未満）:
  縦積み: A → B-1 → B-2 → B-3 → B-4
        → B-5 → C（AIチャット） → D
```

---

## A. ページヘッダー

```
位置: ページ最上部・全幅
背景: クリーム（#FDF6ED）+ 薄いオレンジのグラデーション

内容（上から順に）:
  ① バッジ
     「🎧 英語聴写 × AI」
     pill形状・水色背景・小さめ

  ② メインタイトル
     「AIctation」
     Kaisei Opti・大きめ・ブラウン

  ③ 副題
     「powered by VOA」
     小さめ・text-soft色・letter-spacing広め

  ④ 説明文（3行）
     「聴いて、書いて、声に出して。
      繰り返すほど、英語は身につく。
      
      五感をフル活用する聴写は、
      最も効果的な英語学習法のひとつ。
      
      VOA公式素材 × AIサポートで、
      いつでも・どこでも・自分のペースで。
      疑問はAIにその場で質問できます。」

  ⑤ 繰り返しポリシーの説明（重要）
     背景: 薄いオレンジ（#FFF5EE）
     ボーダー左: 3px solid #FF8C42
     内容:
       「AIctationでは、完璧に書けるまで
        次のレッスンには進めません。
        
        😓 60%未満   → もう一度最初から
        💪 60〜80%  → 弱点部分を集中練習
        🌟 80%以上  → 合格！次のレッスンへ
        
        急がなくていい。
        繰り返すことが、本物の英語力になる。」
```

---

## B. 左カラム（70%）

---

### B-1. 概要セクション

```
セクションタイトル: 「📖 このレッスンについて」
背景: 白・rounded-2xl・border

内容:
  - レッスンタイトル（H2・Kaisei Opti）
  - 難易度バッジ
    🟢 Beginner / 🟡 Intermediate / 🔴 Advanced
  - レッスンの概要文（3〜5行・DBから取得）
  - メタ情報（横並び）
    🕐 約〇分  📅 公開日  🎯 カテゴリ

DBから取得するフィールド:
  lesson.title
  lesson.description
  lesson.level
  lesson.durationMin
  lesson.publishedAt
  lesson.category
```

---

### B-2. 動画セクション

```
セクションタイトル: 「🎬 動画で学ぼう」
内容: MP4ファイルの埋め込みプレイヤー

実装:
  <video controls preload="none">
    <source src={lesson.videoUrl} type="video/mp4">
  </video>

スタイル:
  - 16:9のアスペクト比を維持
  - rounded-2xl
  - 影付き（box-shadow）
  - controls属性で標準コントロール表示
  - preload="none"（初期ロードを軽くする）

注意:
  - videoUrlがnullの場合はこのセクションを非表示
  - Vercel Blobから配信する
```

---

### B-3. 聴写プレイヤーセクション

```
セクションタイトル: 「✍️ 聴写練習」
背景: 水色（#E6F2FB）・rounded-2xl
```

---

#### 【重要な設計方針】

```
キーボード入力ではなく手書きを推奨する。
画面上の入力欄は設けない。
ユーザーは紙とペンで手書きする。
```

---

#### ① 手書き推奨メッセージ（常時表示）

```
背景: 白・rounded-xl・border
絵文字: ✍️
内容:
  「紙とペンを用意してください。

   キーボードではなく手書きで書くことで、
   耳・目・手・声を同時に使えます。
   五感を使う学習が、最も記憶に残ります。」
```

---

#### ② カスタム音声プレイヤー

音声ファイルはVercel Blobから配信。
`<audio>`タグをJavaScriptで完全制御する。
iframeは使用しないこと。

**基本コントロール（必須）:**
```
▶️ / ⏸  再生・一時停止
⏮      前のセンテンスへ
⏭      次のセンテンスへ
🔁      現在のセンテンスをリピート（ON/OFFトグル）
```

**シークバー（必須）:**
```
・全体の進捗をバーで表示
・クリック・ドラッグで任意の位置へジャンプ
・バーの色: var(--water) #2D78C8
・高さ: 6px
・現在時間 / 総時間（MM:SS形式）を右端に表示
```

**速度変更（必須）:**
```
ボタン: [0.75x] [1.0x] [1.25x]
・pill形状
・現在選択中: var(--water) 背景・白文字
・未選択: beige背景・グレー文字
・デフォルト: 1.0x
```

**音量コントロール（PC向け・推奨）:**
```
🔊 スライダー形式
・スマホはOS側で調整するため
  PCのみ表示（@media hover: hover）
```

**自動停止機能（推奨）:**
```
トグルボタン: 「⏹ センテンスで自動停止」ON/OFF
・ON時: 各センテンスの末尾で自動停止
        → ユーザーが書く時間を確保
・OFF時: 連続再生
・デフォルト: ON推奨
```

**キーボードショートカット（PC向け・推奨）:**
```
スペースキー : 再生・一時停止
←           : 前のセンテンスへ
→           : 次のセンテンスへ
R           : 現在センテンスをリピート
```

**実装コード（概要）:**
```javascript
const audio = new Audio(lesson.audioUrl);

// 速度変更
audio.playbackRate = 0.75; // 0.75 / 1.0 / 1.25

// センテンスへジャンプ
audio.currentTime = sentence.start;
audio.play();

// 自動停止（センテンス末尾で停止）
audio.addEventListener('timeupdate', () => {
  const s = sentences[currentIndex];
  if (autoStop && audio.currentTime >= s.end) {
    audio.pause();
  }
});

// 現在再生中のセンテンスをハイライト
audio.addEventListener('timeupdate', () => {
  const current = sentences.findIndex(s =>
    audio.currentTime >= s.start &&
    audio.currentTime < s.end
  );
  if (current !== -1) highlightSentence(current);
});
```

---

#### ③ センテンスリスト（折りたたみ + スクロール表示）

**折りたたみ機能:**
```
デフォルト状態: 折りたたみ（非表示）
理由: 聴写中は答えを見ない方が良い

ボタン:
  折りたたみ時: 「📝 スクリプトを表示する ▼」
  展開時:       「📝 スクリプトを隠す ▲」

注意書き（ボタン横に常時表示）:
  「⚠️ 先に答えを見ないようにしよう！」
  → 小さめ・text-soft色
```

**スクロール表示:**
```
展開後の表示エリア:
  max-height: 300px（固定）
  overflow-y: auto（スクロール可能）
  scroll-behavior: smooth

スクロールバーのスタイル:
  scrollbar-width: thin
  scrollbar-color: #E8CFA8 transparent

下部フェード（続きがあることを示す）:
  position: sticky
  bottom: 0
  height: 48px
  background: linear-gradient(transparent, #FDF6ED)
  pointer-events: none
```

**各センテンスの表示:**
```
[00:03] He discussed trade issues.

・タイムスタンプ（薄いグレー）
・センテンステキスト
・クリックでその位置から再生
・カーソル: pointer
・ホバー: 薄いbeige背景

再生中のセンテンス（ハイライト）:
  背景: var(--water-light) #E6F2FB
  左ボーダー: 3px solid var(--water)
  フォント: bold
```

**再生中センテンスの自動スクロール:**
```javascript
// 再生が進むと常に現在のセンテンスが
// 表示エリアの中央に来るよう自動スクロール
function highlightSentence(index) {
  const el = document.getElementById(`s-${index}`);

  // 全センテンスのハイライトを解除
  document.querySelectorAll('.sentence')
    .forEach(s => s.classList.remove('active'));

  // 現在のセンテンスをハイライト
  el.classList.add('active');

  // 自動スクロール（中央に表示）
  el.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}
```

**クリックでジャンプ:**
```javascript
sentences.forEach((sentence, index) => {
  const el = document.getElementById(`s-${index}`);
  el.addEventListener('click', () => {
    currentIndex = index;
    audio.currentTime = sentence.start;
    audio.play();
    highlightSentence(index);
  });
});
```

---

#### ④ 正解スクリプト全文（折りたたみ）

```
デフォルト: 非表示
ボタン: 「📄 正解スクリプト全文を見る」
展開時: スクリプト全文をテキストで表示
スタイル:
  背景: 白・rounded-xl
  フォント: 等幅・行間広め
  コピー可能
  max-height: 200px・overflow-y: auto

⚠️ 注意書き:
  「聴写が終わってから確認しましょう」
```

---

#### ⑤ 自己申告ボタン（3択）

```
タイトル: 「今日の聴写、どうでしたか？」

ボタン3つ（PCは横並び・スマホは縦積み）:

[😓 もう一度やる]
  背景: #FFF0F0  文字: #E05050
  説明: 「60%未満・最初からやり直す」

[💪 頑張りました！]
  背景: #FFF8E6  文字: #E8A020
  説明: 「60〜80%・もう一度聴いてみよう」

[🌟 完璧！]
  背景: #E8F7F0  文字: #2D9B6F
  説明: 「80%以上・次のレッスンへ」
```

---

#### ⑥ 自己申告後の処理

```
😓 もう一度やる:
  → メッセージ表示:
    「大丈夫！繰り返すことで必ず上達します。
     もう一度聴いてみましょう。💪」
  → audio.currentTime = 0（最初に戻す）
  → currentIndex = 0
  → 申告ボタンをリセット
  → スクリプト表示を折りたたむ
  → attempts + 1（DB更新）

💪 頑張りました！:
  → メッセージ表示:
    「惜しい！あと少しです。
     もう一度だけ聴いてみましょう。」
  → audio.currentTime = 0（最初に戻す）
  → currentIndex = 0
  → 申告ボタンをリセット
  → attempts + 1（DB更新）

🌟 完璧！:
  → 🎉 紙吹雪アニメーション（confetti）
  → メッセージ表示:
    「完璧です！次のレッスンへ進みましょう！」
  → DBに完了を記録:
    lessons_progress upsert {
      userId, lessonId,
      status: 'completed',
      completedAt: now()
    }
  → セクションDを表示（次のレッスンへ）
```

---

#### ⑦ 将来対応機能（Phase2以降）

```
🟢 学習記録・続きから再開
   → audio.currentTimeをDBに保存
   → ページを開くと続きから再開

🟢 再生回数カウント
   → 各センテンスを何回再生したか記録
   → 苦手な箇所が可視化できる

🟢 A-Bリピート
   → 任意の区間を指定して繰り返す
   → 上級者向け機能

🟢 管理画面でのスクリプト編集
   → /admin/lessons/[id] で
     各センテンスのテキストを修正できる
```

---

### B-4. 参考資料セクション

```
セクションタイトル: 「📚 参考資料」
表示条件: lesson.referencesが存在する場合のみ表示

内容: 参考資料のリスト
  - リンク形式（外部リンク・target="_blank"）
  - 各リソースにアイコン付き
    🌐 ウェブサイト
    📄 PDF
    📹 動画

DBから取得するフィールド:
  lesson.references: [
    { title: string, url: string, type: 'web'|'pdf'|'video' }
  ]
```

---

## C. 右カラム（30%）— AIチャットウィジェット（カテゴリタブ版）

```
位置: 右サイド・sticky（スクロール追従）
     top: 80px（ヘッダー分のオフセット）
     max-height: calc(100vh - 100px)
     overflow-y: auto

背景: 白・rounded-2xl・shadow-xl
border: 1px solid #E8CFA8

⚠️ AIctationページでは「カテゴリタブ版」を使うこと。
   普通の記事ページの「シンプル版」とは別モード。
   コンポーネントは共通（modeプロップで切り替え）:

   // AIctationページ
   <AIChatWidget
     mode="aictation"
     context={lesson.script}
   />
```

---

#### ① ウィジェットヘッダー

```
「🤖 AIに質問する」
背景: #FFF5EE
サブテキスト: 「このレッスンについて何でも聞けます」
```

---

#### ② カテゴリタブ（AIctation専用）

```
タブ5つ（横並び・均等幅）:
[📖 内容] [📚 語彙] [📝 文法] [✍️ 練習] [🎯 復習]

スタイル:
  選択中: #FF8C42（オレンジ）背景・白文字
  未選択: beige背景・text-soft色
  デフォルト表示: 📖 内容タブ

タブ切り替えJS（約10行）:
  タブをクリック → 対応するボタンリストを表示
  → 入力欄・チャットエリアは変更なし
```

---

#### ③ 定型質問ボタン（カテゴリ別）

```
📖 内容タブ:
  「このレッスンの内容を3文で要約して」
  「誰が・いつ・どこで・何をした？」
  「このニュースの背景を教えて」

📚 語彙タブ:
  「重要単語を5個教えて（意味・例文付き）」
  「難しい表現をやさしく説明して」
  「よく使うフレーズを3つ教えて」

📝 文法タブ:
  「気になった文法を1つ説明して」
  「時制（現在・過去・完了）の使われ方を教えて」
  「受動態の文を見つけて説明して」

✍️ 練習タブ:
  「英語3文でレッスンの内容をまとめて」
  「私の英文を添削して：[ここに入力]」
  「このトピックで意見を書くヒントをくれる？」

🎯 復習タブ:
  「重要単語の穴埋め問題を作って」
  「このレッスンからクイズを3問出して」
  「難しかった単語を使った例文を作って」

スタイル（共通）:
  pill形状・beige背景
  タップで入力欄に自動入力される
  ホバー: オレンジ背景・白文字
```

---

#### ④ チャット表示エリア

```
max-height: 400px・overflow-y: auto
メッセージの形式:
  ユーザー: 右寄せ・#FFF5EE背景
  AI:      左寄せ・beige背景
ローディング: 3点ドットアニメーション
```

---

#### ⑤ 入力エリア

```
textarea: 2行・resize不可
送信ボタン: #FF8C42（オレンジ）・「送信 →」
文字数制限: 200文字
```

---

#### ⑥ API呼び出し仕様

```typescript
// POST /api/ai
{
  type: 'text-quality',  // Claude Haiku（語学・高品質回答）
  prompt: userMessage,
  context: lesson.script  // スクリプトをコンテキストに含める
}

// サーバー側システムプロンプト:
`あなたは英語学習のサポートAIです。
 以下のVOAスクリプトを参照しながら、
 学習者の質問に日本語で答えてください。
 回答は簡潔に・わかりやすい日本語で。
 
 スクリプト: ${lesson.script}`
```

---

#### ⑦ モバイル対応

```
モバイル（768px未満）:
  右カラムは本文下部に配置
  sticky解除・通常フローに戻す
  カテゴリタブは横スクロール対応
  （overflow-x: auto・scrollbar非表示）
```

---

## D. 次のレッスンへ（フッター直前）

```
表示条件: 自己申告で「🌟 完璧！」を選択した後のみ表示

内容:
  ① 完了メッセージ
     「🎉 このレッスンを完了しました！」

  ② 次のレッスンカード
     サムネイル・タイトル・難易度・時間

  ③ ボタン
     [次のレッスンへ →]（オレンジ・大きめ）
     [レッスン一覧に戻る]（テキストリンク）

DBから取得:
  次のレッスンは lesson.nextLessonId で管理
```

---

## DBテーブル設計（追加が必要なもの）

```sql
-- レッスンテーブル
lessons (
  id              uuid PRIMARY KEY,
  title           varchar(255) NOT NULL,
  description     text,
  level           varchar(20),        -- 'beginner'|'intermediate'|'advanced'
  audio_url       text NOT NULL,      -- Vercel Blob MP3
  video_url       text,               -- Vercel Blob MP4（任意）
  script          text NOT NULL,      -- 正解スクリプト全文（AIチャットのコンテキスト用）
  sentences       jsonb,              -- タイムスタンプ付きセンテンスリスト（後述）
  references      jsonb,              -- 参考資料リスト
  duration_min    integer,            -- 音声の長さ（分）
  category        varchar(50),
  next_lesson_id  uuid REFERENCES lessons(id),
  published       boolean DEFAULT false,
  published_at    timestamp,
  created_at      timestamp DEFAULT NOW(),
  updated_at      timestamp DEFAULT NOW()
)

-- sentences カラムのJSON形式:
-- [
--   {"start": 0.0,  "end": 3.2,  "text": "The president traveled to Japan."},
--   {"start": 3.5,  "end": 6.1,  "text": "He discussed trade issues."},
--   {"start": 6.4,  "end": 9.8,  "text": "Both sides agreed on new policies."}
-- ]

-- 学習進捗テーブル
lessons_progress (
  id           uuid PRIMARY KEY,
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    uuid REFERENCES lessons(id) ON DELETE CASCADE,
  status       varchar(20) DEFAULT 'in_progress',
              -- 'in_progress'|'completed'
  attempts     integer DEFAULT 1,    -- 試行回数（申告するたびに+1）
  completed_at timestamp,
  created_at   timestamp DEFAULT NOW(),
  updated_at   timestamp DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)         -- 重複防止
)
```

---

## PWA対応（アプリっぽい体験）

AIctationページはPWAの恩恵を最も受けるページです。
PWAの詳細仕様はfamilyai_coding_agent_v4.mdを参照すること。

```
AIctationでのPWA効果:

✅ ホーム画面から直接AIctationを開ける
   → 「ホーム画面に追加」でアイコンが現れる
   → タップするとアドレスバーなしで全画面起動

✅ MP3がキャッシュ済みならオフラインで学習できる
   → Service Workerの音声キャッシュと連動
   → 電車の中・Wi-Fiなしでも聴写練習ができる

✅ 全画面で集中して聴写できる
   → ブラウザUIが消えて学習に集中できる

✅ ネイティブアプリと見分けがつかない
   → iOSアプリ開発（Phase4）の前に
     アプリ体験を先行提供できる
```

---

## コンテンツ登録フロー（管理者作業）

```
① VOAの音声・動画をダウンロード
② Vercel BlobにMP3・MP4をアップロード
③ Whisper（ローカルソフト）でMP3を処理
   → SRTまたはVTTファイルを生成
④ 変換スクリプト（CodingAgentが作成）で
   SRT/VTT → JSON形式に自動変換
⑤ DBに登録:
   - audio_url   : Vercel BlobのMP3 URL
   - video_url   : Vercel BlobのMP4 URL
   - script      : スクリプト全文
   - sentences   : タイムスタンプ付きJSONB
⑥ 人工核対:
   Webページのセンテンスリストを見ながら
   テキストの誤りを目視確認
   ※ Phase2で管理画面から直接編集可能にする

変換スクリプト例（SRT → JSON）:
  pnpm db:convert-srt ./srt/lesson1.srt
  → lessonsテーブルのsentencesに自動保存
```

---

## 音声ファイルのキャッシュ設計（Service Worker）

```
前提:
  MP3ファイルサイズ: 最大10MB以内
  → iOSのキャッシュ上限（約50MB）に余裕あり
  → ファイル分割不要・シンプルに実装できる
```

---

### 仕組み

```
初回アクセス:
  ブラウザ → Vercel Blob（MP3取得）
           → ローカルキャッシュに自動保存

2回目以降:
  ブラウザ → ローカルキャッシュから即再生
           → ネットワーク不要・ほぼ瞬時に開始
           → オフラインでも再生できる
```

---

### 実装ファイル

```javascript
// public/sw.js

const CACHE_NAME = 'aictation-audio-v1';

// MP3ファイルをキャッシュする
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // MP3ファイルのみキャッシュ対象
  if (!url.pathname.endsWith('.mp3')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {

      // キャッシュを確認
      const cached = await cache.match(event.request);
      if (cached) {
        return cached;  // 2回目以降はキャッシュから返す
      }

      // キャッシュになければネットワークから取得
      const response = await fetch(event.request);

      // キャッシュに保存
      cache.put(event.request, response.clone());
      return response;
    })
  );
});

// 古いキャッシュを自動削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});
```

```typescript
// app/layout.tsx（Service Workerを登録）

useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW登録完了'))
      .catch((err) => console.error('SW登録失敗:', err));
  }
}, []);
```

---

### ユーザー体験

```
初回再生:
  プレイヤーに「🔄 読み込み中...」表示
  → MP3取得・再生開始
  → バックグラウンドでキャッシュ保存

2回目以降:
  「⚡ キャッシュ済み」バッジを表示（任意）
  → ほぼ瞬時に再生開始
  → オフラインでも再生できる
```

---

### コスト削減効果

```
MP3 10MB × 100回再生 = 1GB 転送
  キャッシュなし: 1GB × $0.15 = 約23円
  キャッシュあり: 10MB（初回のみ）= 約0.2円

→ 約99%のVercel Blob転送コスト削減 ✅
```

---

### 対応ブラウザ

```
✅ Chrome（PC・Android）
✅ Safari（iOS・Mac）
✅ Firefox
✅ Edge

⚠️ シークレットモード:
   キャッシュが保存されない
   → 毎回ネットワークから取得（問題なし）
```

---

### チェックリスト追加項目

```
[ ] public/sw.js が配置されている
[ ] app/layout.tsx でService Workerが登録される
[ ] 初回再生時にMP3がキャッシュに保存される
[ ] 2回目以降はキャッシュから即再生される
[ ] オフライン状態でもキャッシュ済みMP3が再生できる
[ ] 古いキャッシュが自動削除される（バージョン更新時）
```

```
/tools/aictation              # レッスン一覧
/tools/aictation/[lessonId]   # レッスン詳細（このページ）
```

---

## 実装ステップ（推奨順序）

```
Step 1 : DBスキーマ（lessons・lessons_progress）
Step 2 : SRT/VTT → JSON変換スクリプト（pnpm db:convert-srt）
Step 3 : ページレイアウト（A・B・C・Dの骨格・2カラム）
Step 4 : A  ページヘッダー（タイトル・説明・繰り返しポリシー）
Step 5 : B-1 概要セクション
Step 6 : B-2 動画プレイヤー（<video>タグ）
Step 7 : B-3 手書き推奨メッセージ
Step 8 : B-3 カスタム音声プレイヤー
              （再生・一時停止・シークバー・速度変更）
Step 9 : B-3 前・次のセンテンス移動・リピートボタン
Step 10: B-3 自動停止機能（センテンス末尾で停止）
Step 11: B-3 センテンスリスト（折りたたみ・スクロール）
Step 12: B-3 クリックでジャンプ・自動ハイライト・自動スクロール
Step 13: B-3 正解スクリプト全文（折りたたみ）
Step 14: B-3 自己申告ボタン（3択）+ 処理ロジック
Step 15: B-3 confetti アニメーション（🌟完璧時）
Step 16: B-4 参考資料セクション
Step 17: C   AIチャットウィジェット（sticky）
Step 18: D   次のレッスンへセクション
Step 19: モバイル対応（縦積みレイアウト）
Step 20: キーボードショートカット（PC向け）
Step 21: DBへの完了・試行回数の書き込み
Step 22: 人工核対用のセンテンス表示確認
```

---

## 完了チェックリスト

```
レイアウト:
[ ] PC: 左70% + 右30% の2カラムレイアウト
[ ] モバイル: 縦積みレイアウト
[ ] 右カラム（AIチャット）がstickyで追従する

A. ヘッダー:
[ ] タイトル「AIctation」が表示される
[ ] 副題「powered by VOA」が表示される
[ ] 説明文が表示される
[ ] 繰り返しポリシー（😓💪🌟の3段階）が表示される

B-1. 概要:
[ ] レッスンタイトルが表示される
[ ] 難易度バッジが表示される
[ ] 概要文が表示される
[ ] メタ情報（時間・日付・カテゴリ）が表示される

B-2. 動画:
[ ] MP4が再生できる
[ ] video_urlがnullのとき非表示になる

B-3. 聴写プレイヤー:
[ ] 手書き推奨メッセージが表示される
[ ] MP3が再生できる（Vercel Blobから配信）
[ ] iframeを使っていないこと
[ ] 再生・一時停止が動く
[ ] シークバーで任意の位置にジャンプできる
[ ] 現在時間 / 総時間がMM:SS形式で表示される
[ ] 速度変更（0.75x・1.0x・1.25x）が動く
[ ] 前のセンテンスへボタンが動く
[ ] 次のセンテンスへボタンが動く
[ ] リピートON/OFFが切り替わる
[ ] 自動停止ON/OFFが切り替わる
[ ] センテンスリストがデフォルト折りたたみ
[ ] 「スクリプトを表示する」ボタンで展開できる
[ ] 展開時にmax-height: 300pxで表示される
[ ] 下部フェードで続きがあることが示される
[ ] 各センテンスにタイムスタンプが表示される
[ ] センテンスをクリックするとその位置から再生される
[ ] 再生中のセンテンスが自動ハイライトされる
[ ] 再生中のセンテンスが表示エリア中央に自動スクロールする
[ ] 正解スクリプト全文がデフォルト折りたたみ
[ ] 「正解スクリプトを見る」ボタンで展開できる
[ ] 自己申告ボタン3つが表示される
[ ] 😓 選択 → プレイヤーが最初に戻る・attempts+1
[ ] 💪 選択 → プレイヤーが最初に戻る・attempts+1
[ ] 🌟 選択 → confetti アニメーションが出る
[ ] 🌟 選択 → DBに完了が記録される
[ ] キーボードショートカットが動く（PC）
[ ] 音量コントロールがPCのみ表示される

B-4. 参考資料:
[ ] referencesがある場合のみ表示される
[ ] 外部リンクがtarget="_blank"で開く

C. AIチャット:
[ ] 定型質問ボタンが表示される
[ ] ボタンタップで入力欄に自動入力される
[ ] メッセージを送信するとAIが返答する
[ ] レッスンのscriptがコンテキストに含まれる
[ ] ローディング中に3点ドットが表示される
[ ] max-height: 400pxでスクロール可能

D. 次のレッスンへ:
[ ] 🌟完了後のみ表示される
[ ] 次のレッスンカードが表示される
[ ] 「次のレッスンへ」ボタンで遷移できる

DB・データ:
[ ] lessonsテーブルにsentencesカラムがある
[ ] SRT/VTT変換スクリプトが動く
[ ] 変換後のJSONがDBに正しく保存される
[ ] lessons_progressのattemptsが正しく更新される
[ ] lessons_progressのcompletedAtが正しく保存される
```
