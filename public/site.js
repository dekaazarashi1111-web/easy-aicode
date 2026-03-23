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

const normalizeSearchValue = (value) =>
  (value || "")
    .toString()
    .toLowerCase()
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const splitSearchTokens = (value) =>
  normalizeSearchValue(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

const splitSearchList = (value) =>
  (value || "")
    .toString()
    .split(",")
    .map((item) => normalizeSearchValue(item))
    .filter(Boolean);

const updateQueryParams = (params) => {
  const url = new URL(window.location.href);
  url.search = params.toString();
  const nextUrl = `${url.pathname}${url.search ? `?${params.toString()}` : ""}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
};

const initArticleSearch = () => {
  const root = document.querySelector("[data-article-search]");
  const results = document.querySelector("[data-search-results]");
  if (!root || !results) return;

  const queryInput = root.querySelector("[data-search-query]");
  const modeButtons = Array.from(root.querySelectorAll("[data-search-mode]"));
  const filterButtons = Array.from(root.querySelectorAll("[data-search-filter]"));
  const clearButton = root.querySelector("[data-search-clear]");
  const status = root.querySelector("[data-search-status]");
  const empty = document.querySelector("[data-search-empty]");
  const items = Array.from(results.querySelectorAll("[data-search-item]"));
  if (!queryInput || !modeButtons.length || !items.length) return;

  let mode = "and";

  const getSelectedValues = (group) =>
    filterButtons
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

  const evaluateTextMatch = (tokens, haystack) => {
    if (!tokens.length) return null;
    return mode === "and"
      ? tokens.every((token) => haystack.includes(token))
      : tokens.some((token) => haystack.includes(token));
  };

  const evaluateListMatch = (selectedValues, itemValues) => {
    if (!selectedValues.length) return null;
    const normalizedItemValues = new Set(itemValues.map((value) => normalizeSearchValue(value)));
    const normalizedSelectedValues = selectedValues.map((value) => normalizeSearchValue(value));
    return mode === "and"
      ? normalizedSelectedValues.every((value) => normalizedItemValues.has(value))
      : normalizedSelectedValues.some((value) => normalizedItemValues.has(value));
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
    status.textContent = `${conditionText} | 全${items.length}件中 ${visibleCount}件を表示`;
  };

  const applyFilters = ({ syncUrl = true } = {}) => {
    const queryTokens = splitSearchTokens(queryInput.value);
    const selectedTypes = getSelectedValues("type");
    const selectedTags = getSelectedValues("tag");
    let visibleCount = 0;

    items.forEach((item) => {
      const title = item.dataset.title || "";
      const summary = item.dataset.summary || "";
      const keywords = item.dataset.keywords || "";
      const type = item.dataset.type || "";
      const tags = splitSearchList(item.dataset.tags || "");
      const haystack = normalizeSearchValue([title, summary, keywords, type, tags.join(" ")].join(" "));

      const activeMatches = [];
      const textMatch = evaluateTextMatch(queryTokens, haystack);
      const typeMatch = evaluateListMatch(selectedTypes, [type]);
      const tagMatch = evaluateListMatch(selectedTags, tags);

      if (textMatch !== null) activeMatches.push(textMatch);
      if (typeMatch !== null) activeMatches.push(typeMatch);
      if (tagMatch !== null) activeMatches.push(tagMatch);

      const isVisible = !activeMatches.length
        ? true
        : mode === "and"
          ? activeMatches.every(Boolean)
          : activeMatches.some(Boolean);

      item.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    if (empty) empty.hidden = visibleCount !== 0;
    updateStatus(visibleCount);
    if (syncUrl) syncUrlFromState();
  };

  const restoreFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");
    const nextMode = params.get("mode");
    const selectedTypes = params.getAll("type").map((value) => normalizeSearchValue(value));
    const selectedTags = params.getAll("tag").map((value) => normalizeSearchValue(value));

    if (query) queryInput.value = query;
    if (nextMode === "or") mode = "or";
    syncModeButtons();

    filterButtons.forEach((button) => {
      const group = button.dataset.filterGroup;
      const value = normalizeSearchValue(button.dataset.filterValue || "");
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

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextValue = button.getAttribute("aria-pressed") !== "true";
      setPressed(button, nextValue);
      applyFilters();
    });
  });

  queryInput.addEventListener("input", () => {
    applyFilters();
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      queryInput.value = "";
      mode = "and";
      syncModeButtons();
      filterButtons.forEach((button) => setPressed(button, false));
      applyFilters();
      queryInput.focus();
    });
  }

  restoreFromUrl();
  applyFilters({ syncUrl: false });
};

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
