# 3D ツール — うごくAI教室 (familyai.jp)

`/tools/ai-kyoshitsu` の **3D 図鑑化（Rev34）** に向けて、3D モデルをローカルで準備するためのツール集です。

**対象**: junli さん（Blender 未経験・Mac/Windows 両方対応）

---

## 📦 ファイル構成

| ファイル | 用途 |
|---|---|
| `preview.html` | GLB をブラウザで確認（ドラッグ&ドロップ・サイズ判定・AR テスト） |
| `compress.sh` | gltf-pipeline で Draco 圧縮（5-10MB → 0.5-2MB） |
| `hotspot-picker.html` | 3D モデル上でクリック → hotspot 座標 JSON 生成 |
| `generate-solar-system.py` | Blender Python スクリプト（AI 生成 — 段階 3） |
| `attribution-template.md` | 出典・ライセンス記録のテンプレ |
| `output/` | 生成された GLB の出力先（git ignore 推奨） |

---

## 🚀 クイックスタート（3 分で動く確認）

### 1. preview.html を開く

```bash
# このディレクトリで簡易サーバー起動
cd scripts/3d-tools
npx serve .
# → http://localhost:3000/preview.html
```

または **HTML ファイルをダブルクリックで直接開いても OK**（最近のブラウザは file:// でも動く）

### 2. サンプル GLB を試す

[Khronos の公式サンプル](https://github.com/KhronosGroup/glTF-Sample-Models) から好きな GLB をダウンロードしてドラッグ。

---

## 🛠️ 必要な事前インストール

### macOS

```bash
# 1. Node.js（v18 以上）
brew install node

# 2. gltf-pipeline（圧縮ツール）
npm install -g gltf-pipeline

# 3. Blender（3D 編集ソフト・AI 生成スクリプト実行に必要）
brew install --cask blender

# 4. Reality Converter（GLB → USDZ 変換・iOS AR 用・Mac のみ）
# https://developer.apple.com/augmented-reality/tools/ からダウンロード
```

### Windows

```powershell
# 1. Node.js: https://nodejs.org/ から LTS をインストール
# 2. gltf-pipeline
npm install -g gltf-pipeline

# 3. Blender: https://www.blender.org/download/ からインストール
#    Blender 4.x 推奨

# 4. USDZ 変換: Windows は公式ツールなし
#    → 代替: https://www.vectary.com/ または https://products.aspose.app/3d/conversion/glb-to-usdz
```

---

## 📚 標準ワークフロー（1 モデル分・所要時間 30-60 分）

### Step 1: モデルを入手

**A. オリジナル生成（AI Coding Agent）— おすすめ ⭐**

```bash
# 太陽系の例（段階 3 で配布する Blender Python スクリプト）
blender --background --python generate-solar-system.py
# → output/solar-system.glb が生成される
```

**B. 公開アーカイブから DL**

| ソース | URL | 用途 |
|---|---|---|
| NASA 3D Resources | https://nasa3d.arc.nasa.gov/ | 宇宙・天体・探査機 |
| Smithsonian 3D | https://3d.si.edu/ | 動物・恐竜・化石 |
| Sketchfab（CC0）| https://sketchfab.com/3d-models?features=downloadable&licenses=cc0 | 多種 |
| BodyParts3D | http://lifesciencedb.jp/bp3d/ | 人体解剖（日本産・CC BY-SA 2.1 JP） |
| Poly Pizza | https://poly.pizza/ | カジュアル・素材 |

### Step 2: Blender で調整（DL ファイルの場合）

1. `File > Import > glTF 2.0` で GLB を開く
2. スケール調整：Y 軸高さを 1m 前後に正規化（N キーで右パネル表示）
3. 不要なオブジェクト削除（背景・カメラなど）
4. ポリゴン削減（必要なら）：`Modifier > Decimate > Ratio 0.5`
5. `File > Export > glTF 2.0 (.glb)` で保存
   - Format: **glTF Binary (.glb)**
   - Geometry: **Apply Modifiers ✅**
   - Materials: **Export ✅**
   - Animation: **Export ✅**（あれば）

### Step 3: 圧縮

```bash
# 単体
./compress.sh output/solar-system.glb final/
# → final/solar-system.glb (0.5〜2MB に圧縮済み)

# 一括
./compress.sh raw-models/ final/
```

### Step 4: ブラウザで確認

`preview.html` を開いて、圧縮後の GLB をドラッグ。

確認ポイント:
- 🟢 ファイルサイズ < 2MB
- 🟢 回転・拡大できる
- 🟢 マテリアル（色・質感）が正しい
- 🟢 アニメーション再生される（あれば）

### Step 5: Hotspot 座標を採取

`hotspot-picker.html` を開く:

1. GLB ファイルを選択
2. **3D 上で注釈したい場所をクリック** → hotspot が追加
3. パーツ名・既定説明・AI ヒント を入力
4. 「JSON ダウンロード」で `{slug}.json` を保存

→ この JSON が CodingAgent の DB 投入に使われます。

### Step 6: iOS 用 USDZ 生成（Mac のみ）

```
Reality Converter を起動
→ GLB をドラッグ
→ File > Export > USDZ
→ final/solar-system.usdz として保存
```

### Step 7: 出典・ライセンス記録

`attribution-template.md` をコピーして `attributions/{slug}.md` に記入。

---

## 📋 推奨スペック・上限

| 項目 | 推奨 | 上限 | 備考 |
|---|---|---|---|
| GLB サイズ | 1〜2 MB | 5 MB | 超えるとモバイル遅い |
| 三角面数 | <50,000 | <100,000 | 多すぎると低 GPU 端末で重い |
| テクスチャ解像度 | 1024×1024 | 2048×2048 | 大きすぎはムダ |
| テクスチャ数 | 1〜3 枚 | 5 枚 | 多いと初回 DL 遅い |
| アニメ長さ | 5〜10秒ループ | 30秒 | 長すぎると注意散漫 |

---

## 🆘 トラブルシューティング

### `gltf-pipeline: command not found`
```bash
npm install -g gltf-pipeline
# 権限エラーなら sudo を付ける、または nvm を使う
```

### preview.html で何も表示されない
- ブラウザのデベロッパーツール（F12）でエラー確認
- WebGL 対応ブラウザか確認（Chrome / Safari / Edge）
- GLB ファイルが壊れている可能性 → Blender で再エクスポート

### AR ボタンが押せない
- iPhone (Safari) または Android (Chrome) で開く
- HTTPS でないと AR は動作しない場合あり（ローカルは `file://` で OK）
- USDZ が iOS Quick Look 用・GLB が Android Scene Viewer 用

### 圧縮しても 2MB を超える
- Blender で減面：`Modifier > Decimate > Ratio 0.3`
- テクスチャ解像度を下げる：1024 → 512
- 不要な PBR チャンネル削除（roughness / normal map は残す・emissive は削除可）

### Windows で Reality Converter が使えない
- USDZ 抜きで GLB のみ配信も可能（その場合 iOS AR は使えない）
- または https://www.vectary.com/ で GLB → USDZ オンライン変換

---

## 🔗 関連ドキュメント

- 設計書: [`todo/01_システム設計書.md`](../../todo/01_システム設計書.md)
- 実装指示: [`todo/02_CodingAgent指示書.md`](../../todo/02_CodingAgent指示書.md) の **Rev34** 行
- model-viewer 公式: https://modelviewer.dev/
- glTF 仕様: https://github.com/KhronosGroup/glTF
