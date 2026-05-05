# VOA Course Pipeline — VOA レッスンを familyai.jp に取り込む完全手順

VOA Learning English (https://learningenglish.voanews.com) のコースを
familyai.jp の AIctation 機能で使えるよう取り込むための、
**完全自動化された処理パイプライン** です。

Anna コース（40 課）と Level 1 コース（52 課）で実証済み。  
新しいコース（Level 2、Level 3、Intermediate 等）を追加する際は本手順をなぞる。

---

## 📋 全体フロー（3 大フェーズ）

```
┌─ Phase 0: スコープ確定 + メタデータ取得 ────┐
│  • コース URL slug 決定                       │
│  • content フォルダ作成                       │
│  • VOA index page から全 lesson メタデータ取得│
│  • lesson-XX.md (frontmatter のみ) 生成       │
│  • コース index page (.tsx) 生成               │
│  • トップページのリンク更新                    │
└──────────────────────────────────────────────┘
                  ↓
┌─ Phase A: 素材収集（junli 担当）─────────────┐
│  • CSV に video embed URL 記入                │
│  • SRT 生成（Whisper 等）してフォルダ配置      │
│  • MP3 を Vercel Blob にアップロード          │
└──────────────────────────────────────────────┘
                  ↓
┌─ Phase B: 一括処理（Claude Code 担当）────────┐
│  9 ステップを順次実行・1〜2 時間で完了         │
└──────────────────────────────────────────────┘
```

---

## Phase 0: スコープ確定 + メタデータ取得

### 0-1. URL slug を決める

例:
- Anna → `anna`
- Let's Learn English Level 1 → `level-1`
- Level 2 → `level-2`

### 0-2. content フォルダ命名

連番形式で作成:
- `content/voaenglish/01_01_Anna/`
- `content/voaenglish/01_02_Level1/`
- `content/voaenglish/01_03_Level2/`
- `content/voaenglish/02_01_<次レベル>/`

### 0-3. VOA index page から全 lesson 取得

```bash
# 例: Level 1 のインデックス
curl -sL -A "Mozilla/5.0" "https://learningenglish.voanews.com/p/<INDEX_ID>.html" -o /tmp/level1.html

# Lesson カードを正規表現で抽出
node -e '
const fs = require("fs");
const html = fs.readFileSync("/tmp/level1.html", "utf8");
const sectionStart = html.indexOf("Lessons");  // または「Level X Lessons」等
const slice = sectionStart > 0 ? html.slice(sectionStart) : html;

const liPattern = /<li class="col-xs-12 col-sm-6 col-md-6 col-lg-6 mb-grid">[\s\S]*?<\/li>/g;
const lis = slice.match(liPattern) ?? [];

const lessons = [];
for (const li of lis) {
  const hrefMatch  = li.match(/<a href="([^"]+\.html)"/);
  const titleMatch = li.match(/<h4[^>]*title="([^"]+)"/) ?? li.match(/<h4[^>]*>([\s\S]*?)<\/h4>/);
  const thumbMatch = li.match(/<noscript[^>]*>\s*<img src="([^"]+)"/) ?? li.match(/data-src="([^"]+)"/);
  if (hrefMatch && titleMatch) {
    const href     = hrefMatch[1].startsWith("http") ? hrefMatch[1] : `https://learningenglish.voanews.com${hrefMatch[1]}`;
    const titleRaw = titleMatch[1].replace(/&#39;/g, "\x27").replace(/&amp;/g, "&").replace(/&quot;/g, "\x22").trim();
    const m = titleRaw.match(/^Lesson\s+(\d+):\s*(.*)$/i);
    const number = m ? parseInt(m[1], 10) : null;  // null なら除外（Review 回など）
    const title  = m ? m[2].trim() : titleRaw;
    let thumbnail = thumbMatch ? thumbMatch[1] : "";
    thumbnail = thumbnail.replace(/_w100_/, "_w400_").replace(/_w160_/, "_w400_");
    if (number !== null) lessons.push({ number, title, url: href, thumbnail });
  }
}
fs.writeFileSync("/tmp/lessons.json", JSON.stringify(lessons, null, 2));
console.log("Extracted:", lessons.length);
'
```

### 0-4. lesson-XX.md を一括生成

```js
import fs from 'node:fs';
const lessons = JSON.parse(fs.readFileSync('/tmp/lessons.json', 'utf8'));
const dir = 'content/voaenglish/01_03_Level2';   // ← 該当フォルダ
const courseSlug = 'level-2';                     // ← URL slug
const courseTitle = "Let's Learn English - Level 2";

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

for (const l of lessons) {
  const slug = `lesson-${String(l.number).padStart(2, '0')}`;
  const titleEsc = l.title.replace(/"/g, '\\"');
  fs.writeFileSync(`${dir}/${slug}.md`, `---
slug: ${slug}
level: beginning
course: ${courseSlug}
courseTitle: "${courseTitle}"
lessonNumber: ${l.number}
title: "${titleEsc}"
thumbnail: ${l.thumbnail}
voaUrl: ${l.url}
published: true
---
`);
}
```

### 0-5. コース index page (.tsx) 作成

`app/(site)/tools/voaenglish/<slug>/page.tsx` に Anna または Level 1 を雛形にコピー。
変更箇所:
- `getLessonsByCourse('<slug>')`
- `listUserProgressByPrefix(userId, '<slug>/')`
- 各種日本語タイトル・CEFR 表記
- VOA 公式 URL

### 0-6. トップページの Beginning 配列を更新

`app/(site)/tools/voaenglish/page.tsx` の該当エントリを：
- `href: '<外部VOA URL>'` → `href: '/tools/voaenglish/<slug>'` に変更

→ 内部リンクになると「準備中」バッジが自動的に消える（`isInternal` 判定）

### 0-7. CSV 雛形を作成

```js
// 全 lesson の slug + title だけ書いた CSV を生成
// videoUrl 列は空欄（junli が記入する）
import fs from 'node:fs';
const dir = 'content/voaenglish/01_03_Level2';
const lines = ['slug,title,videoUrl'];
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
for (const f of files) {
  const slug = f.replace('.md', '');
  const md = fs.readFileSync(`${dir}/${f}`, 'utf8');
  const title = md.match(/^title:\s*"?([^"\n]+?)"?\s*$/m)?.[1] ?? '';
  const escaped = title.includes(',') || title.includes('"')
    ? `"${title.replace(/"/g, '""')}"`
    : title;
  lines.push(`${slug},${escaped},`);
}
fs.writeFileSync(`${dir}/_videoUrls.csv`, lines.join('\n') + '\n');
```

---

## Phase A: 素材収集（junli 担当）

### A-1. CSV に video embed URL を記入

各 VOA 記事ページから動画 embed URL を取得:
- 動画上で右クリック → 「ビデオ URL をコピー」
- 形式: `https://learningenglish.voanews.com/embed/player/0/<番号>.html?type=video`
- iframe タグ全体貼り付けでも OK（後の処理で URL 抽出可能）

### A-2. SRT を生成してフォルダ配置

- ファイル名: `lesson-XX.srt`（例: `lesson-01.srt`）
- 各 MP3 を Whisper にかけて生成
- 配置先: `content/voaenglish/<フォルダ>/`
- ⚠️ `.srt` は `.gitignore` 対象（json が source of truth）

### A-3. MP3 を Vercel Blob にアップロード

- Vercel Dashboard → familyai-blob-public → `voaenglish/<フォルダ>/`
- ファイル名: `lesson-XX.mp3`
- Public Blob (`hdp0u6ksvlptyyrj.public.blob.vercel-storage.com`) を使用

---

## Phase B: 一括処理（9 ステップ）

junli から「3 種類揃った」連絡を受けたら、以下を順次実行。

### B-1. VOA 全 lesson の HTML 取得（Speaker 名抽出のため）

```bash
mkdir -p /tmp/voa-pages
DIR=content/voaenglish/01_03_Level2
N=30  # ← lesson 総数
for n in $(seq -w 1 $N); do
  url=$(grep "voaUrl:" $DIR/lesson-${n}.md | sed "s/voaUrl: *//")
  curl -sL -A "Mozilla/5.0" "$url" -o /tmp/voa-pages/lesson-${n}.html &
  if (( $(jobs -r | wc -l) >= 10 )); then wait; fi
done
wait
```

### B-2. SRT → sentences.json 変換

```bash
pnpm db:convert-srt content/voaenglish/01_03_Level2/
```

### B-3. Whisper 単純誤り修正

```bash
pnpm tsx scripts/fix-whisper-errors.ts content/voaenglish/01_03_Level2/
```

修正対象: `Chill→Jill` / `Ana→Anna` / `weepers→Meepers` / `bass→bats`（特定 lesson）/ `bathouse→bat house` / `Audon→削除`

### B-4. 連続重複センテンス削除

```bash
pnpm tsx scripts/dedupe-consecutive.ts content/voaenglish/01_03_Level2/
```

### B-5. VOA 対話文と SRT を比較・Speaker 名マッピング

```bash
pnpm tsx scripts/map-speakers-from-voa.ts \
  --srt-dir content/voaenglish/01_03_Level2 \
  --voa-dir /tmp/voa-pages \
  --lessons 1-30
```

⚠️ このスクリプトは **SRT を直接更新する** ため、convert-srt（B-2）の前に実行する必要あり。

**推奨実行順**: B-1 → B-5 → B-2 → B-3 → B-4 → B-6 → B-7 → B-8 → B-9

### B-6. Speaker 太字化

```bash
pnpm tsx scripts/bold-speaker.ts content/voaenglish/01_03_Level2/
```
"Pete: text" → "**Pete:** text"

### B-7. AI 単語注釈追加

```bash
node --env-file=.env.local node_modules/.bin/tsx \
  scripts/annotate-sentences.ts content/voaenglish/01_03_Level2/
```

⚠️ 一括実行時にタイムアウト・rate limit でストップする可能性あり。
バッチでストップしたら個別に再実行:
```bash
for n in $(seq -w 14 30); do
  node --env-file=.env.local node_modules/.bin/tsx \
    scripts/annotate-sentences.ts content/voaenglish/01_03_Level2/lesson-${n}.sentences.json
done
```

### B-8. 日本語 description AI 生成

```bash
node --env-file=.env.local node_modules/.bin/tsx \
  scripts/generate-descriptions.ts \
  content/voaenglish/01_03_Level2/ \
  /tmp/descriptions-level2.json
```

### B-9. CSV クリーニング + frontmatter 拡充

```js
// CSV から iframe タグ → URL のみ抽出
import fs from 'node:fs';
const file = 'content/voaenglish/01_03_Level2/_videoUrls.csv';
const lines = fs.readFileSync(file, 'utf8').split('\n');
const out = lines.map((line, i) => {
  if (i === 0 || !line.trim()) return line;
  // クォート付き title に対応した CSV パーサ
  const slug = line.slice(0, line.indexOf(','));
  // ... (Level 1 の手順と同じ)
});
fs.writeFileSync(file, out.join('\n'));
```

```js
// .md frontmatter を拡充
import fs from 'node:fs';

const DIR = 'content/voaenglish/01_03_Level2';
const COURSE_FOLDER = 'voaenglish/01_03_Level2';

// CSV から videoUrl
const csv = fs.readFileSync(`${DIR}/_videoUrls.csv`, 'utf8').split('\n').slice(1);
const urls = {};
for (const line of csv) {
  if (!line.trim()) continue;
  const slug = line.slice(0, line.indexOf(','));
  const m = line.match(/(https:\/\/learningenglish\.voanews\.com\/embed\/player\/0\/\d+\.html\?type=video)/);
  if (slug && m) urls[slug] = m[1];
}

// description
const descriptions = JSON.parse(fs.readFileSync('/tmp/descriptions-level2.json', 'utf8'));

// 各 .md を frontmatter 抽出 → description / videoUrl / audioPath を追加して書き戻し
// (Level 1 で使用した /tmp/update-level1-md.mjs と同等のロジック)
```

---

## ✅ 検証項目

実装後、以下を必ず確認:

```bash
# 型チェック
npx tsc --noEmit

# Lint
pnpm lint

# Sample MP3 アクセス確認
curl -sIL "https://hdp0u6ksvlptyyrj.public.blob.vercel-storage.com/voaenglish/01_03_Level2/lesson-01.mp3" | head -3

# dev サーバーで動作確認
rm -rf .next && pnpm dev
# → http://localhost:3000/tools/voaenglish/<slug>/lesson-01
#   - 概要: description 表示
#   - 動画: VOA embed 再生
#   - Dictation: 音声 + キャラ名 + 注釈付き単語
```

---

## 🛠️ 関連スクリプト一覧

すべて `scripts/` 配下:

| スクリプト | 役割 |
|----------|------|
| `convert-srt.ts` | SRT/VTT → sentences.json |
| `fix-whisper-errors.ts` | Whisper 単純誤りパターン置換 |
| `dedupe-consecutive.ts` | 連続重複センテンス削除 |
| `bold-speaker.ts` | speaker prefix を **markdown 太字** に |
| `replace-speaker-names.ts` | Speaker N → DrJill/Anna/Max（旧式・Anna 専用）|
| `map-speakers-from-voa.ts` | VOA 公式 transcript と SRT を照合して実キャラ名を割り当て（推奨）|
| `annotate-sentences.ts` | OpenRouter Claude Haiku で単語注釈追加 |
| `generate-descriptions.ts` | OpenRouter Claude Haiku で日本語 description 生成 |

ワークフロー特化スクリプト（その都度 `/tmp/` に作る）:
- `/tmp/extract-voa-lessons.mjs` — VOA index page から lesson メタデータ抽出（Phase 0-3）
- `/tmp/gen-mds.mjs` — `.md` 雛形生成（Phase 0-4）
- `/tmp/update-<course>-md.mjs` — frontmatter 拡充（CSV + description 統合・Phase B-9）

---

## 💰 コスト目安

1 コース（30〜50 lesson 規模）あたり:

| 項目 | コスト |
|------|--------|
| 単語注釈 (annotate-sentences) | ~30〜80 円 |
| description 生成 | ~10〜20 円 |
| **合計** | **~50〜100 円** |

OpenRouter Claude 3.5 Haiku 想定。

---

## 🐛 既知の落とし穴

### 1. annotation script が途中で停止する
- 大きなコースでバッチ処理中にタイムアウト or rate limit でストップ
- → `for n in $(seq -w X Y); do ... lesson-${n}.sentences.json; done` で個別再実行

### 2. CSV が iframe タグで貼り付けられた場合
- そのまま `iframe src="..."` から URL を抽出すれば OK（B-9）

### 3. Whisper で speaker が誤分類されている lesson
- Anna lesson-30: Speaker 2/3 が逆転（Anna ↔ Max）
- Phase B-5 で VOA 対話文と類似度マッチで自動修正される
- マッチしなかった narration はデフォルト Anna に割り当て

### 4. SRT のタイムスタンプが極端に短い lesson
- VOA "Conversation" 音声が本来短い場合がある（例: Level 1 lesson-01 = 29 秒）
- 末尾 3 行が "Until next time" / "Good job" 等で終わっていれば正常
- 切れていそうなら junli に SRT 再生成を依頼

### 5. lesson-XX.md の frontmatter で `course:` を間違えると lesson が表示されない
- ルーティングは `course` フィールドの値で判定される
- フォルダ名（例: `01_03_Level2`）と course slug（例: `level-2`）は別物

---

## 📚 参考: 過去のコース実績

| コース | 課数 | フォルダ | URL slug | 完成日 |
|-------|------|---------|---------|--------|
| Anna | 40 | `01_01_Anna` | `anna` | 2026 早期 |
| Let's Learn English - Level 1 | 52 | `01_02_Level1` | `level-1` | 2026-05 |
| Let's Learn English - Level 2 | 30 | `01_03_Level2` | `level-2` | （準備中） |

---

## 🎯 完成判定チェックリスト

新コース追加が完成したと言える条件:

- [ ] `/tools/voaenglish` のリンクが内部 URL（`/tools/voaenglish/<slug>`）
- [ ] `/tools/voaenglish/<slug>` でカード一覧 + 全 lesson 表示
- [ ] 各 lesson ページで:
  - [ ] 概要セクションに日本語 description
  - [ ] 動画セクションが VOA 埋め込みで再生
  - [ ] Dictation 音声プレイヤーで MP3 再生
  - [ ] センテンスリストに **キャラ名（Pete/Anna 等）** と注釈付き単語
  - [ ] 単語タップでツールチップ + ⭐ 単語帳保存
  - [ ] AI Echo パネル
- [ ] ログイン中に Dictation 完了で「✨ N」バッジが付く
- [ ] `tsc --noEmit` ✅
- [ ] `pnpm lint` ✅
- [ ] git commit + push 済み
