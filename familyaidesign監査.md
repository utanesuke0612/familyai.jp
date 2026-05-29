# タスク：www.familyai.jp と familyaidesign casual のスタイル監査

## 背景

ユーザーは www.familyai.jp を familyaidesign の casual 変体スタイルに改修したい。
サイトの性格：「AI が家族を幸せにする」という世界観を伝えるブランドサイト。
製品販売ではなく、ストーリー型のランディングページ。

familyaidesign casual 変体（クリーム紙 + テラコッタ + polaroid + 手書き字 + マスタード下線）
がこのサイトのトーンと合うと既に判断済み。

**今回は改修しない**。両者のスタイルを監査し、ギャップを整理して報告するだけ。

## やってほしい二つのチェック

### 1. 既存サイトの現状監査

WebFetch で `https://www.familyai.jp` を取得し、以下を抽出：

- カラーパレット（背景・本文・アクセント、各 hex）
- 字体（display / body / mono のスタック）
- レイアウト構造（グリッド・余白・最大幅・モバイル対応）
- セクション構成と各セクションが運ぶ目的
- コピーのトーン（具体的か抽象的か、断言型かラベル型か）
- 既に使われている部品（ヒーロー / 特長カード / CTA / フッター 等）

サイトが取得できない／存在しない場合は明記し、推測で埋めないこと。

### 2. familyaidesign casual 変体の参照

以下を読む（順序：上から下が読みやすい）：

- `/Users/junli/.claude/skills/familyaidesign/CHEATSHEET.md`（速見表）
- `/Users/junli/.claude/skills/familyaidesign/SKILL.md`（フローと判断基準）
- `/Users/junli/.claude/skills/familyaidesign/variants/casual/components-guide.md`（部品 HTML レシピ）
- `/Users/junli/.claude/skills/familyaidesign/variants/casual/report.html`（縦読み・Web に近い）
- `/Users/junli/.claude/skills/familyaidesign/variants/casual/slide-deck.html`（視覚言語の参照）
- `/Users/junli/.claude/skills/familyaidesign/references/anti-patterns.md`（特に §6 Tone Contamination）

## 報告フォーマット

以下の構造で、日本語の監査レポートを返してほしい（800〜1200 字目安）：

1. **既存サイトの現状サマリ** — 一段落で「何系のスタイルか」を述べる
2. **比較表** — 軸ごとに「現状」「casual 目標」「変更必要性（小・中・大）」
   - 軸の例：背景色 / アクセント色 / display 字体 / body 字体 / 見出し階層 / 余白 / セクション錨 / 写真扱い / 強調手段 / コピーのトーン
3. **そのまま使える要素** — 既に casual と整合している部分
4. **要改修要素** — 一覧で、各々「なぜ変えるか」「どう変えるか」
5. **要素不足** — casual の世界観に必要だが既存サイトにない部品（polaroid / num-stamp / 手書き sign-off / mustard ハイライト / ticket motif 等）
6. **ユーザーへの確認事項** — 判断材料が足りない点（家族写真の素材、伝えたい物語、創業者の声、CTA の有無 等）

## 制約

- **コードは書かない**。監査レポートのみ。
- 数字・事実・引用を捏造しない。未確認なものは「未確認」と明示。
- familyai.jp が取得不能なら、その旨だけ書いて familyaidesign 側の整理のみ進める。
- familyaidesign は印刷・スライド向けで、Web LP テンプレートを持たない事実を踏まえる
  （`report.html` が最も Web 縦スクロールに近い）。
- 監査レポートは判断材料であって最終決定ではない。ユーザーが次の指示を出すまで待機。

## 進め方

1. 並列で WebFetch（既存サイト）と familyaidesign のファイル群を読む
2. 抽出した情報を整理し、比較表を作成
3. レポート 6 セクションを順に書く
4. 不明点をリストにしてユーザーに戻す
