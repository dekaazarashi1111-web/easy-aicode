(function (root, factory) {
  root.FinderPublic = factory(root.FinderStore, root.FinderCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (store, core) {
  if (!store || !core) return {};

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

  const toFinderUrl = ({
    query = "",
    sort = "recommended",
    collectionId = "",
    includeTagIds = [],
    excludeTagIds = [],
    matchMode = "and",
  }) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sort && sort !== "recommended") params.set("sort", sort);
    if (collectionId) params.set("collection", collectionId);
    if (matchMode === "or") params.set("mode", "or");
    core.unique(includeTagIds).forEach((tagId) => params.append("include", tagId));
    core.unique(excludeTagIds).forEach((tagId) => params.append("exclude", tagId));
    return `/finder/${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const updateUrl = (nextState) => {
    const finderUrl = new URL(toFinderUrl(nextState), window.location.origin);
    const nextUrl = `${window.location.pathname}${finderUrl.search}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  };

  const createTagButton = ({ kind, tag, selected }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-filter__btn";
    button.dataset.filterKind = kind;
    button.dataset.tagId = tag.id;
    button.setAttribute("aria-pressed", String(selected));
    button.textContent = tag.label;
    return button;
  };

  const createActiveChip = (label, kind, value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-filter__btn";
    button.dataset.removeKind = kind;
    button.dataset.removeValue = value;
    button.textContent = label;
    return button;
  };

  const createWorkCard = ({ work, profileId, reason = "" }) => {
    const card = document.createElement("a");
    const eyebrow = document.createElement("div");
    const title = document.createElement("h2");
    const summary = document.createElement("p");
    const reasonText = document.createElement("p");
    const tagList = document.createElement("div");

    card.className = "card card--interactive stack result-card";
    card.href = `/work/?slug=${encodeURIComponent(work.slug)}`;
    card.dataset.workId = work.id;

    eyebrow.className = "result-meta";
    eyebrow.append(
      createText("span", "pill", work.format || "作品"),
      createText("span", "help", work.creator || "サンプル作者"),
    );

    title.className = "h2";
    title.textContent = work.title;

    summary.className = "muted";
    summary.textContent = work.shortDescription;

    reasonText.className = "help result-reason";
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

    if (profileId) {
      const footer = document.createElement("div");
      footer.className = "cluster cluster--spread";
      footer.append(
        createText("span", "help", "詳細へ"),
        createText("span", "help", work.releasedAt || "")
      );
      card.append(eyebrow, title, summary, reasonText, tagList, footer);
    } else {
      card.append(eyebrow, title, summary, reasonText, tagList);
    }

    return card;
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

  const renderHomePage = () => {
    const root = document.querySelector("[data-home-page]");
    if (!root) return;

    const state = store.loadState();
    const profile = core.getActiveProfile(state);
    if (!profile) return;

    const featuredCollections = core
      .getProfileCollections(state, profile.id, { publicOnly: true })
      .filter((collection) => core.ensureArray(profile.featuredCollectionIds).includes(collection.id))
      .map((collection) => core.decorateCollection(collection, state));

    const featuredWorks = core
      .getProfileWorks(state, profile.id, { publicOnly: true })
      .filter((work) => core.ensureArray(profile.featuredWorkIds).includes(work.id))
      .map((work) => {
        const decorated = core.filterWorks({
          state,
          profileId: profile.id,
          query: "",
          includeTagIds: [],
          excludeTagIds: [],
        }).find((item) => item.id === work.id);
        return decorated || work;
      });

    const groupedTags = core.groupTags(core.getVisibleTags(state, profile.id), state.tagGroups);

    const setText = (selector, value) => {
      const element = root.querySelector(selector);
      if (element && value) element.textContent = value;
    };

    setText("[data-home-kicker]", profile.homeKicker || profile.shortName || "");
    setText("[data-home-title]", profile.heroTitle || "");
    setText("[data-home-description]", profile.homeIntro || profile.heroDescription || "");
    setText("[data-home-audience-note]", profile.audienceNote || "");

    fillTextList(root.querySelector("[data-home-value-props]"), profile.valueProps, (item) =>
      createText("li", "", item)
    );

    fillTextList(root.querySelector("[data-home-search-tips]"), profile.searchTips, (item) =>
      createText("li", "", item)
    );

    fillTextList(root.querySelector("[data-home-featured-collections]"), featuredCollections, (collection) => {
      const card = document.createElement("a");
      card.className = "card card--interactive stack";
      card.href = `/collection/?slug=${encodeURIComponent(collection.slug)}`;
      card.append(
        createText("p", "kicker", "Featured Collection"),
        createText("h3", "h2", collection.title),
        createText("p", "muted", collection.description),
      );
      const tagList = document.createElement("div");
      tagList.className = "tag-list";
      collection.tagObjects.slice(0, 4).forEach((tag) => {
        tagList.appendChild(createTagChip({ label: tag.label }));
      });
      card.append(tagList, createText("p", "help", `${collection.workObjects.length}件を起点に探索`));
      return card;
    });

    fillTextList(root.querySelector("[data-home-featured-works]"), featuredWorks, (work) =>
      createWorkCard({ work, profileId: profile.id, reason: work.matchSummary || work.publicNote })
    );

    fillTextList(root.querySelector("[data-home-tag-groups]"), groupedTags.slice(0, 4), (group) => {
      const card = document.createElement("div");
      const list = document.createElement("div");
      card.className = "card stack";
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
        createText("h3", "h2", group.label),
        createText("p", "muted", group.description || ""),
        list
      );
      return card;
    });
  };

  const renderFinderPage = () => {
    const root = document.querySelector("[data-finder-app]");
    if (!root) return;

    const queryInput = root.querySelector("[data-finder-query]");
    const sortSelect = root.querySelector("[data-finder-sort]");
    const includeRoot = root.querySelector("[data-finder-include-groups]");
    const excludeRoot = root.querySelector("[data-finder-exclude-groups]");
    const resultsRoot = root.querySelector("[data-finder-results]");
    const activeRoot = root.querySelector("[data-finder-active]");
    const emptyRoot = root.querySelector("[data-finder-empty]");
    const statusRoot = root.querySelector("[data-finder-status]");
    const clearButton = root.querySelector("[data-finder-clear]");
    const copyButton = root.querySelector("[data-finder-copy]");
    const titleRoot = root.querySelector("[data-profile-hero-title]");
    const descriptionRoot = root.querySelector("[data-profile-hero-description]");
    const tipsRoot = root.querySelector("[data-profile-search-tips]");
    const presetsRoot = root.querySelector("[data-finder-presets]");
    const suggestionsRoot = root.querySelector("[data-finder-suggestions]");
    const modeButtons = Array.from(root.querySelectorAll("[data-finder-mode]"));
    if (!queryInput || !sortSelect || !includeRoot || !excludeRoot || !resultsRoot || !activeRoot) return;

    let state = store.loadState();
    const profile = core.getActiveProfile(state);
    const visibleTags = core.getVisibleTags(state, profile?.id);
    const groupedTags = core.groupTags(visibleTags, state.tagGroups);
    const tagMap = core.getTagMap(state);
    let logTimer = null;
    let lastLogSignature = "";

    const pageState = {
      query: "",
      includeTagIds: [],
      excludeTagIds: [],
      sort: "recommended",
      collectionId: "",
      matchMode: "and",
    };

    const readUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      pageState.query = params.get("q") || "";
      pageState.sort = params.get("sort") || "recommended";
      pageState.collectionId = params.get("collection") || "";
      pageState.matchMode = params.get("mode") === "or" ? "or" : "and";
      pageState.includeTagIds = core.unique(params.getAll("include"));
      pageState.excludeTagIds = core.unique(params.getAll("exclude"));
    };

    const syncControls = () => {
      queryInput.value = pageState.query;
      queryInput.placeholder = profile?.searchPlaceholder || queryInput.placeholder;
      sortSelect.value = pageState.sort;
      modeButtons.forEach((button) => {
        const isActive = button.dataset.finderMode === pageState.matchMode;
        button.setAttribute("aria-pressed", String(isActive));
      });
      root.querySelectorAll("[data-filter-kind]").forEach((button) => {
        const kind = button.dataset.filterKind;
        const tagId = button.dataset.tagId;
        const selectedIds = kind === "include" ? pageState.includeTagIds : pageState.excludeTagIds;
        button.setAttribute("aria-pressed", String(selectedIds.includes(tagId)));
      });
    };

    const renderTagGroups = (container, kind) => {
      container.textContent = "";
      groupedTags.forEach((group) => {
        const block = document.createElement("div");
        const title = document.createElement("div");
        const name = document.createElement("p");
        const description = document.createElement("p");
        const list = document.createElement("div");
        block.className = "finder-group stack";
        title.className = "stack";
        name.className = "label";
        name.textContent = group.label;
        description.className = "help";
        description.textContent = group.description || "";
        list.className = "tag-filter__list";
        group.tags.forEach((tag) => {
          const selectedIds = kind === "include" ? pageState.includeTagIds : pageState.excludeTagIds;
          list.appendChild(createTagButton({ kind, tag, selected: selectedIds.includes(tag.id) }));
        });
        title.append(name, description);
        block.append(title, list);
        container.appendChild(block);
      });
    };

    const renderActiveConditions = () => {
      activeRoot.textContent = "";
      if (pageState.query) {
        activeRoot.appendChild(createActiveChip(`キーワード: ${pageState.query}`, "query", pageState.query));
      }
      if (pageState.matchMode === "or") {
        activeRoot.appendChild(createActiveChip("条件: いずれか一致", "mode", "or"));
      }
      pageState.includeTagIds.forEach((tagId) => {
        const tag = tagMap.get(tagId);
        if (!tag) return;
        activeRoot.appendChild(createActiveChip(`含める: ${tag.label}`, "include", tagId));
      });
      pageState.excludeTagIds.forEach((tagId) => {
        const tag = tagMap.get(tagId);
        if (!tag) return;
        activeRoot.appendChild(createActiveChip(`除外: ${tag.label}`, "exclude", tagId));
      });
      if (pageState.collectionId) {
        const collection = core.getCollection(state, pageState.collectionId);
        if (collection) {
          activeRoot.appendChild(createActiveChip(`特集: ${collection.title}`, "collection", collection.id));
        }
      }
    };

    const scheduleLog = (resultCount) => {
      const shouldLog =
        pageState.query ||
        pageState.includeTagIds.length ||
        pageState.excludeTagIds.length ||
        pageState.collectionId ||
        resultCount === 0;
      if (!shouldLog) return;

      const signature = JSON.stringify({
        query: pageState.query,
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
          includeTagIds: pageState.includeTagIds,
          excludeTagIds: pageState.excludeTagIds,
          collectionId: pageState.collectionId,
          matchMode: pageState.matchMode,
          resultCount,
        });
        lastLogSignature = signature;
      }, 350);
    };

    const renderSuggestions = (filtered) => {
      if (!suggestionsRoot) return;
      suggestionsRoot.textContent = "";
      if (filtered.length) return;

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
          })
        );
      });
    };

    const renderResults = () => {
      state = store.loadState();
      const collection = pageState.collectionId ? core.getCollection(state, pageState.collectionId) : null;
      const filtered = core.filterWorks({
        state,
        profileId: profile?.id,
        query: pageState.query,
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
          })
        );
      });

      if (emptyRoot) emptyRoot.hidden = filtered.length !== 0;
      renderSuggestions(filtered);

      if (statusRoot) {
        const fragments = [];
        if (pageState.query) fragments.push(`キーワード: ${pageState.query}`);
        if (pageState.matchMode === "or") fragments.push("条件: いずれか一致");
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
        statusRoot.textContent = `${fragments.length ? fragments.join(" | ") : "条件なし"} | ${filtered.length}件`;
      }

      renderActiveConditions();
      scheduleLog(filtered.length);
    };

    const applyAndRender = () => {
      syncControls();
      updateUrl(pageState);
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

    renderTagGroups(includeRoot, "include");
    renderTagGroups(excludeRoot, "exclude");
    readUrlState();
    if (titleRoot && profile?.heroTitle) titleRoot.textContent = profile.heroTitle;
    if (descriptionRoot && profile?.heroDescription) descriptionRoot.textContent = profile.heroDescription;
    renderTips();
    renderPresets();
    applyAndRender();

    root.addEventListener("click", (event) => {
      const filterButton = event.target.closest("[data-filter-kind]");
      if (filterButton) {
        const tagId = filterButton.dataset.tagId;
        const kind = filterButton.dataset.filterKind;
        const selectedIds = kind === "include" ? pageState.includeTagIds : pageState.excludeTagIds;
        const nextSelected = selectedIds.includes(tagId)
          ? selectedIds.filter((value) => value !== tagId)
          : [...selectedIds, tagId];
        if (kind === "include") {
          pageState.includeTagIds = core.unique(nextSelected).filter(
            (value) => !pageState.excludeTagIds.includes(value)
          );
        } else {
          pageState.excludeTagIds = core.unique(nextSelected).filter(
            (value) => !pageState.includeTagIds.includes(value)
          );
        }
        applyAndRender();
        return;
      }

      const removeButton = event.target.closest("[data-remove-kind]");
      if (removeButton) {
        const kind = removeButton.dataset.removeKind;
        const value = removeButton.dataset.removeValue;
        if (kind === "query") pageState.query = "";
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

      const card = event.target.closest("[data-work-id]");
      if (card) {
        store.logEvent("result_click", {
          profileId: profile?.id || "",
          workId: card.dataset.workId,
          query: pageState.query,
          includeTagIds: pageState.includeTagIds,
          excludeTagIds: pageState.excludeTagIds,
          collectionId: pageState.collectionId,
          matchMode: pageState.matchMode,
        });
      }
    });

    queryInput.addEventListener("input", () => {
      pageState.query = queryInput.value.trim();
      applyAndRender();
    });

    sortSelect.addEventListener("change", () => {
      pageState.sort = sortSelect.value;
      applyAndRender();
    });

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        pageState.query = "";
        pageState.includeTagIds = [];
        pageState.excludeTagIds = [];
        pageState.sort = "recommended";
        pageState.collectionId = "";
        pageState.matchMode = "and";
        applyAndRender();
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
    const state = store.loadState();
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

    const decoratedWork = core.filterWorks({
      state,
      profileId: profile?.id,
      query: "",
      includeTagIds: [],
      excludeTagIds: [],
      sort: "recommended",
    }).find((item) => item.id === work.id);

    const titleRoot = root.querySelector("[data-work-title]");
    const summaryRoot = root.querySelector("[data-work-summary]");
    const noteRoot = root.querySelector("[data-work-note]");
    const tagRoot = root.querySelector("[data-work-tags]");
    const linksRoot = root.querySelector("[data-work-links]");
    const similarRoot = root.querySelector("[data-work-similar]");
    const collectionRoot = root.querySelector("[data-work-collections]");
    const creatorRoot = root.querySelector("[data-work-creator]");
    const formatRoot = root.querySelector("[data-work-format]");
    const reasonRoot = root.querySelector("[data-work-reason]");
    const cautionRoot = root.querySelector("[data-work-caution]");
    const pointsRoot = root.querySelector("[data-work-points]");

    if (titleRoot) titleRoot.textContent = work.title;
    if (summaryRoot) summaryRoot.textContent = work.shortDescription;
    if (noteRoot) noteRoot.textContent = work.publicNote;
    if (creatorRoot) creatorRoot.textContent = work.creator || "サンプル作者";
    if (formatRoot) formatRoot.textContent = work.format || "作品";
    if (reasonRoot) reasonRoot.textContent = work.matchSummary || work.publicNote;
    if (cautionRoot) cautionRoot.textContent = work.cautionNote || "強い注意点はまだ登録されていません。";

    if (pointsRoot) {
      fillTextList(pointsRoot, work.highlightPoints, (item) => createText("li", "", item));
    }

    if (tagRoot) {
      tagRoot.textContent = "";
      (decoratedWork?.primaryTagObjects || []).forEach((tag) => {
        tagRoot.appendChild(
          createTagChip({
            label: tag.label,
            href: toFinderUrl({ includeTagIds: [tag.id] }),
          })
        );
      });
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

    root.addEventListener("click", (event) => {
      const link = event.target.closest("[data-outbound-work-id]");
      if (!link) return;
      store.logEvent("outbound_click", {
        profileId: profile?.id || "",
        workId: link.dataset.outboundWorkId,
        href: link.getAttribute("href") || "",
      });
    });
  };

  const renderCollectionsPage = () => {
    const root = document.querySelector("[data-collections-page]");
    if (!root) return;

    const state = store.loadState();
    const profile = core.getActiveProfile(state);
    const listRoot = root.querySelector("[data-collections-list]");
    const introRoot = root.querySelector("[data-collections-intro]");
    if (!listRoot) return;

    if (introRoot && profile?.valueProps) {
      fillTextList(introRoot, profile.valueProps, (item) => createText("li", "", item));
    }

    listRoot.textContent = "";
    core
      .getProfileCollections(state, profile?.id, { publicOnly: true })
      .map((collection) => core.decorateCollection(collection, state))
      .forEach((collection) => {
        const card = document.createElement("a");
        const tagList = document.createElement("div");
        card.className = "card card--interactive stack";
        card.href = `/collection/?slug=${encodeURIComponent(collection.slug)}`;
        tagList.className = "tag-list";

        collection.tagObjects.slice(0, 4).forEach((tag) => {
          tagList.appendChild(createTagChip({ label: tag.label }));
        });

        card.append(
          createText("p", "kicker", "Collection"),
          createText("h2", "h2", collection.title),
          createText("p", "muted", collection.description),
          tagList,
          createText("p", "help", `${collection.workObjects.length}件を起点に探索`),
        );
        listRoot.appendChild(card);
      });
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

  const init = () => {
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
