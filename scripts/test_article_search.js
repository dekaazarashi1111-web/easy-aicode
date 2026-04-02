#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const articleSearch = require(path.join(__dirname, "..", "public", "assets", "article-search.js"));
const articles = require(path.join(__dirname, "..", "public", "assets", "articles.js"));

assert.equal(articles.length, 0, "article index should be empty when no public articles are published");

assert.deepEqual(
  articleSearch.filterArticles({ articles }),
  [],
  "no public articles should yield an empty result set"
);

assert.deepEqual(
  articleSearch.filterArticles({ articles, query: "ガチムチ 臭い", mode: "and" }),
  [],
  "text filtering should remain stable on an empty article index"
);

const options = articleSearch.collectFilterOptions(articles);
assert.deepEqual(options, { types: [], tags: [] }, "empty article index should not expose filter options");

console.log("[article-search] ok");
