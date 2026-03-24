const SITE_CONFIG = window.SITE_CONFIG || {};

if (typeof document !== "undefined" && !document.documentElement.hasAttribute("data-theme")) {
  document.documentElement.setAttribute("data-theme", "light");
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
  themeColorMeta.setAttribute("content", "#ffffff");
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
  { href: "/finder/", label: "作品一覧", section: "finder" },
  { href: "/finder/?include=kemo-entry", label: "タグ別", section: "tags" },
  { href: "/collections/", label: "特集", section: "collections" },
  { href: "/articles/", label: "ガイド", section: "articles" },
  { href: "/about/", label: "運営情報", section: "about" },
];

const HEADER_UTILITY_ITEMS = [
  { href: "/about/", label: "JA | JP 日本語", icon: "globe" },
  { href: "/finder/?collection=start-here", label: "入口タグから絞って探せます", icon: "spark" },
];

const HEADER_PICKER_ITEMS = [
  { href: "/finder/", label: "保存した検索", icon: "save" },
  { href: "/contact/", label: "お問い合わせ", icon: "mail" },
];

const HEADER_ACTIONS = [
  { href: "/finder/", label: "検索", icon: "search" },
  { href: "/finder/", label: "比較", icon: "compare" },
  { href: "/collections/", label: "特集", icon: "heart" },
];

const FOOTER_GROUPS = [
  {
    title: "オンライン探索ガイド",
    links: [
      { href: "/finder/", label: "作品検索" },
      { href: "/collections/", label: "固定特集" },
      { href: "/articles/", label: "ガイド記事" },
      { href: "/finder/?collection=start-here", label: "まずここから" },
    ],
  },
  {
    title: "お客さまサポート",
    links: [
      { href: "/about/", label: "運営方針" },
      { href: "/contact/", label: "お問い合わせ" },
      { href: "/finder/?include=no-ntr", label: "除外条件の入口" },
      { href: "/collections/", label: "特集一覧" },
    ],
  },
  {
    title: "メンバーシップ",
    links: [
      { href: "/finder/", label: "保存した検索を使う" },
      { href: "/finder/", label: "比較トレイを見る" },
      { href: "/articles/", label: "検索の使い方" },
      { href: "/contact/", label: "更新希望を送る" },
    ],
  },
  {
    title: "サイトについて",
    links: [
      { href: "/about/", label: "このサイトについて" },
      { href: "/privacy.html", label: "プライバシー" },
      { href: "/disclaimer.html", label: "免責事項" },
    ],
  },
];

const createIcon = (kind, className = "") => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("aria-hidden", "true");
  if (className) svg.setAttribute("class", className);

  const paths = {
    globe: [
      "M12 2C6.4772 2 2 6.4771 2 12c0 5.5228 4.4772 10 10 10 5.5228 0 10-4.4772 10-10C22 6.4771 17.5228 2 12 2zm0 2c.2151 0 .9482.2263 1.7467 1.8234.3065.6131.5745 1.3473.7831 2.1766H9.4702c.2086-.8293.4766-1.5635.7831-2.1766C11.0518 4.2263 11.7849 4 12 4zm-3.4627.7862C8.0651 5.693 7.6818 6.7834 7.416 8H5.0703a8.035 8.035 0 0 1 3.467-3.2138zM4.252 10H7.1A19.829 19.829 0 0 0 7 12c0 .6906.0875 1.3608.252 2H4.252A8.0147 8.0147 0 0 1 4 12c0-.6906.0875-1.3608.252-2zm.8184 6H7.416c.2658 1.2166.6491 2.307 1.1213 3.2138A8.0347 8.0347 0 0 1 5.0704 16zm4.0415 0h5.777c-.0723.6359-.1115 1.3051-.1115 2 0 .6949.0392 1.3641.1115 2H9.1119A17.7354 17.7354 0 0 1 9 18c0-.6949.0392-1.3641.1119-2zm.3583-2A17.7354 17.7354 0 0 1 9 12c0-.6949.0392-1.3641.1119-2h5.7762c.0723.6359.1119 1.3051.1119 2 0 .6949-.0396 1.3641-.1119 2H9.4702zm.7831 2h5.0594c-.2086.8293-.4766 1.5635-.7831 2.1766C12.9482 19.7737 12.2151 20 12 20c-.2151 0-.9482-.2263-1.7467-1.8234-.3065-.6131-.5745-1.3473-.7831-2.1766zm5.2096 3.2138c.4721-.9068.8555-1.9972 1.1213-3.2138h2.3457a8.0347 8.0347 0 0 1-3.467 3.2138zM16.9 14c.0656-.6462.1-1.3151.1-2 0-.6849-.0344-1.3538-.1-2h2.848c.1645.6392.252 1.3094.252 2 0 .6906-.0875 1.3608-.252 2H16.9zm-.316-6c-.2658-1.2166-.6492-2.307-1.1213-3.2138A8.035 8.035 0 0 1 18.9297 8h-2.3457z",
    ],
    spark: [
      "M12 2.75l1.8368 4.7219 4.9132.3171-3.8208 3.1058 1.2368 4.9323L12 12.9341l-4.166 2.893 1.2368-4.9323-3.8208-3.1058 4.9132-.3171L12 2.75z",
    ],
    save: [
      "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z",
    ],
    mail: [
      "M3 5h18v14H3V5zm2 2v.511l7 4.375 7-4.375V7H5zm14 3.239-6.4707 4.0442a1 1 0 0 1-1.0586 0L5 10.239V17h14v-6.761z",
    ],
    search: [
      "M13.9804 15.3946c-1.0361.7502-2.3099 1.1925-3.6869 1.1925C6.8177 16.5871 4 13.7694 4 10.2935 4 6.8177 6.8177 4 10.2935 4c3.4759 0 6.2936 2.8177 6.2936 6.2935 0 1.377-.4423 2.6508-1.1925 3.6869l4.6016 4.6016-1.4142 1.4142-4.6016-4.6016zm.6067-5.1011c0 2.3713-1.9223 4.2936-4.2936 4.2936C7.9223 14.5871 6 12.6648 6 10.2935 6 7.9223 7.9223 6 10.2935 6c2.3713 0 4.2936 1.9223 4.2936 4.2935z",
    ],
    compare: [
      "M3 4h8v6H3V4zm10 0h8v6h-8V4zM3 14h8v6H3v-6zm10 3h8v-2h-8v2z",
    ],
    close: [
      "m12.0006 13.4148 2.8283 2.8283 1.4142-1.4142-2.8283-2.8283 2.8283-2.8283-1.4142-1.4142-2.8283 2.8283L9.172 7.7578 7.7578 9.172l2.8286 2.8286-2.8286 2.8285 1.4142 1.4143 2.8286-2.8286z",
    ],
    heart: [
      "M12 20.001l-.501-.3088c-.9745-.5626-1.8878-1.2273-2.7655-1.9296-1.1393-.9117-2.4592-2.1279-3.5017-3.5531-1.0375-1.4183-1.8594-3.1249-1.8597-4.9957-.0025-1.2512.3936-2.5894 1.419-3.6149 1.8976-1.8975 4.974-1.8975 6.8716 0l.3347.3347.336-.3347c1.8728-1.8722 4.9989-1.8727 6.8716 0 .9541.954 1.4145 2.2788 1.4191 3.6137 0 3.0657-2.2028 5.7259-4.1367 7.5015-1.2156 1.1161-2.5544 2.1393-3.9813 2.9729L12 20.001z",
    ],
  };

  (paths[kind] || []).forEach((definition) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", definition);
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute("clip-rule", "evenodd");
    svg.appendChild(path);
  });
  return svg;
};

const createChromeLink = ({ href, label, className = "", current = false, icon = "" }) => {
  const link = document.createElement("a");
  link.href = href;
  if (icon) link.appendChild(createIcon(icon));
  link.appendChild(Object.assign(document.createElement("span"), { textContent: label }));
  if (className) link.className = className;
  if (current) link.setAttribute("aria-current", "page");
  return link;
};

const renderSiteChrome = () => {
  const currentSection = getCurrentSection();
  const currentQuery = new URLSearchParams(window.location.search).get("q") || "";

  document.querySelectorAll(".nav").forEach((nav) => {
    nav.textContent = "";

    const messages = document.createElement("div");
    const utilities = document.createElement("div");
    const utilitiesContainer = document.createElement("div");
    const utilitiesWrapper = document.createElement("div");
    const utilityLeft = document.createElement("div");
    const utilityCenter = document.createElement("div");
    const utilityRight = document.createElement("div");
    const header = document.createElement("div");
    const headerContainer = document.createElement("div");
    const brand = document.createElement("a");
    const brandMark = document.createElement("span");
    const brandLockup = document.createElement("span");
    const brandEyebrow = document.createElement("span");
    const brandText = document.createElement("span");
    const entrypoints = document.createElement("nav");
    const searchForm = document.createElement("form");
    const searchShell = document.createElement("div");
    const searchIcon = createIcon("search", "search-box-svg-icon search-box-search__icon");
    const searchInput = document.createElement("input");
    const clearButton = document.createElement("button");
    const divider = document.createElement("span");
    const searchButton = document.createElement("button");
    const actions = document.createElement("div");

    messages.className = "hnf-messages";
    utilities.className = "hnf-utilities";
    utilitiesContainer.className = "hnf-content-container";
    utilitiesWrapper.className = "hnf-utilities__wrapper";
    utilityLeft.className = "hnf-utilities__block";
    utilityCenter.className = "hnf-utilities__block hnf-utilities__block--vp";
    utilityRight.className = "hnf-utilities__block hnf-utilities__block--pickers";
    header.className = "hnf-header hnf-header--nextnav";
    headerContainer.className = "hnf-content-container hnf-header__container";
    brand.className = "hnf-logo";
    brand.href = "/";
    brand.setAttribute("aria-label", "サイトトップへ");
    brandMark.className = "hnf-logo__mark";
    brandMark.textContent = "FINDER";
    brandLockup.className = "hnf-logo__lockup";
    brandEyebrow.className = "hnf-logo__eyebrow";
    brandEyebrow.textContent = "Curated Search";
    brandText.className = "hnf-logo__name";
    brandText.setAttribute("data-site-brand", "");
    brandText.textContent = BRAND_NAME;
    brandLockup.append(brandEyebrow, brandText);
    brand.append(brandMark, brandLockup);

    entrypoints.className = "hnf-megamenu__entrypoints";
    entrypoints.setAttribute("aria-label", "主要メニュー");

    searchForm.className = "search-box-form";
    searchForm.action = "/finder/";
    searchForm.method = "get";
    searchShell.className = "search-box-search search-box-search--filled search-box-search--medium";
    searchInput.type = "search";
    searchInput.name = "q";
    searchInput.className = "search-box-search__input";
    searchInput.value = currentQuery;
    searchInput.placeholder = "作品・タグ・作者で検索";
    searchInput.setAttribute("aria-label", "サイト内検索");
    clearButton.className =
      "search-box-btn search-box-btn--xsmall search-box-btn--icon-tertiary search-box-search__clear";
    clearButton.type = "button";
    clearButton.dataset.headerClear = "true";
    clearButton.append(
      Object.assign(document.createElement("span"), {
        className: "search-box-btn__inner",
      })
    );
    clearButton.firstChild.append(
      createIcon("close", "search-box-svg-icon search-box-btn__icon"),
      Object.assign(document.createElement("span"), {
        className: "search-box-btn__label",
        textContent: "クリア",
      })
    );
    divider.className = "search-box-search__divider";
    searchButton.className =
      "search-box-btn search-box-btn--xsmall search-box-btn--icon-tertiary search-box-search__action";
    searchButton.type = "submit";
    searchButton.append(
      Object.assign(document.createElement("span"), {
        className: "search-box-btn__inner",
      })
    );
    searchButton.firstChild.append(
      createIcon("search", "search-box-svg-icon search-box-btn__icon"),
      Object.assign(document.createElement("span"), {
        className: "search-box-btn__label",
        textContent: "検索",
      })
    );
    searchShell.append(searchIcon, searchInput, clearButton, divider, searchButton);
    searchForm.append(searchShell);
    searchForm.classList.add("hnf-header__search");

    actions.className = "hnf-header__actions";

    HEADER_UTILITY_ITEMS.forEach((item, index) => {
      const target = index === 0 ? utilityLeft : utilityCenter;
      target.appendChild(
        createChromeLink({
          href: item.href,
          label: item.label,
          className: index === 0 ? "hnf-link hnf-utilities__chip" : "hnf-link hnf-vp",
          icon: item.icon,
        })
      );
    });

    HEADER_PICKER_ITEMS.forEach((item) => {
      utilityRight.appendChild(
        createChromeLink({
          href: item.href,
          label: item.label,
          className: "hnf-link hnf-utilities__chip",
          icon: item.icon,
        })
      );
    });

    NAV_ITEMS.forEach((item) => {
      entrypoints.appendChild(
        createChromeLink({
          href: item.href,
          label: item.label,
          className: "hnf-link hnf-megamenu__entrypoint",
          current: item.section === currentSection,
        })
      );
    });

    HEADER_ACTIONS.forEach((item) => {
      actions.appendChild(
        createChromeLink({
          href: item.href,
          label: item.label,
          className: "hnf-link hnf-header__action",
          icon: item.icon,
        })
      );
    });

    utilitiesWrapper.append(utilityLeft, utilityCenter, utilityRight);
    utilitiesContainer.appendChild(utilitiesWrapper);
    utilities.appendChild(utilitiesContainer);
    messages.appendChild(utilities);
    headerContainer.append(brand, entrypoints, searchForm, actions);
    header.appendChild(headerContainer);
    nav.append(messages, header);
  });

  document.querySelectorAll(".footer").forEach((footer) => {
    footer.textContent = "";

    const shell = document.createElement("div");
    const container = document.createElement("div");
    const featured = document.createElement("div");
    const groups = document.createElement("div");
    const bottom = document.createElement("div");
    const copyright = document.createElement("p");
    const note = document.createElement("p");

    shell.className = "hnf-footer";
    container.className = "hnf-content-container hnf-footer__container";
    featured.className = "hnf-footer__featuredLinks";
    groups.className = "hnf-footer__linkGroups";
    bottom.className = "hnf-footer__bottom";

    [
      {
        title: "検索導線を使い切る",
        text: "保存した検索、比較トレイ、関連検索まで一つの流れで扱えるようにしています。公開前は文言差し替えだけで使える汎用土台です。",
        links: [
          { href: "/finder/", label: "作品検索へ", className: "hri-btn hri-btn--primary" },
          { href: "/articles/", label: "使い方を見る", className: "hri-btn hri-btn--secondary" },
        ],
      },
      {
        title: "運用の前提を確認する",
        text: "特集の固定導線、検索ログ、除外条件の扱いなど、ケモホモ作品ファインダーの運用方針をまとめています。",
        links: [
          { href: "/about/", label: "運営方針", className: "hri-btn hri-btn--primary" },
          { href: "/contact/", label: "お問い合わせ", className: "hri-btn hri-btn--secondary" },
        ],
      },
    ].forEach((card) => {
      const article = document.createElement("article");
      const title = document.createElement("h3");
      const text = document.createElement("p");
      const actions = document.createElement("div");

      article.className = "hnf-footer__featuredLink";
      title.textContent = card.title;
      text.textContent = card.text;
      actions.className = "hnf-footer__featuredLinkActions";
      card.links.forEach((link) => {
        actions.appendChild(
          createChromeLink({
            href: link.href,
            label: link.label,
            className: link.className,
          })
        );
      });
      article.append(title, text, actions);
      featured.appendChild(article);
    });

    FOOTER_GROUPS.forEach((group) => {
      const column = document.createElement("div");
      const title = document.createElement("h3");
      const list = document.createElement("ul");

      column.className = "hnf-footer__linkColumn";
      title.textContent = group.title;

      group.links.forEach((item) => {
        const listItem = document.createElement("li");
        list.appendChild(
          listItem
        );
        listItem.appendChild(
          createChromeLink({
            href: item.href,
            label: item.label,
            className: "hnf-link",
          })
        );
      });

      column.append(title, list);
      groups.appendChild(column);
    });

    copyright.setAttribute("data-site-copyright", "");
    copyright.textContent = `© ${BRAND_NAME}`;

    note.textContent =
      "トップ、検索、特集、詳細の役割を明確に分けつつ、差し替えやすい汎用土台として維持します。";

    bottom.append(copyright, note);
    container.append(featured, groups, bottom);
    shell.appendChild(container);
    footer.appendChild(shell);
  });
};

renderSiteChrome();
if (typeof document !== "undefined" && document.body && !document.body.dataset.siteChromeBound) {
  document.body.addEventListener("click", (event) => {
    const clearButton = event.target.closest("[data-header-clear]");
    if (!clearButton) return;
    const form = clearButton.closest("form");
    const input = form?.querySelector('input[name="q"]');
    if (!input) return;
    input.value = "";
    input.focus();
  });
  document.body.dataset.siteChromeBound = "true";
}
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
