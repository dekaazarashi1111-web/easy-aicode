# ケモホモ作品ファインダー用スターター

このリポジトリは静的サイトです。`public/` 以下がそのまま配信されます。

## 方針メモ
- 戦略メモ: `docs/kemohomo-finder-strategy.md`

## 主要ページ
- トップ: `public/index.html` → `/`
- 作品検索: `public/finder/index.html` → `/finder/`
- 詳細条件ビルダー: `public/builder/index.html` → `/builder/`
- 作品詳細: `public/work/index.html` → `/work/?slug=...`
- 特集一覧: `public/collections/index.html` → `/collections/`
- 特集詳細: `public/collection/index.html` → `/collection/?slug=...`
- ガイド一覧: `public/articles/index.html` → `/articles/`
- 運営方針: `public/about/index.html` → `/about/`
- お問い合わせ: `public/contact/index.html` → `/contact/`
- プライバシー: `public/privacy.html` → `/privacy.html`
- 免責事項: `public/disclaimer.html` → `/disclaimer.html`

## 共通ファイル
- CSS: `public/style.css`
- 共通 JS: `public/site.js`
- ブランド設定: `public/assets/site-config.js`
- 作品シード: `public/assets/finder-seed.js`
- 検索 / 集計ロジック: `public/assets/finder-core.js`
- 状態管理: `public/assets/finder-store.js`
- 公開フロント初期化: `public/assets/finder-public.js`
- ルーティング: `public/_redirects`
- サイトマップ: `public/sitemap.xml`

## 使い方
- サイト名、ドメイン、問い合わせ窓口、DMM/FANZA の実リンクを差し替えて公開します。
- 作品データは `public/assets/finder-seed.js` の `works / tags / collections / siteProfiles` を起点に増やします。
- ガイド記事を追加する時は、`public/assets/articles.js` に 1 件追加し、対応ページを `public/articles/<slug>/index.html` として作成します。
- 公開検索では `published` の作品だけが表示されます。
- 特集は `collections` に追加し、作品詳細と検索導線の両方に接続します。

## ライブスクリーンショット
- UI改修の途中確認には `node scripts/capture_local_ui_screenshots.js` を使います。ホーム、検索、詳細条件ビルダー、作品詳細の主要画面をローカルでまとめて撮ります。
- `node scripts/capture_live_screenshots.js` で `https://wintergator.com/` の全ページスクリーンショットを取得します。
- 対象URLは `public/` のHTMLルート、ライブの `sitemap.xml`、描画後DOMの内部リンクを合算して動的に列挙します。
- 出力先は `artifacts/live-screenshots/latest/` です。`manifest.json` にURL一覧、`summary.txt` に結果概要を出します。
- `scripts/verify_linux.sh` / `scripts/verify_wsl.sh` / `scripts/verify_windows.ps1` からも毎回この処理を実行します。
- 必要に応じて `LIVE_SCREENSHOT_BASE_URL`、`LIVE_SCREENSHOT_OUTPUT_DIR`、`LIVE_SCREENSHOT_MAX_PAGES`、`LIVE_SCREENSHOT_BROWSER` を上書きできます。

## 補足
- 現在のシードデータは仮データです。実データ公開前に差し替えてください。
- `sitemap.xml` と `robots.txt` のドメインは仮の `example.com` にしています。公開前に本番ドメインへ更新してください。
