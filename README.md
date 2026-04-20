# familyai.jp

家族みんなのAI活用ガイドサイト（Next.js 14 App Router / Drizzle ORM / NextAuth v5）。

詳細なアーキテクチャと開発手順は [`todo/system-architecture.md`](./todo/system-architecture.md)・
[`todo/familyai_coding_agent_v5.md`](./todo/familyai_coding_agent_v5.md) を参照してください。

## 開発環境セットアップ

```bash
pnpm install
pnpm dev       # http://localhost:3000
```

### スクリプト

| コマンド | 用途 |
|---|---|
| `pnpm dev` | 開発サーバ |
| `pnpm build` | 本番ビルド |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest（ユニットテスト） |
| `pnpm test:smoke` | curl ベースのスモークテスト |
| `pnpm exec tsc --noEmit` | 型チェック |

### 🪟 Windows 開発者向け注意（Rev27 #4）

**OneDrive 同期フォルダ配下では `pnpm install` が失敗する場合があります。**

症状:

- `gray-matter` / `vitest` など pnpm の symlink ベース依存解決が失敗する
- `npx tsc --noEmit` が型解決エラーで止まる
- Vitest が起動しない／モジュールが見つからないエラー

原因:

- OneDrive の on-demand sync が `node_modules` 内のシンボリックリンクを一時ファイル化する
- Windows の長パス制限（260 文字）にも抵触する

対応:

```text
# NG: OneDrive 配下
C:\Users\<user>\OneDrive-Company\projects\familyai.jp

# OK: OneDrive の外
C:\dev\familyai.jp
```

`C:\dev` などに clone し直してから `pnpm install` してください。
macOS 環境および GitHub Actions (Ubuntu) では正常動作するため、Windows + OneDrive 固有の問題です。
