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

  const getActiveProfile = (state) => {
    const profiles = ensureArray(state?.siteProfiles);
    if (!profiles.length) return null;
    return profiles.find((profile) => profile.id === state.activeProfileId) || profiles[0];
  };

  const getProfile = (state, profileId) => {
    if (!profileId) return getActiveProfile(state);
    return ensureArray(state?.siteProfiles).find((profile) => profile.id === profileId) || null;
  };

  const getTagMap = (state) =>
    new Map(ensureArray(state?.tags).map((tag) => [tag.id, tag]));

  const getWorkMap = (state) =>
    new Map(ensureArray(state?.works).map((work) => [work.id, work]));

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

  const getVisibleTags = (state, profileId) => {
    const profile = getProfile(state, profileId);
    const visibleGroups = new Set(ensureArray(profile?.visibleTagGroupIds));
    return ensureArray(state?.tags).filter((tag) => {
      if (!tag.isPublic) return false;
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
    return normalizeText(
      [
        work.title,
        work.shortDescription,
        work.publicNote,
        tagLabels.join(" "),
        tagSynonyms.join(" "),
        linkPartners.join(" "),
      ].join(" ")
    );
  };

  const decorateWork = (work, state) => {
    const tagMap = getTagMap(state);
    const tagObjects = ensureArray(work.tagIds)
      .map((tagId) => tagMap.get(tagId))
      .filter(Boolean);
    const primaryTagObjects = ensureArray(work.primaryTagIds)
      .map((tagId) => tagMap.get(tagId))
      .filter(Boolean);
    return {
      ...work,
      tagObjects,
      primaryTagObjects: primaryTagObjects.length ? primaryTagObjects : tagObjects.slice(0, 4),
      _searchText: getSearchText(work, tagMap),
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

  const filterWorks = ({
    state,
    profileId,
    query = "",
    includeTagIds = [],
    excludeTagIds = [],
    sort = "recommended",
    collectionId = "",
  }) => {
    const collection = collectionId ? getCollection(state, collectionId) : null;
    const includeIds = unique(includeTagIds);
    const excludeIds = unique(excludeTagIds);
    const queryTokens = splitTokens(query);
    const works = getProfileWorks(state, profileId, { publicOnly: true }).map((work) =>
      decorateWork(work, state)
    );

    return works
      .filter((work) => {
        const tagIds = new Set(ensureArray(work.tagIds));
        if (collection && !ensureArray(collection.workIds).includes(work.id)) return false;
        if (queryTokens.length && !queryTokens.every((token) => work._searchText.includes(token))) {
          return false;
        }
        if (includeIds.length && !includeIds.every((tagId) => tagIds.has(tagId))) return false;
        if (excludeIds.length && excludeIds.some((tagId) => tagIds.has(tagId))) return false;
        return true;
      })
      .sort((left, right) => compareBySort(left, right, sort));
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
    const tagBuckets = new Map();

    events.forEach((event) => {
      if (event.kind === "search") {
        counts.search += 1;
        if (event.resultCount === 0) counts.zeroSearch += 1;
        const key = JSON.stringify({
          query: event.query || "",
          includeTagIds: ensureArray(event.includeTagIds).slice().sort(),
          excludeTagIds: ensureArray(event.excludeTagIds).slice().sort(),
        });
        const current = searchBuckets.get(key) || {
          query: event.query || "",
          includeTagIds: ensureArray(event.includeTagIds),
          excludeTagIds: ensureArray(event.excludeTagIds),
          count: 0,
          zeroCount: 0,
        };
        current.count += 1;
        if (event.resultCount === 0) current.zeroCount += 1;
        searchBuckets.set(key, current);

        ensureArray(event.includeTagIds).forEach((tagId) => {
          tagBuckets.set(tagId, (tagBuckets.get(tagId) || 0) + 1);
        });
      }
      if (event.kind === "result_click") counts.resultClick += 1;
      if (event.kind === "detail_view") counts.detailView += 1;
      if (event.kind === "outbound_click") counts.outboundClick += 1;
    });

    const topSearches = Array.from(searchBuckets.values())
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return left.query.localeCompare(right.query, "ja");
      })
      .slice(0, 5)
      .map((item) => ({
        ...item,
        includeLabels: item.includeTagIds.map((tagId) => tagMap.get(tagId)?.label || tagId),
        excludeLabels: item.excludeTagIds.map((tagId) => tagMap.get(tagId)?.label || tagId),
      }));

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
      topTags,
      recentEvents,
    };
  };

  return {
    cloneData,
    ensureArray,
    getActiveProfile,
    getCollection,
    getProfile,
    getProfileWorks,
    getVisibleTags,
    getTagMap,
    groupTags,
    filterWorks,
    findSimilarWorks,
    detectDuplicateWorks,
    aggregateLogs,
    normalizeText,
    slugify,
    splitTokens,
    unique,
  };
});
