#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const articleSearch = require(path.join(__dirname, "..", "public", "assets", "article-search.js"));
const articles = require(path.join(__dirname, "..", "public", "assets", "articles.js"));

const slugs = (items) => items.map((item) => item.slug);

assert.equal(articles.length, 6, "article index should include the six visible entries");

assert.deepEqual(
  slugs(articleSearch.filterArticles({ articles })),
  [
    "hebereke-kansai-tora-ossan",
    "iguma-senpai-kumase-kun",
    "karisome-ookami",
    "mikosuri-san",
    "dosukoi-mammoth-ketsuware-bu",
    "buta-no-harami-bukuro-2",
  ],
  "no filters should return all articles in source order"
);

assert.deepEqual(
  slugs(articleSearch.filterArticles({ articles, query: "ガチムチ 臭い", mode: "and" })),
  ["hebereke-kansai-tora-ossan", "dosukoi-mammoth-ketsuware-bu"],
  "AND text search should require all tokens"
);

assert.deepEqual(
  slugs(articleSearch.filterArticles({ articles, selectedTags: ["ユニフェチ", "乱行"], mode: "or" })),
  ["dosukoi-mammoth-ketsuware-bu", "buta-no-harami-bukuro-2"],
  "OR tag search should match any selected tag"
);

assert.deepEqual(
  slugs(
    articleSearch.filterArticles({
      articles,
      selectedTypes: ["作品紹介記事"],
      selectedTags: ["ガテン系", "臭い"],
      mode: "and",
    })
  ),
  ["hebereke-kansai-tora-ossan", "mikosuri-san"],
  "AND search should require type and both tags"
);

const options = articleSearch.collectFilterOptions(articles);
assert.equal(
  options.types.some((option) => option.value === "作品紹介記事"),
  true,
  "work-guide type should become a filter"
);
assert.equal(options.tags.some((option) => option.value === "臭い"), true, "new tag should become a filter");

console.log("[article-search] ok");
