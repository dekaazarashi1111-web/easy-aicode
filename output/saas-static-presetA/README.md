# Winter Gator | SaaS Static Preset A

- Cloudflare Pages の出力は `public/`（Build output directory = `public`）。
- ビルド不要。静的ファイルのみで動作します。
- 全ページ共通の CSS は `public/style.css` を使用します。

## Stripe リンク設定
`public/site.js` の `STRIPE_URL` を実際の Stripe Payment Link に置き換えるだけで反映されます。

## ブログ
- ブログ一覧は `public/blog/index.html` です。
- 記事は `public/blog/posts/` に HTML を追加します。
- 記事の `post-meta` に `tags` を追加すると、関連記事が自動で更新されます。
- ブログハブのタグ一覧・件数も自動更新されます。
- 記事一覧の反映には `scripts/build_blog_index.py` を実行します。
- `scripts/build_blog_index.py` は以下も生成します:
  - `public/blog/posts.json`
  - `public/blog/feed.xml`
  - `public/sitemap.xml`
  - `public/robots.txt`
- 本番URLが異なる場合は `SITE_URL` 環境変数で上書きできます。
  - 例: `SITE_URL=https://example.com scripts/build_blog_index.py`

## SEO / SNS
- OGP用画像: `public/assets/og-default.png`
- ロゴ: `public/assets/logo.png`
- ファビコン: `public/favicon.png`
- `_redirects` に canonical へ統一するためのリダイレクトを設定しています。
- SNSのURLはHTML内の `REPLACE_ME` を置き換えてください。

## デプロイ
Git に push するだけでデプロイ可能です（ビルド手順なし）。

Pages:
- index.html
- products.html
- support.html
- thanks.html
- terms.html
- privacy.html
- refund.html
- blog/index.html
