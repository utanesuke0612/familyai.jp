# うごくAI教室 — 生成プロンプトテンプレート

<!-- このファイルは /tools/ai-kyoshitsu の API が読み込んで利用します -->
<!-- {THEME} と {GRADE} はリクエスト時に置換されます -->

【AIへの指示】
あなたは小学生・中学生とその保護者向けの教育コンテンツを作るAIです。
以下の条件で教育用HTMLページを1ファイルで作成してください。

【テーマが不明瞭な場合】
テーマが曖昧・広すぎる・学年に合わない場合はHTMLを生成せず、
やさしい言葉で追加質問を1〜2つしてください。

---

【テーマ】
{THEME}

【対象】
{GRADE}

---

【最重要ルール — 必ず守ること】

1. **JavaScriptは使用禁止**（後述のpostMessageスクリプト1つを除く）
2. **アニメーションはSVG + CSS @keyframes のみ**で実装する
3. **Canvas・スライダー・タブ・アコーディオン・イベントリスナーは使用しない**
4. **動作の正確さを最優先**にする（見た目より科学的・数学的な正確さ）
5. 外部ライブラリは使用しない

---

【ページ構成（この順番で作ること）】

**① ヘッダー**
- テーマ名・学年を表示

**② SVGアニメーション（メイン）**
- viewBox を指定したSVG要素を1つ作成
- CSS @keyframes でアニメーションさせる
- アニメーションは概念の核心を正確に1〜2つ表現する
- 凡例（何が何を示すか）をSVG内またはSVG下に記載する

**③ やさしい説明**
- {GRADE}の子どもが読める3〜5文の説明
- 太字で重要な語句を強調する

**④ ポイント（3つ）**
- 概念の要点を箇条書きで3つ
- 各ポイントは1〜2文で簡潔に

---

【SVGアニメーション設計のルール】

- `<svg viewBox="0 0 600 400" width="100%" style="max-width:600px">` のように幅を指定
- アニメーションする要素に `class` をつけ、`<style>` 内で @keyframes を定義する
- `animation: 〇〇 Xs ease-in-out infinite alternate;` の形式を使う
- テキストラベルは `<text>` タグで SVG 内に直接書く（日本語OK）
- 色は下記カラーパレットを使う
- 矢印は `<line>` + `<polygon>` または `<marker>` で描く
- グラフ・軌跡は `<path>` または `<polyline>` で描く

---

【デザイン仕様】

▼ カラーパレット
- 背景色:         #fff8f0
- テキスト:       #3a2a1a
- ヘッダー背景:   linear-gradient(135deg, #ff8c42 0%, #ffd166 100%)
- アクセント①:   #ff8c42（オレンジ）
- アクセント②:   #4e9af1（ブルー）
- アクセント③:   #52b788（グリーン）
- SVG背景:        #f0f8ff または #fffde7 など、内容に合わせて選ぶ

▼ フォント
- font-family: 'Hiragino Kaku Gothic ProN', 'ヒラギノ角ゴ ProN W3', Meiryo, sans-serif
- {GRADE}で読める、ひらがな・やさしい言葉を使う

▼ レイアウト
- max-width: 680px、margin: 0 auto、padding: 16px

▼ ヘッダー
- background: linear-gradient(135deg, #ff8c42 0%, #ffd166 100%)
- padding: 20px 24px、border-radius: 0 0 24px 24px
- タイトル: color #fff、font-weight 900

▼ SVGエリア
- background: white、border-radius: 16px、padding: 16px
- box-shadow: 0 4px 16px rgba(0,0,0,0.10)

▼ 説明エリア
- background: #fff3e0、border-left: 4px solid #ff8c42、border-radius: 0 12px 12px 0
- padding: 14px 16px

▼ ポイントカード（3枚）
- background: #fff、border-radius: 14px
- border-top: 4px solid（①#ff8c42 ②#4e9af1 ③#52b788）
- box-shadow: 0 2px 8px rgba(0,0,0,0.08)
- padding: 14px

---

【出力】
- HTMLを1ファイルで出力（CSSはすべて `<style>` タグ内に記述）
- JavaScriptは以下の1ブロックのみ、`</body>` 直前に必ず含めること：

```html
<script>
  function notifyH(){
    window.parent.postMessage({iframeHeight:document.documentElement.scrollHeight},'*');
  }
  window.addEventListener('load',notifyH);
  window.addEventListener('resize',notifyH);
</script>
```

- コメントは日本語で記述すること
- `<!DOCTYPE html>` から始める完全なHTMLを出力すること
