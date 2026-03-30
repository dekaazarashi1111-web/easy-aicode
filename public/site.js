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
const FINDER_STORAGE_KEY = "finder-canvas-state";
const RECENT_HISTORY_HASH = "#recent-history";
const SAVED_SEARCH_HASH = "#saved-searches";
const RECENT_HISTORY_LIMIT = 20;
const HEADER_FILTER_SPECIES_TAG_IDS = [
  "species-wolf",
  "species-dog",
  "species-fox",
  "species-cat",
  "species-bear",
];
const HEADER_FILTER_BODY_OPTIONS = [
  {
    tagId: "body-normal",
    label: "普通体型",
    imageSrc: "/assets/quick-filters/body-normal.png",
  },
  {
    tagId: "body-muscular",
    label: "筋肉",
    imageSrc: "/assets/quick-filters/body-muscular.png",
  },
  {
    tagId: "body-fat",
    label: "デブ",
    imageSrc: "/assets/quick-filters/body-fat.png",
  },
];
const HEADER_FILTER_AGE_OPTIONS = [
  { tagId: "age-adult", label: "成年" },
  { tagId: "age-older", label: "熟年" },
];
const HEADER_FILTER_LABEL_OVERRIDES = {
  entrance: "入口条件",
  species: "種族",
  "body-type": "体型",
  "age-feel": "年齢",
  style: "雰囲気",
  transformation: "変化要素",
  relationship: "関係性",
  format: "媒体",
  curation: "運営選抜",
  avoid: "除外条件",
};
const HEADER_FILTER_HIDDEN_GROUP_IDS = new Set(["species", "body-type", "age-feel"]);
const HEADER_FILTER_TAG_PREVIEW_LIMIT = 10;
const HEADER_FILTER_SORT_META = {
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
let historyDrawerCloseTimer = null;
let historyDrawerRestoreFocus = null;
let savedSearchDrawerCloseTimer = null;
let savedSearchDrawerRestoreFocus = null;
let searchFilterScreenRestoreFocus = null;
let searchFilterTagPickerRestoreFocus = null;

const parseFinderCanvasState = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return { raw: "", parsed: null };
  }
  try {
    const raw = window.localStorage.getItem(FINDER_STORAGE_KEY);
    if (!raw) return { raw: "", parsed: null };
    const parsed = JSON.parse(raw);
    return {
      raw,
      parsed: parsed && typeof parsed === "object" ? parsed : null,
    };
  } catch (error) {
    return { raw: "", parsed: null };
  }
};

const uniqueFinderValues = (values) =>
  Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));

const normalizeFinderCharacters = (value) =>
  (Array.isArray(value) ? value : []).map((item, index) => ({
    id: item?.id || `character-${index + 1}`,
    speciesTagIds: uniqueFinderValues(item?.speciesTagIds),
    bodyTypeTagIds: uniqueFinderValues(item?.bodyTypeTagIds),
    ageFeelTagIds: uniqueFinderValues(item?.ageFeelTagIds),
  }));

const cloneFinderSeedState = () => {
  if (typeof window === "undefined" || !window.FINDER_SEED || typeof window.FINDER_SEED !== "object") {
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(window.FINDER_SEED));
  } catch (error) {
    return null;
  }
};

const composeFinderCanvasState = (rawState) => {
  const seedState = cloneFinderSeedState();
  if (!seedState) {
    return rawState && typeof rawState === "object" ? rawState : null;
  }

  const next = seedState;
  const stored = rawState && typeof rawState === "object" ? rawState : {};
  const storedUi = stored.ui && typeof stored.ui === "object" ? stored.ui : {};
  const storedLogs = stored.logs && typeof stored.logs === "object" ? stored.logs : {};
  const validProfileIds = new Set(
    (Array.isArray(next.siteProfiles) ? next.siteProfiles : [])
      .map((profile) => profile?.id)
      .filter(Boolean)
  );
  const validWorkIds = new Set(
    (Array.isArray(next.works) ? next.works : []).map((work) => work?.id).filter(Boolean)
  );
  const validTagIds = new Set(
    (Array.isArray(next.tags) ? next.tags : []).map((tag) => tag?.id).filter(Boolean)
  );
  const validCollectionIds = new Set(
    (Array.isArray(next.collections) ? next.collections : [])
      .map((collection) => collection?.id)
      .filter(Boolean)
  );
  const fallbackProfileId = validProfileIds.has(next.activeProfileId)
    ? next.activeProfileId
    : next.siteProfiles?.[0]?.id || "";

  next.activeProfileId = validProfileIds.has(stored.activeProfileId)
    ? stored.activeProfileId
    : fallbackProfileId;
  next.logs = {
    ...storedLogs,
    events: Array.isArray(storedLogs.events) ? storedLogs.events : [],
  };
  next.ui = {
    compareWorkIds: uniqueFinderValues(storedUi.compareWorkIds).filter((id) => validWorkIds.has(id)),
    favoriteWorkIds: uniqueFinderValues(storedUi.favoriteWorkIds).filter((id) => validWorkIds.has(id)),
    recentWorkIds: uniqueFinderValues(storedUi.recentWorkIds)
      .filter((id) => validWorkIds.has(id))
      .slice(0, RECENT_HISTORY_LIMIT),
    savedSearches: (Array.isArray(storedUi.savedSearches) ? storedUi.savedSearches : []).map((item) => ({
      id: item?.id || `search-${Date.now()}`,
      label: `${item?.label || ""}`.trim(),
      query: `${item?.query || ""}`.trim(),
      creatorQuery: `${item?.creatorQuery || ""}`.trim(),
      characters: normalizeFinderCharacters(item?.characters).map((character, index) => ({
        id: character.id || `character-${index + 1}`,
        speciesTagIds: character.speciesTagIds.filter((tagId) => validTagIds.has(tagId)),
        bodyTypeTagIds: character.bodyTypeTagIds.filter((tagId) => validTagIds.has(tagId)),
        ageFeelTagIds: character.ageFeelTagIds.filter((tagId) => validTagIds.has(tagId)),
      })),
      sort: item?.sort || "recommended",
      collectionId: validCollectionIds.has(item?.collectionId) ? item.collectionId : "",
      matchMode: item?.matchMode === "or" ? "or" : "and",
      includeTagIds: uniqueFinderValues(item?.includeTagIds).filter((tagId) => validTagIds.has(tagId)),
      excludeTagIds: uniqueFinderValues(item?.excludeTagIds).filter((tagId) => validTagIds.has(tagId)),
      createdAt: item?.createdAt || "",
    })),
  };
  return next;
};

const readFinderCanvasState = () => {
  if (typeof window === "undefined") return null;
  if (window.FinderStore && typeof window.FinderStore.loadState === "function") {
    return window.FinderStore.loadState();
  }

  const { raw, parsed } = parseFinderCanvasState();
  const next = composeFinderCanvasState(parsed);
  if (
    next &&
    typeof window.localStorage !== "undefined"
  ) {
    const serialized = JSON.stringify(next);
    if (raw !== serialized) {
      window.localStorage.setItem(FINDER_STORAGE_KEY, serialized);
    }
  }
  return next;
};

readFinderCanvasState();

const formatHistoryUpdatedAt = (value) => {
  if (!value) return "";
  const normalized = `${value}`.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `更新 ${normalized.replace(/-/g, ".")}`;
  }
  return normalized;
};

const getRecentHistoryWorks = () => {
  const state = readFinderCanvasState();
  const recentWorkIds = Array.isArray(state?.ui?.recentWorkIds) ? state.ui.recentWorkIds : [];
  const works = Array.isArray(state?.works) ? state.works : [];
  const workMap = new Map(
    works
      .filter((work) => work && typeof work === "object" && work.id)
      .map((work) => [work.id, work])
  );

  return recentWorkIds
    .map((workId) => workMap.get(workId))
    .filter(Boolean)
    .slice(0, RECENT_HISTORY_LIMIT);
};

const getSavedSearches = () => {
  const state = readFinderCanvasState();
  return Array.isArray(state?.ui?.savedSearches) ? state.ui.savedSearches.slice(0, 10) : [];
};

const buildFinderSearchHref = (search = {}) => {
  const params = new URLSearchParams();
  const characters = normalizeFinderCharacters(search.characters);
  const character = characters[0] || {
    speciesTagIds: [],
    bodyTypeTagIds: [],
    ageFeelTagIds: [],
  };

  if (search.query) params.set("q", search.query);
  if (search.creatorQuery) params.set("creator", search.creatorQuery);
  if (search.sort && search.sort !== "recommended") params.set("sort", search.sort);
  if (search.collectionId) params.set("collection", search.collectionId);
  if (search.matchMode === "or") params.set("mode", "or");

  uniqueFinderValues(search.includeTagIds).forEach((tagId) => params.append("include", tagId));
  uniqueFinderValues(search.excludeTagIds).forEach((tagId) => params.append("exclude", tagId));
  character.speciesTagIds.forEach((tagId) => params.append("c1_species", tagId));
  character.bodyTypeTagIds.forEach((tagId) => params.append("c1_body", tagId));
  character.ageFeelTagIds.forEach((tagId) => params.append("c1_age", tagId));

  return params.toString() ? `/finder/?${params.toString()}` : "/finder/";
};

const getSavedSearchSummary = (search = {}) => {
  const character = normalizeFinderCharacters(search.characters)[0] || {
    speciesTagIds: [],
    bodyTypeTagIds: [],
    ageFeelTagIds: [],
  };
  const parts = [];
  const characterLabels = [
    ...character.speciesTagIds.map((tagId) => getHeaderFilterTagLabel(tagId)),
    ...character.bodyTypeTagIds.map((tagId) => getHeaderFilterTagLabel(tagId)),
    ...character.ageFeelTagIds.map((tagId) => getHeaderFilterTagLabel(tagId)),
  ].filter(Boolean);
  const includeLabels = uniqueFinderValues(search.includeTagIds)
    .map((tagId) => getHeaderFilterTagLabel(tagId))
    .filter(Boolean);
  const excludeLabels = uniqueFinderValues(search.excludeTagIds)
    .map((tagId) => getHeaderFilterTagLabel(tagId))
    .filter(Boolean);

  if (search.query) parts.push(`作品: ${search.query}`);
  if (search.creatorQuery) parts.push(`作者: ${search.creatorQuery}`);
  if (characterLabels.length) parts.push(`キャラ1: ${characterLabels.join(" / ")}`);
  if (includeLabels.length) parts.push(`含める: ${includeLabels.join(" / ")}`);
  if (excludeLabels.length) parts.push(`除外: ${excludeLabels.join(" / ")}`);
  if (search.collectionId) parts.push("特集あり");
  if (search.matchMode === "or") parts.push("いずれか一致");
  return parts.join(" / ") || "条件なし";
};

const formatSavedSearchUpdatedAt = (value) => {
  if (!value) return "";
  const normalized = `${value}`.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `保存 ${normalized.replace(/-/g, ".")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(normalized)) {
    return `保存 ${normalized.slice(0, 10).replace(/-/g, ".")}`;
  }
  return normalized;
};

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
  if (normalized.startsWith("/builder/")) return "builder";
  if (normalized.startsWith("/collections/") || normalized.startsWith("/collection/")) {
    return "collections";
  }
  if (normalized.startsWith("/articles/")) return "articles";
  if (normalized.startsWith("/apply/")) return "apply";
  if (normalized.startsWith("/contact/")) return "contact";
  return "";
};

const NAV_ITEMS = [
  { href: "/finder/", label: "作品を探す", section: "finder" },
  { href: "/articles/", label: "特集記事", section: "articles" },
  { href: "/apply/?v=20260325", label: "掲載申請", section: "apply" },
  { href: "/contact/", label: "お問い合わせ", section: "contact" },
];

const HEADER_ACTIONS = [
  { href: "/finder/#saved-searches", label: "保存検索", icon: "save" },
  { href: "/finder/#recent-history", label: "閲覧履歴", icon: "recent" },
];

const EDITORIAL_FOOTER_TEMPLATE = (brandName) => `
  <div class="container editorial-footer__inner">
    <section class="editorial-footer__brand">
      <p class="editorial-footer__eyebrow">Feature Finder</p>
      <h2 data-site-brand>${brandName}</h2>
      <p>特集記事、作品紹介、条件検索をまたいで、次に読むものと次に探す条件をひと続きにするための土台です。</p>
      <a class="btn btn--primary btn--sm" href="/finder/">作品検索へ</a>
    </section>

    <div class="editorial-footer__column">
      <h3>探す</h3>
      <ul class="editorial-footer__links">
        <li><a href="/finder/">作品検索</a></li>
        <li><a href="/builder/">詳細条件ビルダー</a></li>
        <li><a href="/collections/">特集一覧</a></li>
      </ul>
    </div>

    <div class="editorial-footer__column">
      <h3>読む</h3>
      <ul class="editorial-footer__links">
        <li><a href="/articles/">特集記事</a></li>
        <li><a href="/articles/comparison-template/">比較記事</a></li>
        <li><a href="/articles/review-structure/">レビュー記事</a></li>
      </ul>
    </div>

    <div class="editorial-footer__column">
      <h3>運営</h3>
      <ul class="editorial-footer__links">
        <li><a href="/contact/">お問い合わせ</a></li>
        <li><a href="/privacy">プライバシー</a></li>
        <li><a href="/disclaimer">免責事項</a></li>
      </ul>
    </div>
  </div>

  <div class="container editorial-footer__bottom">
    <p class="editorial-footer__legal" data-site-copyright>© ${brandName}</p>
    <div class="editorial-footer__bottom-links">
      <a href="/">ホーム</a>
      <a href="/articles/">記事一覧</a>
      <a href="/finder/">作品検索</a>
      <a href="/contact/">お問い合わせ</a>
    </div>
  </div>
`;

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
    filter: [
      "M4 6h16v2H4V6z",
      "M4 11h16v2H4v-2z",
      "M4 16h16v2H4v-2z",
      "M9 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
      "M15 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
      "M8 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    ],
    compare: [
      "M3 4h8v6H3V4zm10 0h8v6h-8V4zM3 14h8v6H3v-6zm10 3h8v-2h-8v2z",
    ],
    recent: [
      "M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.7574-4.2426L14 10h6V4l-2.3431 2.3431A7.9635 7.9635 0 0 0 12 4zm-1 3h2v5h4v2h-6V7z",
    ],
    tag: [
      "M10.5 3H5a2 2 0 0 0-2 2v5.5a2 2 0 0 0 .5858 1.4142l8.5 8.5a2 2 0 0 0 2.8284 0l5.5-5.5a2 2 0 0 0 0-2.8284l-8.5-8.5A2 2 0 0 0 10.5 3zM7 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z",
    ],
    truck: [
      "M2 5h11v8H2V5zm12 2h3.5L22 10.5V13h-2.051a2.5 2.5 0 0 0-4.898 0H13V7h1zm1.5 1.5V11H19.5l-2-2.5H15.5zM6.5 16a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm11 0a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
    ],
    location: [
      "M12 22s6-5.6863 6-11a6 6 0 1 0-12 0c0 5.3137 6 11 6 11zm0-8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z",
    ],
    store: [
      "M4 4h16l1 4H3l1-4zm0 6h16v10H4V10zm4 2v6h2v-6H8zm4 0v6h2v-6h-2z",
    ],
    user: [
      "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.866 0-7 1.79-7 4v2h14v-2c0-2.21-3.134-4-7-4z",
    ],
    cart: [
      "M6 5H3v2h1.3l1.9 8.4A2 2 0 0 0 8.15 17h8.7a2 2 0 0 0 1.95-1.6L20 9H7.1l-.35-2H21V5H6zm3 15a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z",
    ],
    chat: [
      "M4 4h16v11H8.8L5 18.2V15H4V4zm2 2v7h2v1.2L8.8 13H18V6H6z",
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

const createHistoryDrawer = () => {
  if (typeof document === "undefined" || !document.body) return null;
  const existing = document.querySelector("[data-history-drawer]");
  if (existing) return existing;

  const drawer = document.createElement("div");
  const backdrop = document.createElement("button");
  const panel = document.createElement("aside");
  const header = document.createElement("div");
  const headingGroup = document.createElement("div");
  const eyebrow = document.createElement("p");
  const title = document.createElement("h2");
  const closeButton = document.createElement("button");
  const body = document.createElement("div");
  const lead = document.createElement("p");
  const count = document.createElement("p");
  const list = document.createElement("div");

  drawer.className = "ikea-history-drawer";
  drawer.hidden = true;
  drawer.dataset.historyDrawer = "true";
  drawer.dataset.open = "false";

  backdrop.className = "ikea-history-drawer__backdrop";
  backdrop.type = "button";
  backdrop.dataset.historyClose = "true";
  backdrop.setAttribute("aria-label", "閲覧履歴を閉じる");

  panel.className = "ikea-history-drawer__panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "recent-history-title");

  header.className = "ikea-history-drawer__header";
  headingGroup.className = "ikea-history-drawer__heading";
  eyebrow.className = "ikea-history-drawer__eyebrow";
  eyebrow.textContent = "このブラウザだけに保存";
  title.className = "ikea-history-drawer__title";
  title.id = "recent-history-title";
  title.textContent = "閲覧履歴";
  closeButton.className = "ikea-history-drawer__close";
  closeButton.type = "button";
  closeButton.dataset.historyClose = "true";
  closeButton.setAttribute("aria-label", "閲覧履歴を閉じる");
  closeButton.appendChild(createIcon("close"));
  headingGroup.append(eyebrow, title);
  header.append(headingGroup, closeButton);

  body.className = "ikea-history-drawer__body";
  lead.className = "ikea-history-drawer__lead";
  lead.textContent = `作品詳細を開いた順に、直近 ${RECENT_HISTORY_LIMIT} 件まで表示します。`;
  count.className = "ikea-history-drawer__count";
  count.dataset.historyCount = "true";
  list.className = "finder-mini-list ikea-history-drawer__list";
  list.dataset.historyList = "true";
  body.append(lead, count, list);

  panel.append(header, body);
  drawer.append(backdrop, panel);
  document.body.appendChild(drawer);
  return drawer;
};

const renderHistoryDrawer = () => {
  const drawer = createHistoryDrawer();
  if (!drawer) return null;

  const count = drawer.querySelector("[data-history-count]");
  const list = drawer.querySelector("[data-history-list]");
  const works = getRecentHistoryWorks();

  if (count) {
    count.textContent = works.length ? `${works.length} 件の履歴` : "履歴はまだありません";
  }

  if (list) {
    list.textContent = "";
    if (!works.length) {
      const empty = document.createElement("p");
      empty.className = "ikea-history-drawer__empty";
      empty.textContent = "まだ閲覧履歴はありません。作品詳細を開くとここにたまります。";
      list.appendChild(empty);
    } else {
      works.forEach((work) => {
        const link = document.createElement("a");
        const body = document.createElement("div");
        const title = document.createElement("strong");
        const meta = document.createElement("span");
        const updatedAt = document.createElement("span");

        link.className = "finder-mini-link ikea-history-drawer__link";
        link.href = `/work/?slug=${encodeURIComponent(work.slug || "")}`;
        body.className = "finder-mini-link__body";
        title.textContent = work.title || "作品";

        const metaParts = [work.format, work.creator].filter(Boolean);
        if (metaParts.length) {
          meta.className = "help";
          meta.textContent = metaParts.join(" / ");
          body.append(title, meta);
        } else {
          body.append(title);
        }

        link.appendChild(body);

        const updatedLabel = formatHistoryUpdatedAt(work.updatedAt);
        if (updatedLabel) {
          updatedAt.className = "ikea-history-drawer__updated";
          updatedAt.textContent = updatedLabel;
          link.appendChild(updatedAt);
        }

        list.appendChild(link);
      });
    }
  }

  return drawer;
};

const closeHistoryDrawer = ({ restoreFocus = true } = {}) => {
  const drawer = document.querySelector("[data-history-drawer]");
  if (!drawer || drawer.hidden) return;

  drawer.dataset.open = "false";
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("history-drawer-open");

  if (historyDrawerCloseTimer) window.clearTimeout(historyDrawerCloseTimer);
  historyDrawerCloseTimer = window.setTimeout(() => {
    if (drawer.dataset.open === "true") return;
    drawer.hidden = true;
    if (
      restoreFocus &&
      historyDrawerRestoreFocus &&
      typeof historyDrawerRestoreFocus.focus === "function"
    ) {
      historyDrawerRestoreFocus.focus();
    }
    historyDrawerRestoreFocus = null;
  }, 220);
};

const openHistoryDrawer = ({ clearHash = false } = {}) => {
  const drawer = renderHistoryDrawer();
  if (!drawer) return;
  closeSavedSearchDrawer({ restoreFocus: false });

  if (historyDrawerCloseTimer) {
    window.clearTimeout(historyDrawerCloseTimer);
    historyDrawerCloseTimer = null;
  }

  historyDrawerRestoreFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  drawer.hidden = false;
  drawer.dataset.open = "true";
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("history-drawer-open");

  const closeButton = drawer.querySelector(".ikea-history-drawer__close");
  window.requestAnimationFrame(() => {
    closeButton?.focus();
  });

  if (clearHash && window.location.hash === RECENT_HISTORY_HASH) {
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
  }
};

const initHistoryDrawer = () => {
  if (typeof document === "undefined" || !document.body || document.body.dataset.historyDrawerBound) {
    return;
  }

  createHistoryDrawer();

  document.body.addEventListener("click", (event) => {
    const historyLink = event.target.closest(`a[href$="${RECENT_HISTORY_HASH}"]`);
    if (historyLink) {
      event.preventDefault();
      openHistoryDrawer({ clearHash: true });
      return;
    }

    const closeTrigger = event.target.closest("[data-history-close]");
    if (closeTrigger) {
      event.preventDefault();
      closeHistoryDrawer();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeHistoryDrawer();
    }
  });

  if (window.location.hash === RECENT_HISTORY_HASH) {
    openHistoryDrawer({ clearHash: true });
  }

  document.body.dataset.historyDrawerBound = "true";
};

const createSavedSearchDrawer = () => {
  if (typeof document === "undefined" || !document.body) return null;
  const existing = document.querySelector("[data-saved-search-drawer]");
  if (existing) return existing;

  const drawer = document.createElement("div");
  const backdrop = document.createElement("button");
  const panel = document.createElement("aside");
  const header = document.createElement("div");
  const headingGroup = document.createElement("div");
  const eyebrow = document.createElement("p");
  const title = document.createElement("h2");
  const closeButton = document.createElement("button");
  const body = document.createElement("div");
  const lead = document.createElement("p");
  const count = document.createElement("p");
  const list = document.createElement("div");

  drawer.className = "ikea-history-drawer";
  drawer.hidden = true;
  drawer.dataset.savedSearchDrawer = "true";
  drawer.dataset.open = "false";

  backdrop.className = "ikea-history-drawer__backdrop";
  backdrop.type = "button";
  backdrop.dataset.savedSearchClose = "true";
  backdrop.setAttribute("aria-label", "保存検索を閉じる");

  panel.className = "ikea-history-drawer__panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "saved-search-title");

  header.className = "ikea-history-drawer__header";
  headingGroup.className = "ikea-history-drawer__heading";
  eyebrow.className = "ikea-history-drawer__eyebrow";
  eyebrow.textContent = "このブラウザだけに保存";
  title.className = "ikea-history-drawer__title";
  title.id = "saved-search-title";
  title.textContent = "保存検索";
  closeButton.className = "ikea-history-drawer__close";
  closeButton.type = "button";
  closeButton.dataset.savedSearchClose = "true";
  closeButton.setAttribute("aria-label", "保存検索を閉じる");
  closeButton.appendChild(createIcon("close"));
  headingGroup.append(eyebrow, title);
  header.append(headingGroup, closeButton);

  body.className = "ikea-history-drawer__body";
  lead.className = "ikea-history-drawer__lead";
  lead.textContent = "保存した検索条件を、直近 10 件まで一覧できます。";
  count.className = "ikea-history-drawer__count";
  count.dataset.savedSearchCount = "true";
  list.className = "finder-mini-list ikea-history-drawer__list";
  list.dataset.savedSearchList = "true";
  body.append(lead, count, list);

  panel.append(header, body);
  drawer.append(backdrop, panel);
  document.body.appendChild(drawer);
  return drawer;
};

const renderSavedSearchDrawer = () => {
  const drawer = createSavedSearchDrawer();
  if (!drawer) return null;

  const count = drawer.querySelector("[data-saved-search-count]");
  const list = drawer.querySelector("[data-saved-search-list]");
  const searches = getSavedSearches();

  if (count) {
    count.textContent = searches.length ? `${searches.length} 件の保存検索` : "保存検索はまだありません";
  }

  if (list) {
    list.textContent = "";
    if (!searches.length) {
      const empty = document.createElement("p");
      empty.className = "ikea-history-drawer__empty";
      empty.textContent = "まだ保存検索はありません。作品検索や詳細条件ビルダーで条件を保存するとここにたまります。";
      list.appendChild(empty);
    } else {
      searches.forEach((search) => {
        const link = document.createElement("a");
        const body = document.createElement("div");
        const title = document.createElement("strong");
        const meta = document.createElement("span");
        const updatedAt = document.createElement("span");
        const summary = getSavedSearchSummary(search);
        const titleLabel = `${search?.label || summary || "保存検索"}`.trim();

        link.className = "finder-mini-link finder-mini-link--saved ikea-history-drawer__link";
        link.href = buildFinderSearchHref(search);
        body.className = "finder-mini-link__body";
        title.textContent = titleLabel;
        body.appendChild(title);

        if (summary && summary !== titleLabel) {
          meta.className = "help";
          meta.textContent = summary;
          body.appendChild(meta);
        }

        link.appendChild(body);

        const updatedLabel = formatSavedSearchUpdatedAt(search?.createdAt);
        if (updatedLabel) {
          updatedAt.className = "ikea-history-drawer__updated";
          updatedAt.textContent = updatedLabel;
          link.appendChild(updatedAt);
        }

        list.appendChild(link);
      });
    }
  }

  return drawer;
};

const closeSavedSearchDrawer = ({ restoreFocus = true } = {}) => {
  const drawer = document.querySelector("[data-saved-search-drawer]");
  if (!drawer || drawer.hidden) return;

  drawer.dataset.open = "false";
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("history-drawer-open");

  if (savedSearchDrawerCloseTimer) window.clearTimeout(savedSearchDrawerCloseTimer);
  savedSearchDrawerCloseTimer = window.setTimeout(() => {
    if (drawer.dataset.open === "true") return;
    drawer.hidden = true;
    if (
      restoreFocus &&
      savedSearchDrawerRestoreFocus &&
      typeof savedSearchDrawerRestoreFocus.focus === "function"
    ) {
      savedSearchDrawerRestoreFocus.focus();
    }
    savedSearchDrawerRestoreFocus = null;
  }, 220);
};

const openSavedSearchDrawer = ({ clearHash = false } = {}) => {
  const drawer = renderSavedSearchDrawer();
  if (!drawer) return;
  closeHistoryDrawer({ restoreFocus: false });

  if (savedSearchDrawerCloseTimer) {
    window.clearTimeout(savedSearchDrawerCloseTimer);
    savedSearchDrawerCloseTimer = null;
  }

  savedSearchDrawerRestoreFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  drawer.hidden = false;
  drawer.dataset.open = "true";
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("history-drawer-open");

  const closeButton = drawer.querySelector(".ikea-history-drawer__close");
  window.requestAnimationFrame(() => {
    closeButton?.focus();
  });

  if (clearHash && window.location.hash === SAVED_SEARCH_HASH) {
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
  }
};

const initSavedSearchDrawer = () => {
  if (typeof document === "undefined" || !document.body || document.body.dataset.savedSearchDrawerBound) {
    return;
  }

  createSavedSearchDrawer();

  document.body.addEventListener("click", (event) => {
    const savedSearchLink = event.target.closest(`a[href$="${SAVED_SEARCH_HASH}"]`);
    if (savedSearchLink) {
      event.preventDefault();
      openSavedSearchDrawer({ clearHash: true });
      return;
    }

    const closeTrigger = event.target.closest("[data-saved-search-close]");
    if (closeTrigger) {
      event.preventDefault();
      closeSavedSearchDrawer();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSavedSearchDrawer();
    }
  });

  window.addEventListener("finder:state-changed", () => {
    const drawer = document.querySelector("[data-saved-search-drawer]");
    if (drawer && !drawer.hidden) {
      renderSavedSearchDrawer();
    }
  });

  if (window.location.hash === SAVED_SEARCH_HASH) {
    openSavedSearchDrawer({ clearHash: true });
  }

  document.body.dataset.savedSearchDrawerBound = "true";
};

const getHeaderSearchQuery = (trigger = null) => {
  const scopedInput = trigger
    ?.closest("form")
    ?.querySelector('input[name="q"]');
  if (scopedInput?.value?.trim()) return scopedInput.value.trim();

  const globalInput = document.querySelector('.ikea-shell__searchForm input[name="q"]');
  if (globalInput?.value?.trim()) return globalInput.value.trim();

  return new URLSearchParams(window.location.search).get("q") || "";
};

const normalizeSearchFilterText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getHeaderFilterTagMap = () =>
  new Map(
    (Array.isArray(window.FINDER_SEED?.tags) ? window.FINDER_SEED.tags : [])
      .filter((tag) => tag && tag.id)
      .map((tag) => [tag.id, tag])
  );

const getHeaderFilterTagLabel = (tagId, fallback = "") =>
  getHeaderFilterTagMap().get(tagId)?.label || fallback || tagId;

const getHeaderFilterSortMeta = (sort) => HEADER_FILTER_SORT_META[sort] || HEADER_FILTER_SORT_META.recommended;

const getHeaderFilterGroupedTags = () => {
  const tagGroups = Array.isArray(window.FINDER_SEED?.tagGroups) ? window.FINDER_SEED.tagGroups : [];
  const visibleTags = (Array.isArray(window.FINDER_SEED?.tags) ? window.FINDER_SEED.tags : []).filter(
    (tag) => tag && tag.id && tag.label && tag.isPublic !== false
  );
  const tagsByGroup = new Map();

  visibleTags.forEach((tag) => {
    const current = tagsByGroup.get(tag.groupId) || [];
    current.push(tag);
    tagsByGroup.set(tag.groupId, current);
  });

  const buildTagRecord = (tag, groupLabel) => ({
    ...tag,
    groupLabel,
    searchText: normalizeSearchFilterText(
      [
        tag.label,
        Array.isArray(tag.synonyms) ? tag.synonyms.join(" ") : "",
        groupLabel,
      ].join(" ")
    ),
  });

  const groups = tagGroups
    .map((group) => {
      const groupLabel = HEADER_FILTER_LABEL_OVERRIDES[group.id] || group.label || group.id;
      return {
        ...group,
        label: groupLabel,
        tags: (tagsByGroup.get(group.id) || [])
          .slice()
          .sort((left, right) => left.label.localeCompare(right.label, "ja"))
          .map((tag) => buildTagRecord(tag, groupLabel)),
      };
    })
    .filter((group) => group.tags.length);

  const knownGroupIds = new Set(groups.map((group) => group.id));
  tagsByGroup.forEach((groupTags, groupId) => {
    if (knownGroupIds.has(groupId)) return;
    const groupLabel = HEADER_FILTER_LABEL_OVERRIDES[groupId] || groupId;
    groups.push({
      id: groupId,
      label: groupLabel,
      description: "",
      tags: groupTags
        .slice()
        .sort((left, right) => left.label.localeCompare(right.label, "ja"))
        .map((tag) => buildTagRecord(tag, groupLabel)),
    });
  });

  return groups;
};

const getHeaderFilterQuickTagGroups = () =>
  getHeaderFilterGroupedTags().filter((group) => !HEADER_FILTER_HIDDEN_GROUP_IDS.has(group.id));

const getHeaderFilterQuickSelectableTags = () =>
  getHeaderFilterQuickTagGroups().flatMap((group) => group.tags);

const normalizeSearchFilterCharacterState = (value = {}) => ({
  speciesTagIds: uniqueFinderValues(value.speciesTagIds),
  bodyTypeTagIds: uniqueFinderValues(value.bodyTypeTagIds),
  ageFeelTagIds: uniqueFinderValues(value.ageFeelTagIds),
});

const getSearchFilterCharacterState = (screen) =>
  normalizeSearchFilterCharacterState(screen?._characterFilterState);

const getSearchFilterIncludeTagIds = (screen) =>
  uniqueFinderValues(screen?._searchFilterIncludeTagIds);

const getSearchFilterExcludeTagIds = (screen) =>
  uniqueFinderValues(screen?._searchFilterExcludeTagIds);

const getSearchFilterSortValue = (screen) =>
  HEADER_FILTER_SORT_META[screen?._searchFilterSort] ? screen._searchFilterSort : "recommended";

const appendSearchFilterHiddenInput = (container, name, value) => {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  container.appendChild(input);
};

const syncSearchFilterHiddenInputs = (screen) => {
  const container = screen?.querySelector("[data-search-filter-hidden-inputs]");
  if (!container) return;

  const characterState = getSearchFilterCharacterState(screen);
  container.textContent = "";
  characterState.speciesTagIds.forEach((tagId) =>
    appendSearchFilterHiddenInput(container, "c1_species", tagId)
  );
  characterState.bodyTypeTagIds.forEach((tagId) =>
    appendSearchFilterHiddenInput(container, "c1_body", tagId)
  );
  characterState.ageFeelTagIds.forEach((tagId) =>
    appendSearchFilterHiddenInput(container, "c1_age", tagId)
  );
  getSearchFilterIncludeTagIds(screen).forEach((tagId) =>
    appendSearchFilterHiddenInput(container, "include", tagId)
  );
  getSearchFilterExcludeTagIds(screen).forEach((tagId) =>
    appendSearchFilterHiddenInput(container, "exclude", tagId)
  );
};

const setSearchFilterCharacterState = (screen, nextState) => {
  if (!screen) return;
  screen._characterFilterState = normalizeSearchFilterCharacterState(nextState);
  syncSearchFilterHiddenInputs(screen);
};

const setSearchFilterTagSelections = (screen, nextState = {}) => {
  if (!screen) return;
  screen._searchFilterIncludeTagIds = uniqueFinderValues(nextState.includeTagIds);
  screen._searchFilterExcludeTagIds = uniqueFinderValues(nextState.excludeTagIds);
  syncSearchFilterHiddenInputs(screen);
};

const setSearchFilterSortValue = (screen, sort) => {
  if (!screen) return;
  screen._searchFilterSort = HEADER_FILTER_SORT_META[sort] ? sort : "recommended";
};

const getSearchFilterSummary = (screen) => {
  const characterState = getSearchFilterCharacterState(screen);
  const parts = [];
  const characterLabels = [
    ...characterState.speciesTagIds.map((tagId) => getHeaderFilterTagLabel(tagId)),
    ...characterState.bodyTypeTagIds.map((tagId) =>
      HEADER_FILTER_BODY_OPTIONS.find((option) => option.tagId === tagId)?.label || tagId
    ),
    ...characterState.ageFeelTagIds.map((tagId) =>
      HEADER_FILTER_AGE_OPTIONS.find((option) => option.tagId === tagId)?.label || tagId
    ),
  ].filter(Boolean);
  const includeLabels = getSearchFilterIncludeTagIds(screen)
    .map((tagId) => getHeaderFilterTagLabel(tagId))
    .filter(Boolean);
  const excludeLabels = getSearchFilterExcludeTagIds(screen)
    .map((tagId) => getHeaderFilterTagLabel(tagId))
    .filter(Boolean);

  if (characterLabels.length) parts.push(`キャラ1: ${characterLabels.join(" / ")}`);
  if (includeLabels.length) parts.push(`含める: ${includeLabels.join(" / ")}`);
  if (excludeLabels.length) parts.push(`除外: ${excludeLabels.join(" / ")}`);
  return parts.join(" | ") || "条件なし";
};

const createSearchFilterChipButton = ({
  label,
  selected = false,
  className = "",
  dataset = {},
}) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `ikea-quick-filter-chip${className ? ` ${className}` : ""}`;
  button.textContent = label;
  button.setAttribute("aria-pressed", String(selected));
  Object.entries(dataset).forEach(([key, value]) => {
    button.dataset[key] = value;
  });
  return button;
};

const createSearchFilterBodyButton = ({ label, imageSrc = "", selected = false, dataset = {} }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ikea-quick-filter-bodyButton";
  button.setAttribute("aria-pressed", String(selected));
  Object.entries(dataset).forEach(([key, value]) => {
    button.dataset[key] = value;
  });

  const imageWrap = document.createElement("span");
  imageWrap.className = "ikea-quick-filter-bodyButton__image";
  if (imageSrc) {
    const image = document.createElement("img");
    image.src = imageSrc;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    imageWrap.appendChild(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "ikea-quick-filter-bodyButton__fallback";
    fallback.textContent = label;
    imageWrap.appendChild(fallback);
  }

  const labelNode = document.createElement("span");
  labelNode.className = "ikea-quick-filter-bodyButton__label";
  labelNode.textContent = label;
  button.append(imageWrap, labelNode);
  return button;
};

const toggleSearchFilterCharacterValue = (screen, field, tagId) => {
  const characterState = getSearchFilterCharacterState(screen);
  const nextState = {
    speciesTagIds: characterState.speciesTagIds.slice(),
    bodyTypeTagIds: characterState.bodyTypeTagIds.slice(),
    ageFeelTagIds: characterState.ageFeelTagIds.slice(),
  };
  const key =
    field === "species"
      ? "speciesTagIds"
      : field === "body"
        ? "bodyTypeTagIds"
        : "ageFeelTagIds";
  nextState[key] = nextState[key].includes(tagId)
    ? nextState[key].filter((value) => value !== tagId)
    : uniqueFinderValues([...nextState[key], tagId]);
  setSearchFilterCharacterState(screen, nextState);
};

const toggleSearchFilterQuickTag = (screen, mode, tagId) => {
  const includeTagIds = getSearchFilterIncludeTagIds(screen).filter((value) => value !== tagId);
  const excludeTagIds = getSearchFilterExcludeTagIds(screen).filter((value) => value !== tagId);
  const isSelected = mode === "exclude"
    ? getSearchFilterExcludeTagIds(screen).includes(tagId)
    : getSearchFilterIncludeTagIds(screen).includes(tagId);

  if (!isSelected) {
    if (mode === "exclude") {
      excludeTagIds.push(tagId);
    } else {
      includeTagIds.push(tagId);
    }
  }

  setSearchFilterTagSelections(screen, {
    includeTagIds,
    excludeTagIds,
  });
};

const getSearchFilterQuickTagPreview = (screen, mode) => {
  const selectedTagIds = new Set(
    mode === "exclude" ? getSearchFilterExcludeTagIds(screen) : getSearchFilterIncludeTagIds(screen)
  );
  const selected = [];
  const unselected = [];

  getHeaderFilterQuickSelectableTags().forEach((tag) => {
    if (selectedTagIds.has(tag.id)) {
      selected.push(tag);
      return;
    }
    unselected.push(tag);
  });

  return [...selected, ...unselected].slice(0, HEADER_FILTER_TAG_PREVIEW_LIMIT);
};

const getSearchFilterBuilderHref = (screen) => {
  const params = new URLSearchParams();
  const queryValue =
    document.querySelector('.ikea-shell__searchForm input[name="q"]')?.value?.trim() ||
    screen?.querySelector("[data-search-filter-query-input]")?.value?.trim() ||
    "";
  const characterState = getSearchFilterCharacterState(screen);
  const includeTagIds = uniqueFinderValues([
    ...getSearchFilterIncludeTagIds(screen),
    ...characterState.speciesTagIds,
    ...characterState.bodyTypeTagIds,
    ...characterState.ageFeelTagIds,
  ]);

  if (queryValue) params.set("q", queryValue);
  includeTagIds.forEach((tagId) => params.append("include", tagId));
  getSearchFilterExcludeTagIds(screen).forEach((tagId) => params.append("exclude", tagId));
  return params.toString() ? `/builder/?${params.toString()}` : "/builder/";
};

const renderSearchFilterFields = (screen) => {
  const summary = screen?.querySelector("[data-search-filter-summary]");
  const speciesRow = screen?.querySelector("[data-search-filter-species-row]");
  const bodyGrid = screen?.querySelector("[data-search-filter-body-grid]");
  const ageRow = screen?.querySelector("[data-search-filter-age-row]");
  const includeRow = screen?.querySelector("[data-search-filter-include-row]");
  const excludeRow = screen?.querySelector("[data-search-filter-exclude-row]");
  const includeMoreButton = screen?.querySelector('[data-search-filter-tag-picker-open="include"]');
  const excludeMoreButton = screen?.querySelector('[data-search-filter-tag-picker-open="exclude"]');
  const sortSelect = screen?.querySelector("[data-search-filter-sort]");
  const sortNote = screen?.querySelector("[data-search-filter-sort-note]");
  const builderLink = screen?.querySelector("[data-search-filter-builder-link]");
  if (
    !summary ||
    !speciesRow ||
    !bodyGrid ||
    !ageRow ||
    !includeRow ||
    !excludeRow ||
    !sortSelect ||
    !sortNote
  ) {
    return;
  }

  const characterState = getSearchFilterCharacterState(screen);
  const allQuickTags = getHeaderFilterQuickSelectableTags();

  summary.textContent = getSearchFilterSummary(screen);

  speciesRow.textContent = "";
  HEADER_FILTER_SPECIES_TAG_IDS.forEach((tagId) => {
    speciesRow.appendChild(
      createSearchFilterChipButton({
        label: getHeaderFilterTagLabel(tagId, tagId),
        selected: characterState.speciesTagIds.includes(tagId),
        dataset: {
          searchFilterCharacterField: "species",
          searchFilterTagId: tagId,
        },
      })
    );
  });

  bodyGrid.textContent = "";
  HEADER_FILTER_BODY_OPTIONS.forEach((option) => {
    bodyGrid.appendChild(
      createSearchFilterBodyButton({
        label: option.label,
        imageSrc: option.imageSrc,
        selected: characterState.bodyTypeTagIds.includes(option.tagId),
        dataset: {
          searchFilterCharacterField: "body",
          searchFilterTagId: option.tagId,
        },
      })
    );
  });

  ageRow.textContent = "";
  HEADER_FILTER_AGE_OPTIONS.forEach((option) => {
    ageRow.appendChild(
      createSearchFilterChipButton({
        label: option.label,
        selected: characterState.ageFeelTagIds.includes(option.tagId),
        dataset: {
          searchFilterCharacterField: "age",
          searchFilterTagId: option.tagId,
        },
      })
    );
  });

  includeRow.textContent = "";
  getSearchFilterQuickTagPreview(screen, "include").forEach((tag) => {
    includeRow.appendChild(
      createSearchFilterChipButton({
        label: tag.label,
        selected: getSearchFilterIncludeTagIds(screen).includes(tag.id),
        dataset: {
          searchFilterGlobalState: "include",
          searchFilterTagId: tag.id,
        },
      })
    );
  });

  excludeRow.textContent = "";
  getSearchFilterQuickTagPreview(screen, "exclude").forEach((tag) => {
    excludeRow.appendChild(
      createSearchFilterChipButton({
        label: tag.label,
        selected: getSearchFilterExcludeTagIds(screen).includes(tag.id),
        className: "plp-filter-chip--exclude",
        dataset: {
          searchFilterGlobalState: "exclude",
          searchFilterTagId: tag.id,
        },
      })
    );
  });

  if (includeMoreButton) {
    includeMoreButton.hidden = allQuickTags.length <= HEADER_FILTER_TAG_PREVIEW_LIMIT;
  }
  if (excludeMoreButton) {
    excludeMoreButton.hidden = allQuickTags.length <= HEADER_FILTER_TAG_PREVIEW_LIMIT;
  }

  sortSelect.value = getSearchFilterSortValue(screen);
  sortNote.textContent = getHeaderFilterSortMeta(sortSelect.value).description;
  if (builderLink) builderLink.href = getSearchFilterBuilderHref(screen);
};

const createSearchFilterTagPicker = () => {
  if (typeof document === "undefined" || !document.body) return null;
  const existing = document.querySelector("[data-search-filter-tag-picker]");
  if (existing) return existing;

  const picker = document.createElement("div");
  const backdrop = document.createElement("button");
  const panel = document.createElement("div");
  const header = document.createElement("div");
  const heading = document.createElement("div");
  const eyebrow = document.createElement("p");
  const title = document.createElement("h2");
  const lead = document.createElement("p");
  const closeButton = document.createElement("button");
  const body = document.createElement("div");
  const searchField = document.createElement("label");
  const searchLabel = document.createElement("span");
  const searchInput = document.createElement("input");
  const count = document.createElement("p");
  const results = document.createElement("div");

  picker.className = "ikea-tag-picker";
  picker.hidden = true;
  picker.dataset.searchFilterTagPicker = "true";
  picker.dataset.open = "false";
  picker.setAttribute("aria-hidden", "true");
  picker._mode = "include";
  picker._query = "";

  backdrop.className = "ikea-tag-picker__backdrop";
  backdrop.type = "button";
  backdrop.dataset.searchFilterTagPickerClose = "true";
  backdrop.setAttribute("aria-label", "タグ選択を閉じる");

  panel.className = "ikea-tag-picker__panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "site-search-filter-tag-picker-title");

  header.className = "ikea-tag-picker__header";
  heading.className = "ikea-tag-picker__heading";
  eyebrow.className = "ikea-tag-picker__eyebrow";
  eyebrow.textContent = "タグ選択";
  title.className = "ikea-tag-picker__title";
  title.id = "site-search-filter-tag-picker-title";
  title.dataset.searchFilterTagPickerTitle = "true";
  lead.className = "ikea-tag-picker__lead";
  lead.dataset.searchFilterTagPickerLead = "true";
  heading.append(eyebrow, title, lead);

  closeButton.className = "ikea-tag-picker__close";
  closeButton.type = "button";
  closeButton.dataset.searchFilterTagPickerClose = "true";
  closeButton.setAttribute("aria-label", "タグ選択を閉じる");
  closeButton.appendChild(createIcon("close"));
  header.append(heading, closeButton);

  body.className = "ikea-tag-picker__body";
  searchField.className = "ikea-tag-picker__searchField";
  searchLabel.className = "ikea-tag-picker__searchLabel";
  searchLabel.textContent = "タグ検索";
  searchInput.className = "ikea-tag-picker__searchInput";
  searchInput.type = "search";
  searchInput.placeholder = "タグ名や関連語で検索";
  searchInput.dataset.searchFilterTagPickerQuery = "true";
  searchInput.setAttribute("aria-label", "タグ検索");
  searchField.append(searchLabel, searchInput);

  count.className = "ikea-tag-picker__count";
  count.dataset.searchFilterTagPickerCount = "true";
  results.className = "ikea-tag-picker__results";
  results.dataset.searchFilterTagPickerResults = "true";
  body.append(searchField, count, results);

  panel.append(header, body);
  picker.append(backdrop, panel);
  document.body.appendChild(picker);
  return picker;
};

const closeSearchFilterTagPicker = ({ restoreFocus = true } = {}) => {
  const picker = document.querySelector("[data-search-filter-tag-picker]");
  if (!picker || picker.hidden) return;

  picker.hidden = true;
  picker.dataset.open = "false";
  picker.setAttribute("aria-hidden", "true");
  document.body.classList.remove("finder-tag-picker-open");

  if (
    restoreFocus &&
    searchFilterTagPickerRestoreFocus &&
    typeof searchFilterTagPickerRestoreFocus.focus === "function"
  ) {
    searchFilterTagPickerRestoreFocus.focus();
  }
  searchFilterTagPickerRestoreFocus = null;
};

const openSearchFilterTagPicker = (mode, trigger = null) => {
  const picker = createSearchFilterTagPicker();
  if (!picker) return;

  picker._mode = mode === "exclude" ? "exclude" : "include";
  picker._query = "";
  picker.hidden = false;
  picker.dataset.open = "true";
  picker.setAttribute("aria-hidden", "false");
  document.body.classList.add("finder-tag-picker-open");
  searchFilterTagPickerRestoreFocus = trigger instanceof HTMLElement ? trigger : null;
  renderSearchFilterTagPicker();

  const searchInput = picker.querySelector("[data-search-filter-tag-picker-query]");
  window.requestAnimationFrame(() => {
    searchInput?.focus();
  });
};

const renderSearchFilterTagPicker = () => {
  const picker = createSearchFilterTagPicker();
  const screen = createSearchFilterScreen();
  if (!picker || !screen) return;

  const title = picker.querySelector("[data-search-filter-tag-picker-title]");
  const lead = picker.querySelector("[data-search-filter-tag-picker-lead]");
  const count = picker.querySelector("[data-search-filter-tag-picker-count]");
  const results = picker.querySelector("[data-search-filter-tag-picker-results]");
  const searchInput = picker.querySelector("[data-search-filter-tag-picker-query]");
  if (!title || !lead || !count || !results || !searchInput) return;

  const isExclude = picker._mode === "exclude";
  const normalizedQuery = normalizeSearchFilterText(picker._query);
  const selectedTagIds = new Set(
    isExclude ? getSearchFilterExcludeTagIds(screen) : getSearchFilterIncludeTagIds(screen)
  );

  title.textContent = isExclude ? "除外タグ" : "含めるタグ";
  lead.textContent = isExclude
    ? "外したい要素をまとめて選べます。"
    : "含めたい要素をまとめて選べます。";
  searchInput.value = picker._query;

  const filteredGroups = getHeaderFilterQuickTagGroups()
    .map((group) => ({
      ...group,
      tags: group.tags
        .filter((tag) => !normalizedQuery || tag.searchText.includes(normalizedQuery))
        .sort((left, right) => {
          const leftSelected = selectedTagIds.has(left.id) ? 1 : 0;
          const rightSelected = selectedTagIds.has(right.id) ? 1 : 0;
          if (leftSelected !== rightSelected) return rightSelected - leftSelected;
          return left.label.localeCompare(right.label, "ja");
        }),
    }))
    .filter((group) => group.tags.length);

  const totalCount = filteredGroups.reduce((sum, group) => sum + group.tags.length, 0);
  count.textContent = normalizedQuery
    ? `${totalCount} 件のタグが見つかりました`
    : `${getHeaderFilterQuickSelectableTags().length} 件のタグを選べます`;
  results.textContent = "";

  if (!filteredGroups.length) {
    const empty = document.createElement("p");
    empty.className = "ikea-tag-picker__empty";
    empty.textContent = "一致するタグはありません。";
    results.appendChild(empty);
    return;
  }

  filteredGroups.forEach((group) => {
    const section = document.createElement("section");
    const groupHeader = document.createElement("div");
    const groupTitle = document.createElement("h3");
    const groupCount = document.createElement("p");
    const row = document.createElement("div");

    section.className = "ikea-tag-picker__group";
    groupHeader.className = "ikea-tag-picker__groupHeader";
    groupTitle.className = "ikea-tag-picker__groupTitle";
    groupTitle.textContent = group.label;
    groupCount.className = "ikea-tag-picker__groupCount";
    groupCount.textContent = `${group.tags.length}件`;
    row.className = "ikea-tag-picker__chipRow";

    group.tags.forEach((tag) => {
      row.appendChild(
        createSearchFilterChipButton({
          label: tag.label,
          selected: selectedTagIds.has(tag.id),
          className: isExclude ? "plp-filter-chip--exclude" : "",
          dataset: {
            searchFilterTagPickerState: picker._mode,
            searchFilterTagId: tag.id,
          },
        })
      );
    });

    groupHeader.append(groupTitle, groupCount);
    section.append(groupHeader, row);
    results.appendChild(section);
  });
};

const createSearchFilterScreen = () => {
  if (typeof document === "undefined" || !document.body) return null;
  const existing = document.querySelector("[data-search-filter-screen]");
  if (existing) return existing;

  const screen = document.createElement("div");
  const backdrop = document.createElement("button");
  const panel = document.createElement("section");
  const form = document.createElement("form");
  const queryInput = document.createElement("input");
  const hiddenInputs = document.createElement("div");
  const header = document.createElement("div");
  const title = document.createElement("h2");
  const closeButton = document.createElement("button");
  const body = document.createElement("div");
  const wrapper = document.createElement("div");
  const wrapperHeader = document.createElement("div");
  const headingBlock = document.createElement("div");
  const eyebrow = document.createElement("p");
  const sectionTitle = document.createElement("h2");
  const clearButton = document.createElement("button");
  const summary = document.createElement("p");
  const characterCard = document.createElement("section");
  const characterHeader = document.createElement("div");
  const characterTitle = document.createElement("strong");
  const speciesField = document.createElement("section");
  const speciesLabelRow = document.createElement("div");
  const speciesLabel = document.createElement("strong");
  const speciesLink = document.createElement("a");
  const speciesRow = document.createElement("div");
  const bodyField = document.createElement("section");
  const bodyLabel = document.createElement("strong");
  const bodyGrid = document.createElement("div");
  const ageField = document.createElement("section");
  const ageLabel = document.createElement("strong");
  const ageRow = document.createElement("div");
  const includeField = document.createElement("section");
  const includeLabel = document.createElement("strong");
  const includeRow = document.createElement("div");
  const includeMoreButton = document.createElement("button");
  const excludeField = document.createElement("section");
  const excludeLabel = document.createElement("strong");
  const excludeRow = document.createElement("div");
  const excludeMoreButton = document.createElement("button");
  const sortCard = document.createElement("section");
  const sortField = document.createElement("label");
  const sortLabel = document.createElement("span");
  const sortSelect = document.createElement("select");
  const sortNote = document.createElement("p");
  const footer = document.createElement("div");
  const submitButton = document.createElement("button");

  screen.className = "ikea-search-filter-screen";
  screen.hidden = true;
  screen.dataset.searchFilterScreen = "true";
  screen.dataset.open = "false";
  screen.setAttribute("aria-hidden", "true");

  backdrop.className = "ikea-search-filter-screen__backdrop";
  backdrop.type = "button";
  backdrop.dataset.searchFilterClose = "true";
  backdrop.setAttribute("aria-label", "絞り込み画面を閉じる");

  panel.className = "ikea-search-filter-screen__panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "site-search-filter-title");

  form.className = "ikea-search-filter-screen__form";
  form.action = "/finder/";
  form.method = "get";

  queryInput.type = "hidden";
  queryInput.name = "q";
  queryInput.dataset.searchFilterQueryInput = "true";
  hiddenInputs.hidden = true;
  hiddenInputs.dataset.searchFilterHiddenInputs = "true";

  header.className = "ikea-search-filter-screen__header";
  title.className = "ikea-search-filter-screen__title";
  title.id = "site-search-filter-title";
  title.textContent = "フィルター";
  closeButton.className = "ikea-search-filter-screen__close";
  closeButton.type = "button";
  closeButton.dataset.searchFilterClose = "true";
  closeButton.setAttribute("aria-label", "絞り込み画面を閉じる");
  closeButton.appendChild(createIcon("close"));
  header.append(title, closeButton);

  body.className = "ikea-search-filter-screen__body";
  wrapper.className = "ikea-quick-filters";
  wrapperHeader.className = "ikea-quick-filters__header";
  headingBlock.className = "ikea-quick-filters__heading";
  eyebrow.className = "ikea-quick-filters__eyebrow";
  eyebrow.textContent = "フィルター";
  sectionTitle.textContent = "キャラクターフィルター";
  headingBlock.append(eyebrow, sectionTitle);
  clearButton.className = "ikea-quick-filters__clear";
  clearButton.type = "button";
  clearButton.dataset.searchFilterReset = "true";
  clearButton.textContent = "すべて解除";
  wrapperHeader.append(headingBlock, clearButton);

  summary.className = "ikea-quick-filters__summary";
  summary.dataset.searchFilterSummary = "true";

  characterCard.className = "ikea-quick-character-card";
  characterHeader.className = "ikea-quick-character-card__header";
  characterTitle.className = "ikea-quick-character-card__title";
  characterTitle.textContent = "キャラ 1";
  characterHeader.appendChild(characterTitle);
  characterCard.appendChild(characterHeader);

  speciesField.className = "ikea-quick-filter-field";
  speciesLabelRow.className = "ikea-quick-filter-field__labelRow";
  speciesLabel.className = "ikea-quick-filter-field__label";
  speciesLabel.textContent = "種族";
  speciesLink.className = "ikea-quick-filter-field__link";
  speciesLink.dataset.searchFilterBuilderLink = "true";
  speciesLink.textContent = "もっと探す";
  speciesLabelRow.append(speciesLabel, speciesLink);
  speciesRow.className = "ikea-quick-filter-chipRow";
  speciesRow.dataset.searchFilterSpeciesRow = "true";
  speciesField.append(speciesLabelRow, speciesRow);

  bodyField.className = "ikea-quick-filter-field";
  bodyLabel.className = "ikea-quick-filter-field__label";
  bodyLabel.textContent = "体型";
  bodyGrid.className = "ikea-quick-filter-bodyGrid";
  bodyGrid.dataset.searchFilterBodyGrid = "true";
  bodyField.append(bodyLabel, bodyGrid);

  ageField.className = "ikea-quick-filter-field";
  ageLabel.className = "ikea-quick-filter-field__label";
  ageLabel.textContent = "年齢";
  ageRow.className = "ikea-quick-filter-chipRow";
  ageRow.dataset.searchFilterAgeRow = "true";
  ageField.append(ageLabel, ageRow);

  characterCard.append(speciesField, bodyField, ageField);

  includeField.className = "ikea-quick-filter-field";
  includeLabel.className = "ikea-quick-filter-field__label";
  includeLabel.textContent = "含めるタグ";
  includeRow.className = "ikea-quick-filter-chipRow";
  includeRow.dataset.searchFilterIncludeRow = "true";
  includeMoreButton.className = "ikea-quick-filter-field__more";
  includeMoreButton.type = "button";
  includeMoreButton.dataset.searchFilterTagPickerOpen = "include";
  includeMoreButton.textContent = "もっと見る";
  includeField.append(includeLabel, includeRow, includeMoreButton);

  excludeField.className = "ikea-quick-filter-field";
  excludeLabel.className = "ikea-quick-filter-field__label";
  excludeLabel.textContent = "除外タグ";
  excludeRow.className = "ikea-quick-filter-chipRow";
  excludeRow.dataset.searchFilterExcludeRow = "true";
  excludeMoreButton.className = "ikea-quick-filter-field__more";
  excludeMoreButton.type = "button";
  excludeMoreButton.dataset.searchFilterTagPickerOpen = "exclude";
  excludeMoreButton.textContent = "もっと見る";
  excludeField.append(excludeLabel, excludeRow, excludeMoreButton);

  sortCard.className = "ikea-search-sidebar__card ikea-search-sidebar__card--compact";
  sortField.className = "ikea-search-sidebar__field";
  sortLabel.textContent = "並び替え";
  sortSelect.name = "sort";
  sortSelect.dataset.searchFilterSort = "true";
  Object.entries(HEADER_FILTER_SORT_META).forEach(([value, meta]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = meta.label;
    sortSelect.appendChild(option);
  });
  sortField.append(sortLabel, sortSelect);
  sortNote.className = "ikea-search-sidebar__help";
  sortNote.dataset.searchFilterSortNote = "true";
  sortCard.append(sortField, sortNote);

  footer.className = "ikea-search-filter-screen__footer";
  submitButton.className = "ikea-search-filter-screen__primary";
  submitButton.type = "submit";
  submitButton.textContent = "この条件で探す";
  footer.appendChild(submitButton);

  wrapper.append(wrapperHeader, summary, characterCard, includeField, excludeField);
  body.append(wrapper, sortCard);
  form.append(header, queryInput, hiddenInputs, body, footer);
  panel.appendChild(form);
  screen.append(backdrop, panel);
  document.body.appendChild(screen);

  setSearchFilterCharacterState(screen, {});
  setSearchFilterTagSelections(screen, { includeTagIds: [], excludeTagIds: [] });
  setSearchFilterSortValue(screen, "recommended");
  renderSearchFilterFields(screen);
  return screen;
};

const closeSearchFilterScreen = () => {
  const screen = document.querySelector("[data-search-filter-screen]");
  if (!screen || screen.hidden) return;

  closeSearchFilterTagPicker({ restoreFocus: false });
  screen.hidden = true;
  screen.dataset.open = "false";
  screen.setAttribute("aria-hidden", "true");
  document.body.classList.remove("search-filter-screen-open");

  if (searchFilterScreenRestoreFocus && typeof searchFilterScreenRestoreFocus.focus === "function") {
    searchFilterScreenRestoreFocus.focus();
  }
  searchFilterScreenRestoreFocus = null;
};

const openSearchFilterScreen = (trigger = null) => {
  const screen = createSearchFilterScreen();
  if (!screen) return;

  const params = new URLSearchParams(window.location.search);
  const query = getHeaderSearchQuery(trigger);
  const queryInput = screen.querySelector("[data-search-filter-query-input]");
  if (queryInput) queryInput.value = query;
  setSearchFilterCharacterState(screen, {
    speciesTagIds: params.getAll("c1_species"),
    bodyTypeTagIds: params.getAll("c1_body"),
    ageFeelTagIds: params.getAll("c1_age"),
  });
  setSearchFilterTagSelections(screen, {
    includeTagIds: params.getAll("include"),
    excludeTagIds: params.getAll("exclude"),
  });
  setSearchFilterSortValue(screen, params.get("sort") || "recommended");
  renderSearchFilterFields(screen);

  searchFilterScreenRestoreFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  screen.hidden = false;
  screen.dataset.open = "true";
  screen.setAttribute("aria-hidden", "false");
  document.body.classList.add("search-filter-screen-open");

  const firstButton =
    screen.querySelector("[data-search-filter-character-field]") ||
    screen.querySelector("[data-search-filter-reset]") ||
    screen.querySelector("[data-search-filter-tag-picker-open]");
  window.requestAnimationFrame(() => {
    firstButton?.focus();
  });
};

const initSearchFilterScreen = () => {
  if (typeof document === "undefined" || !document.body || document.body.dataset.searchFilterScreenBound) {
    return;
  }

  createSearchFilterScreen();
  createSearchFilterTagPicker();

  document.body.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-header-filter]");
    if (openButton) {
      openSearchFilterScreen(openButton);
      return;
    }

    const closeButton = event.target.closest("[data-search-filter-close]");
    if (closeButton) {
      closeSearchFilterScreen();
      return;
    }

    const tagPickerCloseButton = event.target.closest("[data-search-filter-tag-picker-close]");
    if (tagPickerCloseButton) {
      closeSearchFilterTagPicker();
      return;
    }

    const tagPickerOpenButton = event.target.closest("[data-search-filter-tag-picker-open]");
    if (tagPickerOpenButton) {
      openSearchFilterTagPicker(tagPickerOpenButton.dataset.searchFilterTagPickerOpen, tagPickerOpenButton);
      return;
    }

    const characterButton = event.target.closest("[data-search-filter-character-field]");
    if (characterButton) {
      const screen = characterButton.closest("[data-search-filter-screen]");
      const field = characterButton.dataset.searchFilterCharacterField || "";
      const tagId = characterButton.dataset.searchFilterTagId || "";
      if (!screen || !field || !tagId) return;
      toggleSearchFilterCharacterValue(screen, field, tagId);
      renderSearchFilterFields(screen);
      return;
    }

    const globalTagButton = event.target.closest("[data-search-filter-global-state]");
    if (globalTagButton) {
      const screen = globalTagButton.closest("[data-search-filter-screen]");
      const mode = globalTagButton.dataset.searchFilterGlobalState || "include";
      const tagId = globalTagButton.dataset.searchFilterTagId || "";
      if (!screen || !tagId) return;
      toggleSearchFilterQuickTag(screen, mode, tagId);
      renderSearchFilterFields(screen);
      return;
    }

    const pickerTagButton = event.target.closest("[data-search-filter-tag-picker-state]");
    if (pickerTagButton) {
      const screen = document.querySelector("[data-search-filter-screen]");
      const mode = pickerTagButton.dataset.searchFilterTagPickerState || "include";
      const tagId = pickerTagButton.dataset.searchFilterTagId || "";
      if (!screen || !tagId) return;
      toggleSearchFilterQuickTag(screen, mode, tagId);
      renderSearchFilterFields(screen);
      renderSearchFilterTagPicker();
      return;
    }

    const resetButton = event.target.closest("[data-search-filter-reset]");
    if (resetButton) {
      const screen = resetButton.closest("[data-search-filter-screen]");
      if (!screen) return;
      setSearchFilterCharacterState(screen, {});
      setSearchFilterTagSelections(screen, { includeTagIds: [], excludeTagIds: [] });
      renderSearchFilterFields(screen);
      resetButton.focus();
    }
  });

  document.body.addEventListener("input", (event) => {
    const tagPickerQueryInput = event.target.closest("[data-search-filter-tag-picker-query]");
    if (!tagPickerQueryInput) return;
    const picker = tagPickerQueryInput.closest("[data-search-filter-tag-picker]");
    if (!picker) return;
    picker._query = tagPickerQueryInput.value || "";
    renderSearchFilterTagPicker();
  });

  document.body.addEventListener("change", (event) => {
    const sortSelect = event.target.closest("[data-search-filter-sort]");
    if (!sortSelect) return;
    const screen = sortSelect.closest("[data-search-filter-screen]");
    if (!screen) return;
    setSearchFilterSortValue(screen, sortSelect.value);
    renderSearchFilterFields(screen);
  });

  document.body.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-search-filter-screen] form");
    if (!form) return;
    const queryInput = form.querySelector("[data-search-filter-query-input]");
    if (!(queryInput instanceof HTMLInputElement)) return;
    const liveQuery = document.querySelector('.ikea-shell__searchForm input[name="q"]')?.value?.trim() || "";
    queryInput.value = liveQuery || queryInput.value.trim();
    queryInput.disabled = queryInput.value.trim() === "";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const picker = document.querySelector("[data-search-filter-tag-picker]");
    if (picker && !picker.hidden) {
      closeSearchFilterTagPicker();
      return;
    }
    closeSearchFilterScreen();
  });

  document.body.dataset.searchFilterScreenBound = "true";
};

const renderSiteChrome = () => {
  const currentSection = getCurrentSection();
  const currentQuery = new URLSearchParams(window.location.search).get("q") || "";

  document.querySelectorAll(".nav").forEach((nav) => {
    nav.textContent = "";

    const shell = document.createElement("div");
    const header = document.createElement("div");
    const headerInner = document.createElement("div");
    const brand = document.createElement("a");
    const brandFrame = document.createElement("span");
    const brandOval = document.createElement("span");
    const menu = document.createElement("nav");
    const searchForm = document.createElement("form");
    const searchShell = document.createElement("div");
    const searchInput = document.createElement("input");
    const clearButton = document.createElement("button");
    const filterButton = document.createElement("button");
    const searchButton = document.createElement("button");
    const actionBar = document.createElement("div");

    shell.className = "ikea-shell";
    header.className = "ikea-shell__header";
    headerInner.className = "ikea-shell__headerInner";
    brand.className = "ikea-shell__logo";
    brand.href = "/";
    brand.setAttribute("aria-label", `${BRAND_NAME} トップへ`);
    brandFrame.className = "ikea-shell__logoFrame";
    brandOval.className = "ikea-shell__logoOval";
    brandOval.textContent = "FIND";
    brandFrame.appendChild(brandOval);
    brand.appendChild(brandFrame);

    menu.className = "ikea-shell__menu";
    menu.setAttribute("aria-label", "主要メニュー");

    searchForm.className = "ikea-shell__searchForm";
    searchForm.action = "/finder/";
    searchForm.method = "get";
    searchShell.className = "ikea-shell__search";
    searchShell.appendChild(createIcon("search", "ikea-shell__searchIcon"));
    searchInput.type = "search";
    searchInput.name = "q";
    searchInput.value = currentQuery;
    searchInput.placeholder = "作品名 / タグ / 作者 / 気分で探す";
    searchInput.className = "ikea-shell__searchInput";
    searchInput.setAttribute("aria-label", "サイト内検索");
    clearButton.className = "ikea-shell__searchClear";
    clearButton.type = "button";
    clearButton.dataset.headerClear = "true";
    clearButton.setAttribute("aria-label", "検索語を消去");
    clearButton.appendChild(createIcon("close"));
    filterButton.className = "ikea-shell__searchFilter";
    filterButton.type = "button";
    filterButton.dataset.headerFilter = "true";
    filterButton.setAttribute("aria-label", "絞り込み条件を開く");
    filterButton.appendChild(createIcon("filter"));
    searchButton.className = "ikea-shell__searchSubmit";
    searchButton.type = "submit";
    searchButton.setAttribute("aria-label", "検索");
    searchButton.appendChild(createIcon("search"));
    searchShell.append(searchInput, clearButton, filterButton, searchButton);
    searchForm.appendChild(searchShell);

    actionBar.className = "ikea-shell__actions";

    NAV_ITEMS.forEach((item) => {
      menu.appendChild(
        createChromeLink({
          href: item.href,
          label: item.label,
          className: "ikea-shell__menuLink",
          current: item.section === currentSection,
        })
      );
    });

    HEADER_ACTIONS.forEach((item) => {
      const link = createChromeLink({
        href: item.href,
        label: item.label,
        className: "ikea-shell__iconLink",
        icon: item.icon,
      });
      link.setAttribute("aria-label", item.label);
      actionBar.appendChild(link);
    });

    headerInner.append(brand, menu, searchForm, actionBar);
    header.appendChild(headerInner);
    shell.appendChild(header);
    nav.appendChild(shell);
  });

  document.querySelectorAll(".footer").forEach((footer) => {
    if (footer.classList.contains("editorial-footer")) return;
    footer.className = "footer editorial-footer";
    footer.innerHTML = EDITORIAL_FOOTER_TEMPLATE(BRAND_NAME);
  });
};

renderSiteChrome();
initHistoryDrawer();
initSavedSearchDrawer();
initSearchFilterScreen();
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

const createArticleTeaserCard = (article) => {
  const link = document.createElement("a");
  const thumb = document.createElement("div");
  const thumbLabel = document.createElement("span");
  const body = document.createElement("div");
  const meta = document.createElement("span");
  const title = document.createElement("strong");
  const summary = document.createElement("p");

  link.className = "detail-related-card";
  link.href = article.url;
  link.dataset.articleType = article.type;

  thumb.className = "detail-related-card__thumb";
  thumbLabel.textContent = article.type;
  thumb.appendChild(thumbLabel);

  body.className = "detail-related-card__body";
  meta.className = "detail-related-card__meta";
  meta.textContent = `${article.type} | ${article.publishedAt}`;
  title.textContent = article.title;
  summary.textContent = article.summary;
  body.append(meta, title, summary);

  link.append(thumb, body);
  return link;
};

const createArticleListLink = (article) => {
  const link = document.createElement("a");
  const thumb = document.createElement("span");
  const body = document.createElement("span");
  const title = document.createElement("strong");
  const meta = document.createElement("span");

  link.className = "detail-list-link";
  link.href = article.url;
  link.dataset.articleType = article.type;
  thumb.className = "detail-list-link__thumb";
  thumb.textContent = article.type;
  body.className = "detail-list-link__body";
  title.textContent = article.title;
  meta.textContent = `${article.type} | ${article.publishedAt}`;
  body.append(title, meta);
  link.append(thumb, body);
  return link;
};

const createArticleCategoryChip = (option) => {
  const chip = document.createElement("a");
  const label = document.createElement("strong");
  const count = document.createElement("span");

  chip.className = "detail-category-chip";
  chip.href = toFilterUrl({ type: option.value });
  label.textContent = option.value;
  count.textContent = `${option.count}件`;
  chip.append(label, count);
  return chip;
};

const scoreRelatedArticle = (baseArticle, candidateArticle) => {
  let score = 0;
  if (baseArticle.type === candidateArticle.type) score += 6;
  const tagSet = new Set(baseArticle.tags || []);
  (candidateArticle.tags || []).forEach((tag) => {
    if (tagSet.has(tag)) score += 3;
  });
  return score;
};

const populateArticleSidebarFeeds = ({ recentRoot, categoryRoot, excludeSlug = "" } = {}) => {
  const api = window.ArticleSearch;
  const articles = Array.isArray(window.ARTICLE_INDEX) ? window.ARTICLE_INDEX : [];
  if (!api || !articles.length) return;

  const decoratedArticles = api.decorateArticles(articles);
  const visibleArticles = excludeSlug
    ? decoratedArticles.filter((item) => item.slug !== excludeSlug)
    : decoratedArticles;

  if (recentRoot) {
    recentRoot.textContent = "";
    visibleArticles
      .slice()
      .sort((left, right) => `${right.publishedAt}`.localeCompare(`${left.publishedAt}`))
      .slice(0, 4)
      .forEach((item) => recentRoot.appendChild(createArticleListLink(item)));
  }

  if (categoryRoot) {
    categoryRoot.textContent = "";
    api
      .collectFilterOptions(decoratedArticles)
      .types.forEach((option) => categoryRoot.appendChild(createArticleCategoryChip(option)));
  }
};

const initSharedArticleSidebars = () => {
  document.querySelectorAll("[data-article-sidebar]").forEach((root) => {
    populateArticleSidebarFeeds({
      recentRoot: root.querySelector("[data-article-recent]"),
      categoryRoot: root.querySelector("[data-article-categories]"),
      excludeSlug: root.dataset.articleSidebarExcludeSlug || "",
    });
  });
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

  const authorRoot = root.querySelector("[data-article-author]");
  if (authorRoot) authorRoot.textContent = `${BRAND_NAME} 編集部`;

  const decoratedArticles = api.decorateArticles(articles);
  const relatedRoot = root.querySelector("[data-guide-related]");
  if (relatedRoot) {
    relatedRoot.textContent = "";
    decoratedArticles
      .filter((item) => item.slug !== article.slug)
      .sort((left, right) => {
        const scoreDiff = scoreRelatedArticle(article, right) - scoreRelatedArticle(article, left);
        if (scoreDiff !== 0) return scoreDiff;
        return `${right.publishedAt}`.localeCompare(`${left.publishedAt}`);
      })
      .slice(0, 3)
      .forEach((item) => relatedRoot.appendChild(createArticleTeaserCard(item)));
  }

  populateArticleSidebarFeeds({
    recentRoot: root.querySelector("[data-article-recent]"),
    categoryRoot: root.querySelector("[data-article-categories]"),
    excludeSlug: article.slug,
  });
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
initSharedArticleSidebars();
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
