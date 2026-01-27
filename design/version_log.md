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
