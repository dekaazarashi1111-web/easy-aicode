# Media Canvas | 記事メディア用スターター

このリポジトリは静的サイト（Cloudflare Pages想定）です。`public/` 以下がそのまま配信されます。

## 主要ページ
- トップ: `public/index.html` → `/`
- 記事一覧: `public/articles/index.html` → `/articles/`
- 比較記事サンプル: `public/articles/comparison-template/index.html` → `/articles/comparison-template/`
- レビュー記事サンプル: `public/articles/review-structure/index.html` → `/articles/review-structure/`
- 運営者情報: `public/about/index.html` → `/about/`
- お問い合わせ: `public/contact/index.html` → `/contact/`
- プライバシー: `public/privacy.html` → `/privacy.html`
- 免責事項: `public/disclaimer.html` → `/disclaimer.html`

## 共通ファイル
- CSS: `public/style.css`
- JS: `public/site.js`
- 設定: `public/assets/site-config.js`
- ルーティング: `public/_redirects`
- サイトマップ: `public/sitemap.xml`

## 使い方
- ブランド名、説明文、問い合わせ先を差し替えて公開します。
- 記事サンプルを実案件の記事に置き換えて運用します。
- アフィリエイト導線を設置する場合は、`public/disclaimer.html` と各記事の広告表記を実態に合わせて更新します。

## 補足
- 旧B2B営業サイト向けの配信停止 Functions と営業導線は削除済みです。
- 現在の内容は「入れ物」としての汎用スターターです。
