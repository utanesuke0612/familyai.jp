# PWA 動作確認チェックリスト

> familyai.jp — 機能 2（PWA 実装）の検証手順とテスト項目  
> 初版: 2026-04-29 / Service Worker `v1`

---

## 🎯 このドキュメントの位置づけ

機能 2（PWA: manifest 拡張 + Service Worker + オフラインページ）が **本番デプロイ前** または **PWA 改修後** に動作確認するための **再利用可能なチェックリスト**。

将来 SW のバージョンを上げた際 (`VERSION = 'v2'` 等)、または manifest を変更した際にもこのドキュメントを参照すること。

---

## 📋 確認環境

### 必要な環境
- **Chrome / Edge**（Chromium 系）— DevTools が最も充実
- **Safari**（任意・iOS 検証用）
- **Lighthouse**（Chrome DevTools に組込み）

### ローカル環境での前提
PWA は **`pnpm dev` では動作しない**（Service Worker 登録が `NODE_ENV !== 'production'` でスキップされるため）。  
必ず以下のコマンドで本番ビルドを起動してから検証する：

```bash
pnpm build && pnpm start
```

→ `http://localhost:3000` で確認。

---

## ✅ 検証項目（全 7 セクション）

### 0. 事前準備

- [ ] `pnpm build` が正常終了している
- [ ] `pnpm start` で起動済み（`http://localhost:3000` がアクセス可能）
- [ ] Chrome で `http://localhost:3000` を開いた
- [ ] DevTools を開いた（`F12` または `⌘+Option+I`）
- [ ] DevTools の **「Application」タブ** を選択した

---

### 1. Manifest 確認

**場所**: DevTools → Application → 左メニュー **「Manifest」**

| # | 項目 | 期待値 | 確認 |
|---|------|--------|:---:|
| 1.1 | Name | `familyai.jp — AI活用事例とAIツール` | ⬜ |
| 1.2 | Short name | `familyai` | ⬜ |
| 1.3 | Description | 「仕事・学習・日常に役立つ AI 活用事例…」 | ⬜ |
| 1.4 | Start URL | `/` | ⬜ |
| 1.5 | Display | `standalone` | ⬜ |
| 1.6 | Background color | `#FDF6ED`（クリーム色見本表示）| ⬜ |
| 1.7 | **Theme color** | **`#FF8C42`（オレンジ色見本表示）** | ⬜ |
| 1.8 | Lang | `ja` | ⬜ |
| 1.9 | Orientation | `portrait` | ⬜ |
| 1.10 | Icons (192×192) | 💞 絵文字アイコン表示 | ⬜ |
| 1.11 | Icons (180×180 apple-icon) | 💞 絵文字アイコン表示 | ⬜ |
| 1.12 | Shortcuts 1 | 「記事を読む」`/learn` | ⬜ |
| 1.13 | Shortcuts 2 | 「VOA × AI ディクテーション教室」`/tools/voaenglish` | ⬜ |
| 1.14 | Shortcuts 3 | 「うごくAI教室」`/tools/ai-kyoshitsu` | ⬜ |

**❌ NG 時の対処**
- 何も表示されない → ハードリロード（`⌘+Shift+R` / `Ctrl+Shift+F5`）
- Theme color がクリームのまま → `pnpm build` をやり直し（変更が反映されていない）
- アイコンが空 → `/icon` を直接ブラウザで開いて画像が出るか確認

---

### 2. Service Worker 確認

**場所**: DevTools → Application → 左メニュー **「Service Workers」**

| # | 項目 | 期待値 | 確認 |
|---|------|--------|:---:|
| 2.1 | Source | `http://localhost:3000/sw.js` | ⬜ |
| 2.2 | Status | **「activated and is running」**（緑のドット）| ⬜ |
| 2.3 | Received timestamp | 直近の時刻が表示 | ⬜ |
| 2.4 | Clients | `http://localhost:3000/` を含む | ⬜ |

**便利な設定（テスト中）**
- ☑ **Update on reload**：ON にしておくとリロード時に SW が再登録される
- ☑ **Bypass for network**：OFF（テストのため SW 経由にする）

**❌ NG 時の対処**
- 「No service worker」表示 → `Update on reload` ✓ → リロード
- それでもダメ → 「Storage」→「Clear site data」→ リロード
- それでもダメ → コンソールに `[SW] register failed` が出ているか確認

---

### 3. Cache Storage 確認

**場所**: DevTools → Application → 左メニュー **「Cache Storage」**（▶ で展開）

| # | 項目 | 期待値 | 確認 |
|---|------|--------|:---:|
| 3.1 | `familyai-pages-v1` フォルダ存在 | あり | ⬜ |
| 3.2 | フォルダ内に `/offline` | あり | ⬜ |
| 3.3 | フォルダ内に `/` | あり | ⬜ |
| 3.4 | フォルダ内に `/learn` | あり | ⬜ |
| 3.5 | フォルダ内に `/tools` | あり | ⬜ |
| 3.6 | `familyai-audio-v1` フォルダ | MP3 を再生していなければ未作成で OK | ⬜ |

**MP3 キャッシュ動作確認（任意・5 分）**
1. AIctation 用 MP3 がある場合は再生してみる
2. `familyai-audio-v1` に MP3 URL がキャッシュされる
3. ネット切断後も再生できることを確認

---

### 4. オフライン動作テスト 🚨 最重要

**場所**: DevTools → **Network タブ**（Application でない）

#### 4-1. ネットワーク切断
- [ ] Network タブを開く
- [ ] 上部のスロットリング設定を **「No throttling」→「Offline」** に変更
- [ ] 上部に「Offline」の赤いインジケータが出る

#### 4-2. キャッシュ済みページの表示確認
- [ ] アドレスバーに `http://localhost:3000/learn` を入力 → Enter
- [ ] **正常に表示される**（キャッシュから返却）
- [ ] DevTools Network タブで `(disk cache)` または `(ServiceWorker)` と表示

#### 4-3. オフラインフォールバック確認
- [ ] アドレスバーに `http://localhost:3000/learn/random-non-existent-slug-12345` を入力 → Enter
- [ ] **`/offline` ページが表示される**
- [ ] ページに以下の要素が見える：
  - 📡 大きい絵文字
  - 「オフラインです」見出し（茶色フォント）
  - 「インターネット接続を確認してください…」説明文
  - 💡 ヒント box（薄いベージュ枠）
  - オレンジの「🏠 ホームに戻る」ボタン

#### 4-4. ネット復活確認
- [ ] Network タブの「Offline」を **「No throttling」** に戻す
- [ ] 「ホームに戻る」ボタンをクリック
- [ ] ホームページが正常に表示される
- [ ] DevTools Network で再度ネット fetch していることを確認

---

### 5. Theme Color 視覚確認

#### 5-1. Mac Chrome（モバイルエミュレーション）
- [ ] DevTools の **Device toolbar** を開く（`⌘+Shift+M`）
- [ ] デバイスを「iPhone 14 Pro」等に切替
- [ ] アドレスバー上部のステータスバー部分が **オレンジ（#FF8C42）** に変化

#### 5-2. iOS Safari（実機テスト・任意）
1. Mac の LAN IP を確認: `ipconfig getifaddr en0` → 例 `192.168.1.10`
2. iPhone Safari で `http://192.168.1.10:3000` にアクセス
3. - [ ] アドレスバーがオレンジに変化
4. 共有ボタン → **「ホーム画面に追加」** → アイコン名を確認
5. - [ ] ホーム画面のアイコンをタップ → **standalone（アドレスバーなし全画面）で起動**
6. - [ ] 上部のステータスバーがオレンジ

#### 5-3. Android Chrome（実機テスト・任意）
1. 同様に LAN IP でアクセス
2. - [ ] アドレスバーがオレンジ
3. メニュー → **「ホーム画面に追加」** または自動バナー表示
4. - [ ] standalone で起動
5. - [ ] アイコン長押しで 3 つのショートカットが表示（記事を読む / VOA / AI 教室）

---

### 6. Lighthouse PWA 監査

**場所**: DevTools → **Lighthouse タブ**

#### 6-1. 設定
- [ ] Mode: **Navigation**
- [ ] Device: **Mobile**
- [ ] Categories: **PWA のみチェック**（他は外す）

#### 6-2. 実行
- [ ] **「Analyze page load」** クリック
- [ ] 結果待ち（30〜60 秒）

#### 6-3. 期待スコア
- [ ] **PWA スコア 90 以上**
- [ ] ✅ Installable（インストール可能）
- [ ] ✅ Service Worker registered
- [ ] ✅ Manifest meets installability requirements
- [ ] ✅ Has a `<meta name="viewport">` tag
- [ ] ✅ Has a `<meta name="theme-color">` tag

#### 6-4. 許容される警告（無視 OK）
- ⚠️ Splash screen icon がない / maskable icon がない
  - → 動的生成（`/icon`、`/apple-icon`）で代替中
  - → junli さん作成の Canva PNG 画像（`public/icons/icon-192.png` / `icon-512.png`）配置後に解消予定

---

### 7. 既存機能への影響確認（リグレッション）

PWA を入れたことで既存ページが壊れていないかの最終確認：

| # | 項目 | 確認 |
|---|------|:---:|
| 7.1 | `/`（ホーム）が正常表示 | ⬜ |
| 7.2 | `/learn`（記事一覧）が正常表示・フィルタが動く | ⬜ |
| 7.3 | `/learn/[任意 slug]`（記事詳細）が正常表示 | ⬜ |
| 7.4 | `/tools`（ツール一覧）が正常表示 | ⬜ |
| 7.5 | `/tools/voaenglish/anna/lesson-01` で AI チャット 5 タブ（📖📚📝✍️🎯）表示 | ⬜ |
| 7.6 | AI チャットで質問送信 → ストリーミング応答が表示 | ⬜ |
| 7.7 | `/tools/ai-kyoshitsu` で AI 教室生成（任意）| ⬜ |
| 7.8 | `/admin/ai-config`（管理画面・ログイン後）が正常 | ⬜ |
| 7.9 | `/mypage/ai-kyoshitsu` で履歴一覧が表示 | ⬜ |
| 7.10 | 認証フロー（ログイン・ログアウト）が動く | ⬜ |
| 7.11 | DevTools **Console タブ** にエラーが出ていない | ⬜ |

#### Console で許容される警告
- `[SW] register failed`（一部環境で出ても機能には影響なし）
- `Speed Insights` 関連の info ログ

---

## 📝 報告フォーマット

確認結果を以下のようにまとめると振り返り資料になります：

```
PWA 動作確認結果（2026-XX-XX）
1. Manifest:        ✅ / ❌
2. Service Worker:  ✅ / ❌
3. Cache Storage:   ✅ / ❌
4. オフライン動作:   ✅ / ❌
5. Theme color:     ✅ / ❌
6. Lighthouse PWA:  __ 点
7. 既存機能:        ✅ / ❌

特記事項:
- (問題があれば記載)

確認環境:
- Chrome バージョン:
- macOS / iOS / Android:
```

---

## 🚨 トラブルシューティング

### Q: SW が登録されない
**A**: 以下を順に試す
1. DevTools Application → Storage → **「Clear site data」** クリック → リロード
2. DevTools Application → Service Workers → **「Unregister」** → リロード
3. シークレットウィンドウで開く（拡張機能の干渉を排除）
4. 別のブラウザで試す

### Q: SW 更新後も古いコードが動く
**A**: SW のキャッシュ更新は以下の流れ
1. `public/sw.js` の `VERSION = 'v1'` → `VERSION = 'v2'` に変更
2. `pnpm build && pnpm start`
3. ブラウザリロード → 新 SW がインストール → activate で旧キャッシュ削除
4. それでもダメなら DevTools → Application → 「Update on reload」 ✓

### Q: ネット復活したのに `/offline` が出続ける
**A**: SW が古いキャッシュを掴んでいる可能性
1. Network タブで「Disable cache」✓
2. Application → Service Workers → 「Unregister」
3. リロード

### Q: `pnpm build` でエラー
**A**: 実装側の TypeScript エラーの可能性
```bash
pnpm exec tsc --noEmit
```
で個別確認。

---

## 🔄 PWA 改修時の運用ルール

### Service Worker 更新時
1. `public/sw.js` の `VERSION` を必ず上げる（`v1` → `v2` → `v3`...）
2. キャッシュ戦略変更時はこのドキュメントの「3. Cache Storage 確認」項目を更新
3. `PRECACHE_URLS` を変更したら 3-2〜3-5 の項目を新 URL リストに合わせて更新

### Manifest 更新時
- このドキュメントの「1. Manifest 確認」項目を新値に合わせて更新
- 特に **Theme color** や **shortcuts** の変更は要記載

### 緊急時の SW Kill Switch
バグった SW を全ユーザーから強制削除する手順：

```javascript
// public/sw.js を以下に書き換えてデプロイ
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async (event) => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const clients = await self.clients.matchAll();
    clients.forEach((c) => c.navigate(c.url));
  })());
});
```

→ デプロイ後、全ユーザーが次回アクセス時に SW から解放される。

---

## 📚 関連ドキュメント

- `todo/01_システム設計書.md` §4 — データ保管マップ（Service Worker のキャッシュ層）
- `todo/familyai_coding_agent_v4.md` §「PWA（Progressive Web App）設計」 — 実装仕様の出典
- `public/sw.js` — Service Worker 本体
- `app/manifest.ts` — Web App Manifest
- `components/pwa/ServiceWorkerRegister.tsx` — SW 登録 Client Component
- `app/offline/page.tsx` — オフラインフォールバックページ
