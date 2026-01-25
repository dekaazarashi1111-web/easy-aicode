# Winter Gator | SaaS Static Preset A

- Cloudflare Pages の出力は `public/`（Build output directory = `public`）。
- ビルド不要。静的ファイルのみで動作します。
- 全ページ共通の CSS は `public/style.css` を使用します。

## Stripe リンク設定
`public/site.js` の `STRIPE_URL` を実際の Stripe Payment Link に置き換えるだけで反映されます。

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
