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
      profileId: "kemohomo-main",
      includeTagIds: ["osu-kemo", "no-ntr"],
      sort: "recommended",
    })
    .map((work) => work.slug),
  ["garage-bond-at-midnight", "rooftop-fence-promise"],
  "include filters should require all selected tags in AND mode"
);

assert.deepEqual(
  core
    .filterWorks({
      state,
      profileId: "kemohomo-main",
      includeTagIds: ["format-cg", "tf-present"],
      matchMode: "or",
      sort: "recommended",
    })
    .map((work) => work.slug),
  [
    "pocket-shift-memo",
    "rain-hoodie-shelter",
    "morning-workshop-shift",
    "harbor-sketchbook",
  ],
  "OR mode should return works matching any selected include tag"
);

assert.deepEqual(
  core
    .filterWorks({
      state,
      profileId: "kemohomo-main",
      excludeTagIds: ["osu-kemo"],
      sort: "recommended",
    })
    .map((work) => work.slug),
  [
    "pocket-shift-memo",
    "rain-hoodie-shelter",
    "morning-workshop-shift",
    "harbor-sketchbook",
  ],
  "exclude filters should remove works containing excluded tags"
);

assert.deepEqual(
  core
    .getCollectionWorks({
      state,
      profileId: "kemohomo-main",
      collectionId: "start-here",
      sort: "recommended",
    })
    .map((work) => work.slug),
  ["garage-bond-at-midnight", "pocket-shift-memo", "rain-hoodie-shelter"],
  "collection filter should only return collection works"
);

store.upsertTag({
  id: "aftercare-clear",
  label: "アフターケアあり",
  groupId: "relationship",
  isPublic: true,
  synonyms: ["ケアあり", "安心感"],
});

store.upsertCollection({
  id: "test-collection",
  title: "テスト特集",
  slug: "test-collection",
  description: "テスト用の特集です。",
  lead: "保存の確認用。",
  introPoints: ["一点目", "二点目"],
  siteProfileIds: ["kemohomo-main"],
  tagIds: ["aftercare-clear"],
  workIds: ["work-garage-bond"],
  isPublic: true,
});

store.upsertWork({
  id: "work-test-seed",
  title: "テスト登録作品",
  slug: "test-seed-work",
  status: "draft",
  creator: "テスト工房",
  format: "漫画",
  siteProfileIds: ["kemohomo-main"],
  tagIds: ["aftercare-clear"],
  primaryTagIds: ["aftercare-clear"],
  collectionIds: ["test-collection"],
  shortDescription: "管理画面保存のテスト作品です。",
  publicNote: "まだ非公開です。",
  matchSummary: "安心感タグの動作確認用。",
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
      profileId: "kemohomo-main",
      includeTagIds: ["aftercare-clear", "no-ntr"],
    })
    .some((work) => work.slug === "test-seed-work"),
  true,
  "saved work should become searchable after bulk publish and tag add"
);

assert.equal(
  core.getCollection(state, "test-collection")?.title,
  "テスト特集",
  "saved collection should be retrievable"
);

store.logEvent("search", {
  profileId: "kemohomo-main",
  query: "オスケモ寄り",
  includeTagIds: ["osu-kemo"],
  excludeTagIds: ["low-gore"],
  matchMode: "and",
  resultCount: 1,
});

store.logEvent("search", {
  profileId: "kemohomo-main",
  query: "変化",
  includeTagIds: ["tf-present"],
  excludeTagIds: ["mind-stable"],
  matchMode: "and",
  resultCount: 0,
});

store.logEvent("detail_view", {
  profileId: "kemohomo-main",
  workId: "work-garage-bond",
});

store.logEvent("outbound_click", {
  profileId: "kemohomo-main",
  workId: "work-garage-bond",
  href: "https://example.com/dmm/garage-bond-at-midnight",
});

state = store.loadState();

const summary = core.aggregateLogs(state);
assert.equal(summary.counts.search >= 2, true, "search log should be counted");
assert.equal(summary.counts.zeroSearch >= 1, true, "zero-result search should be counted");
assert.equal(summary.counts.detailView >= 1, true, "detail view log should be counted");
assert.equal(summary.counts.outboundClick >= 1, true, "outbound click log should be counted");
assert.equal(summary.topZeroSearches.length >= 1, true, "zero-result searches should be aggregated");

console.log("[finder-core] ok");
