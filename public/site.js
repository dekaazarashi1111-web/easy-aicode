const SITE_CONFIG = window.SITE_CONFIG || {};

const sendAnalyticsEvent = (name, params = {}) => {
  if (typeof window.gtag !== "function") return;
  const sanitized = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    } else {
      sanitized[key] = JSON.stringify(value);
    }
  });
  window.gtag("event", name, {
    ...sanitized,
    transport_type: "beacon",
  });
};

const toAbsoluteUrl = (value) => {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  try {
    return new URL(value, window.location.origin).href;
  } catch (error) {
    return value;
  }
};

const updateSeoUrls = () => {
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute("href", toAbsoluteUrl(canonical.getAttribute("href")));
  }

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    ogUrl.setAttribute("content", toAbsoluteUrl(ogUrl.getAttribute("content")));
  }

  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    ogImage.setAttribute("content", toAbsoluteUrl(ogImage.getAttribute("content")));
  }

  const ogImageSecure = document.querySelector('meta[property="og:image:secure_url"]');
  if (ogImageSecure) {
    ogImageSecure.setAttribute(
      "content",
      toAbsoluteUrl(ogImageSecure.getAttribute("content"))
    );
  }

  const twitterImage = document.querySelector('meta[name="twitter:image"]');
  if (twitterImage) {
    twitterImage.setAttribute("content", toAbsoluteUrl(twitterImage.getAttribute("content")));
  }
};

updateSeoUrls();

const updateXProfileLinks = () => {
  if (!SITE_CONFIG.X_PROFILE_URL) return;
  const links = document.querySelectorAll(
    'a[data-x-profile], a[href*="{{YOUR_X_HANDLE}}"], a[href*="%7B%7BYOUR_X_HANDLE%7D%7D"]'
  );
  links.forEach((link) => {
    link.setAttribute("href", SITE_CONFIG.X_PROFILE_URL);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });

  const handleMatch = SITE_CONFIG.X_PROFILE_URL.match(/x\.com\/([^/?#]+)/i);
  const handle = handleMatch ? `@${handleMatch[1]}` : null;
  if (!handle) return;
  const twitterSite = document.querySelector('meta[name="twitter:site"]');
  if (twitterSite) twitterSite.setAttribute("content", handle);
  const twitterCreator = document.querySelector('meta[name="twitter:creator"]');
  if (twitterCreator) twitterCreator.setAttribute("content", handle);
};

updateXProfileLinks();

const updateBrandCopy = () => {
  if (!SITE_CONFIG.BRAND_NAME) return;

  document.querySelectorAll("[data-site-brand]").forEach((element) => {
    element.textContent = SITE_CONFIG.BRAND_NAME;
  });

  document.querySelectorAll("[data-site-copyright]").forEach((element) => {
    element.textContent = `© ${SITE_CONFIG.BRAND_NAME}`;
  });

  const author = document.querySelector('meta[name="author"]');
  if (author) author.setAttribute("content", SITE_CONFIG.BRAND_NAME);

  const siteName = document.querySelector('meta[property="og:site_name"]');
  if (siteName) siteName.setAttribute("content", SITE_CONFIG.BRAND_NAME);

  if (document.title.includes("Media Canvas")) {
    document.title = document.title.replace(/Media Canvas/g, SITE_CONFIG.BRAND_NAME);
  }

  const titleMeta = [
    document.querySelector('meta[property="og:title"]'),
    document.querySelector('meta[name="twitter:title"]'),
  ];

  titleMeta.forEach((meta) => {
    if (!meta) return;
    const current = meta.getAttribute("content") || "";
    if (current.includes("Media Canvas")) {
      meta.setAttribute("content", current.replace(/Media Canvas/g, SITE_CONFIG.BRAND_NAME));
    }
  });
};

updateBrandCopy();

const formatLabel = (value) =>
  (value || "")
    .toString()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

const sanitizeHref = (href) => {
  if (!href) return "";
  if (/^mailto:/i.test(href)) return "mailto";
  if (/^tel:/i.test(href)) return "tel";
  return href;
};

const updateQueryParams = (params) => {
  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
};

const toFilterUrl = ({ query = "", mode = "and", type = "", tag = "" } = {}) => {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (mode === "or") params.set("mode", "or");
  if (type) params.append("type", type);
  if (tag) params.append("tag", tag);
  return `/articles/${params.toString() ? `?${params.toString()}` : ""}`;
};

const createFilterBadge = (label, href) => {
  const badge = document.createElement(href ? "a" : "span");
  badge.className = "tag";
  badge.textContent = label;
  if (href) badge.setAttribute("href", href);
  return badge;
};

const initArticleDetailMeta = () => {
  const root = document.querySelector("[data-article-detail]");
  const slug = root?.dataset.articleSlug;
  const api = window.ArticleSearch;
  const articles = Array.isArray(window.ARTICLE_INDEX) ? window.ARTICLE_INDEX : [];
  if (!root || !slug || !api || !articles.length) return;

  const article = api.decorateArticles(articles).find((item) => item.slug === slug);
  if (!article) return;

  const tagContainer = root.querySelector("[data-article-meta-tags]");
  if (!tagContainer) return;

  tagContainer.textContent = "";
  tagContainer.appendChild(createFilterBadge(article.type, toFilterUrl({ type: article.type })));
  article.tags.forEach((tag) => {
    tagContainer.appendChild(createFilterBadge(tag, toFilterUrl({ tag })));
  });
  tagContainer.appendChild(createFilterBadge(article.publishedAt));
};

const initArticleSearch = () => {
  const root = document.querySelector("[data-article-search]");
  const results = document.querySelector("[data-search-results]");
  const api = window.ArticleSearch;
  const articles = Array.isArray(window.ARTICLE_INDEX) ? window.ARTICLE_INDEX : [];
  if (!root || !results || !api || !articles.length) return;

  const queryInput = root.querySelector("[data-search-query]");
  const modeButtons = Array.from(root.querySelectorAll("[data-search-mode]"));
  const typeOptionsRoot = root.querySelector("[data-search-type-options]");
  const tagOptionsRoot = root.querySelector("[data-search-tag-options]");
  const clearButton = root.querySelector("[data-search-clear]");
  const status = root.querySelector("[data-search-status]");
  const empty = document.querySelector("[data-search-empty]");
  if (!queryInput || !modeButtons.length || !typeOptionsRoot || !tagOptionsRoot) return;

  const decoratedArticles = api.decorateArticles(articles);
  const filterOptions = api.collectFilterOptions(decoratedArticles);

  let mode = "and";

  const getFilterButtons = () => Array.from(root.querySelectorAll("[data-search-filter]"));

  const getSelectedValues = (group) =>
    getFilterButtons()
      .filter(
        (button) =>
          button.dataset.filterGroup === group && button.getAttribute("aria-pressed") === "true"
      )
      .map((button) => button.dataset.filterValue || "")
      .filter(Boolean);

  const syncModeButtons = () => {
    modeButtons.forEach((button) => {
      const isActive = button.dataset.searchMode === mode;
      button.setAttribute("aria-pressed", String(isActive));
    });
  };

  const setPressed = (button, nextValue) => {
    button.setAttribute("aria-pressed", String(nextValue));
  };

  const renderOptionButtons = (container, options, group) => {
    container.textContent = "";
    options.forEach((option) => {
      const button = document.createElement("button");
      const label = document.createElement("span");
      const count = document.createElement("span");
      button.className = "tag-filter__btn";
      button.type = "button";
      button.dataset.searchFilter = "";
      button.dataset.filterGroup = group;
      button.dataset.filterValue = option.value;
      button.setAttribute("aria-pressed", "false");

      label.textContent = option.value;
      count.className = "tag-filter__count";
      count.textContent = String(option.count);

      button.append(label, count);
      container.appendChild(button);
    });
  };

  const renderArticles = (items) => {
    results.textContent = "";

    items.forEach((article) => {
      const card = document.createElement("a");
      const tagList = document.createElement("div");
      const title = document.createElement("h2");
      const summary = document.createElement("p");

      card.className = "card card--interactive stack";
      card.href = article.url;

      tagList.className = "tag-list";
      tagList.appendChild(createFilterBadge(article.type));
      article.tags.slice(0, 4).forEach((tag) => {
        tagList.appendChild(createFilterBadge(tag));
      });

      title.className = "h2";
      title.textContent = article.title;

      summary.className = "muted";
      summary.textContent = article.summary;

      card.append(tagList, title, summary);
      results.appendChild(card);
    });
  };

  const syncUrlFromState = () => {
    const params = new URLSearchParams();
    const queryValue = queryInput.value.trim();
    const selectedTypes = getSelectedValues("type");
    const selectedTags = getSelectedValues("tag");

    if (queryValue) params.set("q", queryValue);
    if (mode !== "and") params.set("mode", mode);
    selectedTypes.forEach((value) => params.append("type", value));
    selectedTags.forEach((value) => params.append("tag", value));
    updateQueryParams(params);
  };

  const updateStatus = (visibleCount) => {
    if (!status) return;
    const fragments = [];
    const queryValue = queryInput.value.trim();
    const selectedTypes = getSelectedValues("type");
    const selectedTags = getSelectedValues("tag");
    if (queryValue) fragments.push(`キーワード: ${queryValue}`);
    if (selectedTypes.length) fragments.push(`記事タイプ: ${selectedTypes.join(" / ")}`);
    if (selectedTags.length) fragments.push(`タグ: ${selectedTags.join(" / ")}`);

    const conditionText = fragments.length
      ? `条件 ${mode.toUpperCase()} 検索`
      : "条件なし";
    status.textContent = `${conditionText} | 全${decoratedArticles.length}件中 ${visibleCount}件を表示`;
  };

  const applyFilters = ({ syncUrl = true } = {}) => {
    const selectedTypes = getSelectedValues("type");
    const selectedTags = getSelectedValues("tag");
    const filtered = api.filterArticles({
      articles: decoratedArticles,
      query: queryInput.value,
      mode,
      selectedTypes,
      selectedTags,
    });

    renderArticles(filtered);
    if (empty) empty.hidden = filtered.length !== 0;
    updateStatus(filtered.length);
    if (syncUrl) syncUrlFromState();
  };

  const restoreFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");
    const nextMode = params.get("mode");
    const selectedTypes = params.getAll("type").map((value) => api.normalizeSearchValue(value));
    const selectedTags = params.getAll("tag").map((value) => api.normalizeSearchValue(value));

    if (query) queryInput.value = query;
    if (nextMode === "or") mode = "or";
    syncModeButtons();

    getFilterButtons().forEach((button) => {
      const group = button.dataset.filterGroup;
      const value = api.normalizeSearchValue(button.dataset.filterValue || "");
      const selectedValues = group === "type" ? selectedTypes : selectedTags;
      setPressed(button, selectedValues.includes(value));
    });
  };

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.searchMode === "or" ? "or" : "and";
      syncModeButtons();
      applyFilters();
    });
  });

  const bindFilterButtons = () => {
    getFilterButtons().forEach((button) => {
      button.addEventListener("click", () => {
        const nextValue = button.getAttribute("aria-pressed") !== "true";
        setPressed(button, nextValue);
        applyFilters();
      });
    });
  };

  queryInput.addEventListener("input", () => {
    applyFilters();
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      queryInput.value = "";
      mode = "and";
      syncModeButtons();
      getFilterButtons().forEach((button) => setPressed(button, false));
      applyFilters();
      queryInput.focus();
    });
  }

  renderOptionButtons(typeOptionsRoot, filterOptions.types, "type");
  renderOptionButtons(tagOptionsRoot, filterOptions.tags, "tag");
  bindFilterButtons();
  restoreFromUrl();
  applyFilters({ syncUrl: false });
};

initArticleDetailMeta();
initArticleSearch();

document.addEventListener("click", (event) => {
  const target = event.target.closest("a, button");
  if (!target) return;
  const label = formatLabel(target.textContent);
  const href = target.tagName === "A" ? sanitizeHref(target.getAttribute("href")) : "";
  const trackData = {
    label,
    href,
    tag: target.tagName.toLowerCase(),
  };
  if (target.dataset.xProfile) {
    trackData.x_profile = "true";
  }
  sendAnalyticsEvent("ui_click", trackData);
});
