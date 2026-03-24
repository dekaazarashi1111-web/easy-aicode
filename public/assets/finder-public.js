(function (root, factory) {
  root.FinderPublic = factory(root.FinderStore, root.FinderCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (store, core) {
  if (!store || !core) return {};

  const SORT_META = {
    recommended: {
      label: "厳密一致順",
      description: "一致タグと表示優先度を重視します。",
    },
    latest: {
      label: "新着順",
      description: "公開日が新しい順に並べます。",
    },
    updated: {
      label: "更新順",
      description: "更新日が新しい順に並べます。",
    },
    title: {
      label: "タイトル順",
      description: "タイトルの五十音順に並べます。",
    },
  };

  const createText = (tagName, className, text) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  };

  const createTagChip = ({ label, href = "", className = "tag" }) => {
    const element = document.createElement(href ? "a" : "span");
    element.className = className;
    element.textContent = label;
    if (href) element.href = href;
    return element;
  };

  const createButton = ({
    label,
    className = "",
    dataset = {},
    pressed = null,
    disabled = false,
    type = "button",
  }) => {
    const button = document.createElement("button");
    button.type = type;
    button.className = className;
    button.textContent = label;
    Object.entries(dataset).forEach(([key, value]) => {
      button.dataset[key] = value;
    });
    if (pressed !== null) button.setAttribute("aria-pressed", String(pressed));
    button.disabled = disabled;
    return button;
  };

  const emptyState = (root, message) => {
    if (!root) return;
    root.textContent = "";
    root.appendChild(createText("p", "help", message));
  };

  const unique = (values) => core.unique(values);

  const toFinderUrl = ({
    query = "",
    creatorQuery = "",
    sort = "recommended",
    collectionId = "",
    includeTagIds = [],
    excludeTagIds = [],
    matchMode = "and",
  }) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (creatorQuery) params.set("creator", creatorQuery);
    if (sort && sort !== "recommended") params.set("sort", sort);
    if (collectionId) params.set("collection", collectionId);
    if (matchMode === "or") params.set("mode", "or");
    unique(includeTagIds).forEach((tagId) => params.append("include", tagId));
    unique(excludeTagIds).forEach((tagId) => params.append("exclude", tagId));
    return `/finder/${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const updateUrl = (nextState) => {
    const finderUrl = new URL(toFinderUrl(nextState), window.location.origin);
    const nextUrl = `${window.location.pathname}${finderUrl.search}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  };

  const loadDecoratedWorks = (state, profileId) =>
    core.filterWorks({
      state,
      profileId,
      query: "",
      creatorQuery: "",
      includeTagIds: [],
      excludeTagIds: [],
      sort: "recommended",
      matchMode: "and",
    });

  const getUiState = (state) => state?.ui || {};

  const getWorkMap = (state, profileId) =>
    new Map(loadDecoratedWorks(state, profileId).map((work) => [work.id, work]));

  const getSortMeta = (sort) => SORT_META[sort] || SORT_META.recommended;

  const getSearchSummaryLabel = (search, tagMap) => {
    const parts = [];
    if (search.query) parts.push(`作品: ${search.query}`);
    if (search.creatorQuery) parts.push(`作者: ${search.creatorQuery}`);
    if (core.ensureArray(search.includeTagIds).length) {
      parts.push(
        `含める: ${search.includeTagIds
          .map((tagId) => tagMap.get(tagId)?.label || tagId)
          .join(" / ")}`
      );
    }
    if (core.ensureArray(search.excludeTagIds).length) {
      parts.push(
        `除外: ${search.excludeTagIds
          .map((tagId) => tagMap.get(tagId)?.label || tagId)
          .join(" / ")}`
      );
    }
    if (search.collectionId) parts.push("特集検索");
    if (search.matchMode === "or") parts.push("いずれか一致");
    return parts.join(" | ") || "条件なし";
  };

  const createFinderLink = ({ label, href, meta = "", className = "finder-mini-link" }) => {
    const link = document.createElement("a");
    const content = document.createElement("div");
    link.href = href;
    link.className = className;
    content.className = "finder-mini-link__body";
    content.append(createText("strong", "", label));
    if (meta) content.append(createText("span", "help", meta));
    link.append(content);
    return link;
  };

  const createWorkActionButton = ({ kind, workId, active }) => {
    const labels = {
      favorite: active ? "保存済み" : "保存",
      compare: active ? "比較中" : "比較",
    };
    return createButton({
      label: labels[kind],
      className: `work-action-chip work-action-chip--${kind}`,
      dataset: { workAction: kind, workId },
      pressed: active,
    });
  };

  const getVisualTone = (seed = "") => {
    const tones = ["sun", "sky", "clay", "mint", "stone"];
    let hash = 0;
    String(seed)
      .split("")
      .forEach((char) => {
        hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
      });
    return tones[Math.abs(hash) % tones.length];
  };

  const createWorkCard = ({
    work,
    profileId,
    reason = "",
    layout = "list",
    uiState = {},
    showActions = layout === "list",
  }) => {
    const article = document.createElement("article");
    const visual = document.createElement("div");
    const visualMeta = document.createElement("div");
    const visualBadgeLabel = document.createElement("span");
    const visualText = document.createElement("strong");
    const header = document.createElement("div");
    const content = document.createElement("div");
    const titleLink = document.createElement("a");
    const summary = document.createElement("p");
    const reasonText = document.createElement("p");
    const tagList = document.createElement("div");
    const meta = document.createElement("div");
    const footer = document.createElement("div");
    const actionCluster = document.createElement("div");
    const detailLink = document.createElement("a");
    const compareSet = new Set(core.ensureArray(uiState.compareWorkIds));
    const favoriteSet = new Set(core.ensureArray(uiState.favoriteWorkIds));
    const visualTone = getVisualTone(work.id || work.slug || work.title);
    const visualLink = document.createElement("a");
    const visualKind = work.format || "作品";
    const visualBadge = core.ensureArray(work.primaryTagObjects).some((tag) => tag.id === "gateway-pick")
      ? "SELECTED"
      : core.ensureArray(work.primaryTagObjects).some((tag) => tag.id === "tf-present")
        ? "POPULAR"
        : "NEW";

    article.className = `card work-card work-card--${layout}`;
    article.dataset.workId = work.id;
    article.dataset.tone = visualTone;

    visual.className = "work-card__visual";
    visualMeta.className = "work-card__visual-meta";
    visualBadgeLabel.className = "work-card__visual-label";
    visualBadgeLabel.textContent = visualBadge;
    visualText.textContent = work.creator || "サンプル作者";
    visualMeta.append(visualBadgeLabel, visualText);
    visualLink.className = "work-card__visual-link";
    visualLink.href = `/work/?slug=${encodeURIComponent(work.slug)}`;
    visualLink.dataset.workLink = "true";
    visualLink.dataset.workId = work.id;
    visualLink.append(
      createText("span", "work-card__visual-kind", visualKind),
      createText("strong", "work-card__visual-title", work.title),
      visualMeta
    );
    visual.append(visualLink);

    header.className = "work-card__header";
    header.append(
      createText("span", "work-card__creator", work.creator || "サンプル作者"),
      createText("span", "help", work.releasedAt || "公開日未設定")
    );

    titleLink.className = "work-card__title";
    titleLink.href = `/work/?slug=${encodeURIComponent(work.slug)}`;
    titleLink.dataset.workLink = "true";
    titleLink.dataset.workId = work.id;
    titleLink.textContent = work.title;

    summary.className = "work-card__summary";
    summary.textContent = work.shortDescription;

    reasonText.className = "work-card__reason";
    reasonText.textContent =
      reason || work.matchContext?.summary || work.matchSummary || work.publicNote || "";

    tagList.className = "tag-list";
    work.primaryTagObjects.forEach((tag) => {
      tagList.appendChild(
        createTagChip({
          label: tag.label,
          href: toFinderUrl({ includeTagIds: [tag.id] }),
        })
      );
    });

    meta.className = "work-card__meta";
    meta.append(
      createText("strong", "work-card__format", work.format || "作品"),
      createText("span", "help", work.highlightPoints?.[0] || "条件要約あり")
    );

    actionCluster.className = "work-card__actions";
    actionCluster.append(
      createWorkActionButton({
        kind: "favorite",
        workId: work.id,
        active: favoriteSet.has(work.id),
      }),
      createWorkActionButton({
        kind: "compare",
        workId: work.id,
        active: compareSet.has(work.id),
      })
    );

    detailLink.className = "btn btn--secondary btn--sm";
    detailLink.href = `/work/?slug=${encodeURIComponent(work.slug)}`;
    detailLink.dataset.workLink = "true";
    detailLink.dataset.workId = work.id;
    detailLink.textContent = layout === "compact" ? "詳細" : "詳細を見る";

    footer.className = showActions ? "work-card__footer" : "work-card__footer work-card__footer--solo";
    if (showActions) {
      footer.append(actionCluster, detailLink);
    } else {
      footer.append(detailLink);
    }

    content.className = "work-card__body";
    content.append(header, titleLink, summary, meta, reasonText, tagList, footer);
    article.append(visual, content);

    if (profileId && layout === "compact") {
      article.append(
        createText(
          "p",
          "help work-card__footnote",
          [work.format || "作品", work.releasedAt || ""].filter(Boolean).join(" / ")
        )
      );
    }

    return article;
  };

  const createCollectionCard = ({ collection, layout = "list" }) => {
    const article = document.createElement("article");
    const visual = document.createElement("div");
    const body = document.createElement("div");
    const header = document.createElement("div");
    const titleLink = document.createElement("a");
    const description = document.createElement("p");
    const tagList = document.createElement("div");
    const footer = document.createElement("div");
    const count = document.createElement("span");
    const detailLink = document.createElement("a");
    const visualTone = getVisualTone(collection.id || collection.slug || collection.title);

    article.className = `card collection-card collection-card--${layout}`;
    article.dataset.tone = visualTone;
    visual.className = "collection-card__visual";
    visual.append(
      createText("span", "collection-card__visual-label", "COLLECTION"),
      createText("strong", "collection-card__visual-title", collection.title)
    );

    header.className = "collection-card__meta";
    header.append(createText("span", "collection-card__creator", "固定導線"), createText("span", "help", "Curated"));

    titleLink.className = layout === "compact" ? "h3 collection-card__title" : "h2 collection-card__title";
    titleLink.href = `/collection/?slug=${encodeURIComponent(collection.slug)}`;
    titleLink.textContent = collection.title;

    description.className = "collection-card__summary";
    description.textContent = collection.description;

    tagList.className = "tag-list";
    collection.tagObjects.slice(0, 4).forEach((tag) => {
      tagList.appendChild(createTagChip({ label: tag.label }));
    });

    body.className = "collection-card__body";
    body.append(
      header,
      titleLink,
      description,
      tagList,
      createText("p", "help", collection.lead || "入口導線として使う固定特集です。")
    );

    count.className = "collection-card__count";
    count.textContent = `${collection.workObjects.length}件`;
    detailLink.className = "btn btn--secondary btn--sm";
    detailLink.href = `/collection/?slug=${encodeURIComponent(collection.slug)}`;
    detailLink.textContent = "特集を見る";

    footer.className = "collection-card__footer";
    footer.append(count, detailLink);
    body.append(footer);
    article.append(visual, body);

    return article;
  };

  const setMeta = ({ title = "", description = "", canonical = "" }) => {
    let canonicalUrl = canonical;
    if (canonical) {
      try {
        canonicalUrl = new URL(canonical, window.location.origin).href;
      } catch (error) {
        canonicalUrl = canonical;
      }
    }

    if (title) document.title = title;

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta && description) descriptionMeta.setAttribute("content", description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && title) ogTitle.setAttribute("content", title);

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle && title) twitterTitle.setAttribute("content", title);

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && description) ogDescription.setAttribute("content", description);

    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription && description) twitterDescription.setAttribute("content", description);

    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink && canonicalUrl) canonicalLink.setAttribute("href", canonicalUrl);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl && canonicalUrl) ogUrl.setAttribute("content", canonicalUrl);
  };

  const fillTextList = (root, items, renderItem) => {
    if (!root) return;
    root.textContent = "";
    core.ensureArray(items).forEach((item) => {
      root.appendChild(renderItem(item));
    });
  };

  const renderSavedSearchLinks = (root, searches, tagMap, { editable = false } = {}) => {
    if (!root) return;
    root.textContent = "";
    if (!searches.length) {
      emptyState(root, "まだ保存した検索はありません。");
      return;
    }
    searches.forEach((search) => {
      const item = document.createElement("div");
      item.className = "finder-mini-link finder-mini-link--saved";
      item.appendChild(
        createFinderLink({
          label: search.label || getSearchSummaryLabel(search, tagMap),
          href: toFinderUrl(search),
          meta: getSearchSummaryLabel(search, tagMap),
          className: "finder-mini-link finder-mini-link--button",
        })
      );
      if (editable) {
        item.appendChild(
          createButton({
            label: "削除",
            className: "btn btn--ghost btn--sm",
            dataset: { savedSearchDelete: search.id },
          })
        );
      }
      root.appendChild(item);
    });
  };

  const renderRecentWorkLinks = (root, works) => {
    if (!root) return;
    root.textContent = "";
    if (!works.length) {
      emptyState(root, "まだ閲覧履歴はありません。");
      return;
    }
    works.forEach((work) => {
      root.appendChild(
        createFinderLink({
          label: work.title,
          href: `/work/?slug=${encodeURIComponent(work.slug)}`,
          meta: [work.format, work.creator].filter(Boolean).join(" / "),
        })
      );
    });
  };

  const renderPopularSearchLinks = (root, searches, tagMap) => {
    if (!root) return;
    root.textContent = "";
    if (!searches.length) {
      emptyState(root, "まだ検索ログが少ないため、人気条件はこれから表示されます。");
      return;
    }
    searches.forEach((search) => {
      root.appendChild(
        createTagChip({
          label: search.label || getSearchSummaryLabel(search, tagMap),
          href: toFinderUrl(search),
          className: "tag tag--search-shortcut",
        })
      );
    });
  };

  const renderHomePage = () => {
    const root = document.querySelector("[data-home-page]");
    if (!root) return;

    const state = store.loadState();
    const profile = core.getActiveProfile(state);
    if (!profile) return;

    const tagMap = core.getTagMap(state);
    const summary = core.aggregateLogs(state);
    const uiState = getUiState(state);
    const workMap = getWorkMap(state, profile.id);
    const featuredCollections = core
      .getProfileCollections(state, profile.id, { publicOnly: true })
      .filter((collection) => core.ensureArray(profile.featuredCollectionIds).includes(collection.id))
      .map((collection) => core.decorateCollection(collection, state));
    const featuredWorks = core
      .getProfileWorks(state, profile.id, { publicOnly: true })
      .filter((work) => core.ensureArray(profile.featuredWorkIds).includes(work.id))
      .map((work) => workMap.get(work.id))
      .filter(Boolean);
    const recentWorks = core.ensureArray(uiState.recentWorkIds)
      .map((workId) => workMap.get(workId))
      .filter(Boolean)
      .slice(0, 4);
    const favoriteWorks = core.ensureArray(uiState.favoriteWorkIds)
      .map((workId) => workMap.get(workId))
      .filter(Boolean)
      .slice(0, 4);
    const groupedTags = core.groupTags(core.getVisibleTags(state, profile.id), state.tagGroups);
    const popularSearches = summary.topSearches.length
      ? summary.topSearches
      : core
          .getProfileCollections(state, profile.id, { publicOnly: true })
          .slice(0, 3)
          .map((collection) => ({
            label: collection.title,
            query: "",
            creatorQuery: "",
            includeTagIds: [],
            excludeTagIds: [],
            collectionId: collection.id,
            matchMode: "and",
            sort: "recommended",
          }));

    const setText = (selector, value) => {
      const element = root.querySelector(selector);
      if (element && value) element.textContent = value;
    };

    setText("[data-home-kicker]", profile.homeKicker || profile.shortName || "");
    setText("[data-home-title]", profile.heroTitle || "");
    setText("[data-home-description]", profile.homeIntro || profile.heroDescription || "");
    setText("[data-home-audience-note]", profile.audienceNote || "");

    fillTextList(root.querySelector("[data-home-value-props]"), profile.valueProps, (item) => {
      const card = document.createElement("article");
      const title = item.split("を")[0] || "運用軸";
      card.className = "card storefront-editorial-card stack";
      card.append(
        createText("p", "pill", "運用軸"),
        createText("h3", "h3", title),
        createText("p", "muted", item)
      );
      return card;
    });

    fillTextList(root.querySelector("[data-home-featured-collections]"), featuredCollections, (collection) =>
      createCollectionCard({ collection, layout: "compact" })
    );

    fillTextList(root.querySelector("[data-home-featured-works]"), featuredWorks, (work) =>
      createWorkCard({
        work,
        profileId: profile.id,
        reason: work.matchSummary || work.publicNote,
        layout: "compact",
        uiState,
        showActions: false,
      })
    );

    fillTextList(root.querySelector("[data-home-tag-groups]"), groupedTags.slice(0, 4), (group) => {
      const card = document.createElement("div");
      const list = document.createElement("div");
      card.className = "card storefront-category-card stack";
      list.className = "tag-list";
      group.tags.slice(0, 5).forEach((tag) => {
        list.appendChild(
          createTagChip({
            label: tag.label,
            href: toFinderUrl({ includeTagIds: [tag.id] }),
          })
        );
      });
      card.append(
        createText("p", "pill", "カテゴリー"),
        createText("h3", "h2", group.label),
        createText("p", "muted", group.description || ""),
        list
      );
      return card;
    });

    renderSavedSearchLinks(
      root.querySelector("[data-home-saved-searches]"),
      core.ensureArray(uiState.savedSearches).slice(0, 4),
      tagMap
    );
    renderRecentWorkLinks(root.querySelector("[data-home-recent-works]"), recentWorks);
    renderPopularSearchLinks(root.querySelector("[data-home-popular-searches]"), popularSearches, tagMap);

    const favoriteRoot = root.querySelector("[data-home-favorite-works]");
    if (favoriteRoot) {
      favoriteRoot.textContent = "";
      if (!favoriteWorks.length) {
        favoriteRoot.appendChild(createText("p", "help", "まだ保存した作品はありません。検索結果や作品詳細から保存できます。"));
      } else {
        favoriteWorks.forEach((work) => {
          favoriteRoot.appendChild(
            createWorkCard({
              work,
              profileId: profile.id,
              reason: work.matchSummary || work.publicNote,
              layout: "compact",
              uiState,
              showActions: false,
            })
          );
        });
      }
    }
  };

  const renderFinderPage = () => {
    const root = document.querySelector("[data-finder-app]");
    if (!root) return;

    const queryInput = root.querySelector("[data-finder-query]");
    const creatorInput = root.querySelector("[data-finder-creator]");
    const sortSelect = root.querySelector("[data-finder-sort]");
    const sortNoteRoot = root.querySelector("[data-finder-sort-note]");
    const groupsRoot = root.querySelector("[data-finder-groups]");
    const resultsRoot = root.querySelector("[data-finder-results]");
    const activeRoot = root.querySelector("[data-finder-active]");
    const emptyRoot = root.querySelector("[data-finder-empty]");
    const statusRoot = root.querySelector("[data-finder-status]");
    const clearButton = root.querySelector("[data-finder-clear]");
    const copyButton = root.querySelector("[data-finder-copy]");
    const saveButton = root.querySelector("[data-finder-save-search]");
    const titleRoot = root.querySelector("[data-profile-hero-title]");
    const descriptionRoot = root.querySelector("[data-profile-hero-description]");
    const tipsRoot = root.querySelector("[data-profile-search-tips]");
    const presetsRoot = root.querySelector("[data-finder-presets]");
    const popularSearchRoot = root.querySelector("[data-finder-popular-searches]");
    const savedSearchRoot = root.querySelector("[data-finder-saved-searches]");
    const recentRoot = root.querySelector("[data-finder-recent]");
    const suggestionsRoot = root.querySelector("[data-finder-suggestions]");
    const suggestionsWrap = root.querySelector("[data-finder-suggestions-wrap]");
    const rescueRoot = root.querySelector("[data-finder-rescue]");
    const compareRoot = root.querySelector("[data-finder-compare]");
    const compareItemsRoot = root.querySelector("[data-compare-items]");
    const compareGridRoot = root.querySelector("[data-compare-grid]");
    const compareClearButton = root.querySelector("[data-compare-clear]");
    const modeButtons = Array.from(root.querySelectorAll("[data-finder-mode]"));
    if (
      !queryInput ||
      !creatorInput ||
      !sortSelect ||
      !groupsRoot ||
      !resultsRoot ||
      !activeRoot
    ) {
      return;
    }

    let state = store.loadState();
    const profile = core.getActiveProfile(state);
    const visibleTags = core.getVisibleTags(state, profile?.id);
    const groupedTags = core.groupTags(visibleTags, state.tagGroups);
    const tagMap = core.getTagMap(state);
    let logTimer = null;
    let lastLogSignature = "";

    const pageState = {
      query: "",
      creatorQuery: "",
      includeTagIds: [],
      excludeTagIds: [],
      sort: "recommended",
      collectionId: "",
      matchMode: "and",
    };

    const readUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      pageState.query = params.get("q") || "";
      pageState.creatorQuery = params.get("creator") || "";
      pageState.sort = params.get("sort") || "recommended";
      pageState.collectionId = params.get("collection") || "";
      pageState.matchMode = params.get("mode") === "or" ? "or" : "and";
      pageState.includeTagIds = unique(params.getAll("include"));
      pageState.excludeTagIds = unique(params.getAll("exclude"));
    };

    const getTagState = (tagId) => {
      if (pageState.includeTagIds.includes(tagId)) return "include";
      if (pageState.excludeTagIds.includes(tagId)) return "exclude";
      return "ignore";
    };

    const getUiStateFromStore = () => getUiState(store.loadState());

    const syncControls = () => {
      queryInput.value = pageState.query;
      creatorInput.value = pageState.creatorQuery;
      queryInput.placeholder = profile?.searchPlaceholder || queryInput.placeholder;
      sortSelect.value = pageState.sort;
      if (sortNoteRoot) sortNoteRoot.textContent = getSortMeta(pageState.sort).description;
      modeButtons.forEach((button) => {
        const isActive = button.dataset.finderMode === pageState.matchMode;
        button.setAttribute("aria-pressed", String(isActive));
      });
    };

    const renderTagGroups = () => {
      groupsRoot.textContent = "";
      groupedTags.forEach((group) => {
        const block = document.createElement("details");
        const summary = document.createElement("summary");
        const summaryLabel = document.createElement("span");
        const summaryMeta = document.createElement("span");
        const body = document.createElement("div");

        block.className = "plp-filter-group";
        block.open = true;
        summary.className = "plp-filter-group__summary";
        summaryLabel.textContent = group.label;
        summaryMeta.className = "help";
        summaryMeta.textContent = `${group.tags.length}条件`;
        summary.append(summaryLabel, summaryMeta);
        block.append(summary);
        if (group.description) {
          block.append(createText("p", "help plp-filter-group__description", group.description));
        }

        body.className = "plp-filter-group__body";

        group.tags.forEach((tag) => {
          const row = document.createElement("div");
          const info = document.createElement("div");
          const controls = document.createElement("div");
          const includeCount = core.filterWorks({
            state,
            profileId: profile?.id,
            query: pageState.query,
            creatorQuery: pageState.creatorQuery,
            includeTagIds: unique([...pageState.includeTagIds.filter((id) => id !== tag.id), tag.id]),
            excludeTagIds: pageState.excludeTagIds.filter((id) => id !== tag.id),
            sort: "recommended",
            collectionId: pageState.collectionId,
            matchMode: pageState.matchMode,
          }).length;
          const tagState = getTagState(tag.id);

          row.className = `plp-filter-row plp-filter-row--${tagState}`;
          info.className = "plp-filter-row__info";
          info.append(
            createText("strong", "", tag.label),
            createText(
              "span",
              "help",
              includeCount > 0 ? `含めると ${includeCount}件` : "この条件では候補なし"
            )
          );

          controls.className = "plp-filter-row__controls";
          controls.append(
            createButton({
              label: "無視",
              className: "plp-filter-chip",
              dataset: { filterTagId: tag.id, filterState: "ignore" },
              pressed: tagState === "ignore",
            }),
            createButton({
              label: "含める",
              className: "plp-filter-chip plp-filter-chip--include",
              dataset: { filterTagId: tag.id, filterState: "include" },
              pressed: tagState === "include",
              disabled: includeCount === 0 && tagState !== "include",
            }),
            createButton({
              label: "除外",
              className: "plp-filter-chip plp-filter-chip--exclude",
              dataset: { filterTagId: tag.id, filterState: "exclude" },
              pressed: tagState === "exclude",
            })
          );

          row.append(info, controls);
          body.append(row);
        });

        block.append(body);
        groupsRoot.appendChild(block);
      });
    };

    const renderActiveConditions = () => {
      activeRoot.textContent = "";
      if (pageState.query) {
        activeRoot.appendChild(createButton({
          label: `作品: ${pageState.query}`,
          className: "tag-filter__btn",
          dataset: { removeKind: "query", removeValue: pageState.query },
        }));
      }
      if (pageState.creatorQuery) {
        activeRoot.appendChild(createButton({
          label: `作者: ${pageState.creatorQuery}`,
          className: "tag-filter__btn",
          dataset: { removeKind: "creatorQuery", removeValue: pageState.creatorQuery },
        }));
      }
      if (pageState.matchMode === "or") {
        activeRoot.appendChild(createButton({
          label: "条件: いずれか一致",
          className: "tag-filter__btn",
          dataset: { removeKind: "mode", removeValue: "or" },
        }));
      }
      pageState.includeTagIds.forEach((tagId) => {
        const tag = tagMap.get(tagId);
        if (!tag) return;
        activeRoot.appendChild(createButton({
          label: `含める: ${tag.label}`,
          className: "tag-filter__btn",
          dataset: { removeKind: "include", removeValue: tagId },
        }));
      });
      pageState.excludeTagIds.forEach((tagId) => {
        const tag = tagMap.get(tagId);
        if (!tag) return;
        activeRoot.appendChild(createButton({
          label: `除外: ${tag.label}`,
          className: "tag-filter__btn",
          dataset: { removeKind: "exclude", removeValue: tagId },
        }));
      });
      if (pageState.collectionId) {
        const collection = core.getCollection(state, pageState.collectionId);
        if (collection) {
          activeRoot.appendChild(createButton({
            label: `特集: ${collection.title}`,
            className: "tag-filter__btn",
            dataset: { removeKind: "collection", removeValue: collection.id },
          }));
        }
      }
    };

    const scheduleLog = (resultCount) => {
      const shouldLog =
        pageState.query ||
        pageState.creatorQuery ||
        pageState.includeTagIds.length ||
        pageState.excludeTagIds.length ||
        pageState.collectionId ||
        resultCount === 0;
      if (!shouldLog) return;

      const signature = JSON.stringify({
        query: pageState.query,
        creatorQuery: pageState.creatorQuery,
        include: pageState.includeTagIds.slice().sort(),
        exclude: pageState.excludeTagIds.slice().sort(),
        collection: pageState.collectionId,
        sort: pageState.sort,
        matchMode: pageState.matchMode,
        resultCount,
      });
      if (signature === lastLogSignature) return;

      window.clearTimeout(logTimer);
      logTimer = window.setTimeout(() => {
        store.logEvent("search", {
          profileId: profile?.id || "",
          query: pageState.query,
          creatorQuery: pageState.creatorQuery,
          includeTagIds: pageState.includeTagIds,
          excludeTagIds: pageState.excludeTagIds,
          collectionId: pageState.collectionId,
          matchMode: pageState.matchMode,
          resultCount,
        });
        lastLogSignature = signature;
      }, 350);
    };

    const renderSavedSearches = () => {
      state = store.loadState();
      renderSavedSearchLinks(savedSearchRoot, core.ensureArray(state.ui?.savedSearches), tagMap, {
        editable: true,
      });
    };

    const renderPopularSearches = () => {
      state = store.loadState();
      const summary = core.aggregateLogs(state);
      const popularSearches = summary.topSearches.length
        ? summary.topSearches
        : core
            .getProfileCollections(state, profile?.id, { publicOnly: true })
            .slice(0, 3)
            .map((collection) => ({
              label: collection.title,
              query: "",
              creatorQuery: "",
              includeTagIds: [],
              excludeTagIds: [],
              collectionId: collection.id,
              matchMode: "and",
              sort: "recommended",
            }));
      renderPopularSearchLinks(popularSearchRoot, popularSearches, tagMap);
    };

    const renderRecentWorks = () => {
      state = store.loadState();
      const uiState = getUiState(state);
      const workMap = getWorkMap(state, profile?.id);
      const recentWorks = core.ensureArray(uiState.recentWorkIds)
        .map((workId) => workMap.get(workId))
        .filter(Boolean)
        .slice(0, 5);
      renderRecentWorkLinks(recentRoot, recentWorks);
    };

    const renderCompare = () => {
      if (!compareRoot || !compareItemsRoot || !compareGridRoot) return;
      state = store.loadState();
      const uiState = getUiState(state);
      const workMap = getWorkMap(state, profile?.id);
      const compareWorks = core.ensureArray(uiState.compareWorkIds)
        .map((workId) => workMap.get(workId))
        .filter(Boolean);

      compareItemsRoot.textContent = "";
      compareGridRoot.textContent = "";
      compareRoot.hidden = compareWorks.length === 0;
      if (!compareWorks.length) return;

      compareWorks.forEach((work) => {
        const item = document.createElement("div");
        item.className = "compare-pill";
        item.append(
          createText("strong", "", work.title),
          createText("span", "help", [work.format, work.creator].filter(Boolean).join(" / ")),
          createButton({
            label: "外す",
            className: "btn btn--ghost btn--sm",
            dataset: { workAction: "compare", workId: work.id },
          })
        );
        compareItemsRoot.appendChild(item);
      });

      if (compareWorks.length === 1) {
        compareGridRoot.appendChild(createText("p", "help", "比較するには、もう1件候補を追加してください。"));
        return;
      }

      compareWorks.forEach((work) => {
        const column = document.createElement("article");
        const tags = document.createElement("div");
        column.className = "card compare-column stack";
        tags.className = "tag-list";
        work.primaryTagObjects.forEach((tag) => tags.appendChild(createTagChip({ label: tag.label })));
        column.append(
          createText("h3", "h3", work.title),
          createText("p", "help", [work.format, work.creator].filter(Boolean).join(" / ")),
          createText("p", "muted", work.shortDescription),
          createText("p", "work-card__reason", work.matchSummary || work.publicNote),
          tags,
          createText("p", "help", `公開: ${work.releasedAt || "未設定"}`),
          createText("p", "help", `特集: ${core.ensureArray(work.collectionObjects).map((collection) => collection.title).join(" / ") || "なし"}`)
        );
        compareGridRoot.appendChild(column);
      });
    };

    const renderSuggestions = (filtered) => {
      if (!suggestionsRoot) return;
      suggestionsRoot.textContent = "";
      if (suggestionsWrap) suggestionsWrap.hidden = filtered.length !== 0;
      if (filtered.length) return;

      const uiState = getUiState(state);
      const suggestions = core.suggestWorks({
        state,
        profileId: profile?.id,
        query: pageState.query,
        includeTagIds: pageState.includeTagIds,
        excludeTagIds: pageState.excludeTagIds,
        limit: 3,
      });
      suggestions.forEach((work) => {
        suggestionsRoot.appendChild(
          createWorkCard({
            work,
            profileId: profile?.id,
            reason:
              work.suggestionSharedTags.length
                ? `近い条件: ${work.suggestionSharedTags
                    .map((tagId) => tagMap.get(tagId)?.label || tagId)
                    .join(" / ")}`
                : work.matchSummary,
            layout: "list",
            uiState,
          })
        );
      });
      if (!suggestionsRoot.childElementCount && suggestionsWrap) {
        suggestionsWrap.hidden = true;
      }
    };

    const renderRescue = () => {
      if (!rescueRoot) return;
      rescueRoot.textContent = "";
      const relaxations = core.buildRelaxationSuggestions({
        state,
        profileId: profile?.id,
        query: pageState.query,
        creatorQuery: pageState.creatorQuery,
        includeTagIds: pageState.includeTagIds,
        excludeTagIds: pageState.excludeTagIds,
        sort: pageState.sort,
        collectionId: pageState.collectionId,
        matchMode: pageState.matchMode,
        limit: 5,
      });

      if (!relaxations.length) {
        rescueRoot.appendChild(createText("p", "help", "緩和候補はまだありません。特集や近い候補から探してください。"));
        return;
      }

      relaxations.forEach((suggestion, index) => {
        const button = createButton({
          label: `${suggestion.label} (${suggestion.resultCount}件)`,
          className: "finder-relax-btn",
          dataset: {
            rescueIndex: String(index),
            rescueState: JSON.stringify(suggestion.nextState),
          },
        });
        const wrapper = document.createElement("div");
        wrapper.className = "finder-relax-item";
        wrapper.append(button, createText("p", "help", suggestion.description));
        rescueRoot.appendChild(wrapper);
      });
    };

    const renderResults = () => {
      state = store.loadState();
      const collection = pageState.collectionId ? core.getCollection(state, pageState.collectionId) : null;
      const uiState = getUiState(state);
      const filtered = core.filterWorks({
        state,
        profileId: profile?.id,
        query: pageState.query,
        creatorQuery: pageState.creatorQuery,
        includeTagIds: pageState.includeTagIds,
        excludeTagIds: pageState.excludeTagIds,
        sort: pageState.sort,
        collectionId: pageState.collectionId,
        matchMode: pageState.matchMode,
      });

      resultsRoot.textContent = "";
      filtered.forEach((work) => {
        resultsRoot.appendChild(
          createWorkCard({
            work,
            profileId: profile?.id,
            reason: work.matchContext?.summary || work.matchSummary,
            layout: "list",
            uiState,
          })
        );
      });

      if (emptyRoot) emptyRoot.hidden = filtered.length !== 0;
      renderSuggestions(filtered);
      renderRescue();

      if (statusRoot) {
        const fragments = [];
        if (pageState.query) fragments.push(`作品: ${pageState.query}`);
        if (pageState.creatorQuery) fragments.push(`作者: ${pageState.creatorQuery}`);
        if (pageState.matchMode === "or") fragments.push("いずれか一致");
        if (pageState.includeTagIds.length) {
          fragments.push(
            `含める: ${pageState.includeTagIds
              .map((tagId) => tagMap.get(tagId)?.label || tagId)
              .join(" / ")}`
          );
        }
        if (pageState.excludeTagIds.length) {
          fragments.push(
            `除外: ${pageState.excludeTagIds
              .map((tagId) => tagMap.get(tagId)?.label || tagId)
              .join(" / ")}`
          );
        }
        if (collection) fragments.push(`特集: ${collection.title}`);
        statusRoot.textContent = `${filtered.length}件 | ${getSortMeta(pageState.sort).label} | ${fragments.length ? fragments.join(" | ") : "条件なし"}`;
      }

      renderActiveConditions();
      renderCompare();
      renderSavedSearches();
      renderPopularSearches();
      renderRecentWorks();
      scheduleLog(filtered.length);
    };

    const applyAndRender = () => {
      syncControls();
      updateUrl(pageState);
      renderTagGroups();
      renderResults();
    };

    const renderPresets = () => {
      if (!presetsRoot) return;
      presetsRoot.textContent = "";
      core
        .getProfileCollections(state, profile?.id, { publicOnly: true })
        .filter((collection) => core.ensureArray(profile?.featuredCollectionIds).includes(collection.id))
        .forEach((collection) => {
          presetsRoot.appendChild(
            createTagChip({
              label: collection.title,
              href: toFinderUrl({ collectionId: collection.id }),
            })
          );
        });
    };

    const renderTips = () => {
      if (!tipsRoot) return;
      fillTextList(tipsRoot, profile?.searchTips, (item) => createText("li", "", item));
    };

    readUrlState();
    if (titleRoot && profile?.heroTitle) titleRoot.textContent = profile.heroTitle;
    if (descriptionRoot && profile?.heroDescription) descriptionRoot.textContent = profile.heroDescription;
    renderTips();
    renderPresets();
    applyAndRender();

    root.addEventListener("click", (event) => {
      const filterButton = event.target.closest("[data-filter-tag-id]");
      if (filterButton) {
        const tagId = filterButton.dataset.filterTagId;
        const nextState = filterButton.dataset.filterState;
        pageState.includeTagIds = pageState.includeTagIds.filter((value) => value !== tagId);
        pageState.excludeTagIds = pageState.excludeTagIds.filter((value) => value !== tagId);
        if (nextState === "include") pageState.includeTagIds = unique([...pageState.includeTagIds, tagId]);
        if (nextState === "exclude") pageState.excludeTagIds = unique([...pageState.excludeTagIds, tagId]);
        applyAndRender();
        return;
      }

      const removeButton = event.target.closest("[data-remove-kind]");
      if (removeButton) {
        const kind = removeButton.dataset.removeKind;
        const value = removeButton.dataset.removeValue;
        if (kind === "query") pageState.query = "";
        if (kind === "creatorQuery") pageState.creatorQuery = "";
        if (kind === "mode") pageState.matchMode = "and";
        if (kind === "include") pageState.includeTagIds = pageState.includeTagIds.filter((id) => id !== value);
        if (kind === "exclude") pageState.excludeTagIds = pageState.excludeTagIds.filter((id) => id !== value);
        if (kind === "collection") pageState.collectionId = "";
        applyAndRender();
        return;
      }

      const modeButton = event.target.closest("[data-finder-mode]");
      if (modeButton) {
        pageState.matchMode = modeButton.dataset.finderMode === "or" ? "or" : "and";
        applyAndRender();
        return;
      }

      const actionButton = event.target.closest("[data-work-action]");
      if (actionButton) {
        const workId = actionButton.dataset.workId;
        const action = actionButton.dataset.workAction;
        if (!workId || !action) return;
        if (action === "favorite") store.toggleFavoriteWork(workId);
        if (action === "compare") store.toggleCompareWork(workId);
        renderResults();
        return;
      }

      const link = event.target.closest("[data-work-link]");
      if (link) {
        store.logEvent("result_click", {
          profileId: profile?.id || "",
          workId: link.dataset.workId || "",
          query: pageState.query,
          creatorQuery: pageState.creatorQuery,
          includeTagIds: pageState.includeTagIds,
          excludeTagIds: pageState.excludeTagIds,
          collectionId: pageState.collectionId,
          matchMode: pageState.matchMode,
        });
        return;
      }

      const deleteSavedSearchButton = event.target.closest("[data-saved-search-delete]");
      if (deleteSavedSearchButton) {
        store.deleteSavedSearch(deleteSavedSearchButton.dataset.savedSearchDelete || "");
        renderSavedSearches();
        return;
      }

      const rescueButton = event.target.closest("[data-rescue-state]");
      if (rescueButton) {
        try {
          const nextState = JSON.parse(rescueButton.dataset.rescueState || "{}");
          pageState.query = nextState.query || "";
          pageState.creatorQuery = nextState.creatorQuery || "";
          pageState.includeTagIds = unique(nextState.includeTagIds);
          pageState.excludeTagIds = unique(nextState.excludeTagIds);
          pageState.collectionId = nextState.collectionId || "";
          pageState.matchMode = nextState.matchMode === "or" ? "or" : "and";
          pageState.sort = nextState.sort || pageState.sort;
          applyAndRender();
        } catch (error) {
          // ignore malformed state payloads
        }
        return;
      }

      if (event.target.closest("[data-compare-clear]")) {
        const compareIds = core.ensureArray(store.loadState().ui?.compareWorkIds);
        compareIds.forEach((workId) => store.toggleCompareWork(workId));
        renderResults();
      }
    });

    queryInput.addEventListener("input", () => {
      pageState.query = queryInput.value.trim();
      applyAndRender();
    });

    creatorInput.addEventListener("input", () => {
      pageState.creatorQuery = creatorInput.value.trim();
      applyAndRender();
    });

    sortSelect.addEventListener("change", () => {
      pageState.sort = sortSelect.value;
      applyAndRender();
    });

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        pageState.query = "";
        pageState.creatorQuery = "";
        pageState.includeTagIds = [];
        pageState.excludeTagIds = [];
        pageState.sort = "recommended";
        pageState.collectionId = "";
        pageState.matchMode = "and";
        applyAndRender();
      });
    }

    if (saveButton) {
      saveButton.addEventListener("click", () => {
        const defaultLabel = getSearchSummaryLabel(pageState, tagMap);
        const label = window.prompt("保存する検索名", defaultLabel === "条件なし" ? "マイ検索" : defaultLabel);
        if (label === null) return;
        store.upsertSavedSearch({
          label,
          query: pageState.query,
          creatorQuery: pageState.creatorQuery,
          includeTagIds: pageState.includeTagIds,
          excludeTagIds: pageState.excludeTagIds,
          collectionId: pageState.collectionId,
          matchMode: pageState.matchMode,
          sort: pageState.sort,
        });
        renderSavedSearches();
      });
    }

    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          copyButton.textContent = "コピー済み";
          window.setTimeout(() => {
            copyButton.textContent = "検索URLをコピー";
          }, 1400);
        } catch (error) {
          copyButton.textContent = "コピー失敗";
          window.setTimeout(() => {
            copyButton.textContent = "検索URLをコピー";
          }, 1400);
        }
      });
    }
  };

  const renderWorkPage = () => {
    const root = document.querySelector("[data-work-page]");
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug") || "";
    let state = store.loadState();
    const profile = core.getActiveProfile(state);
    const work = core
      .getProfileWorks(state, profile?.id, { publicOnly: true })
      .find((item) => item.slug === slug);
    const notFound = root.querySelector("[data-work-not-found]");
    const content = root.querySelector("[data-work-content]");
    if (!work) {
      if (notFound) notFound.hidden = false;
      if (content) content.hidden = true;
      return;
    }

    store.touchRecentWork(work.id);
    state = store.loadState();

    const decoratedWork = core.filterWorks({
      state,
      profileId: profile?.id,
      query: "",
      creatorQuery: "",
      includeTagIds: [],
      excludeTagIds: [],
      sort: "recommended",
    }).find((item) => item.id === work.id);

    const titleRoot = root.querySelector("[data-work-title]");
    const summaryRoot = root.querySelector("[data-work-summary]");
    const noteRoot = root.querySelector("[data-work-note]");
    const tagRoot = root.querySelector("[data-work-tags]");
    const linksRoot = root.querySelector("[data-work-links]");
    const actionsRoot = root.querySelector("[data-work-actions]");
    const searchLinksRoot = root.querySelector("[data-work-search-links]");
    const similarRoot = root.querySelector("[data-work-similar]");
    const collectionRoot = root.querySelector("[data-work-collections]");
    const creatorRoot = root.querySelector("[data-work-creator]");
    const formatRoot = root.querySelector("[data-work-format]");
    const reasonRoot = root.querySelector("[data-work-reason]");
    const cautionRoot = root.querySelector("[data-work-caution]");
    const pointsRoot = root.querySelector("[data-work-points]");
    const breadcrumbRoot = root.querySelector("[data-work-breadcrumb]");
    const releaseRoot = root.querySelector("[data-work-release]");
    const tagCountRoot = root.querySelector("[data-work-tag-count]");

    if (titleRoot) titleRoot.textContent = work.title;
    if (summaryRoot) summaryRoot.textContent = work.shortDescription;
    if (noteRoot) noteRoot.textContent = work.publicNote;
    if (creatorRoot) creatorRoot.textContent = work.creator || "サンプル作者";
    if (formatRoot) formatRoot.textContent = work.format || "作品";
    if (reasonRoot) reasonRoot.textContent = work.matchSummary || work.publicNote;
    if (cautionRoot) cautionRoot.textContent = work.cautionNote || "強い注意点はまだ登録されていません。";
    if (breadcrumbRoot) breadcrumbRoot.textContent = `ホーム / 作品検索 / ${work.title}`;
    if (releaseRoot) releaseRoot.textContent = `公開: ${work.releasedAt || "未設定"}`;
    if (tagCountRoot) {
      tagCountRoot.textContent = `主要タグ: ${core.ensureArray(decoratedWork?.primaryTagObjects).length}件`;
    }

    if (pointsRoot) {
      fillTextList(pointsRoot, work.highlightPoints, (item) => createText("li", "", item));
    }

    if (tagRoot) {
      tagRoot.textContent = "";
      core.ensureArray(decoratedWork?.primaryTagObjects).forEach((tag) => {
        tagRoot.appendChild(
          createTagChip({
            label: tag.label,
            href: toFinderUrl({ includeTagIds: [tag.id] }),
          })
        );
      });
    }

    const renderWorkActions = () => {
      if (!actionsRoot) return;
      const currentUiState = getUiState(store.loadState());
      actionsRoot.textContent = "";
      actionsRoot.append(
        createWorkActionButton({
          kind: "favorite",
          workId: work.id,
          active: core.ensureArray(currentUiState.favoriteWorkIds).includes(work.id),
        }),
        createWorkActionButton({
          kind: "compare",
          workId: work.id,
          active: core.ensureArray(currentUiState.compareWorkIds).includes(work.id),
        }),
        createText(
          "p",
          "help",
          `比較トレイ: ${core.ensureArray(currentUiState.compareWorkIds).length}件`
        )
      );
    };

    renderWorkActions();

    if (searchLinksRoot) {
      searchLinksRoot.textContent = "";
      const primaryTags = core.ensureArray(decoratedWork?.primaryTagObjects);
      const startTagIds = primaryTags.slice(0, 2).map((tag) => tag.id);
      if (startTagIds.length) {
        searchLinksRoot.appendChild(
          createFinderLink({
            label: "主要タグを起点に一覧を見る",
            href: toFinderUrl({ includeTagIds: startTagIds }),
            meta: primaryTags.slice(0, 2).map((tag) => tag.label).join(" / "),
          })
        );
      }
      if (work.creator) {
        searchLinksRoot.appendChild(
          createFinderLink({
            label: "同作者から探す",
            href: toFinderUrl({ creatorQuery: work.creator }),
            meta: work.creator,
          })
        );
      }
      searchLinksRoot.appendChild(
        createFinderLink({
          label: "この条件をビルダーで編集する",
          href: `/builder/${new URL(toFinderUrl({ includeTagIds: startTagIds, creatorQuery: work.creator || "" }), window.location.origin).search}`,
          meta: "通常検索より細かく条件を追加できます。",
        })
      );
    }

    if (linksRoot) {
      linksRoot.textContent = "";
      core.ensureArray(work.externalLinks).forEach((link) => {
        const anchor = document.createElement("a");
        anchor.className = "btn btn--primary";
        anchor.href = link.url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.dataset.outboundWorkId = work.id;
        anchor.textContent = link.label || "外部リンクを見る";
        linksRoot.appendChild(anchor);
      });
    }

    if (collectionRoot) {
      collectionRoot.textContent = "";
      core.ensureArray(work.collectionIds).forEach((collectionId) => {
        const collection = core.getCollection(state, collectionId);
        if (!collection) return;
        collectionRoot.appendChild(
          createTagChip({
            label: collection.title,
            href: `/collection/?slug=${encodeURIComponent(collection.slug)}`,
          })
        );
      });
    }

    if (similarRoot) {
      similarRoot.textContent = "";
      core.findSimilarWorks({ state, work, profileId: profile?.id, limit: 3 }).forEach((item) => {
        const sharedLabels = item.sharedTagIds
          .map((tagId) => core.getTagMap(state).get(tagId)?.label || tagId)
          .join(" / ");
        similarRoot.appendChild(
          createWorkCard({
            work: item,
            profileId: profile?.id,
            reason: sharedLabels ? `近い条件: ${sharedLabels}` : item.matchSummary,
            layout: "compact",
            showActions: false,
          })
        );
      });
      if (!similarRoot.childElementCount) {
        similarRoot.appendChild(createText("p", "help", "類似作品はまだ手動キュレーション前です。"));
      }
    }

    setMeta({
      title: `${work.title} | ${profile?.name || "作品ファインダー"}`,
      description: work.shortDescription || work.publicNote,
      canonical: `/work/?slug=${encodeURIComponent(work.slug)}`,
    });

    store.logEvent("detail_view", {
      profileId: profile?.id || "",
      workId: work.id,
      slug: work.slug,
    });

    if (!root.dataset.workEventsBound) {
      root.addEventListener("click", (event) => {
        const link = event.target.closest("[data-outbound-work-id]");
        if (link) {
          store.logEvent("outbound_click", {
            profileId: profile?.id || "",
            workId: link.dataset.outboundWorkId,
            href: link.getAttribute("href") || "",
          });
          return;
        }

        const actionButton = event.target.closest("[data-work-action]");
        if (!actionButton) return;
        const workId = actionButton.dataset.workId;
        const action = actionButton.dataset.workAction;
        if (!workId || !action) return;
        if (action === "favorite") store.toggleFavoriteWork(workId);
        if (action === "compare") store.toggleCompareWork(workId);
        renderWorkActions();
      });
      root.dataset.workEventsBound = "true";
    }
  };

  const renderCollectionsPage = () => {
    const root = document.querySelector("[data-collections-page]");
    if (!root) return;

    const state = store.loadState();
    const profile = core.getActiveProfile(state);
    const listRoot = root.querySelector("[data-collections-list]");
    const introRoot = root.querySelector("[data-collections-intro]");
    const recentRoot = root.querySelector("[data-collections-recent]");
    if (!listRoot) return;

    if (introRoot && profile?.valueProps) {
      fillTextList(introRoot, profile.valueProps, (item) => createText("li", "", item));
    }

    listRoot.textContent = "";
    core
      .getProfileCollections(state, profile?.id, { publicOnly: true })
      .map((collection) => core.decorateCollection(collection, state))
      .forEach((collection) => {
        listRoot.appendChild(createCollectionCard({ collection, layout: "list" }));
      });

    if (recentRoot) {
      const workMap = getWorkMap(state, profile?.id);
      const recentWorks = core.ensureArray(state.ui?.recentWorkIds)
        .map((workId) => workMap.get(workId))
        .filter(Boolean)
        .slice(0, 4);
      renderRecentWorkLinks(recentRoot, recentWorks);
    }
  };

  const renderCollectionPage = () => {
    const root = document.querySelector("[data-collection-page]");
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug") || "";
    const state = store.loadState();
    const profile = core.getActiveProfile(state);
    const collection = core
      .getProfileCollections(state, profile?.id, { publicOnly: true })
      .find((item) => item.slug === slug);

    const notFound = root.querySelector("[data-collection-not-found]");
    const content = root.querySelector("[data-collection-content]");
    if (!collection) {
      if (notFound) notFound.hidden = false;
      if (content) content.hidden = true;
      return;
    }

    const decorated = core.decorateCollection(collection, state);
    const works = core.getCollectionWorks({
      state,
      profileId: profile?.id,
      collectionId: collection.id,
      sort: "recommended",
    });
    const uiState = getUiState(state);

    const setText = (selector, value) => {
      const element = root.querySelector(selector);
      if (element && value) element.textContent = value;
    };

    setText("[data-collection-title]", decorated.title);
    setText("[data-collection-description]", decorated.description);
    setText("[data-collection-lead]", decorated.lead || decorated.description);

    const tagsRoot = root.querySelector("[data-collection-tags]");
    if (tagsRoot) {
      tagsRoot.textContent = "";
      decorated.tagObjects.forEach((tag) => {
        tagsRoot.appendChild(
          createTagChip({
            label: tag.label,
            href: toFinderUrl({ includeTagIds: [tag.id], collectionId: collection.id }),
          })
        );
      });
    }

    fillTextList(root.querySelector("[data-collection-points]"), decorated.introPoints, (item) =>
      createText("li", "", item)
    );

    const worksRoot = root.querySelector("[data-collection-works]");
    if (worksRoot) {
      worksRoot.textContent = "";
      works.forEach((work) => {
        worksRoot.appendChild(
          createWorkCard({
            work,
            profileId: profile?.id,
            reason: work.matchSummary || work.publicNote,
            layout: "compact",
            uiState,
            showActions: false,
          })
        );
      });
    }

    const relatedRoot = root.querySelector("[data-collection-related]");
    if (relatedRoot) {
      relatedRoot.textContent = "";
      core
        .getProfileCollections(state, profile?.id, { publicOnly: true })
        .filter((item) => item.id !== collection.id)
        .slice(0, 4)
        .forEach((item) => {
          relatedRoot.appendChild(
            createTagChip({
              label: item.title,
              href: `/collection/?slug=${encodeURIComponent(item.slug)}`,
            })
          );
        });
    }

    const recentRoot = root.querySelector("[data-collection-recent]");
    if (recentRoot) {
      const workMap = getWorkMap(state, profile?.id);
      const recentWorks = core.ensureArray(state.ui?.recentWorkIds)
        .map((workId) => workMap.get(workId))
        .filter(Boolean)
        .slice(0, 4);
      renderRecentWorkLinks(recentRoot, recentWorks);
    }

    const finderLink = root.querySelector("[data-collection-finder-link]");
    if (finderLink) {
      finderLink.href = toFinderUrl({ collectionId: collection.id });
    }

    setMeta({
      title: `${collection.title} | ${profile?.name || "作品ファインダー"}`,
      description: collection.description,
      canonical: `/collection/?slug=${encodeURIComponent(collection.slug)}`,
    });
  };

  const bindGlobalInteractions = () => {
    if (typeof document === "undefined" || document.body?.dataset.finderGlobalBound) return;

    document.body.addEventListener("click", (event) => {
      const link = event.target.closest("[data-work-link]");
      if (!link || link.closest("[data-finder-app]")) return;

      const state = store.loadState();
      const profile = core.getActiveProfile(state);
      store.logEvent("result_click", {
        profileId: profile?.id || "",
        workId: link.dataset.workId || "",
        query: "",
        creatorQuery: "",
        includeTagIds: [],
        excludeTagIds: [],
        collectionId: "",
        matchMode: "and",
        sourcePath: window.location.pathname,
      });
    });

    document.body.dataset.finderGlobalBound = "true";
  };

  const init = () => {
    bindGlobalInteractions();
    renderHomePage();
    renderFinderPage();
    renderWorkPage();
    renderCollectionsPage();
    renderCollectionPage();
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  }

  return { init };
});
