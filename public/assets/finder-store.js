(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./finder-seed.js"), require("./finder-core.js"));
    return;
  }
  root.FinderStore = factory(root.FINDER_SEED, root.FinderCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (seed, core) {
  const STORAGE_KEY = "finder-canvas-state";
  const RECENT_WORK_LIMIT = 20;
  const SAVED_SEARCH_LIMIT = 30;
  const LOCAL_SOURCE_KIND = "local";

  const getStorage = () => {
    if (typeof localStorage !== "undefined") return localStorage;
    const rootObject = typeof globalThis !== "undefined" ? globalThis : {};
    if (!rootObject.__FINDER_MEMORY_STORAGE__) {
      const memory = {};
      rootObject.__FINDER_MEMORY_STORAGE__ = {
        getItem: (key) => (Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null),
        setItem: (key, value) => {
          memory[key] = String(value);
        },
        removeItem: (key) => {
          delete memory[key];
        },
      };
    }
    return rootObject.__FINDER_MEMORY_STORAGE__;
  };

  const nowIso = () => new Date().toISOString();

  const buildSeedState = () => core.cloneData(seed);

  const normalizeSearchCharacters = (value) =>
    core.ensureArray(value).map((item, index) => ({
      id: item?.id || `character-${index + 1}`,
      speciesTagIds: core.unique(item?.speciesTagIds),
      bodyTypeTagIds: core.unique(item?.bodyTypeTagIds),
      ageFeelTagIds: core.unique(item?.ageFeelTagIds),
    }));

  const ensureStateShape = (state) => {
    const next = state && typeof state === "object" ? state : {};
    next.schemaVersion = next.schemaVersion || seed.schemaVersion || 1;
    next.activeProfileId = next.activeProfileId || seed.activeProfileId || "";
    next.siteProfiles = core.ensureArray(next.siteProfiles);
    next.tagGroups = core.ensureArray(next.tagGroups);
    next.tags = core.ensureArray(next.tags);
    next.works = core.ensureArray(next.works);
    next.collections = core.ensureArray(next.collections);
    next.logs = next.logs && typeof next.logs === "object" ? next.logs : {};
    next.logs.events = core.ensureArray(next.logs.events);
    next.ui = next.ui && typeof next.ui === "object" ? next.ui : {};
    next.ui.compareWorkIds = core.unique(next.ui.compareWorkIds);
    next.ui.favoriteWorkIds = core.unique(next.ui.favoriteWorkIds);
    next.ui.recentWorkIds = core.unique(next.ui.recentWorkIds);
    next.ui.savedSearches = core.ensureArray(next.ui.savedSearches).map((item) => ({
      id: item.id || `search-${Date.now()}`,
      label: (item.label || "").trim(),
      query: (item.query || "").trim(),
      creatorQuery: (item.creatorQuery || "").trim(),
      characters: normalizeSearchCharacters(item.characters),
      sort: item.sort || "recommended",
      collectionId: item.collectionId || "",
      matchMode: item.matchMode === "or" ? "or" : "and",
      includeTagIds: core.unique(item.includeTagIds),
      excludeTagIds: core.unique(item.excludeTagIds),
      createdAt: item.createdAt || nowIso(),
    }));
    return next;
  };

  const isLocalEntity = (item) => item?.sourceKind === LOCAL_SOURCE_KIND;

  const mergeSeedEntities = (seedItems, storedItems) => {
    const seedIds = new Set(core.ensureArray(seedItems).map((item) => item?.id).filter(Boolean));
    const localItems = core
      .ensureArray(storedItems)
      .filter((item) => item?.id && isLocalEntity(item) && !seedIds.has(item.id));
    return [...core.ensureArray(seedItems), ...localItems];
  };

  const reconcileState = (state) => {
    const next = ensureStateShape(state);
    const validProfileIds = new Set(
      next.siteProfiles.map((profile) => profile?.id).filter(Boolean)
    );
    const validWorkIds = new Set(next.works.map((work) => work?.id).filter(Boolean));
    const usedTagIds = new Set(
      next.works
        .filter((work) => work?.status === "published")
        .flatMap((work) => [
          ...(Array.isArray(work.tagIds) ? work.tagIds : []),
          ...(Array.isArray(work.primaryTagIds) ? work.primaryTagIds : []),
        ])
        .filter(Boolean)
    );
    const validTagIds = new Set(
      next.tags
        .filter((tag) => tag?.id && tag.isPublic !== false && usedTagIds.has(tag.id))
        .map((tag) => tag.id)
    );
    const validCollectionIds = new Set(
      next.collections.map((collection) => collection?.id).filter(Boolean)
    );
    const fallbackProfileId = validProfileIds.has(seed.activeProfileId)
      ? seed.activeProfileId
      : next.siteProfiles[0]?.id || "";

    next.activeProfileId = validProfileIds.has(next.activeProfileId)
      ? next.activeProfileId
      : fallbackProfileId;
    next.ui.compareWorkIds = next.ui.compareWorkIds.filter((id) => validWorkIds.has(id));
    next.ui.favoriteWorkIds = next.ui.favoriteWorkIds.filter((id) => validWorkIds.has(id));
    next.ui.recentWorkIds = next.ui.recentWorkIds
      .filter((id) => validWorkIds.has(id))
      .slice(0, RECENT_WORK_LIMIT);
    next.ui.savedSearches = next.ui.savedSearches.map((item) => ({
      ...item,
      characters: normalizeSearchCharacters(item.characters).map((character, index) => ({
        id: character.id || `character-${index + 1}`,
        speciesTagIds: character.speciesTagIds.filter((tagId) => validTagIds.has(tagId)),
        bodyTypeTagIds: character.bodyTypeTagIds.filter((tagId) => validTagIds.has(tagId)),
        ageFeelTagIds: character.ageFeelTagIds.filter((tagId) => validTagIds.has(tagId)),
      })),
      includeTagIds: item.includeTagIds.filter((tagId) => validTagIds.has(tagId)),
      excludeTagIds: item.excludeTagIds.filter((tagId) => validTagIds.has(tagId)),
      collectionId: validCollectionIds.has(item.collectionId) ? item.collectionId : "",
    }));
    return next;
  };

  // Public works/tags/collections always come from the bundled seed so deploys
  // automatically reflect additions and deletions without clearing localStorage.
  const mergeSeedWithStoredState = (storedState) => {
    const base = ensureStateShape(buildSeedState());
    const stored = ensureStateShape(storedState);
    return reconcileState({
      ...base,
      siteProfiles: mergeSeedEntities(base.siteProfiles, stored.siteProfiles),
      tags: mergeSeedEntities(base.tags, stored.tags),
      works: mergeSeedEntities(base.works, stored.works),
      collections: mergeSeedEntities(base.collections, stored.collections),
      activeProfileId: stored.activeProfileId || base.activeProfileId,
      logs: stored.logs,
      ui: stored.ui,
    });
  };

  const loadState = () => {
    const storage = getStorage();
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = reconcileState(buildSeedState());
      storage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    try {
      const merged = mergeSeedWithStoredState(JSON.parse(raw));
      const serialized = JSON.stringify(merged);
      if (raw !== serialized) {
        storage.setItem(STORAGE_KEY, serialized);
      }
      return merged;
    } catch (error) {
      const seeded = reconcileState(buildSeedState());
      storage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
  };

  const saveState = (state) => {
    const next = reconcileState(core.cloneData(state));
    getStorage().setItem(STORAGE_KEY, JSON.stringify(next));
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      try {
        window.dispatchEvent(
          new CustomEvent("finder:state-changed", {
            detail: {
              state: next,
            },
          })
        );
      } catch (error) {
        // Ignore environments without CustomEvent support.
      }
    }
    return next;
  };

  const mutate = (updater) => {
    const state = loadState();
    updater(state);
    return saveState(state);
  };

  const resetState = () => saveState(buildSeedState());

  const exportState = () => JSON.stringify(loadState(), null, 2);

  const setActiveProfile = (profileId) =>
    mutate((state) => {
      const profileExists = state.siteProfiles.some((profile) => profile.id === profileId);
      if (profileExists) state.activeProfileId = profileId;
    });

  const upsertSiteProfile = (input) =>
    mutate((state) => {
      const nextProfile = {
        id: input.id || core.slugify(input.slug || input.name || "profile"),
        slug: (input.slug || input.id || core.slugify(input.name || "profile")).trim(),
        name: (input.name || "").trim(),
        shortName: (input.shortName || "").trim(),
        heroTitle: (input.heroTitle || "").trim(),
        heroDescription: (input.heroDescription || "").trim(),
        searchPlaceholder: (input.searchPlaceholder || "").trim(),
        visibleTagGroupIds: core.unique(input.visibleTagGroupIds || []),
        sourceKind:
          input.sourceKind ||
          state.siteProfiles.find((profile) => profile.id === input.id)?.sourceKind ||
          LOCAL_SOURCE_KIND,
      };
      const index = state.siteProfiles.findIndex((profile) => profile.id === nextProfile.id);
      if (index === -1) {
        state.siteProfiles.push(nextProfile);
      } else {
        state.siteProfiles[index] = { ...state.siteProfiles[index], ...nextProfile };
      }
      if (!state.activeProfileId) state.activeProfileId = nextProfile.id;
    });

  const upsertTag = (input) =>
    mutate((state) => {
      const nextTag = {
        id: input.id || core.slugify(input.label || "tag"),
        label: (input.label || "").trim(),
        groupId: (input.groupId || "").trim(),
        isPublic: input.isPublic !== false,
        synonyms: core.unique(core.ensureArray(input.synonyms || [])),
        sourceKind:
          input.sourceKind ||
          state.tags.find((tag) => tag.id === input.id)?.sourceKind ||
          LOCAL_SOURCE_KIND,
      };
      const index = state.tags.findIndex((tag) => tag.id === nextTag.id);
      if (index === -1) {
        state.tags.push(nextTag);
      } else {
        state.tags[index] = { ...state.tags[index], ...nextTag };
      }
    });

  const deleteTag = (tagId) =>
    mutate((state) => {
      state.tags = state.tags.filter((tag) => tag.id !== tagId);
      state.works = state.works.map((work) => ({
        ...work,
        tagIds: core.ensureArray(work.tagIds).filter((value) => value !== tagId),
        primaryTagIds: core.ensureArray(work.primaryTagIds).filter((value) => value !== tagId),
      }));
      state.collections = state.collections.map((collection) => ({
        ...collection,
        tagIds: core.ensureArray(collection.tagIds).filter((value) => value !== tagId),
      }));
    });

  const normalizeExternalLinks = (input) => {
    if (Array.isArray(input.externalLinks)) {
      return input.externalLinks
        .map((link, index) => ({
          id: link.id || `link-${index + 1}`,
          label: (link.label || "").trim(),
          partner: (link.partner || "").trim(),
          url: (link.url || "").trim(),
        }))
        .filter((link) => link.url);
    }

    const singleUrl = (input.externalUrl || "").trim();
    if (!singleUrl) return [];
    return [
      {
        id: input.externalLinkId || "link-1",
        label: (input.externalLabel || "外部リンクを見る").trim(),
        partner: (input.externalPartner || "").trim(),
        url: singleUrl,
      },
    ];
  };

  const normalizeImageRecord = (input) => {
    if (!input || typeof input !== "object") return null;
    const url = String(input.url || "").trim();
    if (!url) return null;
    const width = Number(input.width || 0);
    const height = Number(input.height || 0);
    return {
      url,
      width: Number.isFinite(width) && width > 0 ? width : 0,
      height: Number.isFinite(height) && height > 0 ? height : 0,
    };
  };

  const normalizeImageRecords = (records) =>
    core
      .ensureArray(records)
      .map((record) => normalizeImageRecord(record))
      .filter(Boolean);

  const upsertWork = (input) =>
    mutate((state) => {
      const existing = state.works.find((work) => work.id === input.id);
      const nextWork = {
        id: existing?.id || input.id || `work-${Date.now()}`,
        slug: (input.slug || existing?.slug || core.slugify(input.title || "work")).trim(),
        siteProfileIds: core.unique(input.siteProfileIds || existing?.siteProfileIds || []),
        status: input.status || existing?.status || "draft",
        title: (input.title || existing?.title || "").trim(),
        creator: (input.creator || existing?.creator || "").trim(),
        format: (input.format || existing?.format || "").trim(),
        shortDescription: (input.shortDescription || existing?.shortDescription || "").trim(),
        publicNote: (input.publicNote || existing?.publicNote || "").trim(),
        internalNote: (input.internalNote || existing?.internalNote || "").trim(),
        matchSummary: (input.matchSummary || existing?.matchSummary || "").trim(),
        cautionNote: (input.cautionNote || existing?.cautionNote || "").trim(),
        highlightPoints: core.unique(
          core.ensureArray(input.highlightPoints || existing?.highlightPoints || [])
        ),
        tagIds: core.unique(input.tagIds || existing?.tagIds || []),
        primaryTagIds: core.unique(input.primaryTagIds || existing?.primaryTagIds || []),
        collectionIds: core.unique(input.collectionIds || existing?.collectionIds || []),
        priority: Number(input.priority ?? existing?.priority ?? 999),
        releasedAt: input.releasedAt || existing?.releasedAt || "",
        updatedAt: nowIso().slice(0, 10),
        createdAt: existing?.createdAt || nowIso(),
        externalLinks: normalizeExternalLinks(input),
        hoverImageUrl: (input.hoverImageUrl || existing?.hoverImageUrl || "").trim(),
        hoverPreviewImageUrl:
          (input.hoverPreviewImageUrl || existing?.hoverPreviewImageUrl || "").trim(),
        cardHoverImageUrl:
          (input.cardHoverImageUrl || existing?.cardHoverImageUrl || "").trim(),
        galleryImageUrls: core.unique(
          core.ensureArray(input.galleryImageUrls || existing?.galleryImageUrls || [])
        ),
        primaryImage:
          normalizeImageRecord(input.primaryImage) || normalizeImageRecord(existing?.primaryImage),
        galleryImages: normalizeImageRecords(input.galleryImages || existing?.galleryImages || []),
        sourceUrl: (input.sourceUrl || existing?.sourceUrl || "").trim(),
        importSource: (input.importSource || existing?.importSource || "").trim(),
        priceJPY: Number(input.priceJPY ?? existing?.priceJPY ?? 0),
        sourceKind: input.sourceKind || existing?.sourceKind || LOCAL_SOURCE_KIND,
      };

      const index = state.works.findIndex((work) => work.id === nextWork.id);
      if (index === -1) {
        state.works.push(nextWork);
      } else {
        state.works[index] = { ...state.works[index], ...nextWork };
      }
    });

  const upsertCollection = (input) =>
    mutate((state) => {
      const existing = state.collections.find((collection) => collection.id === input.id);
      const nextCollection = {
        id: existing?.id || input.id || core.slugify(input.slug || input.title || "collection"),
        slug: (input.slug || existing?.slug || core.slugify(input.title || "collection")).trim(),
        title: (input.title || existing?.title || "").trim(),
        description: (input.description || existing?.description || "").trim(),
        lead: (input.lead || existing?.lead || "").trim(),
        introPoints: core.unique(
          core.ensureArray(input.introPoints || existing?.introPoints || [])
        ),
        siteProfileIds: core.unique(input.siteProfileIds || existing?.siteProfileIds || []),
        tagIds: core.unique(input.tagIds || existing?.tagIds || []),
        workIds: core.unique(input.workIds || existing?.workIds || []),
        isPublic: input.isPublic !== false,
        sourceKind: input.sourceKind || existing?.sourceKind || LOCAL_SOURCE_KIND,
      };
      const index = state.collections.findIndex((collection) => collection.id === nextCollection.id);
      if (index === -1) {
        state.collections.push(nextCollection);
      } else {
        state.collections[index] = { ...state.collections[index], ...nextCollection };
      }
    });

  const deleteCollection = (collectionId) =>
    mutate((state) => {
      state.collections = state.collections.filter((collection) => collection.id !== collectionId);
      state.works = state.works.map((work) => ({
        ...work,
        collectionIds: core.ensureArray(work.collectionIds).filter((value) => value !== collectionId),
      }));
    });

  const bulkUpdateWorks = ({ ids = [], status = "", addTagId = "", removeTagId = "" }) =>
    mutate((state) => {
      const targetIds = new Set(core.ensureArray(ids));
      state.works = state.works.map((work) => {
        if (!targetIds.has(work.id)) return work;
        const nextTagIds = core.unique([
          ...core.ensureArray(work.tagIds),
          ...(addTagId ? [addTagId] : []),
        ]).filter((tagId) => tagId !== removeTagId);
        return {
          ...work,
          status: status || work.status,
          tagIds: nextTagIds,
          primaryTagIds: core.ensureArray(work.primaryTagIds).filter((tagId) => tagId !== removeTagId),
          updatedAt: nowIso().slice(0, 10),
        };
      });
    });

  const logEvent = (kind, payload = {}) =>
    mutate((state) => {
      state.logs.events.push({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind,
        createdAt: nowIso(),
        ...payload,
      });
      if (state.logs.events.length > 1000) {
        state.logs.events = state.logs.events.slice(-1000);
      }
    });

  const clearLogs = () =>
    mutate((state) => {
      state.logs.events = [];
    });

  const toggleListItem = (values, id, { limit = 0 } = {}) => {
    const items = core.ensureArray(values).filter((value) => value !== id);
    if (core.ensureArray(values).includes(id)) {
      return items;
    }
    const nextItems = [id, ...items];
    return limit > 0 ? nextItems.slice(0, limit) : nextItems;
  };

  const toggleCompareWork = (workId) =>
    mutate((state) => {
      state.ui.compareWorkIds = toggleListItem(state.ui.compareWorkIds, workId, { limit: 4 });
    });

  const toggleFavoriteWork = (workId) =>
    mutate((state) => {
      state.ui.favoriteWorkIds = toggleListItem(state.ui.favoriteWorkIds, workId);
    });

  const touchRecentWork = (workId) =>
    mutate((state) => {
      state.ui.recentWorkIds = [workId, ...core.ensureArray(state.ui.recentWorkIds).filter((id) => id !== workId)].slice(0, RECENT_WORK_LIMIT);
    });

  const upsertSavedSearch = (input) =>
    mutate((state) => {
      const nextSearch = {
        id: input.id || `search-${Date.now()}`,
        label: (input.label || "").trim(),
        query: (input.query || "").trim(),
        creatorQuery: (input.creatorQuery || "").trim(),
        characters: normalizeSearchCharacters(input.characters),
        sort: input.sort || "recommended",
        collectionId: input.collectionId || "",
        matchMode: input.matchMode === "or" ? "or" : "and",
        includeTagIds: core.unique(input.includeTagIds),
        excludeTagIds: core.unique(input.excludeTagIds),
        createdAt: input.createdAt || nowIso(),
      };
      const index = state.ui.savedSearches.findIndex((item) => item.id === nextSearch.id);
      if (index === -1) {
        state.ui.savedSearches = [nextSearch, ...state.ui.savedSearches].slice(0, SAVED_SEARCH_LIMIT);
      } else {
        state.ui.savedSearches[index] = { ...state.ui.savedSearches[index], ...nextSearch };
      }
    });

  const deleteSavedSearch = (searchId) =>
    mutate((state) => {
      state.ui.savedSearches = state.ui.savedSearches.filter((item) => item.id !== searchId);
    });

  return {
    STORAGE_KEY,
    bulkUpdateWorks,
    clearLogs,
    deleteSavedSearch,
    deleteCollection,
    deleteTag,
    exportState,
    loadState,
    logEvent,
    resetState,
    saveState,
    setActiveProfile,
    toggleCompareWork,
    toggleFavoriteWork,
    touchRecentWork,
    upsertSavedSearch,
    upsertCollection,
    upsertSiteProfile,
    upsertTag,
    upsertWork,
  };
});
