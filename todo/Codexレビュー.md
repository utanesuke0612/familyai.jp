# テスト観点
`coderabbit-review` 自体はこのセッションの利用可能スキル一覧に出ていないので、その専用フローをそのまま使うことはできません。ただ、コードレビューとして見られる観点はかなり広いです。

主に次の観点でレビューできます。

1. 正しさ
   仕様逸脱、バグ、例外処理漏れ、境界値、型不整合、データ契約のズレを見ます。

2. 保守性
   責務分離、重複、命名、依存関係、抽象化の過不足、将来の変更コストを見ます。

3. 可読性
   コードの流れが追いやすいか、意図が明確か、コメントや構造が適切かを見ます。

4. 性能・スケーラビリティ
   無駄な再計算、N+1、全件取得、不要なクライアント処理、アクセス増加時の詰まりやすさを見ます。

5. セキュリティ
   認証・認可、CSRF、XSS、入力検証、秘匿情報の扱い、管理機能の防御を見ます。

6. UI操作性
   導線、操作フィードバック、エラー表示、モバイル操作、キーボード操作、アクセシビリティを見ます。

7. 拡張性
   Web だけでなく、将来の iOS/Android 展開や API 再利用、shared 層の健全性を見ます。

8. テスト容易性
   単体テストしやすい設計か、ロジック分離ができているか、壊れやすい箇所にテストがあるかを見ます。

9. 運用性
   ログ、監視しやすさ、失敗時の挙動、管理画面や運用導線の扱いやすさを見ます。

10. フロントエンド品質
   レイアウト崩れ、状態管理、レンダリング負荷、CSS の一貫性、再利用性を見ます。

必要ならレビューの出し方も調整できます。例えば:

- バグ優先で厳しめ
- 可読性と保守性中心
- UI/UX 中心
- iOS/Android 展開を意識した設計中心
- PR レビュー風に優先度付き
- ファイルごとではなく重大事項だけ抽出

必要なら次回はその形式に合わせてレビューします。

# テスト結果

| 優先度 | 観点               | 指摘内容                                                                                                      | 手順書・指示書・設計書とのずれ                                                                                             | コード根拠                                                                                                                                                                                                                                                                                                                                                                                                                               | 影響                                                                                                                |
| --- | ---------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 高   | 拡張性 / shared設計   | `shared` 層の記事契約と実APIの返却形が一致していません。`shared` では `tags`・`readingMin`・`content` 前提ですが、記事詳細APIはDB行に近い形を返しています。 | 手順書では `shared/` を Web/iOS/Android で再利用する前提ですが、そのままでは shared client が破綻します。                                  | [shared/types/index.ts](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/shared/types/index.ts:32>) / [shared/api/index.ts](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/shared/api/index.ts:132>) / [app/api/articles/[slug]/route.ts](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/app/api/articles/[slug]/route.ts:40>)                                                                                                  | 将来の iOS/Android 展開や別クライアント追加時に、型と実データの不整合で再実装が必要になります。                                                            |
| 高   | 仕様準拠 / 機能不足      | 公開記事一覧の `search` が、テスト計画と手順書では存在前提なのに、実装されていません。                                                          | テスト計画では `GET /api/articles?search=...` や `/learn?search=AI` を確認対象にしていますが、公開APIと画面の両方で search パラメータを受けていません。 | [todo/test-plan_v1.md](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/todo/test-plan_v1.md:97>) / [todo/test-plan_v1.md](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/todo/test-plan_v1.md:232>) / [app/api/articles/route.ts](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/app/api/articles/route.ts:69>) / [app/(site)/learn/page.tsx](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/app/(site)/learn/page.tsx:196>) | 仕様差分が残っており、受け入れ確認や将来の検索UX追加時に設計のやり直しが発生します。                                                                       |
| 高   | 運用性 / 設定整合       | OpenRouter のベースURLが手順書では環境変数化されていますが、実装はURLを固定しています。                                                      | 手順書・設計書は `OPENROUTER_BASE_URL` 前提ですが、コードは `https://openrouter.ai/api/v1/chat/completions` を直書きしています。        | [todo/junliToDo_v4.md](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/todo/junliToDo_v4.md:37>) / [todo/system-architecture.md](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/todo/system-architecture.md:20>) / [lib/ai/providers/openrouter.ts](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/lib/ai/providers/openrouter.ts:37>)                                                                                         | 環境差し替えや将来のプロバイダ設定変更に弱く、運用手順がコードに反映されていません。                                                                        |
| 高   | UI品質 / 公開メタデータ   | レイアウトが参照する OGP・PWA 系アセットが `public/` に存在しません。                                                              | 手順書では `og-default.png` などを前提にしていますが、実ファイルがありません。                                                            | [app/layout.tsx](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/app/layout.tsx:50>) / [todo/junliToDo_v4.md](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/todo/junliToDo_v4.md:346>) / [todo/junliToDo_v4.md](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/todo/junliToDo_v4.md:686>)                                                                                                                                     | OGP・アイコン・manifest のリンク切れになり、SNS共有、PWA表示、ブランド整合に影響します。                                                             |
| 中   | スケーラビリティ / 保守性   | 管理画面の記事一覧が全件取得後にクライアント側で検索・並び替えしています。                                                                     | 設計上は API 層があり、実際に管理APIも用意されていますが、UI がそれを使っていません。                                                            | [app/admin/page.tsx](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/app/admin/page.tsx:10>) / [components/admin/AdminArticleTable.tsx](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/components/admin/AdminArticleTable.tsx:28>) / [app/api/admin/articles/route.ts](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/app/api/admin/articles/route.ts:15>)                                                                     | 記事数が増えるほど初期表示と再描画が重くなり、Web 管理画面の運用性が落ちます。                                                                         |
| 中   | API堅牢性           | 管理APIの `sort` が未検証文字列をそのまま union 扱いしています。                                                                 | 手順書は管理機能の安定運用前提ですが、API境界の入力検証が甘いです。                                                                         | [app/api/admin/articles/route.ts](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/app/api/admin/articles/route.ts:21>) / [lib/repositories/articles.ts](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/lib/repositories/articles.ts:234>)                                                                                                                                                                                        | 不正クエリで `orderBy` が不定になり、運用中の不具合解析がしづらくなります。                                                                       |
| 中   | UI操作性 / アクセシビリティ | 管理フォームの入力共通スタイルで `outline: none` を使っており、フォーカス可視性を消しています。                                                  | 指示書はアクセシビリティ重視なのに、管理UIでキーボード操作性が落ちています。                                                                     | [components/admin/ArticleForm.tsx](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/components/admin/ArticleForm.tsx:512>)                                                                                                                                                                                                                                                                                                          | キーボード利用時に現在位置が追いづらく、運用UIとしての操作性が下がります。                                                                            |
| 中   | モバイル操作性          | 管理フォームの Markdown 編集エリアが常に2カラム固定です。                                                                        | モバイル・タブレット優先の思想に対して、狭い画面での編集性が考慮されていません。                                                                    | [components/admin/ArticleForm.tsx](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/components/admin/ArticleForm.tsx:302>)                                                                                                                                                                                                                                                                                                          | ノートPCやタブレットで編集領域が窮屈になり、保守運用の作業効率が落ちます。                                                                            |
| 低   | UIフィードバック        | AIチャットのローディングアニメーション名が CSS 定義と一致していません。                                                                   | 指示書の「操作中の明確なフィードバック」に対して、実装が崩れています。                                                                         | [components/article/AIChatWidget.tsx](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/components/article/AIChatWidget.tsx:103>) / [app/globals.css](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/app/globals.css:209>)                                                                                                                                                                                                         | 軽微ですが、操作中の視覚フィードバックが不安定になります。                                                                                     |
| 低   | 手順書準拠 / モバイルUI   | `CategoryFilter` は手順書では横スクロールチップ列ですが、実装は折り返し `flex-wrap` です。                                              | 手順書の「横スクロール可能なチップ列」と実装が一致していません。                                                                            | [todo/familyai_coding_agent_v5.md](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/todo/familyai_coding_agent_v5.md:2149>) / [components/home/CategoryFilter.tsx](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/components/home/CategoryFilter.tsx:91>)                                                                                                                                                                         | スマホでの一覧性と操作感が仕様想定とずれます。                                                                                           |
| 低   | コメント/実装整合        | レート制限のコメントは「per userId」ですが、実装キーは `identity + ip` です。                                                      | 手順・説明と実装の粒度が一致していません。                                                                                       | [lib/ratelimit.ts](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/lib/ratelimit.ts:9>) / [lib/ratelimit.ts](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/lib/ratelimit.ts:92>)                                                                                                                                                                                                                                                | 仕様理解や将来の運用引き継ぎで誤読の原因になります。                                                                                        |
| 低   | 検証再現性            | 手順書では Vitest PASS 前提ですが、現環境では型チェックとテスト実行を再現できませんでした。                                                      | 手順書の完了状態と、現在の依存関係解決状態が一致していません。                                                                             | [todo/familyai_coding_agent_v5.md](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/todo/familyai_coding_agent_v5.md:5>) / [todo/familyai_coding_agent_v5.md](</C:/Users/jun.li/OneDrive-UiPath/CC/familyai.jp/todo/familyai_coding_agent_v5.md:50>)                                                                                                                                                                                | `npx tsc --noEmit` は `gray-matter` / `vitest` 解決失敗、`npm test -- --run` は `vitest` 実行不可で止まり、レビュー結果の自動検証にギャップがあります。 |

# 更に詳細なテスト結果（参考用）
| 優先度 | 観点 | 詳細な指摘 | 想定される修正方針 |
|---|---|---|---|
| 高 | 拡張性 / shared設計 | `shared` 層の記事型と API の返却契約が一致していません。`shared/types` の `ArticleSummary` / `Article` は `tags`、`readingMin`、`content` を前提にしていますが、記事詳細 API は DB レコード寄りの `body` などを返しています。さらに `shared/api` はその型を信じて `fetchArticle()` を組んでいるため、将来 Web 以外のクライアントが `shared/api` を使い始めた時点で壊れます。現在は Web 側が shared API を全面利用していないため露出していないだけです。根本原因は「DBモデル」「APIレスポンス」「sharedドメイン型」の境界が分かれていないことです。 | `shared/types` を「外部契約の正」として固定し、API 返却時に必ず mapper を通して整形するのが筋です。`lib/repositories` は DB 型、`app/api` は API DTO、`shared/types` は client contract に分離し、`toArticleSummary()` / `toArticleDetail()` のような変換関数を 1 箇所に寄せるべきです。`/api/articles` と `/api/articles/[slug]` の両方で同じ変換を使う形にすると、iOS/Android 追加時も shared contract を流用できます。 |
| 高 | 仕様準拠 / 機能不足 | 手順書・テスト計画では公開記事一覧の `search` が存在する前提ですが、実装上は `/api/articles` も `/learn` 画面も `search` を受けていません。つまり、ドキュメント上は「検索できる」ことになっているのに、コード上はそのユースケース自体が未実装です。これは単なる UI 漏れではなく、API、Repository、画面の全層で search が欠けています。 | まず仕様を確定させるべきです。検索を有効にするなら、`/api/articles` のクエリスキーマに `search` を追加し、Repository 側で `title` / `excerpt` / `body` など対象カラムを明示して検索条件を組みます。画面側では `searchParams` に `search` を通し、入力欄と URL 同期を持たせるべきです。逆に検索を提供しないなら、手順書・テスト計画から `search` を削除する必要があります。今の状態が最も危険です。 |
| 高 | 運用性 / 設定整合 | OpenRouter の設定がドキュメントとコードで食い違っています。手順書では `OPENROUTER_BASE_URL` を環境変数として持つ設計ですが、実装はベース URL をハードコードしています。この状態だと、手順書を見て環境変数を差し替えても挙動が変わらず、運用者が「設定が反映されない」と誤認します。 | `lib/ai/providers/openrouter.ts` で `OPENROUTER_BASE_URL` を参照するよう統一し、未設定時のみ既定値にフォールバックする形に揃えるのが妥当です。併せて、`OPENROUTER_APP_URL` や `OPENROUTER_APP_NAME` を含めた必須/任意の env 一覧を 1 箇所にまとめ、docs とコードの差分をなくすべきです。 |
| 高 | UI品質 / 公開メタデータ | `app/layout.tsx` は OGP 画像、PWA アイコン、manifest を参照していますが、`public/` に対象ファイルがありません。これはビルドエラーにならない一方で、本番で静かにリンク切れになります。SNS シェア時の見え方、ホーム画面追加時のアイコン、manifest 読み込みに影響するため、見た目以上に公開品質へ直結します。 | 最低限、`og-default.png`、`icon-192.png`、`apple-touch-icon.png`、`manifest.json` を `public/` に実配置するべきです。もし未作成のまま進めるなら、`metadata` 参照を一旦外すか、実在するプレースホルダーに寄せるべきです。重要なのは「layout が参照するものは必ず存在する」状態にすることです。 |
| 中 | スケーラビリティ / 保守性 | 管理画面の記事一覧は全件取得してからブラウザ側でフィルタとソートをしています。記事数が少ない間は問題が見えませんが、件数が増えると初期表示、再ソート、検索入力のたびにクライアント負荷が上がります。しかも既に管理 API があるため、実装が二重化しています。運用が拡大するほど「画面が重い」「どこにロジックがあるか分かりづらい」状態になります。 | 管理 UI は `search` / `sort` / `page` を URL か state に持ち、それを管理 API に渡してサーバー側で絞り込む構造に寄せるべきです。クライアント側は表示責務に絞り、全件配列の保持をやめるのがよいです。将来的にはページネーションも API 側主導にして、一覧は「現在ページのみ取得」にしておく方が伸びます。 |
| 中 | API堅牢性 | 管理 API の `sort` はクエリ文字列をそのまま union 扱いしており、実質的に未検証です。TypeScript の型アサーションは実行時バリデーションではないので、未知の値が来た時の安全性を担保できていません。現状は Repository 側で `orderByClause` が `undefined` になる経路があり、障害時の原因が見えづらい実装です。 | `zod` などで `sort` を列挙型として検証し、不正値は明示的に既定値へフォールバックするか 400 を返すべきです。管理 API なので「黙って壊れる」より「入力不正を早く返す」方が保守しやすいです。 |
| 中 | UI操作性 / アクセシビリティ | 管理フォームで `outline: none` を共通入力スタイルに入れているため、キーボード操作時のフォーカス位置が視認しづらくなっています。公開画面だけでなく、管理画面も日常運用で長時間触る UI なので、この種のアクセシビリティ低下はそのまま作業性の低下になります。 | `outline: none` を削除し、必要なら `:focus-visible` で明示的なフォーカスリングを設けるべきです。デザイン上消したい場合でも、代替の視認可能なフォーカス表現を必ず用意するのが必要です。 |
| 中 | モバイル操作性 | 管理フォームの Markdown 編集領域が固定 2 カラムのため、幅が狭い端末や小さめのノート PC で入力・プレビュー双方が窮屈になります。これは公開サイトのモバイル最適化とは別に、運用者向け UI としての実用性の問題です。 | ある幅未満では 1 カラムに落とすレスポンシブ制御を入れるべきです。例えばデスクトップだけ 2 カラム、タブレット以下は縦積みにする構成が自然です。プレビューをトグル式にするのも有効です。 |
| 低 | UIフィードバック | AI チャットのローディングアニメーション名が CSS 定義とずれているため、タイピング中の視覚フィードバックが意図通り動かない可能性があります。小さい差分ですが、チャット UI では「今返答中かどうか」が重要なので、見逃しにくい不整合です。 | JS 側の animation 名を CSS と一致させるか、既存の `.animate-pulse-soft` クラスを使う形に寄せるべきです。インライン style より class ベースに寄せる方が保守しやすいです。 |
| 低 | 手順書準拠 / モバイルUI | `CategoryFilter` は手順書上「横スクロールチップ列」想定ですが、実装は `flex-wrap` で複数行に折り返しています。これは機能不全ではありませんが、設計された操作感と違います。特にモバイルでは横スクロール前提の方が、一覧の縦スペースを節約しやすいです。 | 仕様を守るなら、チップ列を `overflow-x: auto` の横並びにし、折り返しをやめるべきです。もし現実装の方針で行くなら、手順書側を更新して「wrap 方式」に揃える必要があります。 |
| 低 | コメント/実装整合 | レート制限ロジックの説明コメントと実装キーが一致していません。コメントは `per userId` と読めますが、実際は `identity + ip` です。コードの挙動自体より、将来の理解齟齬が問題です。 | コメントを実装に合わせて修正し、identity の意味を `userId` なのか `anonymous/admin key` なのか明示すべきです。設計書にも同じ粒度で記載があると保守しやすくなります。 |
| 低 | 検証再現性 | 手順書ではテスト完了前提ですが、現環境では `npx tsc --noEmit` と `npm test -- --run` を再現できませんでした。これは必ずしもアプリ本体のロジック不具合とは限りませんが、少なくとも「誰でも同じ品質確認ができる状態」ではありません。レビュー観点としては、実装品質より運用再現性の不足です。 | `package.json`、lockfile、依存関係、テスト実行手順を見直し、クリーン環境でも同じコマンドで通る状態に揃えるべきです。特に `vitest` と型依存の解決が一貫しているか確認が必要です。 |

| 補足 | 内容 |
|---|---|
| いま一番優先して揃えるべき点 | `shared` 契約、公開検索仕様、OpenRouter 設定、公開アセットの4点です。これらは「将来拡張」「運用」「仕様整合」に直結します。 |
| 修正の進め方 | 1. まず docs と実装のどちらを正にするか決める 2. 次に API 契約を固定する 3. その後 UI と管理画面を API 主導に寄せる、の順が安全です。 |
| 今回の位置づけ | これは修正ではなくレビュー結果です。コード変更はしていません。 |