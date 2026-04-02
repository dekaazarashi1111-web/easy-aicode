(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.FinderCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const normalizeText = (value) =>
    (value || "")
      .toString()
      .toLowerCase()
      .replace(/\u3000/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const splitTokens = (value) =>
    normalizeText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter(Boolean);

  const ensureArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

  const unique = (values) => Array.from(new Set(ensureArray(values)));

  const cloneData = (value) => JSON.parse(JSON.stringify(value));

  const slugify = (value) =>
    normalizeText(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `item-${Date.now()}`;

  const getWorkPath = (workOrSlug) => {
    const slug =
      typeof workOrSlug === "string"
        ? workOrSlug
        : typeof workOrSlug?.slug === "string"
          ? workOrSlug.slug
          : "";
    return slug ? `/works/${encodeURIComponent(slug)}/` : "/";
  };

  const getCollectionPath = (collectionOrSlug) => {
    const slug =
      typeof collectionOrSlug === "string"
        ? collectionOrSlug
        : typeof collectionOrSlug?.slug === "string"
          ? collectionOrSlug.slug
          : "";
    return slug ? `/collections/${encodeURIComponent(slug)}/` : "/collections/";
  };

  const getActiveProfile = (state) => {
    const profiles = ensureArray(state?.siteProfiles);
    if (!profiles.length) return null;
    return profiles.find((profile) => profile.id === state.activeProfileId) || profiles[0];
  };

  const getProfile = (state, profileId) => {
    if (!profileId) return getActiveProfile(state);
    return ensureArray(state?.siteProfiles).find((profile) => profile.id === profileId) || null;
  };

  const getTagMap = (state) => new Map(ensureArray(state?.tags).map((tag) => [tag.id, tag]));

  const getWorkMap = (state) => new Map(ensureArray(state?.works).map((work) => [work.id, work]));

  const getCollectionMap = (state) =>
    new Map(ensureArray(state?.collections).map((collection) => [collection.id, collection]));

  const getCollection = (state, collectionIdOrSlug) =>
    ensureArray(state?.collections).find(
      (collection) =>
        collection.id === collectionIdOrSlug || collection.slug === collectionIdOrSlug
    ) || null;

  const getProfileWorks = (state, profileId, { publicOnly = false } = {}) => {
    const profile = getProfile(state, profileId);
    if (!profile) return [];
    return ensureArray(state?.works).filter((work) => {
      const workProfiles = ensureArray(work.siteProfileIds);
      if (!workProfiles.includes(profile.id)) return false;
      if (publicOnly) return work.status === "published";
      return true;
    });
  };

  const getProfileCollections = (state, profileId, { publicOnly = false } = {}) => {
    const profile = getProfile(state, profileId);
    if (!profile) return [];
    return ensureArray(state?.collections).filter((collection) => {
      const collectionProfiles = ensureArray(collection.siteProfileIds);
      if (collectionProfiles.length && !collectionProfiles.includes(profile.id)) return false;
      if (publicOnly) return collection.isPublic !== false;
      return true;
    });
  };

  const getUsedTagIds = (state, profileId, { publicOnly = true } = {}) => {
    const works = getProfileWorks(state, profileId, { publicOnly });
    return new Set(
      works.flatMap((work) => [
        ...ensureArray(work.tagIds),
        ...ensureArray(work.primaryTagIds),
      ])
    );
  };

  const getVisibleTags = (state, profileId) => {
    const profile = getProfile(state, profileId);
    const visibleGroups = new Set(ensureArray(profile?.visibleTagGroupIds));
    const usedTagIds = getUsedTagIds(state, profileId, { publicOnly: true });
    return ensureArray(state?.tags).filter((tag) => {
      if (!tag.isPublic) return false;
      if (!usedTagIds.has(tag.id)) return false;
      if (!visibleGroups.size) return true;
      return visibleGroups.has(tag.groupId);
    });
  };

  const groupTags = (tags, tagGroups) => {
    const tagsByGroup = new Map();
    ensureArray(tags).forEach((tag) => {
      const current = tagsByGroup.get(tag.groupId) || [];
      current.push(tag);
      tagsByGroup.set(tag.groupId, current);
    });

    const orderedGroups = ensureArray(tagGroups)
      .map((group) => ({
        ...group,
        tags: (tagsByGroup.get(group.id) || []).slice().sort((left, right) =>
          left.label.localeCompare(right.label, "ja")
        ),
      }))
      .filter((group) => group.tags.length > 0);

    const knownGroupIds = new Set(orderedGroups.map((group) => group.id));
    tagsByGroup.forEach((groupTagsValue, groupId) => {
      if (knownGroupIds.has(groupId)) return;
      orderedGroups.push({
        id: groupId,
        label: groupId,
        description: "",
        tags: groupTagsValue.slice().sort((left, right) =>
          left.label.localeCompare(right.label, "ja")
        ),
      });
    });

    return orderedGroups;
  };

  const getSearchText = (work, tagMap) => {
    const tags = ensureArray(work.tagIds)
      .map((tagId) => tagMap.get(tagId))
      .filter(Boolean);
    const tagLabels = tags.map((tag) => tag.label);
    const tagSynonyms = tags.flatMap((tag) => ensureArray(tag.synonyms));
    const linkPartners = ensureArray(work.externalLinks).map((link) => link.partner);
    const highlightPoints = ensureArray(work.highlightPoints);
    return normalizeText(
      [
        work.title,
        work.creator,
        work.format,
        work.shortDescription,
        work.publicNote,
        work.matchSummary,
        work.cautionNote,
        highlightPoints.join(" "),
        tagLabels.join(" "),
        tagSynonyms.join(" "),
        linkPartners.join(" "),
      ].join(" ")
    );
  };

  const decorateWork = (work, state) => {
    const tagMap = getTagMap(state);
    const collectionMap = getCollectionMap(state);
    const tagObjects = ensureArray(work.tagIds)
      .map((tagId) => tagMap.get(tagId))
      .filter(Boolean);
    const primaryTagObjects = ensureArray(work.primaryTagIds)
      .map((tagId) => tagMap.get(tagId))
      .filter(Boolean);
    const collectionObjects = ensureArray(work.collectionIds)
      .map((collectionId) => collectionMap.get(collectionId))
      .filter(Boolean);
    return {
      ...work,
      tagObjects,
      primaryTagObjects: primaryTagObjects.length ? primaryTagObjects : tagObjects.slice(0, 4),
      collectionObjects,
      _searchText: getSearchText(work, tagMap),
      _creatorText: normalizeText(work.creator),
    };
  };

  const decorateCollection = (collection, state) => {
    const tagMap = getTagMap(state);
    const workMap = getWorkMap(state);
    return {
      ...collection,
      tagObjects: ensureArray(collection.tagIds)
        .map((tagId) => tagMap.get(tagId))
        .filter(Boolean),
      workObjects: ensureArray(collection.workIds)
        .map((workId) => workMap.get(workId))
        .filter(Boolean),
    };
  };

  const compareBySort = (left, right, sort) => {
    if (sort === "latest") {
      return `${right.releasedAt || ""}`.localeCompare(`${left.releasedAt || ""}`);
    }
    if (sort === "updated") {
      return `${right.updatedAt || ""}`.localeCompare(`${left.updatedAt || ""}`);
    }
    if (sort === "title") {
      return left.title.localeCompare(right.title, "ja");
    }
    return (left.priority || 9999) - (right.priority || 9999) ||
      left.title.localeCompare(right.title, "ja");
  };

  const matchesTokens = (searchText, tokens, matchMode) => {
    if (!tokens.length) return true;
    if (matchMode === "or") {
      return tokens.some((token) => searchText.includes(token));
    }
    return tokens.every((token) => searchText.includes(token));
  };

  const matchesIncludeTags = (tagIds, includeIds, matchMode) => {
    if (!includeIds.length) return true;
    const tagSet = new Set(tagIds);
    if (matchMode === "or") {
      return includeIds.some((tagId) => tagSet.has(tagId));
    }
    return includeIds.every((tagId) => tagSet.has(tagId));
  };

  const getMatchContext = ({ work, state, query = "", includeTagIds = [] }) => {
    const tagMap = getTagMap(state);
    const tokens = splitTokens(query);
    const tokenMatches = tokens.filter((token) => work._searchText.includes(token));
    const includeLabels = unique(includeTagIds)
      .map((tagId) => tagMap.get(tagId)?.label)
      .filter(Boolean);
    const matchedIncludeLabels = unique(includeTagIds)
      .filter((tagId) => ensureArray(work.tagIds).includes(tagId))
      .map((tagId) => tagMap.get(tagId)?.label)
      .filter(Boolean);
    return {
      tokenMatches,
      includeLabels,
      matchedIncludeLabels,
      summary:
        work.matchSummary ||
        (matchedIncludeLabels.length
          ? `${matchedIncludeLabels.join(" / ")} で探している人向け。`
          : work.publicNote || work.shortDescription),
    };
  };

  const filterWorks = ({
    state,
    profileId,
    query = "",
    creatorQuery = "",
    includeTagIds = [],
    excludeTagIds = [],
    sort = "recommended",
    collectionId = "",
    matchMode = "and",
  }) => {
    const collection = collectionId ? getCollection(state, collectionId) : null;
    const includeIds = unique(includeTagIds);
    const excludeIds = unique(excludeTagIds);
    const queryTokens = splitTokens(query);
    const creatorTokens = splitTokens(creatorQuery);
    const works = getProfileWorks(state, profileId, { publicOnly: true }).map((work) =>
      decorateWork(work, state)
    );

    return works
      .filter((work) => {
        const tagIds = ensureArray(work.tagIds);
        if (collection && !ensureArray(collection.workIds).includes(work.id)) return false;
        if (!matchesTokens(work._searchText, queryTokens, matchMode)) return false;
        if (!matchesTokens(work._creatorText, creatorTokens, matchMode)) return false;
        if (!matchesIncludeTags(tagIds, includeIds, matchMode)) return false;
        if (excludeIds.length && excludeIds.some((tagId) => tagIds.includes(tagId))) return false;
        return true;
      })
      .map((work) => ({
        ...work,
        matchContext: getMatchContext({ work, state, query, includeTagIds: includeIds }),
      }))
      .sort((left, right) => compareBySort(left, right, sort));
  };

  const buildRelaxationSuggestions = ({
    state,
    profileId,
    query = "",
    creatorQuery = "",
    includeTagIds = [],
    excludeTagIds = [],
    sort = "recommended",
    collectionId = "",
    matchMode = "and",
    limit = 5,
  }) => {
    const suggestions = [];
    const suggestionKeys = new Set();
    const tagMap = getTagMap(state);

    const pushSuggestion = (label, description, nextState) => {
      const key = JSON.stringify({
        label,
        query: nextState.query || "",
        creatorQuery: nextState.creatorQuery || "",
        includeTagIds: ensureArray(nextState.includeTagIds).slice().sort(),
        excludeTagIds: ensureArray(nextState.excludeTagIds).slice().sort(),
        collectionId: nextState.collectionId || "",
        matchMode: nextState.matchMode || "and",
      });
      if (suggestionKeys.has(key)) return;
      const resultCount = filterWorks({
        state,
        profileId,
        query: nextState.query || "",
        creatorQuery: nextState.creatorQuery || "",
        includeTagIds: nextState.includeTagIds || [],
        excludeTagIds: nextState.excludeTagIds || [],
        sort,
        collectionId: nextState.collectionId || "",
        matchMode: nextState.matchMode || "and",
      }).length;
      if (resultCount <= 0) return;
      suggestionKeys.add(key);
      suggestions.push({
        label,
        description,
        resultCount,
        nextState: {
          query: nextState.query || "",
          creatorQuery: nextState.creatorQuery || "",
          includeTagIds: unique(nextState.includeTagIds),
          excludeTagIds: unique(nextState.excludeTagIds),
          collectionId: nextState.collectionId || "",
          matchMode: nextState.matchMode === "or" ? "or" : "and",
          sort,
        },
      });
    };

    if (matchMode === "and" && (splitTokens(query).length > 1 || includeTagIds.length > 1 || splitTokens(creatorQuery).length > 1)) {
      pushSuggestion("いずれか一致に広げる", "AND 条件を OR 条件へ緩めます。", {
        query,
        creatorQuery,
        includeTagIds,
        excludeTagIds,
        collectionId,
        matchMode: "or",
      });
    }

    if (excludeTagIds.length) {
      pushSuggestion("除外条件を外す", "除外しているタグを一度外します。", {
        query,
        creatorQuery,
        includeTagIds,
        excludeTagIds: [],
        collectionId,
        matchMode,
      });
    }

    if (query) {
      pushSuggestion("キーワードを外す", "フリーワードを外してタグ条件だけで探します。", {
        query: "",
        creatorQuery,
        includeTagIds,
        excludeTagIds,
        collectionId,
        matchMode,
      });
    }

    if (creatorQuery) {
      pushSuggestion("作者条件を外す", "作者・サークル名の条件を外して探します。", {
        query,
        creatorQuery: "",
        includeTagIds,
        excludeTagIds,
        collectionId,
        matchMode,
      });
    }

    if (collectionId) {
      pushSuggestion("特集条件を外す", "特集縛りを外して全体から探します。", {
        query,
        creatorQuery,
        includeTagIds,
        excludeTagIds,
        collectionId: "",
        matchMode,
      });
    }

    unique(includeTagIds).forEach((tagId) => {
      pushSuggestion(`${tagMap.get(tagId)?.label || tagId} を外す`, "含める条件を1つ減らして候補を広げます。", {
        query,
        creatorQuery,
        includeTagIds: includeTagIds.filter((value) => value !== tagId),
        excludeTagIds,
        collectionId,
        matchMode,
      });
    });

    return suggestions
      .sort((left, right) => {
        if (right.resultCount !== left.resultCount) return right.resultCount - left.resultCount;
        return left.label.localeCompare(right.label, "ja");
      })
      .slice(0, limit);
  };

  const getCollectionWorks = ({ state, profileId, collectionId, sort = "recommended" }) => {
    const collection = getCollection(state, collectionId);
    if (!collection) return [];
    return filterWorks({
      state,
      profileId,
      sort,
      collectionId: collection.id,
    });
  };

  const suggestWorks = ({
    state,
    profileId,
    query = "",
    includeTagIds = [],
    excludeTagIds = [],
    limit = 3,
  }) => {
    const includeIds = unique(includeTagIds);
    const excludeIds = new Set(unique(excludeTagIds));
    const queryTokens = splitTokens(query);

    return getProfileWorks(state, profileId, { publicOnly: true })
      .map((work) => decorateWork(work, state))
      .filter((work) => !ensureArray(work.tagIds).some((tagId) => excludeIds.has(tagId)))
      .map((work) => {
        const sharedIncludeIds = includeIds.filter((tagId) => ensureArray(work.tagIds).includes(tagId));
        const tokenMatches = queryTokens.filter((token) => work._searchText.includes(token));
        return {
          ...work,
          suggestionScore: sharedIncludeIds.length * 2 + tokenMatches.length,
          suggestionSharedTags: sharedIncludeIds,
          suggestionTokenMatches: tokenMatches,
        };
      })
      .filter((work) => work.suggestionScore > 0)
      .sort((left, right) => {
        if (right.suggestionScore !== left.suggestionScore) {
          return right.suggestionScore - left.suggestionScore;
        }
        return compareBySort(left, right, "recommended");
      })
      .slice(0, limit);
  };

  const findSimilarWorks = ({ state, work, profileId, limit = 3 }) => {
    const baseTagIds = new Set(ensureArray(work?.tagIds));
    if (!work || !baseTagIds.size) return [];

    return getProfileWorks(state, profileId, { publicOnly: true })
      .filter((candidate) => candidate.id !== work.id)
      .map((candidate) => {
        const sharedTagIds = ensureArray(candidate.tagIds).filter((tagId) => baseTagIds.has(tagId));
        return {
          ...decorateWork(candidate, state),
          sharedTagIds,
          sharedScore: sharedTagIds.length,
        };
      })
      .filter((candidate) => candidate.sharedScore > 0)
      .sort((left, right) => {
        if (right.sharedScore !== left.sharedScore) return right.sharedScore - left.sharedScore;
        return compareBySort(left, right, "recommended");
      })
      .slice(0, limit);
  };

  const detectDuplicateWorks = (works) => {
    const duplicateMap = new Map();
    const buckets = new Map();

    ensureArray(works).forEach((work) => {
      const titleKey = normalizeText(work.title);
      if (titleKey) {
        const current = buckets.get(`title:${titleKey}`) || [];
        current.push({ reason: "タイトル一致", work });
        buckets.set(`title:${titleKey}`, current);
      }

      ensureArray(work.externalLinks).forEach((link) => {
        const urlKey = normalizeText(link.url);
        if (!urlKey) return;
        const current = buckets.get(`url:${urlKey}`) || [];
        current.push({ reason: "外部URL一致", work });
        buckets.set(`url:${urlKey}`, current);
      });
    });

    buckets.forEach((entries) => {
      if (entries.length < 2) return;
      entries.forEach(({ work, reason }) => {
        const current = duplicateMap.get(work.id) || [];
        if (!current.includes(reason)) current.push(reason);
        duplicateMap.set(work.id, current);
      });
    });

    return duplicateMap;
  };

  const aggregateLogs = (state) => {
    const events = ensureArray(state?.logs?.events)
      .slice()
      .sort((left, right) => `${right.createdAt || ""}`.localeCompare(`${left.createdAt || ""}`));
    const tagMap = getTagMap(state);
    const workMap = getWorkMap(state);
    const counts = {
      search: 0,
      zeroSearch: 0,
      resultClick: 0,
      detailView: 0,
      outboundClick: 0,
    };
    const searchBuckets = new Map();
    const zeroSearchBuckets = new Map();
    const tagBuckets = new Map();

    events.forEach((event) => {
      if (event.kind === "search") {
        counts.search += 1;
        if (event.resultCount === 0) counts.zeroSearch += 1;
        const key = JSON.stringify({
          query: event.query || "",
          includeTagIds: ensureArray(event.includeTagIds).slice().sort(),
          excludeTagIds: ensureArray(event.excludeTagIds).slice().sort(),
          matchMode: event.matchMode || "and",
        });
        const current = searchBuckets.get(key) || {
          query: event.query || "",
          includeTagIds: ensureArray(event.includeTagIds),
          excludeTagIds: ensureArray(event.excludeTagIds),
          matchMode: event.matchMode || "and",
          count: 0,
          zeroCount: 0,
        };
        current.count += 1;
        if (event.resultCount === 0) {
          current.zeroCount += 1;
          zeroSearchBuckets.set(key, current);
        }
        searchBuckets.set(key, current);

        ensureArray(event.includeTagIds).forEach((tagId) => {
          tagBuckets.set(tagId, (tagBuckets.get(tagId) || 0) + 1);
        });
      }
      if (event.kind === "result_click") counts.resultClick += 1;
      if (event.kind === "detail_view") counts.detailView += 1;
      if (event.kind === "outbound_click") counts.outboundClick += 1;
    });

    const mapSearchItem = (item) => ({
      ...item,
      includeLabels: item.includeTagIds.map((tagId) => tagMap.get(tagId)?.label || tagId),
      excludeLabels: item.excludeTagIds.map((tagId) => tagMap.get(tagId)?.label || tagId),
    });

    const topSearches = Array.from(searchBuckets.values())
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return left.query.localeCompare(right.query, "ja");
      })
      .slice(0, 5)
      .map(mapSearchItem);

    const topZeroSearches = Array.from(zeroSearchBuckets.values())
      .sort((left, right) => right.zeroCount - left.zeroCount)
      .slice(0, 5)
      .map(mapSearchItem);

    const topTags = Array.from(tagBuckets.entries())
      .map(([tagId, count]) => ({
        tagId,
        label: tagMap.get(tagId)?.label || tagId,
        count,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6);

    const recentEvents = events.slice(0, 8).map((event) => ({
      ...event,
      workTitle: event.workId ? workMap.get(event.workId)?.title || event.workId : "",
      includeLabels: ensureArray(event.includeTagIds).map((tagId) => tagMap.get(tagId)?.label || tagId),
      excludeLabels: ensureArray(event.excludeTagIds).map((tagId) => tagMap.get(tagId)?.label || tagId),
    }));

    return {
      counts,
      topSearches,
      topZeroSearches,
      topTags,
      recentEvents,
    };
  };

  return {
    cloneData,
    decorateCollection,
    detectDuplicateWorks,
    ensureArray,
    filterWorks,
    findSimilarWorks,
    buildRelaxationSuggestions,
    getActiveProfile,
    getCollection,
    getCollectionMap,
    getCollectionWorks,
    getProfile,
    getProfileCollections,
    getProfileWorks,
    getTagMap,
    getUsedTagIds,
    getVisibleTags,
    groupTags,
    aggregateLogs,
    normalizeText,
    getCollectionPath,
    slugify,
    splitTokens,
    getWorkPath,
    suggestWorks,
    unique,
  };
});
