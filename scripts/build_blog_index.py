#!/usr/bin/env python3
import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / "output/saas-static-presetA/public/blog/posts"
OUT_FILE = ROOT / "output/saas-static-presetA/public/blog/posts.json"

META_RE = re.compile(
    r"<script[^>]*id=['\"]post-meta['\"][^>]*>(.*?)</script>",
    re.IGNORECASE | re.DOTALL,
)


def parse_date(value: str):
    if not value:
        return None
    try:
        return datetime.date.fromisoformat(value)
    except ValueError:
        return None


def load_meta(path: Path):
    text = path.read_text(encoding="utf-8")
    match = META_RE.search(text)
    if not match:
        return None, f"post-meta not found in {path.name}"
    raw = match.group(1).strip()
    try:
        meta = json.loads(raw)
    except json.JSONDecodeError as exc:
        return None, f"post-meta JSON error in {path.name}: {exc}"
    if not isinstance(meta, dict):
        return None, f"post-meta is not an object in {path.name}"

    meta = dict(meta)
    meta["url"] = f"/blog/posts/{path.name}"
    return meta, None


def main():
    if not POSTS_DIR.exists():
        print(f"posts dir not found: {POSTS_DIR}", file=sys.stderr)
        return 1

    posts = []
    warnings = []

    for path in sorted(POSTS_DIR.glob("*.html")):
        if path.name.startswith("_"):
            continue
        meta, warning = load_meta(path)
        if warning:
            warnings.append(warning)
            continue
        posts.append(meta)

    posts.sort(
        key=lambda item: parse_date(item.get("date") or "") or datetime.date.min,
        reverse=True,
    )

    OUT_FILE.write_text(
        json.dumps(posts, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    if warnings:
        print("Warnings:", file=sys.stderr)
        for warning in warnings:
            print(f"- {warning}", file=sys.stderr)

    print(f"Wrote {OUT_FILE} ({len(posts)} posts)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
