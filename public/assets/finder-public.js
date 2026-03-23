(function (root, factory) {
  root.FinderPublic = factory(root.FinderStore, root.FinderCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (store, core) {
  if (!store || !core) return {};

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

  const createStatusLine = (text) => {
    const element = document.createElement("p");
    element.className = "help";
    element.textContent = text;
    return element;
  };

  const toFinderUrl = (state) => {
    const params = new URLSearchParams();
    if (state.query) params.set("q", state.query);
    if (state.sort && state.sort !== "recommended") params.set("sort", state.sort);
    if (state.collectionId) params.set("collection", state.collectionId);
    core.unique(state.includeTagIds).forEach((tagId) => params.append("include", tagId));
    core.unique(state.excludeTagIds).forEach((tagId) => params.append("exclude", tagId));
    return `/finder/${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const updateUrl = (nextState) => {
    const finderUrl = new URL(toFinderUrl(nextState), window.location.origin);
    const nextUrl = `${window.location.pathname}${finderUrl.search}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  };

  const formatActiveChip = (label, kind, value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-filter__btn";
    button.dataset.removeKind = kind;
    button.dataset.removeValue = value;
    button.textContent = label;
    return button;
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
    const titleRoot = root.querySelector("[data-profile-hero-title]");
    const descriptionRoot = root.querySelector("[data-profile-hero-description]");
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
    };

    const readUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      pageState.query = params.get("q") || "";
      pageState.sort = params.get("sort") || "recommended";
      pageState.collectionId = params.get("collection") || "";
      pageState.includeTagIds = core.unique(params.getAll("include"));
      pageState.excludeTagIds = core.unique(params.getAll("exclude"));
    };

    const syncControls = () => {
      queryInput.value = pageState.query;
      sortSelect.value = pageState.sort;
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
        const title = document.createElement("p");
        const list = document.createElement("div");
        block.className = "finder-group";
        title.className = "label";
        title.textContent = group.label;
        list.className = "tag-filter__list";
        group.tags.forEach((tag) => {
          const selectedIds = kind === "include" ? pageState.includeTagIds : pageState.excludeTagIds;
          list.appendChild(createTagButton({ kind, tag, selected: selectedIds.includes(tag.id) }));
        });
        block.append(title, list);
        container.appendChild(block);
      });
    };

    const renderActiveConditions = () => {
      activeRoot.textContent = "";
      if (pageState.query) {
        activeRoot.appendChild(formatActiveChip(`キーワード: ${pageState.query}`, "query", pageState.query));
      }
      pageState.includeTagIds.forEach((tagId) => {
        const tag = tagMap.get(tagId);
        if (!tag) return;
        activeRoot.appendChild(formatActiveChip(`含める: ${tag.label}`, "include", tagId));
      });
      pageState.excludeTagIds.forEach((tagId) => {
        const tag = tagMap.get(tagId);
        if (!tag) return;
        activeRoot.appendChild(formatActiveChip(`除外: ${tag.label}`, "exclude", tagId));
      });
      if (pageState.collectionId) {
        const collection = core.getCollection(state, pageState.collectionId);
        if (collection) {
          activeRoot.appendChild(formatActiveChip(`特集: ${collection.title}`, "collection", collection.id));
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
          resultCount,
        });
        lastLogSignature = signature;
      }, 350);
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
      });

      resultsRoot.textContent = "";
      filtered.forEach((work) => {
        const card = document.createElement("a");
        const tagList = document.createElement("div");
        const title = document.createElement("h2");
        const summary = document.createElement("p");
        const note = document.createElement("p");
        card.className = "card card--interactive stack";
        card.href = `/work/?slug=${encodeURIComponent(work.slug)}`;
        card.dataset.workId = work.id;

        tagList.className = "tag-list";
        work.primaryTagObjects.forEach((tag) => {
          const chip = document.createElement("span");
          chip.className = "tag";
          chip.textContent = tag.label;
          tagList.appendChild(chip);
        });

        title.className = "h2";
        title.textContent = work.title;
        summary.className = "muted";
        summary.textContent = work.shortDescription;
        note.className = "help";
        note.textContent = work.publicNote;

        card.append(tagList, title, summary, note);
        resultsRoot.appendChild(card);
      });

      if (emptyRoot) emptyRoot.hidden = filtered.length !== 0;
      if (statusRoot) {
        const fragments = [];
        if (pageState.query) fragments.push(`キーワード: ${pageState.query}`);
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

    renderTagGroups(includeRoot, "include");
    renderTagGroups(excludeRoot, "exclude");
    readUrlState();
    if (titleRoot && profile?.heroTitle) titleRoot.textContent = profile.heroTitle;
    if (descriptionRoot && profile?.heroDescription) descriptionRoot.textContent = profile.heroDescription;
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
        if (kind === "include") pageState.includeTagIds = pageState.includeTagIds.filter((id) => id !== value);
        if (kind === "exclude") pageState.excludeTagIds = pageState.excludeTagIds.filter((id) => id !== value);
        if (kind === "collection") pageState.collectionId = "";
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
        applyAndRender();
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

    if (titleRoot) titleRoot.textContent = work.title;
    if (summaryRoot) summaryRoot.textContent = work.shortDescription;
    if (noteRoot) noteRoot.textContent = work.publicNote;
    if (tagRoot) {
      tagRoot.textContent = "";
      (decoratedWork?.primaryTagObjects || []).forEach((tag) => {
        const link = document.createElement("a");
        link.className = "tag";
        link.href = `/finder/?include=${encodeURIComponent(tag.id)}`;
        link.textContent = tag.label;
        tagRoot.appendChild(link);
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
        const link = document.createElement("a");
        link.className = "tag";
        link.href = `/finder/?collection=${encodeURIComponent(collection.id)}`;
        link.textContent = collection.title;
        collectionRoot.appendChild(link);
      });
    }

    if (similarRoot) {
      similarRoot.textContent = "";
      core.findSimilarWorks({ state, work, profileId: profile?.id, limit: 3 }).forEach((item) => {
        const card = document.createElement("a");
        const title = document.createElement("h3");
        const summary = document.createElement("p");
        card.className = "card card--interactive stack";
        card.href = `/work/?slug=${encodeURIComponent(item.slug)}`;
        title.textContent = item.title;
        summary.className = "muted";
        summary.textContent = item.shortDescription;
        card.append(title, summary);
        similarRoot.appendChild(card);
      });
      if (!similarRoot.childElementCount) {
        similarRoot.appendChild(createStatusLine("類似作品はまだ手動キュレーション前です。"));
      }
    }

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
    if (!listRoot) return;

    listRoot.textContent = "";
    core
      .ensureArray(state.collections)
      .filter(
        (collection) =>
          collection.isPublic && core.ensureArray(collection.siteProfileIds).includes(profile?.id)
      )
      .forEach((collection) => {
        const card = document.createElement("div");
        const tagList = document.createElement("div");
        const title = document.createElement("h2");
        const description = document.createElement("p");
        const actions = document.createElement("div");
        const finderLink = document.createElement("a");
        const note = document.createElement("p");
        card.className = "card stack";
        tagList.className = "tag-list";
        core.ensureArray(collection.tagIds).forEach((tagId) => {
          const tag = core.getTagMap(state).get(tagId);
          if (!tag || !tag.isPublic) return;
          const badge = document.createElement("span");
          badge.className = "tag";
          badge.textContent = tag.label;
          tagList.appendChild(badge);
        });
        title.className = "h2";
        title.textContent = collection.title;
        description.className = "muted";
        description.textContent = collection.description;
        note.className = "help";
        note.textContent = `${core.ensureArray(collection.workIds).length}件を特集内で管理`;
        actions.className = "cluster";
        finderLink.className = "btn btn--secondary";
        finderLink.href = `/finder/?collection=${encodeURIComponent(collection.id)}`;
        finderLink.textContent = "この特集で探す";
        actions.appendChild(finderLink);
        card.append(tagList, title, description, note, actions);
        listRoot.appendChild(card);
      });
  };

  const init = () => {
    renderFinderPage();
    renderWorkPage();
    renderCollectionsPage();
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
