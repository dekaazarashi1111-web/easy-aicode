const SITE_CONFIG = window.SITE_CONFIG || {};

if (typeof document !== "undefined" && !document.documentElement.hasAttribute("data-theme")) {
  document.documentElement.setAttribute("data-theme", "dark");
}

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

const themeColorMeta = document.querySelector('meta[name="theme-color"]');
if (themeColorMeta) {
  themeColorMeta.setAttribute("content", "#09111d");
}

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
    if (element.classList.contains("nav__brand")) {
      const text = element.querySelector(".nav__brand-text");
      if (text) {
        text.textContent = SITE_CONFIG.BRAND_NAME;
      } else {
        element.textContent = SITE_CONFIG.BRAND_NAME;
      }
      return;
    }
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

const BRAND_NAME = SITE_CONFIG.BRAND_NAME || "Media Canvas";

const normalizePathname = (pathname) => {
  if (!pathname) return "/";
  let nextPath = pathname;
  if (nextPath !== "/" && nextPath.endsWith("/index.html")) {
    nextPath = nextPath.slice(0, -"index.html".length);
  }
  if (nextPath.endsWith(".html")) return nextPath;
  return nextPath.endsWith("/") ? nextPath : `${nextPath}/`;
};

const getCurrentSection = (pathname = window.location.pathname) => {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") return "home";
  if (normalized.startsWith("/finder/") || normalized.startsWith("/work/")) return "finder";
  if (normalized.startsWith("/collections/") || normalized.startsWith("/collection/")) {
    return "collections";
  }
  if (normalized.startsWith("/articles/")) return "articles";
  if (normalized.startsWith("/about/")) return "about";
  if (normalized.startsWith("/contact/")) return "contact";
  return "";
};

const NAV_ITEMS = [
  { href: "/", label: "ホーム", section: "home" },
  { href: "/finder/", label: "作品検索", section: "finder" },
  { href: "/collections/", label: "特集", section: "collections" },
  { href: "/articles/", label: "ガイド", section: "articles" },
  { href: "/about/", label: "運営方針", section: "about" },
  { href: "/contact/", label: "お問い合わせ", section: "contact" },
];

const NAV_CATEGORY_ITEMS = [
  { href: "/finder/?collection=start-here", label: "まずここから" },
  { href: "/finder/?include=tf-present", label: "TFあり" },
  { href: "/finder/?include=format-comic", label: "漫画" },
  { href: "/finder/?include=format-cg", label: "CG・イラスト" },
  { href: "/finder/?include=no-ntr", label: "NTRなし" },
  { href: "/collections/", label: "特集一覧" },
  { href: "/articles/", label: "ガイド一覧" },
];

const FOOTER_GROUPS = [
  {
    title: "探す",
    links: [
      { href: "/finder/", label: "作品検索" },
      { href: "/collections/", label: "特集一覧" },
      { href: "/articles/", label: "ガイド一覧" },
    ],
  },
  {
    title: "案内",
    links: [
      { href: "/about/", label: "運営方針" },
      { href: "/contact/", label: "お問い合わせ" },
      { href: "/404.html", label: "404ページ" },
    ],
  },
  {
    title: "法務",
    links: [
      { href: "/privacy.html", label: "プライバシー" },
      { href: "/disclaimer.html", label: "免責事項" },
    ],
  },
];

const createChromeLink = ({ href, label, className = "", current = false }) => {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  if (className) link.className = className;
  if (current) link.setAttribute("aria-current", "page");
  return link;
};

const renderSiteChrome = () => {
  const currentSection = getCurrentSection();

  document.querySelectorAll(".nav").forEach((nav) => {
    const inner = nav.querySelector(".nav__inner");
    if (!inner) return;
    inner.textContent = "";

    const topbar = document.createElement("div");
    const topbarLeft = document.createElement("div");
    const topbarRight = document.createElement("div");
    const mainRow = document.createElement("div");
    const brand = document.createElement("a");
    const brandMark = document.createElement("span");
    const brandText = document.createElement("span");
    const searchForm = document.createElement("form");
    const searchInput = document.createElement("input");
    const searchButton = document.createElement("button");
    const utility = document.createElement("div");
    const linksRoot = document.createElement("div");
    const categoryRoot = document.createElement("div");
    const promo = document.createElement("div");
    const promoText = document.createElement("p");
    const promoActions = document.createElement("div");

    topbar.className = "nav__topbar";
    topbarLeft.className = "nav__topbar-links";
    topbarRight.className = "nav__topbar-links nav__topbar-links--right";
    mainRow.className = "nav__main";
    brand.className = "nav__brand";
    brand.href = "/";
    brand.setAttribute("data-site-brand", "");
    brandMark.className = "nav__brand-mark";
    brandMark.textContent = BRAND_NAME.slice(0, 2);
    brandText.className = "nav__brand-text";
    brandText.textContent = BRAND_NAME;
    brand.append(brandMark, brandText);

    searchForm.className = "nav__search";
    searchForm.action = "/finder/";
    searchForm.method = "get";
    searchInput.className = "nav__search-input";
    searchInput.type = "search";
    searchInput.name = "q";
    searchInput.placeholder = "作品名、作者、雰囲気で探す";
    searchInput.setAttribute("aria-label", "サイト内検索");
    searchButton.className = "nav__search-button";
    searchButton.type = "submit";
    searchButton.textContent = "検索";
    searchForm.append(searchInput, searchButton);

    utility.className = "nav__utility";
    linksRoot.className = "nav__links";
    categoryRoot.className = "nav__categories";
    promo.className = "nav__promo";
    promoText.className = "nav__promo-text";
    promoText.textContent =
      "条件検索、固定特集、ガイド導線を一つの流れで使える探索サイトの土台です。";
    promoActions.className = "nav__promo-actions";

    topbarLeft.append(
      createChromeLink({ href: "/about/", label: "このサイトについて" }),
      createChromeLink({ href: "/collections/", label: "特集から探す" }),
      createChromeLink({ href: "/articles/", label: "ガイドを見る" })
    );

    topbarRight.append(
      createChromeLink({ href: "/contact/", label: "お問い合わせ" }),
      createChromeLink({ href: "/privacy.html", label: "プライバシー" })
    );

    NAV_ITEMS.forEach((item) => {
      linksRoot.appendChild(
        createChromeLink({
          href: item.href,
          label: item.label,
          className: "nav__link",
          current: item.section === currentSection,
        })
      );
    });

    NAV_CATEGORY_ITEMS.forEach((item) => {
      categoryRoot.appendChild(
        createChromeLink({
          href: item.href,
          label: item.label,
          className: "nav__category-link",
        })
      );
    });

    utility.append(
      createChromeLink({
        href: "/collections/",
        label: "特集から始める",
        className: "nav__cta nav__cta--secondary",
      }),
      createChromeLink({
        href: "/finder/",
        label: "条件から探す",
        className: "nav__cta nav__cta--primary",
      })
    );

    promoActions.append(
      createChromeLink({
        href: "/finder/",
        label: "検索ページへ",
        className: "nav__promo-link",
      }),
      createChromeLink({
        href: "/collections/",
        label: "公開中特集を見る",
        className: "nav__promo-link nav__promo-link--secondary",
      })
    );

    topbar.append(topbarLeft, topbarRight);
    mainRow.append(brand, searchForm, utility);
    promo.append(promoText, promoActions);
    inner.append(topbar, mainRow, linksRoot, categoryRoot, promo);
  });

  document.querySelectorAll(".footer").forEach((footer) => {
    const inner = footer.querySelector(".footer__inner");
    if (!inner) return;

    inner.textContent = "";

    const lead = document.createElement("div");
    const leadTop = document.createElement("div");
    const leadText = document.createElement("p");
    const leadLinks = document.createElement("div");
    const grid = document.createElement("div");
    const bottom = document.createElement("div");
    const copyright = document.createElement("p");
    const note = document.createElement("p");

    lead.className = "footer__lead";
    leadTop.className = "stack";
    leadLinks.className = "footer__lead-actions";
    grid.className = "footer__grid";
    bottom.className = "footer__bottom";

    leadTop.append(
      Object.assign(document.createElement("p"), {
        className: "footer__eyebrow",
        textContent: "Finder Base",
      }),
      Object.assign(document.createElement("h2"), {
        className: "h3",
        textContent: BRAND_NAME,
      })
    );

    leadText.className = "muted";
    leadText.textContent =
      "条件検索、固定特集、ガイド導線を一つの体験として揃え、どのページから入っても迷わず次の行動へ進めるようにします。";

    leadLinks.append(
      createChromeLink({
        href: "/finder/",
        label: "作品検索へ",
        className: "btn btn--primary btn--sm",
      }),
      createChromeLink({
        href: "/contact/",
        label: "お問い合わせ",
        className: "btn btn--secondary btn--sm",
      })
    );

    lead.append(leadTop, leadText, leadLinks);

    FOOTER_GROUPS.forEach((group) => {
      const column = document.createElement("div");
      const title = document.createElement("h3");
      const list = document.createElement("div");

      column.className = "footer__column";
      title.className = "footer__column-title";
      title.textContent = group.title;
      list.className = "footer__column-links";

      group.links.forEach((item) => {
        list.appendChild(
          createChromeLink({
            href: item.href,
            label: item.label,
          })
        );
      });

      column.append(title, list);
      grid.appendChild(column);
    });

    copyright.className = "muted";
    copyright.setAttribute("data-site-copyright", "");
    copyright.textContent = `© ${BRAND_NAME}`;

    note.className = "help";
    note.textContent =
      "固定ページ、ガイド、検索結果で導線や表記を揃え、見た瞬間に役割が分かる構造を維持します。";

    bottom.append(copyright, note);
    inner.append(lead, grid, bottom);
  });
};

renderSiteChrome();
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

  const typeRoot = root.querySelector("[data-article-type-label]");
  if (typeRoot) typeRoot.textContent = article.type;

  const publishedRoot = root.querySelector("[data-article-published]");
  if (publishedRoot) publishedRoot.textContent = `公開: ${article.publishedAt}`;

  const relatedRoot = root.querySelector("[data-guide-related]");
  if (relatedRoot) {
    relatedRoot.textContent = "";
    api
      .decorateArticles(articles)
      .filter((item) => item.slug !== article.slug)
      .slice(0, 3)
      .forEach((item) => {
        const link = document.createElement("a");
        const title = document.createElement("strong");
        const meta = document.createElement("span");
        link.className = "guide-mini-link";
        link.href = item.url;
        title.textContent = item.title;
        meta.className = "help";
        meta.textContent = `${item.type} | ${item.publishedAt}`;
        link.append(title, meta);
        relatedRoot.appendChild(link);
      });
  }
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
