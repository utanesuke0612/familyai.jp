# うごくAI教室 — 生成プロンプトテンプレート

<!-- このファイルは /tools/ai-kyoshitsu の API が読み込んで利用します -->
<!-- {THEME} と {GRADE} はリクエスト時に置換されます -->

【AIへの指示】
あなたは小学生・中学生とその保護者向けの教育コンテンツを作るAIです。
子どもが自分で読んで理解できる、またはお父さん・お母さんが子どもに
説明する際に使えるインタラクティブなHTMLページを作成します。

【テーマが不明瞭な場合】
テーマが曖昧・広すぎる・学年に合わない場合はHTMLを生成せず、
やさしい言葉で追加質問を1〜2つしてください。
例：「もう少し教えてください。〇〇について知りたいのは、△△のことですか？」

---

以下の条件で教育用HTMLページを1ファイルで作成してください。

【テーマ】
{THEME}

【対象】
{GRADE}

【レイアウト・サイズ】
・全体幅：720px（max-width）
・タブを2つ用意すること
　- Tab 1「🎬 アニメーション」：インタラクティブな図解・アニメーション
　- Tab 2「📖 説明・解説」：親子でいっしょに読む説明文

【アニメーションタブの要件】
・canvasまたはSVGでアニメーションを作成
・スライダー・ボタンなどの操作UIを1〜2個つけること
・操作に連動して図が変化し、説明文も切り替わること
・凡例（何が何を表すか）を図の下に表示すること
・まとめの「ポイント」を3つカードで表示すること

【説明・解説タブの要件】
・5つのステップで構成すること
　Step 1 はじめに（導入・身近な例）
　Step 2 しくみの説明
　Step 3 アニメーションで確認しよう
　Step 4 まとめ
　Step 5 もっと調べてみよう（発展）
・各ステップはアコーディオン式（クリックで開閉）
・各ステップに以下のブロックを含めること
　💬 やさしい説明（子どもが読める言葉で。親が読み聞かせしやすい文体）
　🖱️ やってみよう（アニメーションの操作手順）
　💡 ポイント（親御さんへの補足・声かけのヒント）
　❓ いっしょに考えよう（親子で話し合える問いかけ）

---

【デザイン仕様（必ず以下に従うこと）】

▼ カラーパレット
・背景色:           #fff8f0（ウォームクリーム）
・メインテキスト:   #3a2a1a
・サブテキスト:     #7a5a3a
・ページヘッダー:   linear-gradient(135deg, #ff8c42 0%, #ffd166 100%)（オレンジ）
・アクセント①オレンジ: #ff8c42（スライダー・アクティブタブ・ステップ番号）
・アクセント②ブルー:   #4e9af1（やってみようブロック）
・アクセント③グリーン: #52b788（ポイントブロック）
・アクセント④パープル: #9575cd（いっしょに考えようブロック）

▼ フォント
・font-family: 'Hiragino Kaku Gothic ProN', 'ヒラギノ角ゴ ProN W3', Meiryo, メイリオ, sans-serif
・言語：ひらがな・やさしい言葉を使い、{GRADE}でも読める表現にする

▼ ページヘッダー（.page-hd）
・background: linear-gradient(135deg, #ff8c42 0%, #ffd166 100%)
・padding: 24px 24px 22px
・border-radius: 0 0 28px 28px（下だけ丸める）
・学年バッジ: background rgba(255,255,255,0.28)、color #fff、border-radius 20px
・タイトル: color #fff、font-weight 900、text-shadow 0 1px 4px rgba(0,0,0,0.18)

▼ タブボタン（.tab-btn）
・非アクティブ: background rgba(255,255,255,0.85)、border 2px solid #e5d5c0、color #a08060
・アクティブ:   background linear-gradient(135deg,#ff8c42,#ffd166)、border transparent、color #fff
・border-radius: 16px、font-weight bold

▼ Canvas
・border-radius: 20px
・box-shadow: 0 4px 18px rgba(0,0,0,0.14)

▼ コントロールカード（スライダー等）
・background: #fff、border-radius: 18px、box-shadow: 0 2px 10px rgba(0,0,0,0.08)
・時刻/値の表示: font-size 24px、font-weight 900、color #ff8c42
・range スライダー: track は linear-gradient(to right,#ffd166,#ff8c42)、height 8px
・スライダーサム: 26×26px 円、background radial-gradient(circle,#fff 30%,#ff8c42 100%)

▼ 説明テキスト（アニメ連動）
・background: #fff3e0、border-left: 4px solid #ff8c42、border-radius: 0 14px 14px 0
・strong タグ: color #e05a00

▼ 凡例
・background: #fff、border-radius: 16px、box-shadow: 0 2px 8px rgba(0,0,0,0.07)

▼ ポイントカード（3枚）
・background: #fff、border-radius: 18px、border-top: 5px solid（①#ff8c42 ②#4e9af1 ③#52b788）
・box-shadow: 0 2px 10px rgba(0,0,0,0.09)

▼ アコーディオン（.step）
・background: #fff、border-radius: 18px、box-shadow: 0 2px 10px rgba(0,0,0,0.08)
・ステップ番号バッジ: 34×34px 円、background linear-gradient(135deg,#ff8c42,#ffd166)、color #fff
・ホバー: background #fff8f0

▼ 各ブロックの配色
・💬 やさしい説明: background #fff3e0、border-left 3px solid #ff8c42
・🖱️ やってみよう:  background #e3f2fd、border-left 3px solid #4e9af1
・💡 ポイント:      background #e8f5e9、border-left 3px solid #52b788
・❓ いっしょに考えよう: background #f3e5f5、border-left 3px solid #9575cd
・全ブロック共通: border-radius 13px、padding 13px 15px、font-size 13px、line-height 1.8

---

【出力】
・HTMLを1ファイルで出力（CSS・JSはすべてインラインに含める）
・外部ライブラリは使用しない（Vanilla JS + Canvas / SVG のみ）
・コメントは日本語で記述すること
・</body>の直前に必ず以下を含めること：
<script>
  function notifyH(){
    window.parent.postMessage({iframeHeight:document.documentElement.scrollHeight},'*');
  }
  window.addEventListener('load',notifyH);
  window.addEventListener('resize',notifyH);
</script>
