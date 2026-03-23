# Media Canvas | 作品ファインダー用スターター

このリポジトリは静的サイト（Cloudflare Pages想定）です。`public/` 以下がそのまま配信されます。

## 主要ページ
- トップ: `public/index.html` → `/`
- 作品検索: `public/finder/index.html` → `/finder/`
- 作品詳細: `public/work/index.html` → `/work/?slug=...`
- 特集一覧: `public/collections/index.html` → `/collections/`
- 管理画面: `public/admin/index.html` → `/admin/`
- 記事一覧: `public/articles/index.html` → `/articles/`
- 比較記事サンプル: `public/articles/comparison-template/index.html` → `/articles/comparison-template/`
- 記事設計ガイドサンプル: `public/articles/content-planning-checklist/index.html` → `/articles/content-planning-checklist/`
- レビュー記事サンプル: `public/articles/review-structure/index.html` → `/articles/review-structure/`
- 運営者情報: `public/about/index.html` → `/about/`
- お問い合わせ: `public/contact/index.html` → `/contact/`
- プライバシー: `public/privacy.html` → `/privacy.html`
- 免責事項: `public/disclaimer.html` → `/disclaimer.html`

## 共通ファイル
- CSS: `public/style.css`
- JS: `public/site.js`
- 設定: `public/assets/site-config.js`
- 記事メタデータ: `public/assets/articles.js`
- 記事検索ロジック: `public/assets/article-search.js`
- 作品シード: `public/assets/finder-seed.js`
- 作品検索 / 集計ロジック: `public/assets/finder-core.js`
- 状態管理: `public/assets/finder-store.js`
- 公開フロント初期化: `public/assets/finder-public.js`
- 管理画面初期化: `public/assets/finder-admin.js`
- ルーティング: `public/_redirects`
- サイトマップ: `public/sitemap.xml`

## 使い方
- ブランド名、説明文、問い合わせ先を差し替えて公開します。
- 作品データは `public/assets/finder-seed.js` の `works` / `tags` / `collections` / `siteProfiles` を起点に増やします。
- 公開検索では `published` の作品だけが表示され、`draft` / `hold` / `excluded` は管理画面側で保持されます。
- 記事ガイドを増やす場合は、記事ページ本体に加えて `public/assets/articles.js` にメタデータを追加します。
- アフィリエイト導線を設置する場合は、`public/disclaimer.html` と各作品の外部リンク・広告表記を実態に合わせて更新します。

## 補足
- 管理画面は現時点ではブラウザの `localStorage` に保存します。将来的な API / DB 差し替えを前提に、公開ロジックと状態管理を分離しています。
- 旧B2B営業サイト向けの配信停止 Functions と営業導線は削除済みです。
- 現在の内容は「ニッチ条件で探す作品ファインダー」の土台です。
