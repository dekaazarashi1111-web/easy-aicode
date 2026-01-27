# version_log.md (append-only)

フォーマット例:

## 2025-01-01T00:00:00Z
- Version: v1.0.0
- Commit: <hash or ->
- Task: <id or -> / <title>
- Summary:
  - 変更点を2〜4行で
- Verify: <command> <PASS|FAIL>


## 2026-01-27T07:29:47Z
- Version: -
- Commit: -
- Task: - / ブログ項目追加
- Summary:
  - ブログハブページとヘッダー画像、記事一覧UIを追加
  - 記事メタデータをJSON化するスクリプトと初回記事を追加
  - ナビ/フッターにブログ導線を追加、CSS/JSを拡張
- Verify: bash scripts/verify_wsl.sh PASS

## 2026-01-27T07:32:29Z
- Version: -
- Commit: -
- Task: - / テスト用ブログ記事追加
- Summary:
  - テスト用ブログ記事を1本追加
  - 記事一覧JSONを再生成
- Verify: bash scripts/verify_wsl.sh PASS

## 2026-01-27T07:39:42Z
- Version: -
- Commit: -
- Task: - / ブログ記事に関連ページ追加
- Summary:
  - ブログ記事の末尾に関連ページセクションを追加
  - 関連カードのリンク表現を共通化
- Verify: bash scripts/verify_wsl.sh PASS

## 2026-01-27T07:55:24Z
- Version: -
- Commit: -
- Task: - / SEO最適化
- Summary:
  - 全ページにcanonical/OG/Twitter/robotsを追加
  - Blog/FAQ/Product/各種WebPageの構造化データを追加
  - sitemap/robots/RSS生成とブログ一覧の静的出力を追加
- Verify: bash scripts/verify_wsl.sh PASS

## 2026-01-27T08:01:36Z
- Version: -
- Commit: -
- Task: - / SEO絶対URL化
- Summary:
  - 本番ドメインの絶対URLをcanonical/OG/Twitter/RSSに反映
  - sitemap/robots/feedを本番ドメインで再生成
- Verify: bash scripts/verify_wsl.sh PASS

## 2026-01-27T08:16:47Z
- Version: -
- Commit: -
- Task: - / SEO総仕上げ
- Summary:
  - OGP/ロゴ/ファビコンPNGを追加しメタ情報を最適化
  - BreadcrumbとブログItemListの構造化データを追加
  - 301リダイレクトとsitemap/robots/feedを更新
- Verify: bash scripts/verify_wsl.sh PASS

## 2026-01-27T08:48:31Z
- Version: -
- Commit: -
- Task: - / GA4タグ埋め込み
- Summary:
  - GA4 gtag.js スニペットを全ページのheadへ追加
- Verify: bash scripts/verify_wsl.sh PASS

## 2026-01-27T09:04:32Z
- Version: -
- Commit: -
- Task: - / ブログタグ・関連記事土台
- Summary:
  - 記事タグと関連記事自動更新の仕組みを追加
  - 構造ルールを design/STRUCTURE.md に集約
- Verify: bash scripts/verify_wsl.sh PASS

## 2026-01-27T09:09:33Z
- Version: -
- Commit: -
- Task: - / ブログタグ絞り込み
- Summary:
  - ブログハブにタグ一覧と件数を自動生成
  - タグクリックで記事を絞り込むJSを追加
- Verify: bash scripts/verify_wsl.sh PASS
