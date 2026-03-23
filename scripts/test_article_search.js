#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const articleSearch = require(path.join(__dirname, "..", "public", "assets", "article-search.js"));
const articles = require(path.join(__dirname, "..", "public", "assets", "articles.js"));

const slugs = (items) => items.map((item) => item.slug);

assert.equal(articles.length >= 3, true, "sample articles should include at least three entries");

assert.deepEqual(
  slugs(articleSearch.filterArticles({ articles })),
  ["content-planning-checklist", "comparison-template", "review-structure"],
  "no filters should return all articles in source order"
);

assert.deepEqual(
  slugs(articleSearch.filterArticles({ articles, query: "比較記事 広告表記", mode: "and" })),
  ["comparison-template"],
  "AND text search should require all tokens"
);

assert.deepEqual(
  slugs(articleSearch.filterArticles({ articles, selectedTags: ["CTA", "体験談"], mode: "or" })),
  ["content-planning-checklist", "comparison-template", "review-structure"],
  "OR tag search should match any selected tag"
);

assert.deepEqual(
  slugs(
    articleSearch.filterArticles({
      articles,
      selectedTypes: ["使い方ガイド"],
      selectedTags: ["検索意図", "内部リンク"],
      mode: "and",
    })
  ),
  ["content-planning-checklist"],
  "AND search should require type and both tags"
);

const options = articleSearch.collectFilterOptions(articles);
assert.equal(options.types.some((option) => option.value === "使い方ガイド"), true, "new type should become a filter");
assert.equal(options.tags.some((option) => option.value === "検索意図"), true, "new tag should become a filter");

console.log("[article-search] ok");
