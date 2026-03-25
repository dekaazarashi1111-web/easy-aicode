(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./finder-seed.js"), require("./finder-core.js"));
    return;
  }
  root.FinderStore = factory(root.FINDER_SEED, root.FinderCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (seed, core) {
  const STORAGE_KEY = "finder-canvas-state";
  const RECENT_WORK_LIMIT = 20;

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

  const loadState = () => {
    const storage = getStorage();
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = ensureStateShape(buildSeedState());
      storage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    try {
      return ensureStateShape(JSON.parse(raw));
    } catch (error) {
      const seeded = ensureStateShape(buildSeedState());
      storage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
  };

  const saveState = (state) => {
    const next = ensureStateShape(core.cloneData(state));
    getStorage().setItem(STORAGE_KEY, JSON.stringify(next));
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
        state.ui.savedSearches = [nextSearch, ...state.ui.savedSearches].slice(0, 10);
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
