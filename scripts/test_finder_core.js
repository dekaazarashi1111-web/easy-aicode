#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const seed = require(path.join(__dirname, "..", "public", "assets", "finder-seed.js"));
const core = require(path.join(__dirname, "..", "public", "assets", "finder-core.js"));
const store = require(path.join(__dirname, "..", "public", "assets", "finder-store.js"));

store.resetState();

let state = store.loadState();

assert.equal(core.getActiveProfile(state).id, seed.activeProfileId, "active profile should come from seed");

assert.deepEqual(
  core
    .filterWorks({
      state,
      profileId: "soft-romance-lab",
      includeTagIds: ["gentle", "no-ntr"],
      sort: "recommended",
    })
    .map((work) => work.slug),
  ["quiet-library-midnight", "weekend-atelier-warmth"],
  "include filters should require all selected tags"
);

assert.deepEqual(
  core
    .filterWorks({
      state,
      profileId: "soft-romance-lab",
      excludeTagIds: ["older-heroine"],
      sort: "recommended",
    })
    .map((work) => work.slug),
  ["rainy-platform-reunion"],
  "exclude filters should remove works containing excluded tags"
);

assert.deepEqual(
  core
    .filterWorks({
      state,
      profileId: "soft-romance-lab",
      collectionId: "late-night-gentle",
      sort: "recommended",
    })
    .map((work) => work.slug),
  ["quiet-library-midnight", "rainy-platform-reunion"],
  "collection filter should only return collection works"
);

store.upsertTag({
  id: "comfort-food",
  label: "安心して読める",
  groupId: "mood",
  isPublic: true,
  synonyms: ["安心", "穏やか"],
});

store.upsertWork({
  id: "work-test-seed",
  title: "テスト登録作品",
  slug: "test-seed-work",
  status: "draft",
  siteProfileIds: ["soft-romance-lab"],
  tagIds: ["comfort-food"],
  primaryTagIds: ["comfort-food"],
  shortDescription: "管理画面保存のテスト作品です。",
  publicNote: "まだ非公開です。",
  internalNote: "後で公開へ切り替える想定。",
  priority: 99,
  releasedAt: "2026-03-23",
  externalLabel: "DMMで作品を見る",
  externalPartner: "DMM",
  externalUrl: "https://example.com/dmm/test-seed-work",
});

store.bulkUpdateWorks({
  ids: ["work-test-seed"],
  status: "published",
  addTagId: "no-ntr",
});

state = store.loadState();

assert.equal(
  core
    .filterWorks({
      state,
      profileId: "soft-romance-lab",
      includeTagIds: ["comfort-food", "no-ntr"],
    })
    .some((work) => work.slug === "test-seed-work"),
  true,
  "saved work should become searchable after bulk publish and tag add"
);

store.logEvent("search", {
  profileId: "soft-romance-lab",
  query: "静かめ",
  includeTagIds: ["calm"],
  excludeTagIds: ["older-heroine"],
  resultCount: 1,
});

store.logEvent("detail_view", {
  profileId: "soft-romance-lab",
  workId: "work-quiet-library",
});

store.logEvent("outbound_click", {
  profileId: "soft-romance-lab",
  workId: "work-quiet-library",
  href: "https://example.com/dmm/quiet-library-midnight",
});

state = store.loadState();

const summary = core.aggregateLogs(state);
assert.equal(summary.counts.search >= 1, true, "search log should be counted");
assert.equal(summary.counts.detailView >= 1, true, "detail view log should be counted");
assert.equal(summary.counts.outboundClick >= 1, true, "outbound click log should be counted");

console.log("[finder-core] ok");
