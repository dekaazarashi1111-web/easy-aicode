# STRUCTURE.md

本プロジェクトの構造・運用ルールの全体メモ（Codex向け）。

## 1. 公開対象 / ディレクトリ構成
- 公開ルート: `output/saas-static-presetA/public/`
- 入力素材: `input/`（原本扱い・上書き禁止）
- 編集は `output/` で行う。

主な構成:
- `public/index.html` : トップ
- `public/products.html` : 製品
- `public/support.html` : サポート
- `public/terms.html` : 利用規約
- `public/privacy.html` : プライバシー
- `public/refund.html` : 返金
- `public/thanks.html` : 購入完了（noindex）
- `public/tokusho/index.html` : 特商法
- `public/blog/index.html` : ブログハブ
- `public/blog/posts/*.html` : ブログ記事
- `public/style.css` : 全ページ共通CSS
- `public/site.js` : Stripeリンク切替・SEO URL補正

## 2. ブログシステム
### 2.1 記事のメタデータ
各記事の `<head>` に以下を記載する。
- `id="post-meta"` の JSON（必須）

例:
```json
{
  "title": "記事タイトル",
  "description": "概要",
  "date": "YYYY-MM-DD",
  "cover": "/blog/assets/....",
  "tags": ["運用", "更新"]
}
```

### 2.2 タグ運用
- `tags` を追加すると**関連記事が自動生成**される。
- タグは後から自由に増減可能。
- タグは `posts.json` に出力され、関連判定に使われる。

### 2.3 自動生成スクリプト
`/scripts/build_blog_index.py` を実行すると以下を更新/生成する。
- `public/blog/posts.json` : 記事一覧JSON（tags含む）
- `public/blog/index.html` : 記事カードの静的差し込み
- `public/blog/feed.xml` : RSS
- `public/sitemap.xml` : サイトマップ
- `public/robots.txt` : robots
- **関連記事セクション**: 各記事HTML内の markers を置換

#### マーカー
- ブログ一覧:
  - `<!-- BLOG_LIST_START -->` ～ `<!-- BLOG_LIST_END -->`
- ブログのItemList JSON-LD:
  - `<!-- BLOG_ITEMLIST_JSONLD_START -->` ～ `<!-- BLOG_ITEMLIST_JSONLD_END -->`
- 記事の関連記事:
  - `<!-- RELATED_POSTS_START -->` ～ `<!-- RELATED_POSTS_END -->`

### 2.4 関連記事ロジック
- 同じタグの件数が多い記事ほど上位
- タグ一致がない場合はブログ一覧リンクを1件表示
- 最大3件まで表示

### 2.5 追加時の流れ
1. `public/blog/posts/` に記事HTMLを追加
2. `post-meta` を記述（tags含む）
3. `scripts/build_blog_index.py` 実行

## 3. SEO / メタ / 構造化データ
- 各ページに `canonical` / `hreflang` / `OG` / `Twitter` メタを追加済み
- OG画像: `public/assets/og-default.png`
- ロゴ: `public/assets/logo.png`
- ファビコン: `public/favicon.png`
- `@REPLACE_ME_TWITTER` / `REPLACE_ME` はSNS URL/IDで置換

構造化データ:
- Top: `Organization`, `WebSite`, `FAQPage`
- Blog hub: `Blog`, `BreadcrumbList`, `ItemList`
- Blog post: `BlogPosting`, `BreadcrumbList`
- Product: `Product` + `BreadcrumbList`
- その他ページ: `WebPage` + `BreadcrumbList`

## 4. リダイレクト
- `public/_redirects` で正規URLに統一
  - `/index.html → /`
  - `/blog → /blog/`
  - `/blog/index.html → /blog/`
  - `/tokusho/index.html → /tokusho`

## 5. 計測（GA4）
- GA4タグ（G-QTPYX6S1D6）を全ページ `<head>` に埋め込み済み

## 6. 本番ドメイン
- 本番: `https://wintergator.com`
- スクリプト実行時は `SITE_URL` 環境変数で上書き可能
  - 例: `SITE_URL=https://wintergator.com scripts/build_blog_index.py`

## 7. 注意点
- `design/PLANS.md` はループが参照のみ（編集禁止）
- `input/` は素材置き場、編集は `output/` のみ
