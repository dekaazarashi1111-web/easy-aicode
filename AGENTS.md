# AGENTS.md — 作品ファインダー用スターター運用メモ

このワークスペースは、ニッチ条件で探せる作品ファインダー / 発見サイト用の静的スターターを編集するための作業場所です。
`public/` がそのまま配信されます。

## 主要ページ
- `/` : `public/index.html`
- `/finder/` : `public/finder/index.html`
- `/builder/` : `public/builder/index.html`
- `/work/` : `public/work/index.html`
- `/collections/` : `public/collections/index.html`
- `/collection/` : `public/collection/index.html`
- `/articles/` : `public/articles/index.html`
- `/articles/comparison-template/` : `public/articles/comparison-template/index.html`
- `/articles/content-planning-checklist/` : `public/articles/content-planning-checklist/index.html`
- `/articles/review-structure/` : `public/articles/review-structure/index.html`
- `/about/` : `public/about/index.html`
- `/contact/` : `public/contact/index.html`
- `/privacy.html` : `public/privacy.html`
- `/disclaimer.html` : `public/disclaimer.html`

## 反映ポイント
- ルーティング: `public/_redirects`
- サイトマップ: `public/sitemap.xml`

## 方針
- すべて日本語で記述します。
- ケモホモ作品ファインダーとしての方針メモは `docs/kemohomo-finder-strategy.md` を参照します。
- 文言は汎用的な土台として保ち、公開前にブランド名・問い合わせ先・提携先・ポリシーを差し替えやすい状態を優先します。
- 公開フロントは、作品 / タグ / コレクション / サイトプロファイル / ログの共通データ構造を意識して編集します。
- 記事追加は UI では行わず、`public/assets/articles.js` に一覧データを追加し、対応する記事HTMLを `public/articles/<slug>/index.html` として増やします。
- UI を大きく触る作業では、完了時だけでなく各 major pass の途中でも `node scripts/capture_local_ui_screenshots.js` を実行し、ローカル描画を見てから次の修正へ進みます。
- 各作業の完了前と GitHub 同期前に、`node scripts/capture_live_screenshots.js` を実行して `https://wintergator.com/` の全ページスクリーンショットを更新します。
- スクリーンショット対象URLは `public/` のHTMLルート、`https://wintergator.com/sitemap.xml`、ライブ描画後DOMの内部リンクから動的に列挙し、今後追加されたページも自動で含めます。
- ローカルUIスクリーンショットは `scripts/capture_local_ui_screenshots.js` を使い、ホーム・検索・ビルダー・詳細の主要画面を最低限毎回確認します。
- スクリーンショットの出力先は `artifacts/live-screenshots/latest/` とし、取得失敗を残したまま完了扱いにしません。
- ユーザーから停止指示がない限り、作業完了ごとに変更を GitHub へ同期します。
- GitHub 同期が必要な作業では、コミット後に `origin/main` へ push して反映状態を確認します。
