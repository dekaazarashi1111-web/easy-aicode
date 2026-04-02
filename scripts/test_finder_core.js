#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const seed = require(path.join(__dirname, "..", "public", "assets", "finder-seed.js"));
const core = require(path.join(__dirname, "..", "public", "assets", "finder-core.js"));
const store = require(path.join(__dirname, "..", "public", "assets", "finder-store.js"));

const ensureCharacters = (work) => (Array.isArray(work?.characters) ? work.characters : []);

store.resetState();

let state = store.loadState();

assert.equal(core.getActiveProfile(state).id, seed.activeProfileId, "active profile should come from seed");
assert.equal(
  ensureCharacters(seed.works.find((work) => work.slug === "ookami-nanka-kowakunai")).length >= 2,
  true,
  "seed work should keep character cards data"
);

assert.equal(
  core.getVisibleTags(state, "kemohomo-main").some((tag) => tag.id === "species-wolf"),
  true,
  "used public tags should remain visible"
);

assert.equal(
  core.getVisibleTags(state, "kemohomo-main").some((tag) => tag.id === "species-fox"),
  false,
  "unused public tags should not appear in visible tags"
);

assert.deepEqual(
  core
    .filterWorks({
      state,
      profileId: "kemohomo-main",
      includeTagIds: ["species-wolf", "format-comic"],
      sort: "recommended",
    })
    .map((work) => work.slug),
  ["karisome-ookami", "dosukoi-mammoth-ketsuware-bu"],
  "include filters should require all selected tags in AND mode"
);

assert.deepEqual(
  core
    .filterWorks({
      state,
      profileId: "kemohomo-main",
      includeTagIds: ["motif-isekai", "motif-master-servant"],
      matchMode: "or",
      sort: "recommended",
    })
    .map((work) => work.slug),
  [],
  "OR mode should return works matching any selected include tag"
);

assert.deepEqual(
  core
    .filterWorks({
      state,
      profileId: "kemohomo-main",
      excludeTagIds: ["species-wolf"],
      sort: "recommended",
    })
    .map((work) => work.slug),
  [
    "hebereke-kansai-tora-ossan",
    "iguma-senpai-kumase-kun",
    "mikosuri-san",
    "buta-no-harami-bukuro-2",
  ],
  "exclude filters should remove works containing excluded tags"
);

assert.deepEqual(
  core
    .filterWorks({
      state,
      profileId: "kemohomo-main",
      creatorQuery: "Draw Two",
      sort: "recommended",
    })
    .map((work) => work.slug),
  ["karisome-ookami"],
  "creator query should filter by creator name"
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
  [],
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
  workIds: ["work-drawtwo-ookami"],
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
  shortDescription: "手動投入のテスト作品です。",
  publicNote: "まだ非公開です。",
  matchSummary: "安心感タグの動作確認用。",
  internalNote: "後で公開へ切り替える想定。",
  priority: 99,
  releasedAt: "2026-03-31",
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
  core.getVisibleTags(state, "kemohomo-main").some((tag) => tag.id === "aftercare-clear"),
  true,
  "newly used public tags should become visible after publish"
);

assert.equal(
  core.getCollection(state, "test-collection")?.title,
  "テスト特集",
  "saved collection should be retrievable"
);

const relaxations = core.buildRelaxationSuggestions({
  state,
  profileId: "kemohomo-main",
  query: "存在しない条件",
  includeTagIds: ["species-wolf"],
  matchMode: "and",
});

assert.equal(
  relaxations.some((suggestion) => suggestion.label === "キーワードを外す"),
  true,
  "zero-result searches should suggest removing an impossible keyword"
);

store.logEvent("search", {
  profileId: "kemohomo-main",
  query: "狼",
  includeTagIds: ["species-wolf"],
  excludeTagIds: ["body-fat"],
  matchMode: "and",
  resultCount: 1,
});

store.logEvent("search", {
  profileId: "kemohomo-main",
  query: "異世界",
  includeTagIds: ["motif-isekai"],
  excludeTagIds: ["body-muscular"],
  matchMode: "and",
  resultCount: 0,
});

store.logEvent("detail_view", {
  profileId: "kemohomo-main",
  workId: "work-drawtwo-ookami",
});

store.logEvent("outbound_click", {
  profileId: "kemohomo-main",
  workId: "work-drawtwo-ookami",
  href: "https://example.com/dmm/ookami-nanka-kowakunai",
});

state = store.loadState();

const summary = core.aggregateLogs(state);
assert.equal(summary.counts.search >= 2, true, "search log should be counted");
assert.equal(summary.counts.zeroSearch >= 1, true, "zero-result search should be counted");
assert.equal(summary.counts.detailView >= 1, true, "detail view log should be counted");
assert.equal(summary.counts.outboundClick >= 1, true, "outbound click log should be counted");
assert.equal(summary.topZeroSearches.length >= 1, true, "zero-result searches should be aggregated");

console.log("[finder-core] ok");
