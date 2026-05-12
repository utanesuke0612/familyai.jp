
---

## 📋 引き継ぎ用サマリー

### 🎯 目的

`/admin/3d-models/new` で **5〜7MB の GLB ファイル**を Vercel Blob にアップロードしたい。

### 🔧 技術スタック

- Next.js 14.2.35
- `@vercel/blob: ^2.3.3`（`client.upload()` パターン）
- 環境: localhost 開発
- `BLOB_READ_WRITE_TOKEN` は `.env.local` に設定済み（`vercel_blob_rw_wBUrWyov...`）

### 🐛 症状

1. `POST /api/admin/3d-models/upload-token` → **200 OK**（token 生成成功）
2. `OPTIONS https://vercel.com/api/blob/?pathname=tutor3d%2F<slug>-<hash>.glb` → **200 OK**（CORS 通過）
3. `PUT https://vercel.com/api/blob/?pathname=...` → **400 Bad Request × 3 回リトライ**
    - Response body: Content-Length 134（中身は確認不能）
    - Authorization: `Bearer vercel_blob_client_...`
    - `X-Api-Blob-Request-Attempt: 3`

### ✋ 試したが効果なし

- ✅ `requireAdmin / verifyCsrf` を `blob.upload-completed` フェーズでスキップ
- ✅ Content-Type を `model/gltf-binary` で明示
- ✅ `onUploadCompleted` を削除（localhost で callbackUrl 解決不可問題）
- ✅ `multipart: false` を強制（直前の commit `fab7be6`）

### 🔍 関連ファイル

- `app/api/admin/3d-models/upload-token/route.ts`（サーバ側 handleUpload）
- `components/admin/3d-models/BlobUploadInput.tsx`（クライアント側 upload()）
- `lib/schemas/3d-models.ts`（assetUrlSchema：allowlist で Vercel Blob のみ許可）

### 🤔 まだ検証していない仮説

1. **`BLOB_READ_WRITE_TOKEN` の権限/スコープ問題** — 別 Blob ストアを参照していて書き込み権限なし
2. **`@vercel/blob@2.3.3` 自体のバグ** — v2.0.x にダウングレードで動くか
3. **Vercel Blob のリージョン制約** — token のリージョンとリクエストのリージョン不一致
4. **token の `allowedContentTypes` 配列指定が v2.3.3 で壊れている** — `undefined` にすれば動くか
5. **`pathname` に `/` 含むパスが v2.3.3 で問題** — `tutor3d-{slug}-{hash}.glb`（フラット）にすれば動くか
6. **curl で同じ token を使った PUT を叩く** — クライアント側問題かサーバ側問題か切り分け
7. **PUT の Response 本文を読む方法**（Chrome では空表示）— curl で再現 / Network タブの "Raw" ボタン

### 📦 最新コミット

```
fab7be6 fix(rev36/admin): GLB アップロードを単一 PUT に強制
ab424b2 fix(rev36/admin): upload-token から onUploadCompleted を削除
f210924 fix(rev36/admin): GLB アップロード 400 Bad Request — Content-Type を強制セット
df8a65d fix(rev36/admin): upload-token endpoint で完了通知時の認証チェックをスキップ
```

---

## 🙏 すみません

3 回直して全部外したので、私の仮説の立て方が良くなかったです。**Response 本文の中身**さえ読めれば即解決の問題ですが、Chrome が表示してくれないので原因が確定できませんでした。

別 Agent には「**まず curl で同じ POST → PUT を再現して response body を見てください**」と最初に伝えるのが一番速いと思います。

引き継ぎ後に何か分かったら、内容を共有してもらえれば**残りの Admin 実装（段階 D HotspotEditor、段階 F 仕上げ）**は私が引き取って完成させます。