# Attribution Template — うごくAI教室 3D モデル

このテンプレートをコピーして `attributions/{slug}.md` として保存してください。
**ライセンス表示・出典明記は法的義務**です（CC BY 系・MIT 系含む）。

---

## 基本情報

- **slug**: `(英数字とハイフンのみ。例: tyrannosaurus / solar-system)`
- **title (日本語)**: ``
- **title (English)**: `` (オプション)
- **subject**: `biology` | `chemistry` | `earth-space` | `physics`
- **grade**: `elem-low` | `elem-high` | `middle`
- **対象年齢目安**: 5〜15歳

## 出典情報

- **元データ URL**: ``
- **元データ作者**: ``
- **取得日**: `YYYY-MM-DD`
- **オリジナル形式**: `(GLB / GLTF / OBJ / FBX / STL など)`

## ライセンス

- **ライセンス名**: `(例: CC0 / CC BY 4.0 / CC BY-SA 2.1 JP / Public Domain / Smithsonian Educational Use)`
- **ライセンス URL**: `(例: https://creativecommons.org/licenses/by/4.0/)`
- **クレジット表記方法**: `(例: "Original by John Doe, Smithsonian, CC0")`
- **商用利用可**: `Yes / No`
- **改変可**: `Yes / No`
- **SA（継承）必須**: `Yes / No`

## 加工内容（junli さん作業ログ）

- [ ] スケール調整（高さ ___m に正規化）
- [ ] ポリゴン削減（Decimate Ratio: ___）
- [ ] 不要オブジェクト削除（あれば一覧）
- [ ] マテリアル簡素化
- [ ] アニメーション保持・削除
- [ ] Draco 圧縮済み（compression level: 10）
- [ ] USDZ 版生成（iOS AR 用・Mac で Reality Converter 使用）

## ファイル

- **GLB**: `final/{slug}.glb` （サイズ: ___ MB）
- **USDZ**: `final/{slug}.usdz` （サイズ: ___ MB・iOS のみ）
- **サムネイル**: `final/{slug}-thumb.webp` （800×600）

## Hotspot

- **数**: ___ 個
- **JSON**: `hotspots/{slug}.json`

## 備考

`(編集中に気づいたこと、注意事項、特殊なライセンス条件等を自由に記入)`

---

## ライセンス別 表記例

### Public Domain / CC0
```
出典: NASA / Public Domain
```

### CC BY 4.0
```
"Tyrannosaurus Rex Skeleton" by Smithsonian Institution,
licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
```

### CC BY-SA（継承必須・要注意）
```
"BodyParts3D / Anatomography" by 産業技術総合研究所,
licensed under CC BY-SA 2.1 JP
※ 改変・再配布は同ライセンスでの公開が必須
```

### Smithsonian Educational Use
```
Source: Smithsonian National Museum of Natural History
For educational use under Smithsonian's open access policy
```

---

## 表示先（実装時の参考）

サイト上では以下の場所にクレジットを表示：

1. モデル詳細ページ末尾（`<ModelMetadata />` コンポーネント）
2. 共有 OGP ページ（`/share/[slug]`）末尾
3. 管理画面の編集フォーム（編集者向けメモ）

---

## 関連リソース

- [Creative Commons ライセンス一覧](https://creativecommons.org/about/cclicenses/)
- [Smithsonian Open Access](https://www.si.edu/openaccess)
- [NASA 3D Resources Usage](https://nasa3d.arc.nasa.gov/page/usage)
- [BodyParts3D ライセンス](http://lifesciencedb.jp/bp3d/info/license/index.html)
