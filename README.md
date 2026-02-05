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
配信停止処理を行います。

- 実装: `functions/unsubscribe/[token].ts`
- 推奨（PC不要で常時稼働）:
  - D1 binding: `UNSUB_DB`
  - Pages 側の環境変数: `APP_SECRET_KEY`（メーラーと同じ）
  - この場合、D1 に配信停止（company_id）を記録して完了画面を返します
- 後方互換（従来のプロキシ方式）:
  - Pages 側の環境変数: `MAILER_BACKEND_BASE_URL`
  - 例: `https://<Flaskを公開しているホスト>`
  - D1 未設定時のみ使われます

## 配信停止の同期（ローカル送信用）
ローカルPC側で送信する前に、Pages 側に溜まった配信停止（company_id）をローカルDBへ反映させるため、
管理者用のAPIを用意しています。

- API: `GET /api/unsubscribed`
  - 認証: `Authorization: Bearer <UNSUBSCRIBE_API_TOKEN>`
  - Pages 側の環境変数: `UNSUBSCRIBE_API_TOKEN`（長いランダム値）

補足:
- メール本文に載せるURLのベースは、メーラー側で `UNSUBSCRIBE_BASE_URL=https://wintergator.com` を設定します。
