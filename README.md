# ケモホモ作品ファインダー用スターター

このリポジトリは静的サイトです。`public/` 以下がそのまま配信されます。

## 方針メモ
- 戦略メモ: `docs/kemohomo-finder-strategy.md`

## 主要ページ
- トップ: `public/index.html` → `/`
- 作品検索: `public/finder/index.html` → `/finder/`
- 作品詳細: `public/work/index.html` → `/work/?slug=...`
- 特集一覧: `public/collections/index.html` → `/collections/`
- 特集詳細: `public/collection/index.html` → `/collection/?slug=...`
- 管理画面: `public/admin/index.html` → `/admin/`
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
- 管理画面初期化: `public/assets/finder-admin.js`
- ルーティング: `public/_redirects`
- サイトマップ: `public/sitemap.xml`

## 使い方
- サイト名、ドメイン、問い合わせ窓口、DMM/FANZA の実リンクを差し替えて公開します。
- 作品データは `public/assets/finder-seed.js` の `works / tags / collections / siteProfiles` を起点に増やします。
- 公開検索では `published` の作品だけが表示されます。
- 特集は `collections` に追加し、作品詳細と検索導線の両方に接続します。
- 管理画面はブラウザの `localStorage` を使います。将来的な API / DB 差し替えを前提に、公開ロジックと状態管理を分離しています。

## 補足
- 現在のシードデータは仮データです。実データ公開前に差し替えてください。
- `sitemap.xml` と `robots.txt` のドメインは仮の `example.com` にしています。公開前に本番ドメインへ更新してください。
