(function (root, factory) {
  root.IkeaFinderUi = factory(root.FinderStore, root.FinderCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (store, core) {
  if (!store || !core || typeof document === "undefined") return {};

  const SORT_META = {
    recommended: {
      label: "ベストマッチ",
      description: "一致タグと表示優先度を重視します。",
    },
    latest: {
      label: "新しい順",
      description: "公開日が新しい順に並びます。",
    },
    updated: {
      label: "更新順",
      description: "更新日が新しい順に並びます。",
    },
    title: {
      label: "名前順",
      description: "タイトルの五十音順に並びます。",
    },
  };

  const ensureArray = (value) => core.ensureArray(value);
  const unique = (value) => core.unique(value);

  const normalizeText = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\u3000/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const createElement = (tagName, className = "", text = "") => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  const createIcon = (kind, className = "") => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("aria-hidden", "true");
    if (className) svg.setAttribute("class", className);

    const iconMap = {
      recent:
        "M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.7574-4.2426L14 10h6V4l-2.3431 2.3431A7.9635 7.9635 0 0 0 12 4zm-1 3h2v5h4v2h-6V7z",
      save:
        "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z",
      collection:
        "M3 4h8v6H3V4zm10 0h8v6h-8V4zM3 14h8v6H3v-6zm10 0h8v6h-8v-6z",
      tag:
        "M10.5 3H5a2 2 0 0 0-2 2v5.5a2 2 0 0 0 .5858 1.4142l8.5 8.5a2 2 0 0 0 2.8284 0l5.5-5.5a2 2 0 0 0 0-2.8284l-8.5-8.5A2 2 0 0 0 10.5 3zM7 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z",
      work:
        "M4 5h16v14H4V5zm2 2v10h12V7H6zm2 2h8v2H8V9zm0 4h6v2H8v-2z",
      compare:
        "M3 4h8v6H3V4zm10 0h8v6h-8V4zM3 14h8v6H3v-6zm10 3h8v-2h-8v2z",
      arrow:
        "m16.415 12.0011-8.0012 8.0007-1.4141-1.4143 6.587-6.5866-6.586-6.5868L8.415 4l8 8.0011z",
      delete:
        "m12.0006 13.4148 2.8283 2.8283 1.4142-1.4142-2.8283-2.8283 2.8283-2.8283-1.4142-1.4142-2.8283 2.8283L9.172 7.7578 7.7578 9.172l2.8286 2.8286-2.8286 2.8285 1.4142 1.4143 2.8286-2.8286z",
    };

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute("clip-rule", "evenodd");
    path.setAttribute("d", iconMap[kind] || iconMap.work);
    svg.appendChild(path);
    return svg;
  };

  const createActionButton = ({
    label,
    className,
    dataset = {},
    pressed = null,
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
    return button;
  };

  const createFinderUrl = ({
    query = "",
    creatorQuery = "",
    sort = "recommended",
    collectionId = "",
    includeTagIds = [],
    excludeTagIds = [],
    matchMode = "and",
  } = {}) => {
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

  const getUiState = (state) => state?.ui || {};

  const getDecoratedWorkMap = (state, profileId) =>
    new Map(
      core
        .filterWorks({
          state,
          profileId,
          query: "",
          creatorQuery: "",
          includeTagIds: [],
          excludeTagIds: [],
          sort: "recommended",
          collectionId: "",
          matchMode: "and",
        })
        .map((work) => [work.id, work])
    );

  const getSortMeta = (sort) => SORT_META[sort] || SORT_META.recommended;

  const getSearchSummaryLabel = (search, tagMap) => {
    const parts = [];
    if (search.query) parts.push(`作品: ${search.query}`);
    if (search.creatorQuery) parts.push(`作者: ${search.creatorQuery}`);
    ensureArray(search.includeTagIds).forEach((tagId) => {
      const tag = tagMap.get(tagId);
      if (!tag) return;
      parts.push(`含める: ${tag.label}`);
    });
    ensureArray(search.excludeTagIds).forEach((tagId) => {
      const tag = tagMap.get(tagId);
      if (!tag) return;
      parts.push(`除外: ${tag.label}`);
    });
    if (search.collectionId) {
      parts.push("特集");
    }
    if (search.matchMode === "or") {
      parts.push("いずれか一致");
    }
    return parts.join(" / ") || "条件なし";
  };

  const updateFinderUrl = (state) => {
    const nextUrl = new URL(createFinderUrl(state), window.location.origin);
    window.history.replaceState({}, "", `${window.location.pathname}${nextUrl.search}${window.location.hash}`);
  };

  const createPillLink = ({ label, href, className = "hri-pill" }) => {
    const link = createElement("a", className);
    link.href = href;
    link.textContent = label;
    return link;
  };

  const createMiniLink = ({ label, href, meta = "", icon = "work" }) => {
    const link = createElement("a", "hri-mini-link");
    const iconWrap = createElement("span", "hri-mini-link__icon");
    const body = createElement("span", "hri-mini-link__body");
    const title = createElement("strong", "hri-mini-link__title", label);
    link.href = href;
    iconWrap.appendChild(createIcon(icon));
    body.append(title);
    if (meta) body.append(createElement("span", "hri-mini-link__meta", meta));
    link.append(iconWrap, body);
    return link;
  };

  const createMiniSearchItem = ({ search, label, tagMap, editable = false }) => {
    const wrapper = createElement("div", "hri-mini-stack__item");
    wrapper.appendChild(
      createMiniLink({
        label: label || search.label || getSearchSummaryLabel(search, tagMap),
        href: createFinderUrl(search),
        meta: getSearchSummaryLabel(search, tagMap),
        icon: "save",
      })
    );
    if (editable) {
      wrapper.appendChild(
        createActionButton({
          label: "削除",
          className: "plp-btn plp-btn--small plp-btn--tertiary",
          dataset: { savedSearchDelete: search.id },
        })
      );
    }
    return wrapper;
  };

  const createSupportCard = (value) => {
    const card = createElement("article", "hri-support-card");
    const pieces = String(value || "").split("を");
    card.append(
      createElement("strong", "hri-support-card__title", pieces[0] || "運用軸"),
      createElement("p", "hri-support-card__body", value)
    );
    return card;
  };

  const createContentCard = ({
    href,
    kind = "tag",
    kicker = "",
    title = "",
    description = "",
    meta = "",
    imageTitle = "",
    chips = [],
  }) => {
    const article = createElement("article", `content-card content-card--${kind}`);
    const link = createElement("a", "content-card__link");
    const image = createElement("div", "content-card__image");
    const imageInner = createElement("div", "content-card__image-inner");
    const wrapper = createElement("div", "content-card__wrapper");
    const footer = createElement("div", "content-card__footer");
    const icon = createElement("span", "content-card__icon");

    link.href = href;
    imageInner.append(
      createElement("span", "content-card__image-kicker", kicker || "カテゴリ"),
      createElement("strong", "content-card__image-title", imageTitle || title)
    );
    image.appendChild(imageInner);

    wrapper.append(
      createElement("p", "content-card__type", kicker || "カテゴリ"),
      createElement("p", "content-card__title", title)
    );
    if (description) wrapper.appendChild(createElement("p", "content-card__description", description));
    if (chips.length) {
      const chipList = createElement("div", "content-card__chips");
      chips.forEach((chip) => chipList.appendChild(createElement("span", "content-card__chip", chip)));
      wrapper.appendChild(chipList);
    }
    icon.appendChild(createIcon("arrow"));
    footer.append(createElement("span", "content-card__meta", meta), icon);
    wrapper.appendChild(footer);
    link.append(image, wrapper);
    article.appendChild(link);
    return article;
  };

  const createProductCard = ({ work, uiState = {}, reason = "", showActions = true }) => {
    const article = createElement("article", "plp-product-card");
    const media = createElement("div", "plp-product-card__media");
    const body = createElement("div", "plp-product-card__body");
    const meta = createElement("div", "plp-product-card__meta");
    const title = createElement("a", "plp-product-card__title", work.title);
    const chips = createElement("div", "plp-product-card__chips");
    const actions = createElement("div", "plp-product-card__actions");
    const compareSet = new Set(ensureArray(uiState.compareWorkIds));
    const favoriteSet = new Set(ensureArray(uiState.favoriteWorkIds));

    title.href = `/work/?slug=${encodeURIComponent(work.slug)}`;
    title.dataset.workLink = "true";
    title.dataset.workId = work.id;

    media.append(
      createElement("span", "plp-product-card__label", work.format || "作品"),
      createElement("strong", "plp-product-card__media-title", work.title),
      createElement(
        "span",
        "plp-product-card__media-meta",
        [work.creator || "サンプル作者", work.releasedAt || "公開日未設定"].filter(Boolean).join(" / ")
      )
    );

    meta.append(
      createElement("span", "", work.creator || "サンプル作者"),
      createElement("span", "", work.updatedAt ? `更新 ${work.updatedAt}` : "")
    );

    ensureArray(work.primaryTagObjects)
      .slice(0, 4)
      .forEach((tag) => {
        chips.appendChild(createElement("span", "plp-product-card__chip", tag.label));
      });

    body.append(
      meta,
      title,
      createElement("p", "plp-product-card__description", work.shortDescription || ""),
      createElement("p", "plp-product-card__reason", reason || work.matchContext?.summary || work.matchSummary || ""),
      chips
    );

    if (showActions) {
      actions.append(
        createActionButton({
          label: favoriteSet.has(work.id) ? "保存済み" : "保存",
          className: "plp-btn plp-btn--small plp-btn--secondary",
          dataset: { workAction: "favorite", workId: work.id },
          pressed: favoriteSet.has(work.id),
        }),
        createActionButton({
          label: compareSet.has(work.id) ? "比較中" : "比較",
          className: "plp-btn plp-btn--small plp-btn--secondary",
          dataset: { workAction: "compare", workId: work.id },
          pressed: compareSet.has(work.id),
        })
      );
    }

    const detailLink = createElement("a", "plp-btn plp-btn--small plp-btn--primary", "詳細を見る");
    detailLink.href = `/work/?slug=${encodeURIComponent(work.slug)}`;
    detailLink.dataset.workLink = "true";
    detailLink.dataset.workId = work.id;
    actions.appendChild(detailLink);
    body.appendChild(actions);
    article.append(media, body);
    return article;
  };

  const refreshCarousels = (scope = document) => {
    scope.querySelectorAll("[data-carousel]").forEach((carousel) => {
      const content = carousel.querySelector(".plp-carousel__content");
      const prevButton = carousel.querySelector("[data-carousel-prev]");
      const nextButton = carousel.querySelector("[data-carousel-next]");
      const indicator = carousel.querySelector(".plp-scroll-indicator__bar");
      if (!content || !indicator) return;

      const update = () => {
        const maxScroll = Math.max(content.scrollWidth - content.clientWidth, 0);
        const ratio = maxScroll === 0 ? 1 : content.clientWidth / content.scrollWidth;
        const width = Math.max(ratio * 100, 14);
        const translate = maxScroll === 0 ? 0 : (content.scrollLeft / maxScroll) * (100 - width);
        indicator.style.width = `${width}%`;
        indicator.style.transform = `translateX(${translate}%)`;
        if (prevButton) prevButton.disabled = content.scrollLeft <= 4;
        if (nextButton) nextButton.disabled = content.scrollLeft >= maxScroll - 4;
      };

      if (!carousel.dataset.carouselBound) {
        prevButton?.addEventListener("click", () => {
          content.scrollBy({ left: -Math.max(content.clientWidth * 0.92, 260), behavior: "smooth" });
        });
        nextButton?.addEventListener("click", () => {
          content.scrollBy({ left: Math.max(content.clientWidth * 0.92, 260), behavior: "smooth" });
        });
        content.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        carousel.dataset.carouselBound = "true";
      }

      update();
    });
  };

  const initializeAccordions = (scope = document) => {
    scope.querySelectorAll("[data-accordion-item], .plp-filter-panel").forEach((item) => {
      const button = item.querySelector("[data-accordion-button], .plp-filter-panel__heading");
      const panel = item.querySelector("[data-accordion-panel], .plp-filter-panel__body");
      if (!button || !panel) return;
      const expanded = button.getAttribute("aria-expanded") !== "false";
      panel.hidden = !expanded;
    });
  };

  const renderHomePage = () => {
    const root = document.querySelector("[data-home-ikea-page]");
    if (!root) return;

    const state = store.loadState();
    const profile = core.getActiveProfile(state);
    if (!profile) return;

    const tagMap = core.getTagMap(state);
    const uiState = getUiState(state);
    const summary = core.aggregateLogs(state);
    const workMap = getDecoratedWorkMap(state, profile.id);
    const visibleTags = core.getVisibleTags(state, profile.id);
    const groupedTags = core.groupTags(visibleTags, state.tagGroups);
    const featuredCollections = core
      .getProfileCollections(state, profile.id, { publicOnly: true })
      .filter((collection) => ensureArray(profile.featuredCollectionIds).includes(collection.id))
      .map((collection) => core.decorateCollection(collection, state));
    const featuredWorks = core
      .getProfileWorks(state, profile.id, { publicOnly: true })
      .filter((work) => ensureArray(profile.featuredWorkIds).includes(work.id))
      .map((work) => workMap.get(work.id))
      .filter(Boolean);
    const recentWorks = ensureArray(uiState.recentWorkIds)
      .map((workId) => workMap.get(workId))
      .filter(Boolean)
      .slice(0, 4);
    const favoriteWorks = ensureArray(uiState.favoriteWorkIds)
      .map((workId) => workMap.get(workId))
      .filter(Boolean)
      .slice(0, 4);
    const popularSearches = summary.topSearches.length
      ? summary.topSearches
      : featuredCollections.slice(0, 4).map((collection) => ({
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

    const popularRoot = root.querySelector("[data-home-popular-searches]");
    if (popularRoot) {
      popularRoot.textContent = "";
      popularSearches.forEach((search) => {
        popularRoot.appendChild(
          createPillLink({
            label: search.label || getSearchSummaryLabel(search, tagMap),
            href: createFinderUrl(search),
          })
        );
      });
    }

    const savedRoot = root.querySelector("[data-home-saved-searches]");
    if (savedRoot) {
      savedRoot.textContent = "";
      const savedSearches = ensureArray(uiState.savedSearches).slice(0, 4);
      if (!savedSearches.length) {
        savedRoot.appendChild(
          createMiniLink({
            label: "保存した検索はまだありません",
            href: "/finder/",
            meta: "検索条件を保存するとここから再訪できます。",
            icon: "save",
          })
        );
      } else {
        savedSearches.forEach((search) => {
          savedRoot.appendChild(createMiniSearchItem({ search, tagMap }));
        });
      }
    }

    const recentRoot = root.querySelector("[data-home-recent-works]");
    if (recentRoot) {
      recentRoot.textContent = "";
      if (!recentWorks.length) {
        recentRoot.appendChild(
          createMiniLink({
            label: "閲覧履歴はまだありません",
            href: "/finder/",
            meta: "作品詳細を開くとここに履歴がたまります。",
            icon: "recent",
          })
        );
      } else {
        recentWorks.forEach((work) => {
          recentRoot.appendChild(
            createMiniLink({
              label: work.title,
              href: `/work/?slug=${encodeURIComponent(work.slug)}`,
              meta: [work.format, work.creator].filter(Boolean).join(" / "),
              icon: "recent",
            })
          );
        });
      }
    }

    const tagGroupsRoot = root.querySelector("[data-home-tag-groups]");
    if (tagGroupsRoot) {
      tagGroupsRoot.textContent = "";
      groupedTags.slice(0, 8).forEach((group) => {
        tagGroupsRoot.appendChild(
          createContentCard({
            href: createFinderUrl({ includeTagIds: group.tags.slice(0, 1).map((tag) => tag.id) }),
            kind: "tag",
            kicker: "カテゴリ",
            title: group.label,
            description: group.description || "",
            meta: `${group.tags.length}条件`,
            imageTitle: group.label,
            chips: group.tags.slice(0, 3).map((tag) => tag.label),
          })
        );
      });
    }

    const collectionRoot = root.querySelector("[data-home-featured-collections]");
    if (collectionRoot) {
      collectionRoot.textContent = "";
      featuredCollections.forEach((collection) => {
        collectionRoot.appendChild(
          createContentCard({
            href: `/collection/?slug=${encodeURIComponent(collection.slug)}`,
            kind: "collection",
            kicker: "特集",
            title: collection.title,
            description: collection.description,
            meta: `${collection.workObjects.length}作品`,
            imageTitle: collection.title,
            chips: collection.tagObjects.slice(0, 3).map((tag) => tag.label),
          })
        );
      });
    }

    const workRoot = root.querySelector("[data-home-featured-works]");
    if (workRoot) {
      workRoot.textContent = "";
      featuredWorks.forEach((work) => {
        workRoot.appendChild(
          createProductCard({
            work,
            uiState,
            reason: work.matchSummary || work.publicNote,
          })
        );
      });
    }

    const favoriteRoot = root.querySelector("[data-home-favorite-works]");
    if (favoriteRoot) {
      favoriteRoot.textContent = "";
      if (!favoriteWorks.length) {
        favoriteRoot.appendChild(
          createMiniLink({
            label: "保存した作品はまだありません",
            href: "/finder/",
            meta: "検索結果や作品詳細から保存できます。",
            icon: "compare",
          })
        );
      } else {
        favoriteWorks.forEach((work) => {
          favoriteRoot.appendChild(
            createMiniLink({
              label: work.title,
              href: `/work/?slug=${encodeURIComponent(work.slug)}`,
              meta: [work.format, work.creator].filter(Boolean).join(" / "),
              icon: "compare",
            })
          );
        });
      }
    }

    const valuePropRoot = root.querySelector("[data-home-value-props]");
    if (valuePropRoot) {
      valuePropRoot.textContent = "";
      ensureArray(profile.valueProps).forEach((value) => {
        valuePropRoot.appendChild(createSupportCard(value));
      });
    }

    if (!root.dataset.homeBound) {
      root.addEventListener("click", (event) => {
        const actionButton = event.target.closest("[data-work-action]");
        if (!actionButton) return;
        const action = actionButton.dataset.workAction;
        const workId = actionButton.dataset.workId;
        if (!action || !workId) return;
        if (action === "favorite") store.toggleFavoriteWork(workId);
        if (action === "compare") store.toggleCompareWork(workId);
        renderHomePage();
      });
      root.dataset.homeBound = "true";
    }

    refreshCarousels(root);
  };

  const renderFinderPage = () => {
    const root = document.querySelector("[data-finder-ikea-page]");
    if (!root) return;

    const queryInput = root.querySelector("[data-finder-query]");
    const creatorInput = root.querySelector("[data-finder-creator]");
    const sortSelect = root.querySelector("[data-finder-sort]");
    const sortNoteRoot = root.querySelector("[data-finder-sort-note]");
    const groupsRoot = root.querySelector("[data-finder-groups]");
    const resultsRoot = root.querySelector("[data-finder-results]");
    const activeRoot = root.querySelector("[data-finder-active]");
    const statusRoot = root.querySelector("[data-finder-status]");
    const headingRoot = root.querySelector("[data-finder-heading]");
    const summaryRoot = root.querySelector("[data-finder-summary-note]");
    const savedRoot = root.querySelector("[data-finder-saved-searches]");
    const presetsRoot = root.querySelector("[data-finder-presets]");
    const popularRoot = root.querySelector("[data-finder-popular-searches]");
    const recentRoot = root.querySelector("[data-finder-recent]");
    const categoryRoot = root.querySelector("[data-finder-categories]");
    const relatedRoot = root.querySelector("[data-finder-related-searches]");
    const suggestionsRoot = root.querySelector("[data-finder-suggestions]");
    const suggestionsWrap = root.querySelector("[data-finder-suggestions-wrap]");
    const compareRoot = root.querySelector("[data-finder-compare]");
    const compareItemsRoot = root.querySelector("[data-compare-items]");
    const compareGridRoot = root.querySelector("[data-compare-grid]");
    const rescueRoot = root.querySelector("[data-finder-rescue]");
    const emptyRoot = root.querySelector("[data-finder-empty]");
    const clearButton = root.querySelector("[data-finder-clear]");
    const clearQueryButton = root.querySelector("[data-finder-clear-query]");
    const copyButton = root.querySelector("[data-finder-copy]");
    const saveButton = root.querySelector("[data-finder-save-search]");
    const compareClearButton = root.querySelector("[data-compare-clear]");
    const a11yLive = root.querySelector("[data-finder-a11y-live]");
    const tipsRoot = root.querySelector("[data-profile-search-tips]");
    const modeButtons = Array.from(root.querySelectorAll("[data-finder-mode]"));
    if (
      !queryInput ||
      !creatorInput ||
      !sortSelect ||
      !groupsRoot ||
      !resultsRoot ||
      !activeRoot ||
      !statusRoot ||
      !headingRoot
    ) {
      return;
    }

    let state = store.loadState();
    const profile = core.getActiveProfile(state);
    if (!profile) return;
    const visibleTags = core.getVisibleTags(state, profile.id);
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

    const syncControls = () => {
      queryInput.value = pageState.query;
      creatorInput.value = pageState.creatorQuery;
      queryInput.placeholder = profile.searchPlaceholder || "作品・タグ・作者で検索";
      sortSelect.value = pageState.sort;
      if (sortNoteRoot) sortNoteRoot.textContent = getSortMeta(pageState.sort).description;
      modeButtons.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.finderMode === pageState.matchMode)
        );
      });
    };

    const getTagState = (tagId) => {
      if (pageState.includeTagIds.includes(tagId)) return "include";
      if (pageState.excludeTagIds.includes(tagId)) return "exclude";
      return "ignore";
    };

    const renderSavedSearches = () => {
      state = store.loadState();
      const uiState = getUiState(state);
      savedRoot.textContent = "";
      const savedSearches = ensureArray(uiState.savedSearches);
      if (!savedSearches.length) {
        savedRoot.appendChild(
          createMiniLink({
            label: "保存した検索はまだありません",
            href: "/finder/",
            meta: "条件を保存するとここからすぐ再訪できます。",
            icon: "save",
          })
        );
        return;
      }
      savedSearches.forEach((search) => {
        savedRoot.appendChild(createMiniSearchItem({ search, tagMap, editable: true }));
      });
    };

    const renderPresets = () => {
      presetsRoot.textContent = "";
      core
        .getProfileCollections(state, profile.id, { publicOnly: true })
        .filter((collection) => ensureArray(profile.featuredCollectionIds).includes(collection.id))
        .forEach((collection) => {
          presetsRoot.appendChild(
            createPillLink({
              label: collection.title,
              href: createFinderUrl({ collectionId: collection.id }),
            })
          );
        });
    };

    const renderPopularSearches = () => {
      state = store.loadState();
      popularRoot.textContent = "";
      const summary = core.aggregateLogs(state);
      const searches = summary.topSearches.length
        ? summary.topSearches
        : core
            .getProfileCollections(state, profile.id, { publicOnly: true })
            .slice(0, 4)
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
      searches.forEach((search) => {
        popularRoot.appendChild(
          createPillLink({
            label: search.label || getSearchSummaryLabel(search, tagMap),
            href: createFinderUrl(search),
          })
        );
      });
    };

    const renderRecentWorks = () => {
      state = store.loadState();
      recentRoot.textContent = "";
      const uiState = getUiState(state);
      const workMap = getDecoratedWorkMap(state, profile.id);
      const works = ensureArray(uiState.recentWorkIds)
        .map((workId) => workMap.get(workId))
        .filter(Boolean)
        .slice(0, 5);
      if (!works.length) {
        recentRoot.appendChild(
          createMiniLink({
            label: "閲覧履歴はまだありません",
            href: "/finder/",
            meta: "作品詳細を開くとここに履歴がたまります。",
            icon: "recent",
          })
        );
        return;
      }
      works.forEach((work) => {
        recentRoot.appendChild(
          createMiniLink({
            label: work.title,
            href: `/work/?slug=${encodeURIComponent(work.slug)}`,
            meta: [work.format, work.creator].filter(Boolean).join(" / "),
            icon: "recent",
          })
        );
      });
    };

    const renderTips = () => {
      tipsRoot.textContent = "";
      ensureArray(profile.searchTips).forEach((tip) => {
        tipsRoot.appendChild(createElement("li", "", tip));
      });
    };

    const renderActiveChips = () => {
      activeRoot.textContent = "";
      if (pageState.query) {
        activeRoot.appendChild(
          createActionButton({
            label: `作品: ${pageState.query}`,
            className: "plp-chip",
            dataset: { removeKind: "query" },
          })
        );
      }
      if (pageState.creatorQuery) {
        activeRoot.appendChild(
          createActionButton({
            label: `作者: ${pageState.creatorQuery}`,
            className: "plp-chip",
            dataset: { removeKind: "creator" },
          })
        );
      }
      if (pageState.matchMode === "or") {
        activeRoot.appendChild(
          createActionButton({
            label: "いずれか一致",
            className: "plp-chip",
            dataset: { removeKind: "mode" },
          })
        );
      }
      pageState.includeTagIds.forEach((tagId) => {
        const tag = tagMap.get(tagId);
        if (!tag) return;
        activeRoot.appendChild(
          createActionButton({
            label: `含める: ${tag.label}`,
            className: "plp-chip",
            dataset: { removeKind: "include", removeValue: tagId },
          })
        );
      });
      pageState.excludeTagIds.forEach((tagId) => {
        const tag = tagMap.get(tagId);
        if (!tag) return;
        activeRoot.appendChild(
          createActionButton({
            label: `除外: ${tag.label}`,
            className: "plp-chip",
            dataset: { removeKind: "exclude", removeValue: tagId },
          })
        );
      });
      if (pageState.collectionId) {
        const collection = core.getCollection(state, pageState.collectionId);
        if (collection) {
          activeRoot.appendChild(
            createActionButton({
              label: `特集: ${collection.title}`,
              className: "plp-chip",
              dataset: { removeKind: "collection" },
            })
          );
        }
      }
    };

    const renderFilterGroups = () => {
      groupsRoot.textContent = "";
      groupedTags.forEach((group) => {
        const section = createElement("section", "plp-filter-panel");
        const heading = createActionButton({
          label: group.label,
          className: "plp-filter-panel__heading",
          dataset: { accordionButton: "true" },
        });
        const panel = createElement("div", "plp-filter-panel__body");
        const options = createElement("div", "plp-filter-options");

        heading.setAttribute("aria-expanded", "false");
        section.append(heading, panel);
        if (group.description) {
          panel.appendChild(createElement("p", "plp-field__help", group.description));
        }

        group.tags.forEach((tag) => {
          const nextIncludeIds = unique([
            ...pageState.includeTagIds.filter((value) => value !== tag.id),
            tag.id,
          ]);
          const includeCount = core.filterWorks({
            state,
            profileId: profile.id,
            query: pageState.query,
            creatorQuery: pageState.creatorQuery,
            includeTagIds: nextIncludeIds,
            excludeTagIds: pageState.excludeTagIds.filter((value) => value !== tag.id),
            sort: "recommended",
            collectionId: pageState.collectionId,
            matchMode: pageState.matchMode,
          }).length;
          const row = createElement("div", "plp-filter-option");
          const main = createElement("div", "plp-filter-option__main");
          const title = createElement("div", "plp-filter-option__title");
          const actions = createElement("div", "plp-filter-option__actions");
          const tagState = getTagState(tag.id);

          title.append(
            createElement("strong", "", tag.label),
            createElement(
              "span",
              "plp-filter-option__meta",
              includeCount > 0 ? `追加時に ${includeCount}件` : "この条件では候補なし"
            )
          );
          main.append(
            title,
            createElement("span", "plp-filter-option__count", `${includeCount}件`)
          );

          actions.append(
            createActionButton({
              label: "解除",
              className: "plp-filter-chip",
              dataset: { filterTagId: tag.id, filterState: "ignore" },
              pressed: tagState === "ignore",
            }),
            createActionButton({
              label: "含める",
              className: "plp-filter-chip",
              dataset: { filterTagId: tag.id, filterState: "include" },
              pressed: tagState === "include",
            }),
            createActionButton({
              label: "除外",
              className: "plp-filter-chip plp-filter-chip--exclude",
              dataset: { filterTagId: tag.id, filterState: "exclude" },
              pressed: tagState === "exclude",
            })
          );

          row.append(main, actions);
          options.appendChild(row);
        });

        panel.appendChild(options);
        groupsRoot.appendChild(section);
      });
      initializeAccordions(groupsRoot);
    };

    const renderCompare = (uiState) => {
      if (!compareRoot || !compareItemsRoot || !compareGridRoot) return;
      const workMap = getDecoratedWorkMap(store.loadState(), profile.id);
      const compareWorks = ensureArray(uiState.compareWorkIds)
        .map((workId) => workMap.get(workId))
        .filter(Boolean);

      compareItemsRoot.textContent = "";
      compareGridRoot.textContent = "";
      compareRoot.hidden = compareWorks.length === 0;
      if (!compareWorks.length) return;

      compareWorks.forEach((work) => {
        compareItemsRoot.appendChild(
          createMiniLink({
            label: work.title,
            href: `/work/?slug=${encodeURIComponent(work.slug)}`,
            meta: [work.format, work.creator].filter(Boolean).join(" / "),
            icon: "compare",
          })
        );
      });

      if (compareWorks.length < 2) return;

      compareWorks.forEach((work) => {
        const column = createElement("article", "plp-compare-column");
        const chipList = createElement("div", "plp-product-card__chips");
        ensureArray(work.primaryTagObjects)
          .slice(0, 4)
          .forEach((tag) => {
            chipList.appendChild(createElement("span", "plp-product-card__chip", tag.label));
          });
        column.append(
          createElement("strong", "", work.title),
          createElement("p", "plp-product-card__description", work.shortDescription),
          createElement("p", "plp-product-card__reason", work.matchSummary || work.publicNote || ""),
          chipList
        );
        compareGridRoot.appendChild(column);
      });
    };

    const renderRescue = () => {
      if (!rescueRoot) return;
      rescueRoot.textContent = "";
      const suggestions = core.buildRelaxationSuggestions({
        state,
        profileId: profile.id,
        query: pageState.query,
        creatorQuery: pageState.creatorQuery,
        includeTagIds: pageState.includeTagIds,
        excludeTagIds: pageState.excludeTagIds,
        sort: pageState.sort,
        collectionId: pageState.collectionId,
        matchMode: pageState.matchMode,
        limit: 5,
      });

      if (!suggestions.length) {
        rescueRoot.appendChild(createElement("p", "plp-field__help", "緩和候補はまだありません。"));
        return;
      }

      suggestions.forEach((suggestion, index) => {
        const item = createElement("div", "finder-relax-item");
        item.append(
          createActionButton({
            label: `${suggestion.label} (${suggestion.resultCount}件)`,
            className: "finder-relax-btn",
            dataset: {
              rescueIndex: String(index),
              rescueState: JSON.stringify(suggestion.nextState),
            },
          }),
          createElement("p", "", suggestion.description)
        );
        rescueRoot.appendChild(item);
      });
    };

    const renderSuggestions = (filtered, uiState) => {
      if (!suggestionsRoot || !suggestionsWrap) return;
      suggestionsRoot.textContent = "";
      suggestionsWrap.hidden = filtered.length !== 0;
      if (filtered.length) return;

      const suggestions = core.suggestWorks({
        state,
        profileId: profile.id,
        query: pageState.query,
        includeTagIds: pageState.includeTagIds,
        excludeTagIds: pageState.excludeTagIds,
        limit: 4,
      });
      suggestions.forEach((work) => {
        suggestionsRoot.appendChild(
          createProductCard({
            work,
            uiState,
            reason:
              ensureArray(work.suggestionSharedTags).length
                ? `近い条件: ${work.suggestionSharedTags
                    .map((tagId) => tagMap.get(tagId)?.label || tagId)
                    .join(" / ")}`
                : work.matchSummary,
            showActions: false,
          })
        );
      });
      if (!suggestions.length) suggestionsWrap.hidden = true;
    };

    const renderCategories = (filtered) => {
      if (!categoryRoot) return;
      categoryRoot.textContent = "";
      const collections = core
        .getProfileCollections(state, profile.id, { publicOnly: true })
        .map((collection) => core.decorateCollection(collection, state))
        .slice(0, 8);

      if (filtered.length && collections.length) {
        collections.forEach((collection) => {
          const relatedCount = filtered.filter((work) =>
            ensureArray(work.collectionIds).includes(collection.id)
          ).length;
          categoryRoot.appendChild(
            createContentCard({
              href: createFinderUrl({ collectionId: collection.id }),
              kind: "collection",
              kicker: "カテゴリ",
              title: collection.title,
              description: collection.lead || collection.description,
              meta: `${relatedCount || collection.workObjects.length}件`,
              imageTitle: collection.title,
              chips: collection.tagObjects.slice(0, 3).map((tag) => tag.label),
            })
          );
        });
        return;
      }

      groupedTags.slice(0, 8).forEach((group) => {
        categoryRoot.appendChild(
          createContentCard({
            href: createFinderUrl({ includeTagIds: group.tags.slice(0, 1).map((tag) => tag.id) }),
            kind: "tag",
            kicker: "カテゴリ",
            title: group.label,
            description: group.description,
            meta: `${group.tags.length}条件`,
            imageTitle: group.label,
            chips: group.tags.slice(0, 3).map((tag) => tag.label),
          })
        );
      });
    };

    const renderRelatedSearches = (filtered) => {
      if (!relatedRoot) return;
      relatedRoot.textContent = "";
      const seen = new Set();
      const items = [];
      const sourceWorks = filtered.length
        ? filtered
        : core.suggestWorks({
            state,
            profileId: profile.id,
            query: pageState.query,
            includeTagIds: pageState.includeTagIds,
            excludeTagIds: pageState.excludeTagIds,
            limit: 8,
          });

      const pushItem = ({ label, href, count }) => {
        if (!label || seen.has(label)) return;
        seen.add(label);
        items.push({ label, href, count });
      };

      const tagCountMap = new Map();
      sourceWorks.forEach((work) => {
        ensureArray(work.primaryTagObjects).forEach((tag) => {
          if (pageState.includeTagIds.includes(tag.id) || pageState.excludeTagIds.includes(tag.id)) {
            return;
          }
          const key = tag.id;
          const current = tagCountMap.get(key) || { tag, count: 0 };
          current.count += 1;
          tagCountMap.set(key, current);
        });
      });

      Array.from(tagCountMap.values())
        .sort((left, right) => right.count - left.count)
        .slice(0, 10)
        .forEach(({ tag }) => {
          const resultCount = core.filterWorks({
            state,
            profileId: profile.id,
            query: pageState.query,
            creatorQuery: pageState.creatorQuery,
            includeTagIds: unique([...pageState.includeTagIds, tag.id]),
            excludeTagIds: pageState.excludeTagIds,
            sort: pageState.sort,
            collectionId: pageState.collectionId,
            matchMode: pageState.matchMode,
          }).length;
          if (!resultCount) return;
          pushItem({
            label: tag.label,
            href: createFinderUrl({
              query: pageState.query,
              creatorQuery: pageState.creatorQuery,
              includeTagIds: [...pageState.includeTagIds, tag.id],
              excludeTagIds: pageState.excludeTagIds,
              sort: pageState.sort,
              collectionId: pageState.collectionId,
              matchMode: pageState.matchMode,
            }),
            count: resultCount,
          });
        });

      if (items.length < 8) {
        core
          .getProfileCollections(state, profile.id, { publicOnly: true })
          .slice(0, 6)
          .forEach((collection) => {
            const resultCount = core.filterWorks({
              state,
              profileId: profile.id,
              query: pageState.query,
              creatorQuery: pageState.creatorQuery,
              includeTagIds: pageState.includeTagIds,
              excludeTagIds: pageState.excludeTagIds,
              sort: pageState.sort,
              collectionId: collection.id,
              matchMode: pageState.matchMode,
            }).length;
            if (!resultCount) return;
            pushItem({
              label: collection.title,
              href: createFinderUrl({
                query: pageState.query,
                creatorQuery: pageState.creatorQuery,
                includeTagIds: pageState.includeTagIds,
                excludeTagIds: pageState.excludeTagIds,
                sort: pageState.sort,
                collectionId: collection.id,
                matchMode: pageState.matchMode,
              }),
              count: resultCount,
            });
          });
      }

      items.slice(0, 10).forEach((item) => {
        const listItem = createElement("li", "relatedSearches__list-item");
        const link = createElement("a", "relatedSearches__link", item.label);
        link.href = item.href;
        listItem.append(
          link,
          createElement("span", "relatedSearches__count", `(${item.count})`)
        );
        relatedRoot.appendChild(listItem);
      });
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
        includeTagIds: pageState.includeTagIds.slice().sort(),
        excludeTagIds: pageState.excludeTagIds.slice().sort(),
        collectionId: pageState.collectionId,
        sort: pageState.sort,
        matchMode: pageState.matchMode,
        resultCount,
      });
      if (signature === lastLogSignature) return;

      window.clearTimeout(logTimer);
      logTimer = window.setTimeout(() => {
        store.logEvent("search", {
          profileId: profile.id,
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

    const renderResults = () => {
      state = store.loadState();
      const uiState = getUiState(state);
      const collection = pageState.collectionId ? core.getCollection(state, pageState.collectionId) : null;
      const filtered = core.filterWorks({
        state,
        profileId: profile.id,
        query: pageState.query,
        creatorQuery: pageState.creatorQuery,
        includeTagIds: pageState.includeTagIds,
        excludeTagIds: pageState.excludeTagIds,
        sort: pageState.sort,
        collectionId: pageState.collectionId,
        matchMode: pageState.matchMode,
      });

      const headingLabel = pageState.query
        ? `「${pageState.query}」の検索結果：${filtered.length}件`
        : collection
          ? `${collection.title}：${filtered.length}件`
          : `作品検索：${filtered.length}件`;

      headingRoot.textContent = headingLabel;
      if (summaryRoot) {
        summaryRoot.textContent =
          collection?.description || profile.heroDescription || "条件を組み合わせて作品を探します。";
      }
      if (a11yLive) {
        a11yLive.textContent = `${headingLabel} が見つかりました。`;
      }

      resultsRoot.textContent = "";
      filtered.forEach((work) => {
        resultsRoot.appendChild(
          createProductCard({
            work,
            uiState,
            reason: work.matchContext?.summary || work.matchSummary || work.publicNote,
          })
        );
      });

      const conditionFragments = [];
      if (pageState.query) conditionFragments.push(`作品: ${pageState.query}`);
      if (pageState.creatorQuery) conditionFragments.push(`作者: ${pageState.creatorQuery}`);
      if (pageState.matchMode === "or") conditionFragments.push("いずれか一致");
      if (pageState.includeTagIds.length) {
        conditionFragments.push(
          `含める: ${pageState.includeTagIds
            .map((tagId) => tagMap.get(tagId)?.label || tagId)
            .join(" / ")}`
        );
      }
      if (pageState.excludeTagIds.length) {
        conditionFragments.push(
          `除外: ${pageState.excludeTagIds
            .map((tagId) => tagMap.get(tagId)?.label || tagId)
            .join(" / ")}`
        );
      }
      if (collection) conditionFragments.push(`特集: ${collection.title}`);
      statusRoot.textContent = `${filtered.length}件 | ${getSortMeta(pageState.sort).label} | ${
        conditionFragments.length ? conditionFragments.join(" | ") : "条件なし"
      }`;

      if (emptyRoot) emptyRoot.hidden = filtered.length !== 0;
      renderActiveChips();
      renderRescue();
      renderSuggestions(filtered, uiState);
      renderCompare(uiState);
      renderCategories(filtered);
      renderRelatedSearches(filtered);
      renderRecentWorks();
      refreshCarousels(root);
      scheduleLog(filtered.length);
    };

    const applyAndRender = () => {
      syncControls();
      updateFinderUrl(pageState);
      renderFilterGroups();
      renderSavedSearches();
      renderPresets();
      renderPopularSearches();
      renderTips();
      renderResults();
    };

    readUrlState();
    applyAndRender();
    initializeAccordions(root);

    if (!root.dataset.finderBound) {
      root.addEventListener("click", (event) => {
        const accordionButton = event.target.closest("[data-accordion-button], .plp-filter-panel__heading");
        if (accordionButton) {
          const expanded = accordionButton.getAttribute("aria-expanded") !== "false";
          accordionButton.setAttribute("aria-expanded", String(!expanded));
          const panel =
            accordionButton.parentElement?.querySelector("[data-accordion-panel], .plp-filter-panel__body");
          if (panel) panel.hidden = expanded;
          return;
        }

        const filterButton = event.target.closest("[data-filter-tag-id]");
        if (filterButton) {
          const tagId = filterButton.dataset.filterTagId;
          const nextState = filterButton.dataset.filterState;
          pageState.includeTagIds = pageState.includeTagIds.filter((value) => value !== tagId);
          pageState.excludeTagIds = pageState.excludeTagIds.filter((value) => value !== tagId);
          if (nextState === "include") {
            pageState.includeTagIds = unique([...pageState.includeTagIds, tagId]);
          }
          if (nextState === "exclude") {
            pageState.excludeTagIds = unique([...pageState.excludeTagIds, tagId]);
          }
          applyAndRender();
          return;
        }

        const removeButton = event.target.closest("[data-remove-kind]");
        if (removeButton) {
          const kind = removeButton.dataset.removeKind;
          const value = removeButton.dataset.removeValue || "";
          if (kind === "query") pageState.query = "";
          if (kind === "creator") pageState.creatorQuery = "";
          if (kind === "mode") pageState.matchMode = "and";
          if (kind === "include") {
            pageState.includeTagIds = pageState.includeTagIds.filter((tagId) => tagId !== value);
          }
          if (kind === "exclude") {
            pageState.excludeTagIds = pageState.excludeTagIds.filter((tagId) => tagId !== value);
          }
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
          const action = actionButton.dataset.workAction;
          const workId = actionButton.dataset.workId;
          if (!action || !workId) return;
          if (action === "favorite") store.toggleFavoriteWork(workId);
          if (action === "compare") store.toggleCompareWork(workId);
          renderResults();
          return;
        }

        const deleteSaved = event.target.closest("[data-saved-search-delete]");
        if (deleteSaved) {
          store.deleteSavedSearch(deleteSaved.dataset.savedSearchDelete || "");
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
            // ignore malformed rescue payloads
          }
          return;
        }

        if (event.target.closest("[data-work-link]")) {
          store.logEvent("result_click", {
            profileId: profile.id,
            query: pageState.query,
            creatorQuery: pageState.creatorQuery,
            includeTagIds: pageState.includeTagIds,
            excludeTagIds: pageState.excludeTagIds,
            collectionId: pageState.collectionId,
            matchMode: pageState.matchMode,
          });
          return;
        }

        if (compareClearButton && event.target.closest("[data-compare-clear]")) {
          ensureArray(store.loadState().ui?.compareWorkIds).forEach((workId) => {
            store.toggleCompareWork(workId);
          });
          renderResults();
        }
      });

      root.dataset.finderBound = "true";
    }

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

    clearQueryButton?.addEventListener("click", () => {
      pageState.query = "";
      queryInput.value = "";
      applyAndRender();
      queryInput.focus();
    });

    clearButton?.addEventListener("click", () => {
      pageState.query = "";
      pageState.creatorQuery = "";
      pageState.includeTagIds = [];
      pageState.excludeTagIds = [];
      pageState.sort = "recommended";
      pageState.collectionId = "";
      pageState.matchMode = "and";
      applyAndRender();
    });

    saveButton?.addEventListener("click", () => {
      const defaultLabel = getSearchSummaryLabel(pageState, tagMap);
      const label = window.prompt(
        "保存する検索名",
        defaultLabel === "条件なし" ? "マイ検索" : defaultLabel
      );
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
      renderPopularSearches();
    });

    copyButton?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        copyButton.textContent = "コピー済み";
        window.setTimeout(() => {
          copyButton.textContent = "検索URLをコピー";
        }, 1200);
      } catch (error) {
        copyButton.textContent = "コピー失敗";
        window.setTimeout(() => {
          copyButton.textContent = "検索URLをコピー";
        }, 1200);
      }
    });
  };

  const init = () => {
    renderHomePage();
    renderFinderPage();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  return {
    init,
    refreshCarousels,
  };
});
