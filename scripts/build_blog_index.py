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
BLOG_ITEMLIST_START = "<!-- BLOG_ITEMLIST_JSONLD_START -->"
BLOG_ITEMLIST_END = "<!-- BLOG_ITEMLIST_JSONLD_END -->"
TAG_FILTER_START = "<!-- TAG_FILTER_START -->"
TAG_FILTER_END = "<!-- TAG_FILTER_END -->"

META_RE = re.compile(
    r"<script[^>]*id=['\"]post-meta['\"][^>]*>(.*?)</script>",
    re.IGNORECASE | re.DOTALL,
)
RELATED_START = "<!-- RELATED_POSTS_START -->"
RELATED_END = "<!-- RELATED_POSTS_END -->"

STATIC_PAGES = [
    {"path": "/", "file": PUBLIC_DIR / "index.html", "priority": "1.0", "indexable": True},
    {"path": "/products.html", "file": PUBLIC_DIR / "products.html", "priority": "0.8", "indexable": True},
    {"path": "/support.html", "file": PUBLIC_DIR / "support.html", "priority": "0.6", "indexable": True},
    {"path": "/terms.html", "file": PUBLIC_DIR / "terms.html", "priority": "0.4", "indexable": True},
    {"path": "/privacy.html", "file": PUBLIC_DIR / "privacy.html", "priority": "0.4", "indexable": True},
    {"path": "/refund.html", "file": PUBLIC_DIR / "refund.html", "priority": "0.4", "indexable": True},
    {"path": "/thanks.html", "file": PUBLIC_DIR / "thanks.html", "priority": "0.1", "indexable": False},
    {"path": "/blog/", "file": PUBLIC_DIR / "blog/index.html", "priority": "0.7", "indexable": True},
    {"path": "/tokusho", "file": PUBLIC_DIR / "tokusho/index.html", "priority": "0.4", "indexable": True},
]


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
    meta["path"] = path
    tags = meta.get("tags", [])
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    elif isinstance(tags, list):
        tags = [str(t).strip() for t in tags if str(t).strip()]
    else:
        tags = []
    meta["tags"] = tags
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

        tags = ",".join(post.get("tags", []))
        data_tags = escape(tags)
        lines.extend(
            [
                f"{indent}<article class=\"card blog-card\" data-tags=\"{data_tags}\">",
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


def render_tag_filter(posts, indent: str) -> str:
    counts = {}
    for post in posts:
        for tag in post.get("tags", []):
            key = tag.strip()
            if not key:
                continue
            counts[key] = counts.get(key, 0) + 1

    sorted_tags = sorted(counts.items(), key=lambda item: (-item[1], item[0]))

    lines = [
        f"{indent}<div class=\"tag-filter__title\">タグで絞り込む</div>",
        f"{indent}<div class=\"tag-filter__list\">",
    ]
    total = len(posts)
    lines.append(
        f"{indent}  <button class=\"tag-filter__btn\" type=\"button\" data-tag=\"all\" aria-pressed=\"true\">"
        f"全て <span class=\"tag-filter__count\">{total}</span></button>"
    )
    for tag, count in sorted_tags:
        safe_tag = escape(tag)
        lines.append(
            f"{indent}  <button class=\"tag-filter__btn\" type=\"button\" data-tag=\"{safe_tag}\" aria-pressed=\"false\">"
            f"{safe_tag} <span class=\"tag-filter__count\">{count}</span></button>"
        )
    lines.append(f"{indent}</div>")
    return "\n".join(lines)


def normalize_tags(tags):
    return {tag.strip().lower() for tag in tags if tag.strip()}


def render_related_cards(base_post, posts, indent: str) -> str:
    base_tags = normalize_tags(base_post.get("tags", []))
    candidates = []
    for post in posts:
        if post["url"] == base_post["url"]:
            continue
        shared = base_tags & normalize_tags(post.get("tags", []))
        score = len(shared)
        if score == 0:
            continue
        candidates.append((score, post))

    candidates.sort(
        key=lambda item: (
            -item[0],
            -(
                parse_date(item[1].get("date") or "")
                or datetime.date.min
            ).toordinal(),
        )
    )

    related_posts = [item[1] for item in candidates][:3]

    if len(related_posts) < 3:
        seen = {post["url"] for post in related_posts}
        seen.add(base_post["url"])
        remaining = []
        for post in posts:
            if post["url"] in seen:
                continue
            remaining.append(post)
        remaining.sort(
            key=lambda item: parse_date(item.get("date") or "") or datetime.date.min,
            reverse=True,
        )
        for post in remaining:
            related_posts.append(post)
            if len(related_posts) >= 3:
                break

    if not related_posts:
        related_posts = [
            {
                "title": "ブログ一覧を見る",
                "description": "最新の記事を一覧で確認できます。",
                "url": "/blog/",
            }
        ]

    lines = []
    for post in related_posts:
        title = escape(post.get("title") or "Untitled")
        desc = escape(post.get("description") or "")
        url = escape(post.get("url") or "/blog/")
        lines.append(f"{indent}<a class=\"card card--interactive\" href=\"{url}\">")
        lines.append(f"{indent}  <h3 class=\"card__title\">{title}</h3>")
        if desc:
            lines.append(f"{indent}  <p class=\"card__body\">{desc}</p>")
        if post.get("date"):
            lines.append(f"{indent}  <p class=\"muted\">{post.get('date')}</p>")
        lines.append(f"{indent}</a>")
    return "\n".join(lines)


def update_blog_index(posts):
    if not BLOG_INDEX.exists():
        print(f"blog index not found: {BLOG_INDEX}", file=sys.stderr)
        return

    content = BLOG_INDEX.read_text(encoding="utf-8")
    list_marker_match = re.search(r"(^[ \t]*)" + re.escape(BLOG_LIST_START), content, re.M)
    list_indent = list_marker_match.group(1) if list_marker_match else ""
    item_marker_match = re.search(r"(^[ \t]*)" + re.escape(BLOG_ITEMLIST_START), content, re.M)
    item_indent = item_marker_match.group(1) if item_marker_match else ""
    tag_marker_match = re.search(r"(^[ \t]*)" + re.escape(TAG_FILTER_START), content, re.M)
    tag_indent = tag_marker_match.group(1) if tag_marker_match else ""

    if BLOG_LIST_START in content and BLOG_LIST_END in content:
        cards = render_blog_cards(posts, list_indent)
        before, rest = content.split(BLOG_LIST_START, 1)
        _, after = rest.split(BLOG_LIST_END, 1)
        content = before + f"{BLOG_LIST_START}\n{cards}\n{list_indent}{BLOG_LIST_END}" + after
    else:
        print("blog list markers not found in blog/index.html", file=sys.stderr)

    if BLOG_ITEMLIST_START in content and BLOG_ITEMLIST_END in content:
        item_entries = []
        for idx, post in enumerate(posts, start=1):
            url = to_absolute(post.get("url") or "/blog/")
            name = post.get("title") or "Untitled"
            item_entries.append(
                {
                    "@type": "ListItem",
                    "position": idx,
                    "name": name,
                    "url": url,
                }
            )

        itemlist = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": item_entries,
        }

        itemlist_json = json.dumps(itemlist, ensure_ascii=False, indent=2)
        script_block = "\n".join(
            [
                f"{item_indent}{BLOG_ITEMLIST_START}",
                f"{item_indent}<script type=\"application/ld+json\">",
                itemlist_json,
                f"{item_indent}</script>",
                f"{item_indent}{BLOG_ITEMLIST_END}",
            ]
        )

        before_items, rest_items = content.split(BLOG_ITEMLIST_START, 1)
        _, after_items = rest_items.split(BLOG_ITEMLIST_END, 1)
        content = before_items + script_block + after_items
    else:
        print("blog itemlist markers not found in blog/index.html", file=sys.stderr)

    if TAG_FILTER_START in content and TAG_FILTER_END in content:
        filter_block = render_tag_filter(posts, tag_indent)
        before_tags, rest_tags = content.split(TAG_FILTER_START, 1)
        _, after_tags = rest_tags.split(TAG_FILTER_END, 1)
        content = before_tags + f"{TAG_FILTER_START}\n{filter_block}\n{tag_indent}{TAG_FILTER_END}" + after_tags
    else:
        print("tag filter markers not found in blog/index.html", file=sys.stderr)

    BLOG_INDEX.write_text(content, encoding="utf-8")


def update_related_posts(posts):
    for post in posts:
        path = post.get("path")
        if not path or not Path(path).exists():
            continue
        content = Path(path).read_text(encoding="utf-8")
        if RELATED_START not in content or RELATED_END not in content:
            print(f"related markers not found in {Path(path).name}", file=sys.stderr)
            continue
        marker_match = re.search(r"(^[ \t]*)" + re.escape(RELATED_START), content, re.M)
        indent = marker_match.group(1) if marker_match else ""
        cards = render_related_cards(post, posts, indent)
        before, rest = content.split(RELATED_START, 1)
        _, after = rest.split(RELATED_END, 1)
        updated = before + f"{RELATED_START}\n{cards}\n{indent}{RELATED_END}" + after
        Path(path).write_text(updated, encoding="utf-8")


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

    for page in STATIC_PAGES:
        if not page["indexable"]:
            continue
        file_path = page["file"]
        lastmod = None
        if file_path.exists():
            lastmod = datetime.date.fromtimestamp(file_path.stat().st_mtime)
        urls.append(
            {
                "loc": to_absolute(page["path"]),
                "lastmod": lastmod.isoformat() if lastmod else None,
                "changefreq": "weekly",
                "priority": page["priority"],
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

    json_posts = []
    for post in posts:
        clean = dict(post)
        clean.pop("path", None)
        json_posts.append(clean)

    POSTS_JSON.write_text(
        json.dumps(json_posts, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    update_blog_index(posts)
    update_related_posts(posts)
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
