#!/usr/bin/env python3
import datetime
import json
import os
import re
import sys
from email.utils import format_datetime
from html import escape
from pathlib import Path
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / "output/saas-static-presetA/public"
POSTS_DIR = PUBLIC_DIR / "blog/posts"
POSTS_JSON = PUBLIC_DIR / "blog/posts.json"
BLOG_INDEX = PUBLIC_DIR / "blog/index.html"
FEED_FILE = PUBLIC_DIR / "blog/feed.xml"
SITEMAP_FILE = PUBLIC_DIR / "sitemap.xml"
ROBOTS_FILE = PUBLIC_DIR / "robots.txt"

SITE_URL = os.environ.get("SITE_URL", "https://wintergator.com").rstrip("/")
BLOG_LIST_START = "<!-- BLOG_LIST_START -->"
BLOG_LIST_END = "<!-- BLOG_LIST_END -->"

META_RE = re.compile(
    r"<script[^>]*id=['\"]post-meta['\"][^>]*>(.*?)</script>",
    re.IGNORECASE | re.DOTALL,
)

STATIC_PAGES = {
    "/index.html": PUBLIC_DIR / "index.html",
    "/products.html": PUBLIC_DIR / "products.html",
    "/support.html": PUBLIC_DIR / "support.html",
    "/terms.html": PUBLIC_DIR / "terms.html",
    "/privacy.html": PUBLIC_DIR / "privacy.html",
    "/refund.html": PUBLIC_DIR / "refund.html",
    "/thanks.html": PUBLIC_DIR / "thanks.html",
    "/blog/": PUBLIC_DIR / "blog/index.html",
    "/tokusho": PUBLIC_DIR / "tokusho/index.html",
}


def parse_date(value: str):
    if not value:
        return None
    try:
        return datetime.date.fromisoformat(value)
    except ValueError:
        return None


def to_absolute(url_path: str) -> str:
    if not url_path:
        return SITE_URL
    return urljoin(f"{SITE_URL}/", url_path.lstrip("/"))


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


def render_blog_cards(posts, indent: str) -> str:
    lines = []
    for post in posts:
        title = escape(post.get("title") or "Untitled")
        desc = escape(post.get("description") or "")
        url = escape(post.get("url") or "#")
        cover = escape(post.get("cover") or "/blog/assets/blog-hero.svg")
        date = escape(post.get("date") or "")
        alt = escape(f"{post.get('title') or '記事'}のヘッダー画像")

        lines.extend(
            [
                f"{indent}<article class=\"card blog-card\">",
                f"{indent}  <a class=\"blog-card__link\" href=\"{url}\">",
                f"{indent}    <div class=\"blog-card__media\">",
                f"{indent}      <img class=\"blog-card__image\" src=\"{cover}\" alt=\"{alt}\" loading=\"lazy\" />",
                f"{indent}    </div>",
                f"{indent}    <div class=\"stack\">",
                f"{indent}      <div class=\"blog-card__meta\">",
                f"{indent}        <span>{date}</span>",
                f"{indent}        <span class=\"pill\">記事</span>",
                f"{indent}      </div>",
                f"{indent}      <h3 class=\"blog-card__title\">{title}</h3>",
            ]
        )
        if desc:
            lines.append(f"{indent}      <p class=\"muted\">{desc}</p>")
        lines.extend(
            [
                f"{indent}      <span class=\"btn btn--ghost btn--sm blog-card__cta\">続きを読む</span>",
                f"{indent}    </div>",
                f"{indent}  </a>",
                f"{indent}</article>",
            ]
        )
    return "\n".join(lines)


def update_blog_index(posts):
    if not BLOG_INDEX.exists():
        print(f"blog index not found: {BLOG_INDEX}", file=sys.stderr)
        return

    content = BLOG_INDEX.read_text(encoding="utf-8")
    if BLOG_LIST_START not in content or BLOG_LIST_END not in content:
        print("blog list markers not found in blog/index.html", file=sys.stderr)
        return

    marker_match = re.search(r"(^[ \t]*)" + re.escape(BLOG_LIST_START), content, re.M)
    indent = marker_match.group(1) if marker_match else ""
    cards = render_blog_cards(posts, indent)

    before, rest = content.split(BLOG_LIST_START, 1)
    _, after = rest.split(BLOG_LIST_END, 1)

    new_block = f"{BLOG_LIST_START}\n{cards}\n{indent}{BLOG_LIST_END}"
    BLOG_INDEX.write_text(before + new_block + after, encoding="utf-8")


def build_feed(posts):
    now = datetime.datetime.now(datetime.timezone.utc)
    items = []
    for post in posts:
        title = escape(post.get("title") or "Untitled")
        desc = escape(post.get("description") or "")
        link = to_absolute(post.get("url") or "/blog/")
        date = parse_date(post.get("date") or "")
        pub_date = now
        if date:
            pub_date = datetime.datetime.combine(date, datetime.time(9, 0), tzinfo=datetime.timezone.utc)

        items.append(
            "\n".join(
                [
                    "  <item>",
                    f"    <title>{title}</title>",
                    f"    <link>{link}</link>",
                    f"    <guid>{link}</guid>",
                    f"    <pubDate>{format_datetime(pub_date)}</pubDate>",
                    f"    <description>{desc}</description>",
                    "  </item>",
                ]
            )
        )

    channel = "\n".join(
        [
            "<channel>",
            "  <title>Winter Gator Blog</title>",
            f"  <link>{to_absolute('/blog/')}</link>",
            "  <description>Winter Gator のブログ更新情報</description>",
            "  <language>ja</language>",
            f"  <lastBuildDate>{format_datetime(now)}</lastBuildDate>",
        ]
    )
    feed = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<rss version=\"2.0\">", channel]
    feed.extend(items)
    feed.append("</channel>")
    feed.append("</rss>")
    FEED_FILE.write_text("\n".join(feed) + "\n", encoding="utf-8")


def build_sitemap(posts):
    urls = []

    for url_path, file_path in STATIC_PAGES.items():
        lastmod = None
        if file_path.exists():
            lastmod = datetime.date.fromtimestamp(file_path.stat().st_mtime)
        urls.append(
            {
                "loc": to_absolute(url_path),
                "lastmod": lastmod.isoformat() if lastmod else None,
                "changefreq": "weekly",
                "priority": "0.7",
            }
        )

    for post in posts:
        url_path = post.get("url")
        if not url_path:
            continue
        date = parse_date(post.get("date") or "")
        urls.append(
            {
                "loc": to_absolute(url_path),
                "lastmod": date.isoformat() if date else None,
                "changefreq": "monthly",
                "priority": "0.6",
            }
        )

    rows = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"]
    for entry in urls:
        rows.append("  <url>")
        rows.append(f"    <loc>{escape(entry['loc'])}</loc>")
        if entry.get("lastmod"):
            rows.append(f"    <lastmod>{entry['lastmod']}</lastmod>")
        rows.append(f"    <changefreq>{entry['changefreq']}</changefreq>")
        rows.append(f"    <priority>{entry['priority']}</priority>")
        rows.append("  </url>")
    rows.append("</urlset>")
    SITEMAP_FILE.write_text("\n".join(rows) + "\n", encoding="utf-8")


def build_robots():
    robots = "\n".join(
        [
            "User-agent: *",
            "Allow: /",
            f"Sitemap: {to_absolute('/sitemap.xml')}",
            "",
        ]
    )
    ROBOTS_FILE.write_text(robots, encoding="utf-8")


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

    POSTS_JSON.write_text(
        json.dumps(posts, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    update_blog_index(posts)
    build_feed(posts)
    build_sitemap(posts)
    build_robots()

    if warnings:
        print("Warnings:", file=sys.stderr)
        for warning in warnings:
            print(f"- {warning}", file=sys.stderr)

    print(f"Wrote {POSTS_JSON} ({len(posts)} posts)")
    print(f"Wrote {FEED_FILE}")
    print(f"Wrote {SITEMAP_FILE}")
    print(f"Wrote {ROBOTS_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
