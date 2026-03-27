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
- ローカルUI確認、`node scripts/capture_local_ui_screenshots.js`、`127.0.0.1` やローカル配信URLでの見た目確認は禁止です。見え方が実URLと違う時点でノイズとして扱い、確認対象にしません。
- 通常作業の live 確認は `node scripts/capture_live_screenshots.js --quick --target <path>` を原則とし、その作業で触ったページ、今まさに見たいページ、今回確認したい query 付き詳細ページだけを動的に選んで撮影します。`--target` は複数回指定でき、例として `node scripts/capture_live_screenshots.js --quick --target /articles/article-layout-test/ --target '/work/?slug=pocket-shift-memo'` の形で使います。
- 画面確認は常に `https://wintergator.com/` の実URLだけを対象にします。ローカル環境、簡易サーバー、未公開URLは通常確認フローに入れません。
- 各作業の完了前と GitHub 同期前には、まず上記の targeted live スクリーンショットで、今回触ったページの `https://wintergator.com/` 実URL確認を行います。
- GitHub 同期後にも、同じ `--target` 群で `node scripts/capture_live_screenshots.js --quick ...` を再実行し、実URLで反映結果を確認します。
- 導線を広く触った作業、どこまで影響したか読み切れない作業、公開前の総点検でのみ、`node scripts/capture_live_screenshots.js --full` を実行し、`public/` のHTMLルート、`https://wintergator.com/sitemap.xml`、ライブ描画後DOMの内部リンクまで含めた網羅巡回を行います。
- スクリーンショットの出力先は `artifacts/live-screenshots/latest/` とし、取得失敗を残したまま完了扱いにしません。
- スクリーンショット取得は確認工程であり、取得しただけでは完了扱いにしません。問題が残っている限り、修正、GitHub 同期、`https://wintergator.com/` の実URL確認を必要な回数だけ繰り返して調整します。
- ユーザーから停止指示がない限り、作業完了ごとに変更を GitHub へ同期します。
- GitHub 同期が必要な作業では、コミット後に `origin/main` へ push して反映状態を確認します。
