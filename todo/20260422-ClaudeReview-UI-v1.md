# 20260422 Claude Review — UI / Visual Design v1

> **視点**: frontend-design skill（Typography / Color / Motion / Spatial Composition / Backgrounds / Identity / Density）
> **対象**: `claude/serene-stonebraker-503306` 時点の familyai.jp 全 UI
> **実施**: Claude Opus 4.7 (1M) — 2026-04-22
> **目的**: 別 Agent が "デザイン改修" を実装する際の設計指針。本ドキュメントはコードの保守性ではなく、**審美・識別性・体験の質** を中心に見る。
> **注意**: アクセシビリティ / 構造的バグの指摘は [20260422-ClaudeReview-v1.md](./20260422-ClaudeReview-v1.md) を参照。ここでは扱わない。

---

## 0. 一言総評

> "温かみのある和風 AI メディア" という方向性は出せている。ただし、**「AI = 愛」という強い主題に対して、UI の"愛の表現"が絵文字 💞 と peach 一色に依存しきっている**。Hero の家族カード浮遊は唯一無二だが、そこから先のページはテンプレに近い。全体として *decent* だが *memorable* ではない。

現状を 100 点満点で採点するとおおむね **66 / 100**。強みを殺さず、"あと 4 箇所" だけ強い差別化要素を仕込めば、80 台に乗る位置取り。

---

## 1. 触らない方がよい良質な資産（保全対象）

以下 5 点は **コード変更の際に壊さない** こと。ここが崩れたら familyai.jp らしさは消える。

1. **フォントペア: Zen Maru Gothic × Kaisei Opti**（[app/layout.tsx:7-20](app/layout.tsx), [app/globals.css:106-121](app/globals.css)）
   日本語丸ゴシック × 明朝セリフ display の組み合わせは、この領域の web で珍しい。"やさしさと知性" を 1 ペアで言い切っている。
2. **Hero の浮遊する家族カード演出**（`components/home/HeroSection.tsx:198-261`）
   サービスの主題を 1 秒で伝える、このサイトで最も記憶に残る要素。モーションも含めて現状維持が最良。
3. **役割ベース 5 色パレット**（`tailwind.config.ts:75-104`、`globals.css:37-60`）
   papa/mama/kids/senior の色分化は情報設計の骨格。カラーそのものだけでなく、各色が果たす **意味** を壊さないこと。
4. **`prose-warm` の本文スタイリング**（`globals.css:591-711`）
   line-height 1.85 / max-width 72ch / blockquote / list marker 色まで行き届いた長文装飾。記事詳細ページの価値の大半はここにある。
5. **`prefers-reduced-motion` 対応**（`globals.css:760-768`）
   このレベルで配慮されているサイトは少数。Motion 強化時も必ず reduce-motion で死ぬ設計を維持すること。

---

## 2. デザイン視点の Findings（優先度順）

### [D-HIGH-1] 「愛のメタファー」が記号（💞）止まりで UI に染みていない
- **観点**: Identity / Differentiation
- **現状根拠**:
  - `HeroSection.tsx:198-261` の center card が 💞 絵文字
  - それ以外のページ（Learn / About / 記事詳細）には "家族らしさ・手触りの温度" を表すモチーフがほぼ無い
  - 装飾要素は blob (`globals.css:372-390`) のみで、**家族・愛・関係性を示す要素ゼロ**
- **問題**: トップだけ尖っていて、下層に降りた瞬間テンプレに戻る "Hero Trap"。回遊時の識別性が落ちる。
- **提案**:
  - "手書きのハート線画" や "親子の手のシルエット" 等の **SVG line illustration** を 1 セット作成し、Learn 一覧ヘッダ / About / 記事末尾 / footer に 1 つずつ配置。
  - カードや section の区切りに、**連続する点線の道**（家族の成長を示唆するライン）をモチーフとして入れる。
  - 絵文字依存（💞 / 🤗）を段階的に SVG に置換。
- **期待効果**: 「UI を見た瞬間に familyai だと分かる」状態を Hero 以外でも実現。

---

### [D-HIGH-2] noise / grain が薄すぎて "無" に等しい
- **観点**: Backgrounds & Visual Details
- **現状根拠**: `globals.css:354-368` noise-bg ::before `opacity: 0.035`
- **問題**:
  - opacity 0.035 は目視でほぼ判別不能。**「テクスチャを入れた感」だけが残り、実体として効いていない**。
  - 結果、全体は flat デジタル印象になり、せっかくの "organic warm" 方向性が弱まる。
- **提案**:
  - セクション粒度でテクスチャを切り分ける：
    - 背景 base: `opacity 0.05–0.08` の grain
    - Hero / CTA: `opacity 0.10–0.12` の粗めの paper noise
    - 記事本文: 極薄 `opacity 0.025` のまま（可読性優先）
  - noise を SVG fractal ではなく、**紙繊維のテクスチャ PNG**（`public/textures/paper.png` 等）に置換する選択肢も検討。"Organic" の核は "紙とインク" の連想。
- **期待効果**: flat AI サイトからの脱却。手触りの差別化。

---

### [D-HIGH-3] Hero の radial-gradient が "AI ダッシュボードあるある" の配色
- **観点**: Backgrounds / Color
- **現状根拠**: `globals.css:746-752` hero-bg が 4 つの radial-gradient を重ねる実装。角度は `20% 40%`, `80% 70%` など固定で、色は peach / sky / mint。
- **問題**:
  - この配色・配置は、**2024–2025 の AI 系 SaaS LP テンプレで氾濫している表現**。"orange + pastel + radial blur" は AI 生成デザインの代表格。
  - familyai.jp のブランドである "暖かさ・和" とは、実は少しズレている（洋テックの雰囲気に寄る）。
- **提案**:
  - Hero 背景を **和紙グラデーション**（off-white → 薄い生成 → cream）＋ **墨色インク滲みの SVG** 1〜2 点に置換。
  - アクセントの orange は gradient ではなく **印鑑風の円形スタンプ** で 1 箇所だけ置く。「1 点豪華主義」に寄せると記憶に残る。
- **期待効果**: SaaS LP との差別化、和の温度の強化。

---

### [D-HIGH-4] Hero 以外のページが「カードグリッドの反復」で終わっている
- **観点**: Spatial Composition
- **現状根拠**:
  - 一覧: `app/(site)/learn/page.tsx` 4-column grid
  - トップ下段: 同様の card grid
  - 関連記事: 同じパターン
- **問題**:
  - 2-col / 4-col / 5-col の対称グリッドだけで構成されており、**asymmetry / overlap / diagonal** が皆無。
  - 結果、ページをスクロールしても視線の緩急がなく、平坦。
- **提案**:
  - **1 ページに 1 箇所だけ非対称セクション** を仕込む。例:
    - Learn 一覧: 「最新 1 本」を大判 feature で左に寄せ、右に 4 小カードを 2x2 で入れるマガジンレイアウト
    - 記事詳細末尾: 関連記事を **階段状オフセット**（1 つ目が左、2 つ目が右 24px ずれ、3 つ目が左 48px…）
    - About: タイムライン風の左右振り分け
  - グリッドを崩すのは 1 ページ 1 箇所までがコツ。増やすと騒がしくなる。
- **期待効果**: 「編集された誌面」感。メディアらしさ。

---

### [D-HIGH-5] 見出し階層の Serif 一律使用が H4〜H6 で裏目
- **観点**: Typography
- **現状根拠**: `globals.css:106-121` で `h1–h6` 全てに `var(--font-display)` (Kaisei Opti) 適用
- **問題**:
  - H4 以下の小さい文字で明朝セリフは **輪郭が弱く読みにくい**（とくに CJK フォントの明朝は小サイズで潰れる）。
  - 管理画面やフォームの小見出しで `Kaisei Opti` が使われると "繊細すぎて情報が入ってこない"。
- **提案**:
  - H1 / H2: Kaisei Opti（display・印象重視）
  - H3: Kaisei Opti + weight 700（中間域）
  - H4–H6: **Zen Maru Gothic の Bold**（body と同じファミリーで重さだけ変える）
  - 記事本文内の H2 / H3 のみ Kaisei Opti、UI の小見出しはゴシックに。
- **期待効果**: 可読性向上 + 「本文で Serif が出る場所 = 読み物」という文脈化。

---

### [D-MED-6] グラデーションの語彙が orange→peach 1 種のみで単調
- **観点**: Color
- **現状根拠**: `globals.css:739` の warm gradient 定義が 1 本
- **提案**: セマンティックに 3 本用意する
  1. `--gradient-warm`（現行の orange→peach）= CTA / 強調
  2. `--gradient-dawn`（cream → peach-light → sky）= Hero / 癒し
  3. `--gradient-hearth`（brown-light → beige → cream）= footer / 記事末尾・落ち着き
- **期待効果**: 同じ palette から「時間帯」「温度」の語彙を生む。

---

### [D-MED-7] Motion の bounce easing と blob animation の同時多発が "落ち着きのなさ" を生む
- **観点**: Motion
- **現状根拠**:
  - `globals.css:491-493` btn-primary bounce: `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoot 強め
  - `globals.css:372-390` blob animation は 6–10s と長く、複数が常時動く
  - Hero と一覧で同時にアニメ要素が並ぶ
- **問題**: 家族メディアの "落ち着き" と逆行。情報摂取の邪魔。
- **提案**:
  - bounce は **"初回表示のみ"** に限定（`animation-fill-mode: forwards` で 1 回限り）。hover では easing を `cubic-bezier(0.22, 1, 0.36, 1)` 等の緩やかな出戻りに変更。
  - blob は Hero と About のみに限定。一覧・記事詳細では止める。
  - ページ遷移時は `IntersectionObserver` で **スクロール進入時に一度だけ fade+up** する方式に寄せる。
- **期待効果**: "穏やかなのに生きている" 感。

---

### [D-MED-8] `ArticleCard` の hover 挙動が JS で style 直書き
- **観点**: Motion / Maintainability
- **現状根拠**: `components/article/ArticleCard.tsx:87-98` で `onMouseEnter` / `onMouseLeave` に `el.style.transform = ...` を直接代入
- **問題**:
  - CSS `:hover` で書けば reduce-motion で自動で止まるが、JS 直書きは media query を迂回（[20260422-ClaudeReview-v1.md#MEDIUM-13](./20260422-ClaudeReview-v1.md) と重複指摘）。
  - デザイン的にも「card の浮き上がり」は **CSS transition + `:hover` で完結させる** のが王道。
- **提案**: hover スタイルを className ベースに戻す（Tailwind の `hover:-translate-y-1 hover:shadow-warm-lg`）。`@media (prefers-reduced-motion: reduce)` で transform を殺す 1 行を追加。
- **期待効果**: コード簡潔化 + A11y 保護 + 再利用性。

---

### [D-MED-9] 管理画面が "design system の外"
- **観点**: Identity / Density
- **現状根拠**: `components/admin/ArticleForm.tsx`, `AdminArticleTable.tsx` に inline `style={{}}` と gray palette が多用。ブランドの warm palette が適用されていない。
- **問題**:
  - 「公開画面と管理画面で別サイトに見える」。運営者の体験が雑。
  - gray 一色で情報密度だけ高く、疲れる UI。
- **提案**:
  - 管理画面専用のサブトーン（`--color-ink-slate` = #3A3A3A, `--color-paper` = #F7F5F1）を 2 色だけ追加し、**warm palette の低彩度版** として運用。
  - フォームの label / border / focus ring は brown-light ベースに統一。
  - table は `tabular-nums` + zebra（極薄 beige）でデータ可読性を上げる。
- **期待効果**: オーナー体験の質 UP、一貫性。

---

### [D-MED-10] 数字・統計の `tabular-nums` 未指定
- **観点**: Typography / Density
- **現状根拠**: `AdminArticleTable.tsx` の件数表示、pagination、`/about` の統計っぽい数字などに `font-variant-numeric: tabular-nums` 指定なし
- **提案**: `globals.css` に utility 追加
  ```css
  .num, table td.num, [data-variant="num"] { font-variant-numeric: tabular-nums; }
  ```
  管理画面のカウント・ページャ・再生数表示などに適用。
- **期待効果**: 数字の桁揃い。プロダクト感。

---

### [D-LOW-11] Dark mode の扉が開いているのに中身が無い
- **観点**: Color / Future-proofing
- **現状根拠**: `tailwind.config.ts:13` で `darkMode: ['class']` 宣言済みだが `.dark` スタイル未実装
- **提案**:
  - 今フェーズで全面実装は不要だが、**最低限 `@media (prefers-color-scheme: dark)` で背景が白基調のまま眩しすぎる状態を防ぐ** 薄い対応を入れる。
  - あるいは宣言そのものを削除して「対応していない」ことを明示。中途半端な宣言が一番悪い。
- **期待効果**: 方針の明確化。

---

### [D-LOW-12] Focus ring のブランド色適用が徹底されていない
- **観点**: Focus / Identity（A11y ではなくアイデンティティ側の論点）
- **現状根拠**: `globals.css:129-133` で `:focus-visible { outline: 2px solid orange }` が global 定義、ただし `components/learn/LearnSearchBar.tsx:77` で `focus-visible:ring-2` のみで色未指定
- **提案**: Tailwind の `focus-visible:ring-[var(--color-orange)]` or 独自クラス `.focus-brand` を用意して全コンポーネント横断で採用。focus そのものを **ブランドの一部** として扱う。
- **期待効果**: キーボード操作時にまでブランドが出る。

---

## 3. 「記憶に残る one thing」候補 — 差別化の突き抜け所

現状、突き抜けポイントは **Hero の浮遊家族カード** 1 点のみ。ここにもう 1 点、**全ページ共通で効く** モチーフを仕込むと強い。

提案 3 案（どれか 1 つ採用推奨）:

### 案 A: "家族の時間" インタラクティブ時計
記事詳細の sticky 右カラム or footer に、**朝（🌅）・昼・夕・夜** で背景トーンが自動変化する小さな時計 UI を常設。閲覧時刻で paper の色が微妙に変わる（夕方は warmer、深夜はより落ち着いた beige）。"家族の日常に寄り添う" メタファーが UI 化される。

### 案 B: スクロール連動の「成長する植物」デコレーション
ページ左端や余白に、スクロールとともに **線画の植物が伸びていく SVG アニメーション**。About / 記事詳細 / Learn トップで伸び方の種類を変える。成長・育児の連想。

### 案 C: "愛の印鑑" フッターシール
全ページフッター直上に、**朱色の丸印鑑風マーク**（「愛」1 文字）を常設。筆文字 SVG で軽微に回転しながら fade-in。和のアイデンティティ＋ブランド tagline を 1 点で連結。

**推奨: 案 C**（実装コスト最小 × 識別性最大 × ブランド主題との合致度最大）

---

## 4. スコア内訳

| 観点 | スコア | コメント |
|---|---|---|
| Typography | 72/100 | フォントペアは強い。ただし H4–H6 の serif 一律は減点。 |
| Color & Theme | 68/100 | palette 定義は丁寧だが gradient 語彙 1 本のみ。dark mode 中途半端。 |
| Motion | 65/100 | CSS-only + reduce-motion は ◎。bounce + blob 同時多発で騒がしい。 |
| Spatial Composition | 58/100 | 対称グリッド反復。Hero 以外が "テンプレ" に見える最大要因。 |
| Backgrounds & Details | 55/100 | noise opacity 0.035 は実質 flat。hero-bg は SaaS LP 調。 |
| Identity / Differentiation | 62/100 | Hero で立てた個性が下層で薄れる。"愛" の UI 表現は絵文字依存。 |
| Density / Hierarchy | 74/100 | prose-warm の読み物設計は優秀。admin だけ落差が大きい。 |
| **総合** | **66/100** | *Decent but not memorable.* |

---

## 5. 推奨実施順序（PR 分割案）

別 Agent がデザイン改修を行う際の推奨順。[20260422-ClaudeReview-v1.md](./20260422-ClaudeReview-v1.md) の backend PR とは独立に進行できる。

| PR | 内容 | Findings |
|---|---|---|
| **UI-PR-1**（識別性の核） | "愛の印鑑" 型シール + 共通モチーフ SVG セット導入 | 案 C, D-HIGH-1 |
| **UI-PR-2**（背景の強化） | noise 濃度見直し、Hero 背景の和紙グラデ化 | D-HIGH-2, D-HIGH-3 |
| **UI-PR-3**（レイアウト） | 1 ページ 1 箇所の非対称セクション導入 | D-HIGH-4 |
| **UI-PR-4**（タイポ分業） | H4–H6 を Zen Maru Gothic Bold に切替 + tabular-nums 追加 | D-HIGH-5, D-MED-10 |
| **UI-PR-5**（Motion 整理） | bounce 初回限定化、blob の適用範囲絞り、ArticleCard hover を CSS 化 | D-MED-7, D-MED-8 |
| **UI-PR-6**（admin 統合） | 管理画面に warm palette の低彩度版を適用 | D-MED-9 |
| **UI-PR-7**（カラー拡張） | gradient 語彙を 3 本に拡張 | D-MED-6 |
| **UI-PR-8**（清算） | dark mode 宣言の扱い決定、focus ring のブランド色統一 | D-LOW-11, D-LOW-12 |

各 PR は独立して差し戻し可能なサイズに留めること。とくに UI-PR-1〜3 は **"触った瞬間にサイトの印象が変わる"** レイヤなので、プレビュー前後のスクショ比較を必ず添付。

---

## 6. 改修担当 Agent への注意書き

- **「洗練された最小主義」か「大胆な最大主義」かの選択を迫られたら、最小主義を選ぶこと**。familyai は家族メディアであり、派手さよりも "落ち着き＋1 点の華" が合う。
- noise / grain / motion を強めるときは、**必ず `prefers-reduced-motion` と `max-width` 環境でも崩れない** ことを preview ツールで確認。
- 装飾モチーフを増やすときは、**既存の blob / 💞 / orange アクセントのどれかを同時に減らす**。足し算だけで進めると破綻する。
- 管理画面に warm palette を入れる際、**既存の form label との視認性**（brown-light on cream の 4.71:1 限界）を下回らないよう慎重に。
- Hero の浮遊家族カードは **絶対に "改善" しないこと**。replacement 提案が来ても pushback。
- `public/textures/`, `public/illustrations/` を新設する場合、SVG は `<title>` と `aria-hidden` を適切に使い分け（装飾 = hidden、意味あり = title）。
- 参考にする外部サイトの "直模倣" は避ける。note / cakes / HELLO! 的な和メディア調を **翻案** する方向で。

---

**最終確認**: 本 UI レビューは [20260422-ClaudeReview-v1.md](./20260422-ClaudeReview-v1.md) と相補関係。Backend / A11y / Security の論点はそちらを正とする。両文書の指摘が衝突した場合は、**A11y を最優先**、次にセキュリティ、最後にデザイン。デザインの華やかさが A11y を損なうことは許容しない。
