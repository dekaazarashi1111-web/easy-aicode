# Winter Gator | Gator Companion LP

- Cloudflare Pages の出力は `public/`（Build output directory = `public`）。
- ビルド不要。静的ファイルのみで動作します。
- 全ページ共通の CSS は `public/style.css` を使用します。

## サイト設定
`public/assets/site-config.js` を編集すると主要な設定を一括で変更できます。

- `APP_NAME` : アプリ名
- `PRICE_JPY` : 価格（JPY）
- `BUY_URL` : Stripe Payment Link（購入リンク。未設定時は `/start#buy` を使用）
- `SUPPORT_EMAIL` : サポートメール
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
