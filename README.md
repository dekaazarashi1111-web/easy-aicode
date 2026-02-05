# Winter Gator | B2Bアウトバウンド運用代行

このリポジトリは静的サイト（Cloudflare Pages想定）です。`public/` 以下がそのまま配信されます。

## 主要ページ
- トップ: `public/index.html` → `/`
- サービス: `public/outbound/index.html` → `/outbound/`
- 相談: `public/apply/index.html` → `/apply/`
- 運営者情報: `public/about/index.html` → `/about`
- お問い合わせ: `public/contact/index.html` → `/contact`
- プライバシー: `public/privacy.html` → `/privacy.html`

## 共通ファイル
- CSS: `public/style.css`
- JS: `public/site.js`
- 設定: `public/assets/site-config.js`
- ルーティング: `public/_redirects`
- サイトマップ: `public/sitemap.xml`

## 配信停止URL（/unsubscribe/<token>）
このサイトは Cloudflare Pages の Functions を使って、`/unsubscribe/<token>` をメーラー（Flask）の
`/unsubscribe/<token>` にプロキシし、配信停止処理を行います。

- 実装: `functions/unsubscribe/[token].ts`
- Pages 側の環境変数: `MAILER_BACKEND_BASE_URL`
  - 例: `https://<Flaskを公開しているホスト>`
  - 未設定だと 500 になります

補足:
- メール本文に載せるURLのベースは、メーラー側で `UNSUBSCRIBE_BASE_URL=https://wintergator.com` を設定します。
