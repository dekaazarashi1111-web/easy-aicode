#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const articleSearch = require(path.join(__dirname, "..", "public", "assets", "article-search.js"));
const articles = require(path.join(__dirname, "..", "public", "assets", "articles.js"));

const slugs = (items) => items.map((item) => item.slug);

assert.equal(articles.length >= 4, true, "article index should include at least four entries");

assert.deepEqual(
  slugs(articleSearch.filterArticles({ articles })),
  [
    "content-planning-checklist",
    "comparison-template",
    "review-structure",
    "article-layout-test",
  ],
  "no filters should return all articles in source order"
);

assert.deepEqual(
  slugs(articleSearch.filterArticles({ articles, query: "狼 虎 異世界", mode: "and" })),
  ["comparison-template"],
  "AND text search should require all tokens"
);

assert.deepEqual(
  slugs(articleSearch.filterArticles({ articles, selectedTags: ["異世界", "主従"], mode: "or" })),
  ["comparison-template", "review-structure", "article-layout-test"],
  "OR tag search should match any selected tag"
);

assert.deepEqual(
  slugs(
    articleSearch.filterArticles({
      articles,
      selectedTypes: ["使い方ガイド"],
      selectedTags: ["入口", "初読"],
      mode: "and",
    })
  ),
  ["content-planning-checklist"],
  "AND search should require type and both tags"
);

const options = articleSearch.collectFilterOptions(articles);
assert.equal(options.types.some((option) => option.value === "使い方ガイド"), true, "guide type should become a filter");
assert.equal(options.tags.some((option) => option.value === "異世界"), true, "new tag should become a filter");

console.log("[article-search] ok");
