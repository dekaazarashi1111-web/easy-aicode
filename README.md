# ケモホモ作品ファインダー用スターター

このリポジトリは静的サイトです。`public/` 以下がそのまま配信されます。

## 方針メモ
- 戦略メモ: `docs/kemohomo-finder-strategy.md`

編集テスト: README の更新を実施しました。

## 主要ページ
- トップ: `public/index.html` → `/`
- 作品検索: `public/finder/index.html` → `/finder/`
- 詳細条件ビルダー: `public/builder/index.html` → `/builder/`
- 作品詳細: `public/work/index.html` → `/work/?slug=...`
- 特集一覧: `public/collections/index.html` → `/collections/`
- 特集詳細: `public/collection/index.html` → `/collection/?slug=...`
- ガイド一覧: `public/articles/index.html` → `/articles/`
- お問い合わせ: `public/contact/index.html` → `/contact/`
- プライバシー: `public/privacy/index.html` → `/privacy`
- 免責事項: `public/disclaimer/index.html` → `/disclaimer`

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

## BOOTH取込
- `node scripts/import_booth_item.js https://booth.pm/ja/items/<item-id>` で、BOOTH の公開商品ページから `title / creator / shortDescription / hoverImageUrl / externalLinks` などを含む `work` JSON を生成できます。
- 現状は静的サイト運用を優先し、生成した内容を `public/assets/finder-seed.js` に反映して公開します。
- 実例として `https://booth.pm/ja/items/2427390` の取り込み結果を seed に追加済みです。

## 作品テキストDB
- `userfile/作品一覧` の手動文字起こしは、公開用 `finder-seed.js` とは別に保持します。
- `node scripts/build_text_work_db.js` で `data/work-library-db.json` を生成できます。
- 生成DBは `sourceDocuments` に生テキスト全文、`works` に抽出済みメタ情報、`creators` / `series` に横断参照を持ちます。
- 詳細設計は `docs/work-library-db.md` を参照してください。

## Windows Chrome 取り込み
- Windows 側で普段使っている Chrome から DMM/FANZA 同人の作品ページを取り込む導線を `tools/dmm-capture/` に追加しています。
- `node tools/dmm-capture/server.js` で WSL 側のローカル inbox サーバーを起動できます。
- Chrome 拡張は `tools/dmm-capture/extension/` を「パッケージ化されていない拡張機能」として読み込みます。
- `127.0.0.1` で届かない環境では、WSL の IP を `Server URL` に指定して保存できます。
- 保存先は `data/dmm-capture-inbox.json` と `data/dmm-capture-items/` です。
- 詳細手順は `docs/windows-dmm-capture.md` を参照してください。

## ライブスクリーンショット
- UI改修の途中確認には `node scripts/capture_local_ui_screenshots.js` を使います。ホーム、検索、詳細条件ビルダー、作品詳細の主要画面をローカルでまとめて撮ります。
- `node scripts/capture_live_screenshots.js` はデフォルトで `quick` モードです。`public/` のHTMLルートと `sitemap.xml` を起点に、主要ページだけを軽く撮ります。
- `node scripts/capture_live_screenshots.js --full` で、描画後DOMの内部リンクも辿る従来どおりの網羅モードを実行できます。
- `quick` は日常の確認向け、`full` は公開前や導線の大きな変更時向けです。
- 出力先は `artifacts/live-screenshots/latest/` です。`manifest.json` にURL一覧、`summary.txt` に結果概要を出します。
- `scripts/verify_linux.sh` / `scripts/verify_wsl.sh` はデフォルトではスクリーンショットを回しません。必要な時だけ `VERIFY_LOCAL_SCREENSHOTS=1`、`VERIFY_LIVE_SCREENSHOTS=quick`、`VERIFY_LIVE_SCREENSHOTS=full` を指定してください。
- 必要に応じて `LIVE_SCREENSHOT_BASE_URL`、`LIVE_SCREENSHOT_MODE`、`LIVE_SCREENSHOT_OUTPUT_DIR`、`LIVE_SCREENSHOT_MAX_PAGES`、`LIVE_SCREENSHOT_BROWSER` を上書きできます。

## 補足
- 現在のシードデータは仮データです。実データ公開前に差し替えてください。
- `sitemap.xml` と `robots.txt` のドメインは仮の `example.com` にしています。公開前に本番ドメインへ更新してください。
