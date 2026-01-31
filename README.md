# Winter Gator | イチメAI（日本語AIコーディング入門）LP

- Cloudflare Pages の出力は `public/`（Build output directory = `public`）。
- ビルド不要。静的ファイルのみで動作します。
- 全ページ共通の CSS は `public/style.css` を使用します。

## サイト設定
`public/assets/site-config.js` を編集すると主要な設定を一括で変更できます。

- `PRODUCT_NAME_LONG` : 製品正式名
- `PRODUCT_NAME_SHORT` : 製品短縮名
- `PRODUCT_PLATFORM` : 対応OS表記
- `PUBLISHER` : 運営/提供
- `SUPPORT_EMAIL` : サポートメール
- `NOTE_UNOFFICIAL` : 非公式の注意文言
- `NOTE_WINDOWS_BETA` : OS注意文言
- `APP_NAME` : アプリ名（後方互換）
- `PRICE_JPY` : 価格（JPY）
- `BUY_URL` : Stripe Payment Link（購入リンク。未設定時は `/start#buy` を使用）
- `DEMO_URL` : デモURL
- `START_URL` : はじめるページ
- `X_PROFILE_URL` : XプロフィールURL
- `FREE_SLOTS` : 無料枠の先着数
- `DISCOUNT_SLOTS` : 割引枠の先着数

## ブログ
- ブログ一覧は `public/blog/index.html` です。
- 記事は `public/blog/posts/` に HTML を追加します。
- 記事の `post-meta` に `tags` を追加すると、関連記事が更新されます。
- `public/blog/posts.json` / `public/blog/feed.xml` / `public/sitemap.xml` は静的に更新しています。

## SEO / SNS
- OGP用画像: `public/assets/og-default.png`
- ロゴ: `public/assets/logo.png`
- ファビコン: `public/favicon.png`
- `_redirects` に canonical へ統一するためのリダイレクトを設定しています。
- SNSのURLは `public/assets/site-config.js` の設定に合わせて更新します。

## デプロイ
Git に push するだけでデプロイ可能です（ビルド手順なし）。

Pages:
- index.html
- products.html
- start/index.html
- support.html
- thanks.html
- terms.html
- privacy.html
- refund.html
- blog/index.html

## Cloudflare Pages Functions
### Bindings
- KV: `WG_KV`
- R2: `WG_R2`

### Secrets / Variables
- `STRIPE_WEBHOOK_SECRET` (必須)
- `STRIPE_API_KEY` (任意)
- `DOWNLOAD_R2_KEY` (必須: R2内のオブジェクトキー)
- `TOKEN_TTL_SECONDS` (任意: デフォルト 259200)
- `MAX_DOWNLOADS` (任意: デフォルト 3)
- `MAIL_PROVIDER` (任意: `mailchannels` または `resend`)
- `MAIL_API_KEY` (任意)
- `FROM_EMAIL` / `SUPPORT_EMAIL` (任意)

### Stripe 設定
- Webhook エンドポイント: `/api/stripe-webhook`
- Webhook イベント: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
- Payment Link の成功時リダイレクト: `/thanks?session_id={CHECKOUT_SESSION_ID}`

### 動作概要
- Stripe決済完了 → KVにDLトークン保存 → `/dl?token=...` でR2から配布
- `/api/order-status?session_id=...` で準備状況を返す（/thanks から参照）
