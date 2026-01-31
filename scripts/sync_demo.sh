#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INPUT_DIR="$ROOT_DIR/input/demo"
OUTPUT_DIR="$ROOT_DIR/output/saas-static-presetA/public/demo"

if [ ! -d "$INPUT_DIR" ]; then
  echo "入力フォルダが見つかりません: $INPUT_DIR" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
rsync -a --delete "$INPUT_DIR"/ "$OUTPUT_DIR"/

find "$OUTPUT_DIR" -name '*:Zone.Identifier' -type f -delete

echo "同期完了: $OUTPUT_DIR"
