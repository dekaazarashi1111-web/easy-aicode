(function (root, factory) {
  root.IkeaFinderUi = factory(root.FinderStore, root.FinderCore, root.ArticleSearch, root.ARTICLE_INDEX);
})(typeof globalThis !== "undefined" ? globalThis : this, function (store, core, articleSearch, articleIndex) {
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

  const ARTICLE_SORT_META = {
    latest: {
      label: "新しい順",
      description: "公開日が新しい順に並びます。",
    },
    oldest: {
      label: "古い順",
      description: "公開日が古い順に並びます。",
    },
    title: {
      label: "名前順",
      description: "記事タイトルの五十音順に並びます。",
    },
    type: {
      label: "種別順",
      description: "比較記事やガイドなど、記事種別ごとに並びます。",
    },
  };
  const ARTICLE_RESULTS_PER_PAGE = 6;

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

  let mediaCycleSequence = 0;
  const mediaCycleCleanupMap = new Map();

  const registerMediaCycleCleanup = (element, cleanup) => {
    if (!element || typeof cleanup !== "function") return;
    const cycleId = `media-cycle-${++mediaCycleSequence}`;
    element.dataset.mediaCycleId = cycleId;
    mediaCycleCleanupMap.set(cycleId, cleanup);
  };

  const disposeMediaCycleCleanup = (element) => {
    if (!element) return;
    const cycleId = element.dataset.mediaCycleId;
    if (!cycleId) return;
    const cleanup = mediaCycleCleanupMap.get(cycleId);
    if (cleanup) cleanup();
    mediaCycleCleanupMap.delete(cycleId);
    delete element.dataset.mediaCycleId;
  };

  const disposeMediaCyclesWithin = (root) => {
    if (!root) return;
    if (root instanceof Element && root.dataset.mediaCycleId) {
      disposeMediaCycleCleanup(root);
    }
    root.querySelectorAll?.("[data-media-cycle-id]").forEach((element) => {
      disposeMediaCycleCleanup(element);
    });
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
      heart:
        "M12 20.001l-.501-.3088c-.9745-.5626-1.8878-1.2273-2.7655-1.9296-1.1393-.9117-2.4592-2.1279-3.5017-3.5531-1.0375-1.4183-1.8594-3.1249-1.8597-4.9957-.0025-1.2512.3936-2.5894 1.419-3.6149 1.8976-1.8975 4.974-1.8975 6.8716 0l.3347.3347.336-.3347c1.8728-1.8722 4.9989-1.8727 6.8716 0 .9541.954 1.4145 2.2788 1.4191 3.6137 0 3.0657-2.2028 5.7259-4.1367 7.5015-1.2156 1.1161-2.5544 2.1393-3.9813 2.9729L12 20.001z",
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

  const FILTER_LABEL_OVERRIDES = {
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

  const QUICK_FILTER_GROUP_IDS = new Set(["species", "body-type", "age-feel"]);
  const FINDER_SIDEBAR_HIDDEN_GROUP_IDS = new Set([
    "entrance",
    "species",
    "body-type",
    "age-feel",
    "style",
    "relationship",
    "transformation",
    "format",
    "curation",
    "avoid",
  ]);

  const QUICK_FILTER_SPECIES_TAG_IDS = [
    "species-wolf",
    "species-dog",
    "species-fox",
    "species-cat",
    "species-bear",
  ];

  const QUICK_FILTER_BODY_OPTIONS = [
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

  const QUICK_FILTER_AGE_OPTIONS = [
    { tagId: "age-adult", label: "成年" },
    { tagId: "age-older", label: "熟年" },
  ];
  const QUICK_FILTER_AGE_TAG_IDS = QUICK_FILTER_AGE_OPTIONS.map((option) => option.tagId);
  const QUICK_FILTER_AGE_TAG_ID_SET = new Set(QUICK_FILTER_AGE_TAG_IDS);

  const QUICK_FILTER_GLOBAL_INCLUDE_TAG_IDS = [
    "osu-kemo",
    "dense-fur",
    "buddy-energy",
    "distance-close",
    "gentle-tone",
    "light-tone",
    "format-comic",
    "format-cg",
    "format-novel",
  ];

  const QUICK_FILTER_GLOBAL_EXCLUDE_TAG_IDS = ["no-ntr", "clear-consent", "low-gore"];
  const QUICK_FILTER_GLOBAL_INCLUDE_SET = new Set(QUICK_FILTER_GLOBAL_INCLUDE_TAG_IDS);
  const QUICK_FILTER_GLOBAL_EXCLUDE_SET = new Set(QUICK_FILTER_GLOBAL_EXCLUDE_TAG_IDS);
  const HOVER_GALLERY_INTERVAL_MS = 3000;

  const hashString = (value) => {
    let hash = 0;
    String(value || "")
      .split("")
      .forEach((char) => {
        hash = (hash * 33 + char.charCodeAt(0)) % 2147483647;
      });
    return Math.abs(hash);
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const formatDateLabel = (value) => {
    if (!value) return "日付未設定";
    return value.replace(/-/g, ".");
  };

  const getQuickFilterTagLabel = (tagId, tagMap) => {
    const ageOption = QUICK_FILTER_AGE_OPTIONS.find((option) => option.tagId === tagId);
    if (ageOption) return ageOption.label;
    return tagMap.get(tagId)?.label || tagId;
  };

  const getDiscoveryCardMeta = ({
    work,
    tagMap,
    pageState = {},
    reason = "",
  }) => {
    const hash = hashString(work.id || work.slug || work.title);
    const tone = ["white", "sand", "sage", "blue", "charcoal"][hash % 5];
    const visual = ["ladder", "cube", "wide", "frame", "grid"][hash % 5];
    const activeIncludeIds = ensureArray(pageState.includeTagIds);
    const matchedTagLabels = activeIncludeIds
      .filter((tagId) => ensureArray(work.tagIds).includes(tagId))
      .map((tagId) => tagMap.get(tagId)?.label || tagId);
    const tokenMatches = ensureArray(work.matchContext?.tokenMatches);
    const primaryTags = ensureArray(work.primaryTagObjects);
    const primaryLabels = primaryTags.map((tag) => tag.label);
    const badge =
      matchedTagLabels[0] ||
      primaryLabels[0] ||
      (ensureArray(work.primaryTagIds).includes("gateway-pick") ? "まずここから" : "");
    const matchScore = clamp(
      78 +
        matchedTagLabels.length * 8 +
        tokenMatches.length * 4 +
        (reason ? 3 : 0) +
        (ensureArray(work.primaryTagIds).includes("gateway-pick") ? 3 : 0),
      78,
      98
    );
    const highlightLabel =
      activeIncludeIds.length || pageState.query || pageState.creatorQuery || pageState.collectionId
        ? `一致度 ${matchScore}%`
        : `更新 ${formatDateLabel(work.updatedAt || work.releasedAt)}`;
    const metaItems = [
      `更新 ${formatDateLabel(work.updatedAt || work.releasedAt)}`,
    ].filter(Boolean);

    return {
      badge,
      tone,
      visual,
      highlightLabel,
      metaItems,
      matchLabels: unique([...matchedTagLabels, ...primaryLabels]).slice(0, 4),
    };
  };

  const createShelfArtwork = (seed, visual = "grid", tone = "white", compact = false) => {
    const art = createElement(
      "div",
      `ikea-artwork ikea-artwork--${visual}${compact ? " ikea-artwork--compact" : ""}`
    );
    art.dataset.tone = tone;
    art.dataset.seed = String(hashString(seed) % 7);
    Array.from({ length: visual === "wide" ? 6 : 5 }).forEach(() => {
      art.appendChild(createElement("span", "ikea-artwork__piece"));
    });
    return art;
  };

  const escapeSvgText = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const buildHoverPreviewPlaceholder = (work, meta) => {
    const palette = {
      white: { background: "#f4efe6", accent: "#e3d2b6", text: "#181818" },
      sand: { background: "#e6d2b2", accent: "#c79257", text: "#181818" },
      sage: { background: "#d8e5d8", accent: "#55785b", text: "#18211b" },
      blue: { background: "#dbe7f5", accent: "#5a79ac", text: "#182033" },
      charcoal: { background: "#e5e5e5", accent: "#595959", text: "#181818" },
    }[meta.tone] || { background: "#f4efe6", accent: "#d1c2aa", text: "#181818" };

    const title = escapeSvgText(work.title || "作品プレビュー");
    const creator = escapeSvgText(work.creator || "仮画像");
    const label = escapeSvgText(meta.badge || work.format || "preview");
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" role="img" aria-label="${title}">
        <rect width="640" height="480" rx="0" fill="${palette.background}" />
        <rect x="34" y="34" width="572" height="412" rx="28" fill="rgba(255,255,255,0.66)" />
        <rect x="68" y="72" width="156" height="34" rx="17" fill="${palette.accent}" />
        <rect x="68" y="152" width="504" height="180" rx="24" fill="${palette.accent}" opacity="0.28" />
        <rect x="68" y="350" width="250" height="14" rx="7" fill="${palette.accent}" opacity="0.52" />
        <rect x="68" y="378" width="196" height="14" rx="7" fill="${palette.accent}" opacity="0.34" />
        <text x="88" y="95" fill="#ffffff" font-family="Noto Sans JP, Helvetica Neue, Arial, sans-serif" font-size="18" font-weight="700">${label}</text>
        <text x="68" y="126" fill="${palette.text}" font-family="Noto Sans JP, Helvetica Neue, Arial, sans-serif" font-size="16" opacity="0.72">hover preview</text>
        <text x="68" y="214" fill="${palette.text}" font-family="Noto Sans JP, Helvetica Neue, Arial, sans-serif" font-size="34" font-weight="800">${title}</text>
        <text x="68" y="258" fill="${palette.text}" font-family="Noto Sans JP, Helvetica Neue, Arial, sans-serif" font-size="18" opacity="0.8">${creator}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const getImageVariantScore = (url) => {
    const value = String(url || "");
    let score = 0;
    if (/_base_resized(?=\.[a-z0-9]+$)/i.test(value)) score += 4;
    if (/\/c\/\d+x\d+\//i.test(value)) score += 2;
    return score;
  };

  const normalizeGalleryImageKey = (url) => {
    const value = String(url || "").trim();
    if (!value) return "";
    try {
      const parsed = new URL(value, window.location.href);
      const normalizedPath = parsed.pathname
        .replace(/\/c\/[^/]+\//i, "/")
        .replace(/_base_resized(?=\.[a-z0-9]+$)/i, "");
      return `${parsed.origin}${normalizedPath}`;
    } catch (error) {
      return value.replace(/_base_resized(?=\.[a-z0-9]+$)/i, "");
    }
  };

  const resolveCardImageUrls = (work) => {
    const order = [];
    const preferredByKey = new Map();
    [
      work.primaryImage?.url,
      work.hoverImageUrl,
      ...ensureArray(work.galleryImages).map((image) => image?.url),
      ...ensureArray(work.galleryImageUrls),
      work.hoverPreviewImageUrl,
      work.cardHoverImageUrl,
    ]
      .filter(Boolean)
      .forEach((url) => {
        const key = normalizeGalleryImageKey(url);
        if (!key) return;
        if (!preferredByKey.has(key)) {
          preferredByKey.set(key, url);
          order.push(key);
          return;
        }
        const current = preferredByKey.get(key);
        if (getImageVariantScore(url) > getImageVariantScore(current)) {
          preferredByKey.set(key, url);
        }
      });
    return order.map((key) => preferredByKey.get(key)).filter(Boolean);
  };

  const createProductCardImage = (className, src) => {
    const image = document.createElement("img");
    image.className = className;
    image.src = src;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.draggable = false;
    return image;
  };

  const bindHoverGalleryCycle = ({ card, hoverImage, hoverImageUrls }) => {
    if (!card || !hoverImage || hoverImageUrls.length < 2) return;

    let intervalId = 0;
    let currentIndex = 0;

    const applyFrame = (index) => {
      currentIndex = index;
      hoverImage.src = hoverImageUrls[currentIndex];
    };

    const stopCycle = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = 0;
      }
      applyFrame(0);
    };

    const startCycle = () => {
      applyFrame(0);
      if (intervalId) return;
      intervalId = window.setInterval(() => {
        applyFrame((currentIndex + 1) % hoverImageUrls.length);
      }, HOVER_GALLERY_INTERVAL_MS);
    };

    const handleFocusOut = (event) => {
      if (card.contains(event.relatedTarget)) return;
      stopCycle();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stopCycle();
    };

    card.addEventListener("mouseenter", startCycle);
    card.addEventListener("mouseleave", stopCycle);
    card.addEventListener("focusin", startCycle);
    card.addEventListener("focusout", handleFocusOut);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", stopCycle);

    registerMediaCycleCleanup(card, () => {
      stopCycle();
      card.removeEventListener("mouseenter", startCycle);
      card.removeEventListener("mouseleave", stopCycle);
      card.removeEventListener("focusin", startCycle);
      card.removeEventListener("focusout", handleFocusOut);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", stopCycle);
    });
  };

  const createProductCardMediaVisual = ({ work, meta, card }) => {
    const visuals = createElement("div", "ikea-product-card__mediaVisuals");
    const base = createElement("div", "ikea-product-card__mediaVisual ikea-product-card__mediaVisual--base");
    const hover = createElement("div", "ikea-product-card__mediaVisual ikea-product-card__mediaVisual--hover");
    const distinctImageUrls = resolveCardImageUrls(work);
    const primaryImageUrl = distinctImageUrls[0] || "";
    const alternateImageUrls = distinctImageUrls.slice(1);

    if (primaryImageUrl) {
      base.appendChild(createProductCardImage("ikea-product-card__mainImage", primaryImageUrl));
    } else {
      base.appendChild(createShelfArtwork(work.id || work.slug || work.title, meta.visual, meta.tone));
    }

    if (alternateImageUrls.length) {
      const hoverImage = createProductCardImage(
        "ikea-product-card__hoverImage",
        alternateImageUrls[0]
      );
      visuals.classList.add("ikea-product-card__mediaVisuals--hoverSwap");
      hover.appendChild(hoverImage);
      bindHoverGalleryCycle({ card, hoverImage, hoverImageUrls: alternateImageUrls });
    } else if (!primaryImageUrl) {
      visuals.classList.add("ikea-product-card__mediaVisuals--hoverSwap");
      hover.appendChild(
        createProductCardImage(
          "ikea-product-card__hoverImage",
          buildHoverPreviewPlaceholder(work, meta)
        )
      );
    }

    visuals.append(base, hover);
    return visuals;
  };

  const createMatchTagList = (labels) => {
    const wrap = createElement("div", "ikea-product-card__matchTags");
    labels.forEach((label) => {
      wrap.appendChild(createElement("span", "ikea-product-card__matchTag", label));
    });
    return wrap;
  };

  const createAffinityLinks = (links) => {
    const wrap = createElement("div", "ikea-affinity-links");
    links.forEach((item) => {
      const link = createElement("a", "ikea-affinity-link", item.label);
      link.href = item.href;
      wrap.appendChild(link);
    });
    return wrap;
  };

  const createIconActionButton = ({ kind, workId, active = false, label }) => {
    const button = createElement(
      "button",
      `ikea-product-card__iconButton ikea-product-card__iconButton--${kind}`
    );
    button.type = "button";
    button.dataset.workAction = kind;
    button.dataset.workId = workId;
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", label);
    button.appendChild(createIcon(kind === "favorite" ? "heart" : "compare"));
    return button;
  };

  const createCategoryVisual = (variant) => {
    const visual = createElement("div", "ikea-category-visual");
    visual.dataset.variant = variant;
    Array.from({ length: 5 }).forEach(() => {
      visual.appendChild(createElement("span", "ikea-category-visual__piece"));
    });
    return visual;
  };

  const createTopCategoryCard = ({ label, href, visual }) => {
    const link = createElement("a", "ikea-top-category-card");
    const body = createElement("div", "ikea-top-category-card__body");
    link.href = href;
    body.append(createCategoryVisual(visual), createElement("strong", "ikea-top-category-card__title", label));
    link.appendChild(body);
    return link;
  };

  const createPromoCard = ({ kicker = "", title = "", description = "", href = "/", tone = "image", visual = "grid" }) => {
    const link = createElement("a", `ikea-home-promo ikea-home-promo--${tone}`);
    const content = createElement("div", "ikea-home-promo__content");
    const visualWrap = createElement("div", "ikea-home-promo__visual");
    link.href = href;
    visualWrap.appendChild(createShelfArtwork(`${title}-${tone}`, visual, tone === "yellow" ? "sand" : "white"));
    if (kicker) content.appendChild(createElement("span", "ikea-home-promo__kicker", kicker));
    content.appendChild(createElement("strong", "ikea-home-promo__title", title));
    if (description) content.appendChild(createElement("p", "ikea-home-promo__description", description));
    content.appendChild(createElement("span", "ikea-home-promo__link", "見る →"));
    link.append(visualWrap, content);
    return link;
  };

  const createCategoryBannerCard = ({ href, label, description = "", variant = "storage", meta = "" }) => {
    const link = createElement("a", "ikea-category-banner");
    const body = createElement("div", "ikea-category-banner__body");
    const text = createElement("div", "ikea-category-banner__text");
    link.href = href;
    body.appendChild(createCategoryVisual(variant));
    text.append(createElement("strong", "ikea-category-banner__title", label));
    if (description) text.appendChild(createElement("p", "ikea-category-banner__description", description));
    if (meta) text.appendChild(createElement("span", "ikea-category-banner__meta", meta));
    body.appendChild(text);
    link.appendChild(body);
    return link;
  };

  const createHomeSearchHero = ({ profile }) => {
    const card = createElement("section", "ikea-home-search-hero");
    const content = createElement("div", "ikea-home-search-hero__content");
    const form = createElement("form", "ikea-home-search-hero__form");
    const field = createElement("label", "ikea-home-search-hero__field");
    const input = document.createElement("input");
    const submit = createElement("button", "ikea-home-search-hero__submit", "探す");
    const quick = createElement("div", "ikea-home-search-hero__quick");
    const links = [
      { label: "まずここから", href: createFinderUrl({ collectionId: "start-here" }) },
      { label: "TFあり", href: createFinderUrl({ includeTagIds: ["tf-present"] }) },
      { label: "NTRなし", href: createFinderUrl({ includeTagIds: ["no-ntr"] }) },
      { label: "詳細条件ビルダー", href: "/builder/" },
    ];

    form.action = "/finder/";
    form.method = "get";
    input.type = "search";
    input.name = "q";
    input.placeholder = profile.searchPlaceholder || "タグや作品名で探す";
    input.autocomplete = "off";
    field.appendChild(input);
    form.append(field, submit);

    content.append(
      createElement("span", "ikea-home-search-hero__eyebrow", "Search first"),
      createElement("h1", "ikea-home-search-hero__title", "何を探したいかを、そのまま入れる"),
      createElement(
        "p",
        "ikea-home-search-hero__description",
        "広い入口はここから、細かい組み合わせは詳細条件ビルダーへ。ECの販促枠だった場所を、探索の入口に置き換えています。"
      ),
      form
    );
    links.forEach((item) => {
      quick.appendChild(createPillLink({ label: item.label, href: item.href, className: "ikea-pill" }));
    });
    card.append(content, quick);
    return card;
  };

  const mountBuilderSkeleton = (root) => {
    if (root.dataset.builderMounted) return;
    root.className = "main ikea-main ikea-builder-page";
    root.innerHTML = `
      <div class="ikea-page-shell ikea-builder-shell">
        <section class="ikea-builder-hero">
          <div>
            <p class="ikea-section-heading__eyebrow">Detailed Search</p>
            <h1 class="ikea-builder-hero__title">詳細条件ビルダー</h1>
            <p class="ikea-builder-hero__summary">
              広い入口はトップや通常検索、細かい組み合わせはここで作ります。今の段階ではタグ・作者・特集・除外条件をまとめて組み立てるための独立導線です。
            </p>
          </div>
          <div class="ikea-builder-hero__actions">
            <a href="/finder/" class="ikea-builder-hero__link">通常検索へ</a>
            <a href="/collections/" class="ikea-builder-hero__link ikea-builder-hero__link--secondary">入口特集へ</a>
          </div>
        </section>
        <div class="ikea-builder-layout">
          <section class="ikea-builder-main">
            <section class="ikea-builder-card">
              <div class="ikea-section-heading">
                <div>
                  <p class="ikea-section-heading__eyebrow">Step 1</p>
                  <h2 class="ikea-section-heading__title">基本条件</h2>
                </div>
              </div>
              <div class="ikea-builder-fields">
                <label class="ikea-search-sidebar__field">
                  <span>作品名・タグ・気分</span>
                  <input type="search" autocomplete="off" placeholder="例: TF / やさしめ / ノベル" data-builder-query />
                </label>
                <label class="ikea-search-sidebar__field">
                  <span>作者・サークル</span>
                  <input type="search" autocomplete="off" placeholder="作者名やサークル名" data-builder-creator />
                </label>
                <label class="ikea-search-sidebar__field">
                  <span>入口特集</span>
                  <select data-builder-collection></select>
                </label>
                <div class="ikea-search-sidebar__field">
                  <span>一致方法</span>
                  <div class="ikea-search-modeSwitch">
                    <button type="button" data-builder-mode="and" aria-pressed="true">すべて一致</button>
                    <button type="button" data-builder-mode="or" aria-pressed="false">いずれか一致</button>
                  </div>
                </div>
              </div>
            </section>
            <section class="ikea-builder-card">
              <div class="ikea-section-heading">
                <div>
                  <p class="ikea-section-heading__eyebrow">Step 2</p>
                  <h2 class="ikea-section-heading__title">含めたい条件</h2>
                </div>
              </div>
              <div class="ikea-builder-groups" data-builder-include-groups></div>
            </section>
            <section class="ikea-builder-card">
              <div class="ikea-section-heading">
                <div>
                  <p class="ikea-section-heading__eyebrow">Step 3</p>
                  <h2 class="ikea-section-heading__title">外したい条件</h2>
                </div>
              </div>
              <div class="ikea-builder-groups" data-builder-exclude-groups></div>
            </section>
          </section>
          <aside class="ikea-builder-side">
            <section class="ikea-builder-card ikea-builder-card--sticky">
              <div class="ikea-section-heading">
                <div>
                  <p class="ikea-section-heading__eyebrow">Preview</p>
                  <h2 class="ikea-section-heading__title" data-builder-preview-title>候補を計算中</h2>
                </div>
              </div>
              <p class="ikea-builder-preview__summary" data-builder-preview-summary></p>
              <div class="ikea-pill-cloud" data-builder-active></div>
              <div class="ikea-mini-stack" data-builder-preview-works></div>
              <div class="ikea-builder-preview__actions">
                <a href="/finder/" class="ikea-builder-preview__primary" data-builder-open-results>この条件で一覧を見る</a>
                <button type="button" data-builder-save-search>条件を保存</button>
                <button type="button" data-builder-copy-link>共有URLをコピー</button>
                <button type="button" data-builder-clear>最初からやり直す</button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    `;
    root.dataset.builderMounted = "true";
  };

  const mountHomeSkeleton = (root) => {
    if (root.dataset.homeMounted) return;
    root.className = "main ikea-main ikea-home-page";
    root.innerHTML = `
      <div class="ikea-page-shell ikea-home-shell">
        <section class="ikea-home-categories">
          <div class="ikea-home-categories__grid" data-home-top-categories></div>
        </section>
        <section class="ikea-home-heroGrid">
          <div data-home-promo-primary></div>
          <div class="ikea-home-heroGrid__stack" data-home-promo-secondary></div>
        </section>
        <section class="ikea-home-section">
          <div class="ikea-section-heading">
            <div>
              <p class="ikea-section-heading__eyebrow">Start points</p>
              <h2 class="ikea-section-heading__title">入口として使いやすい作品</h2>
            </div>
            <a href="/finder/" class="ikea-section-heading__link">もっと見る</a>
          </div>
          <div class="ikea-product-grid ikea-product-grid--home" data-home-featured-works></div>
        </section>
        <section class="ikea-home-section">
          <div class="ikea-section-heading">
            <div>
              <p class="ikea-section-heading__eyebrow">Explore paths</p>
              <h2 class="ikea-section-heading__title">探し方別の入口</h2>
            </div>
          </div>
          <div class="ikea-banner-row" data-home-featured-collections></div>
        </section>
        <section class="ikea-home-section ikea-home-assist">
          <div>
            <div class="ikea-section-heading">
              <div>
                <p class="ikea-section-heading__eyebrow">Quick entries</p>
                <h2 class="ikea-section-heading__title">よく使う入口</h2>
              </div>
            </div>
            <div class="ikea-pill-cloud" data-home-popular-searches></div>
          </div>
          <div>
            <div class="ikea-section-heading">
              <div>
                <p class="ikea-section-heading__eyebrow">Continue</p>
                <h2 class="ikea-section-heading__title">保存した検索</h2>
              </div>
            </div>
            <div class="ikea-mini-stack" data-home-saved-searches></div>
          </div>
          <div>
            <div class="ikea-section-heading">
              <div>
                <p class="ikea-section-heading__eyebrow">Builder</p>
                <h2 class="ikea-section-heading__title">詳細条件で探す</h2>
              </div>
            </div>
            <div class="ikea-mini-stack" data-home-builder-tools></div>
          </div>
        </section>
        <section class="ikea-home-section">
          <div class="ikea-section-heading">
            <div>
              <p class="ikea-section-heading__eyebrow">Search grammar</p>
              <h2 class="ikea-section-heading__title">条件から枝分かれする</h2>
            </div>
          </div>
          <div class="ikea-banner-row" data-home-tag-groups></div>
        </section>
      </div>
    `;
    root.dataset.homeMounted = "true";
  };

  const mountFinderSkeleton = (root) => {
    if (root.dataset.finderMounted) return;
    root.className = "main ikea-main ikea-search-page";
    root.innerHTML = `
      <div class="ikea-page-shell ikea-search-shell">
        <div class="ikea-search-layout">
          <aside class="ikea-search-sidebar">
            <section class="ikea-search-sidebar__card" data-finder-quick-filters></section>
            <section class="ikea-search-sidebar__card ikea-search-sidebar__card--compact">
              <label class="ikea-search-sidebar__field">
                <span>並び替え</span>
                <select data-finder-sort>
                  <option value="recommended">ベストマッチ</option>
                  <option value="latest">新しい順</option>
                  <option value="updated">更新順</option>
                  <option value="title">名前順</option>
                </select>
              </label>
              <p class="ikea-search-sidebar__help" data-finder-sort-note></p>
            </section>
          </aside>
          <section class="ikea-search-results">
            <p aria-live="assertive" class="sr-only" data-finder-a11y-live></p>
            <div class="ikea-search-results__toolbar">
              <div>
                <h2>結果リスト</h2>
                <p data-finder-status>条件なし</p>
              </div>
            </div>
            <section class="ikea-search-results__compare" data-finder-compare hidden id="compare-tray">
              <div class="ikea-section-heading">
                <div>
                  <p class="ikea-section-heading__eyebrow">Compare tray</p>
                  <h2 class="ikea-section-heading__title">候補を見比べる</h2>
                </div>
                <button type="button" data-compare-clear>比較をクリア</button>
              </div>
              <div class="ikea-mini-stack" data-compare-items></div>
              <div class="plp-compare-grid" data-compare-grid></div>
            </section>
            <section class="ikea-search-results__empty" data-finder-empty hidden>
              <h2>一致する作品が見つかりません</h2>
              <p>条件を絞りすぎている可能性があります。下の緩和候補から近い条件の作品を探してください。</p>
              <div class="finder-relax-list" data-finder-rescue></div>
              <div class="ikea-search-empty-grid">
                <div class="ikea-search-empty-grid__column">
                  <h3>入口特集</h3>
                  <div class="ikea-mini-stack" data-finder-empty-collections></div>
                </div>
                <div class="ikea-search-empty-grid__column">
                  <h3>最近見た作品</h3>
                  <div class="ikea-mini-stack" data-finder-empty-recent></div>
                </div>
                <div class="ikea-search-empty-grid__column">
                  <h3>助けが必要なとき</h3>
                  <div class="ikea-mini-stack" data-finder-empty-help></div>
                </div>
              </div>
            </section>
            <div class="ikea-product-grid ikea-product-grid--search" id="product-list" data-finder-results></div>
          </section>
        </div>
      </div>
    `;
    root.dataset.finderMounted = "true";
  };

  const createFinderUrl = ({
    query = "",
    creatorQuery = "",
    sort = "recommended",
    collectionId = "",
    includeTagIds = [],
    excludeTagIds = [],
    matchMode = "and",
    characters = [],
  } = {}) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (creatorQuery) params.set("creator", creatorQuery);
    if (sort && sort !== "recommended") params.set("sort", sort);
    if (collectionId) params.set("collection", collectionId);
    if (matchMode === "or") params.set("mode", "or");
    unique(includeTagIds).forEach((tagId) => params.append("include", tagId));
    unique(excludeTagIds).forEach((tagId) => params.append("exclude", tagId));
    appendCharacterParams(params, characters);
    return `/finder/${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const createArticlesUrl = ({
    query = "",
    selectedTypes = [],
    selectedTags = [],
    sort = "latest",
    mode = "and",
    page = 1,
  } = {}) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    unique(selectedTypes).forEach((value) => params.append("type", value));
    unique(selectedTags).forEach((value) => params.append("tag", value));
    if (sort && sort !== "latest") params.set("sort", sort);
    if (mode === "or") params.set("mode", "or");
    if (page && page > 1) params.set("page", String(page));
    return `/articles/${params.toString() ? `?${params.toString()}` : ""}`;
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
  const getArticleSortMeta = (sort) => ARTICLE_SORT_META[sort] || ARTICLE_SORT_META.latest;

  const getSearchSummaryLabel = (search, tagMap) => {
    const parts = [];
    if (search.query) parts.push(`作品: ${search.query}`);
    if (search.creatorQuery) parts.push(`作者: ${search.creatorQuery}`);
    ensureArray(search.characters).forEach((character, index) => {
      const labels = [
        ...ensureArray(character?.speciesTagIds).map((tagId) => tagMap.get(tagId)?.label || tagId),
        ...ensureArray(character?.bodyTypeTagIds).map((tagId) => tagMap.get(tagId)?.label || tagId),
        ...ensureArray(character?.ageFeelTagIds).map((tagId) => tagMap.get(tagId)?.label || tagId),
      ];
      if (!labels.length) return;
      parts.push(`キャラ${index + 1}: ${labels.join(" / ")}`);
    });
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

  const createEmptyCharacterState = (id = "character-1") => ({
    id,
    speciesTagIds: [],
    bodyTypeTagIds: [],
    ageFeelTagIds: [],
  });

  const normalizeCharacterState = (value, fallbackId = "character-1") => ({
    id: value?.id || fallbackId,
    speciesTagIds: unique(value?.speciesTagIds),
    bodyTypeTagIds: unique(value?.bodyTypeTagIds),
    ageFeelTagIds: unique(value?.ageFeelTagIds).filter((tagId) =>
      QUICK_FILTER_AGE_TAG_ID_SET.has(tagId)
    ),
  });

  const normalizeCharacters = (characters) => {
    const nextCharacters = ensureArray(characters).map((character, index) =>
      normalizeCharacterState(character, `character-${index + 1}`)
    );
    return nextCharacters.length ? nextCharacters : [createEmptyCharacterState()];
  };

  const getCharacterFieldTagIds = (character, field) => {
    if (field === "species") return ensureArray(character?.speciesTagIds);
    if (field === "body") return ensureArray(character?.bodyTypeTagIds);
    if (field === "age") return ensureArray(character?.ageFeelTagIds);
    return [];
  };

  const getAllCharacterTagIds = (characters) =>
    unique(
      normalizeCharacters(characters).flatMap((character) => [
        ...ensureArray(character.speciesTagIds),
        ...ensureArray(character.bodyTypeTagIds),
        ...ensureArray(character.ageFeelTagIds),
      ])
    );

  const characterMatchesField = (work, character, field) => {
    const selectedTagIds = getCharacterFieldTagIds(character, field);
    if (!selectedTagIds.length) return true;
    const workTagIds = new Set(ensureArray(work?.tagIds));
    return selectedTagIds.some((tagId) => workTagIds.has(tagId));
  };

  const matchesCharacters = (work, characters) =>
    normalizeCharacters(characters).every((character) =>
      ["species", "body", "age"].every((field) => characterMatchesField(work, character, field))
    );

  const appendCharacterParams = (params, characters) => {
    const character = normalizeCharacters(characters)[0];
    ensureArray(character.speciesTagIds).forEach((tagId) => params.append("c1_species", tagId));
    ensureArray(character.bodyTypeTagIds).forEach((tagId) => params.append("c1_body", tagId));
    ensureArray(character.ageFeelTagIds).forEach((tagId) => params.append("c1_age", tagId));
  };

  const readCharactersFromParams = (params) => [
    normalizeCharacterState({
      id: "character-1",
      speciesTagIds: params.getAll("c1_species"),
      bodyTypeTagIds: params.getAll("c1_body"),
      ageFeelTagIds: params.getAll("c1_age"),
    }),
  ];

  const getQuickFilterBuilderHref = (state) =>
    createFinderUrl({
      query: state.query,
      creatorQuery: state.creatorQuery,
      sort: state.sort,
      collectionId: state.collectionId,
      includeTagIds: unique([...state.includeTagIds, ...getAllCharacterTagIds(state.characters)]),
      excludeTagIds: state.excludeTagIds,
      matchMode: state.matchMode,
    }).replace("/finder/", "/builder/");

  const getQuickFilterSummary = (state, tagMap) => {
    const parts = [];
    normalizeCharacters(state.characters).forEach((character, index) => {
      const labels = [
        ...ensureArray(character.speciesTagIds).map((tagId) => getQuickFilterTagLabel(tagId, tagMap)),
        ...ensureArray(character.bodyTypeTagIds).map((tagId) => getQuickFilterTagLabel(tagId, tagMap)),
        ...ensureArray(character.ageFeelTagIds).map((tagId) => getQuickFilterTagLabel(tagId, tagMap)),
      ];
      if (!labels.length) return;
      parts.push(`キャラ${index + 1}: ${labels.join(" / ")}`);
    });
    const quickIncludeLabels = state.includeTagIds
      .filter((tagId) => QUICK_FILTER_GLOBAL_INCLUDE_SET.has(tagId))
      .map((tagId) => tagMap.get(tagId)?.label || tagId);
    const quickExcludeLabels = state.excludeTagIds
      .filter((tagId) => QUICK_FILTER_GLOBAL_EXCLUDE_SET.has(tagId))
      .map((tagId) => tagMap.get(tagId)?.label || tagId);
    if (quickIncludeLabels.length) {
      parts.push(`含める: ${quickIncludeLabels.join(" / ")}`);
    }
    if (quickExcludeLabels.length) {
      parts.push(`除外: ${quickExcludeLabels.join(" / ")}`);
    }
    return parts.filter(Boolean).join(" | ") || "条件なし";
  };

  const createQuickFilterChip = ({
    label,
    selected = false,
    className = "",
    dataset = {},
  }) => {
    const button = createElement(
      "button",
      `ikea-quick-filter-chip${className ? ` ${className}` : ""}`,
      label
    );
    button.type = "button";
    button.setAttribute("aria-pressed", String(selected));
    Object.entries(dataset).forEach(([key, value]) => {
      button.dataset[key] = value;
    });
    return button;
  };

  const createQuickFilterBodyButton = ({
    label,
    imageSrc = "",
    selected = false,
    dataset = {},
  }) => {
    const button = createElement("button", "ikea-quick-filter-bodyButton");
    button.type = "button";
    button.setAttribute("aria-pressed", String(selected));
    Object.entries(dataset).forEach(([key, value]) => {
      button.dataset[key] = value;
    });

    const imageWrap = createElement("span", "ikea-quick-filter-bodyButton__image");
    if (imageSrc) {
      const image = document.createElement("img");
      image.src = imageSrc;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      imageWrap.appendChild(image);
    } else {
      imageWrap.appendChild(createElement("span", "ikea-quick-filter-bodyButton__fallback", label));
    }

    button.append(
      imageWrap,
      createElement("span", "ikea-quick-filter-bodyButton__label", label)
    );
    return button;
  };

  const updateFinderUrl = (state) => {
    const nextUrl = new URL(createFinderUrl(state), window.location.origin);
    window.history.replaceState({}, "", `${window.location.pathname}${nextUrl.search}${window.location.hash}`);
  };

  const updateArticlesUrl = (state) => {
    const nextUrl = new URL(createArticlesUrl(state), window.location.origin);
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

  const createProductCard = ({
    work,
    uiState = {},
    reason = "",
    showActions = true,
    tagMap = new Map(),
    pageState = {},
  }) => {
    const meta = getDiscoveryCardMeta({ work, tagMap, pageState, reason });
    const article = createElement("article", "plp-product-card ikea-product-card");
    const mediaLink = createElement("a", "ikea-product-card__mediaLink");
    const media = createElement("div", "ikea-product-card__media");
    const body = createElement("div", "ikea-product-card__body");
    const formatLabel = createElement("p", "ikea-product-card__subtitle", work.format || "作品");
    const title = createElement("a", "ikea-product-card__title", work.title);
    const subtitle = createElement(
      "p",
      "ikea-product-card__detail",
      work.creator || "サンプル作者"
    );
    const metaRow = createElement("div", "ikea-product-card__metaRow");
    const actionRow = createElement("div", "ikea-product-card__actionRow");
    const favoriteSet = new Set(ensureArray(uiState.favoriteWorkIds));
    const summaryText = reason || work.matchSummary || work.shortDescription || work.publicNote || "";

    article.dataset.tone = meta.tone;
    mediaLink.href = `/work/?slug=${encodeURIComponent(work.slug)}`;
    mediaLink.dataset.workLink = "true";
    mediaLink.dataset.workId = work.id;
    title.href = `/work/?slug=${encodeURIComponent(work.slug)}`;
    title.dataset.workLink = "true";
    title.dataset.workId = work.id;

    if (meta.badge) {
      media.appendChild(createElement("span", "ikea-product-card__badge", meta.badge));
    }
    media.appendChild(createProductCardMediaVisual({ work, meta, card: article }));
    mediaLink.appendChild(media);

    meta.metaItems.forEach((item) => {
      metaRow.appendChild(createElement("span", "ikea-product-card__metaItem", item));
    });

    if (showActions) {
      actionRow.append(
        createIconActionButton({
          kind: "favorite",
          workId: work.id,
          active: favoriteSet.has(work.id),
          label: favoriteSet.has(work.id) ? "保存済み" : "保存する",
        })
      );
    }

    body.append(formatLabel, title, subtitle, metaRow);
    if (summaryText) body.appendChild(createElement("p", "ikea-product-card__reason", summaryText));
    if (showActions) body.appendChild(actionRow);
    article.append(mediaLink, body);
    return article;
  };

  const getArticleTimestamp = (article) => {
    const timestamp = Date.parse(article?.publishedAt || "");
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  const sortArticles = (articles, sort = "latest") => {
    const items = ensureArray(articles).slice();
    if (sort === "oldest") {
      return items.sort((left, right) => getArticleTimestamp(left) - getArticleTimestamp(right));
    }
    if (sort === "title") {
      return items.sort((left, right) => {
        const titleOrder = String(left?.title || "").localeCompare(String(right?.title || ""), "ja");
        if (titleOrder !== 0) return titleOrder;
        return getArticleTimestamp(right) - getArticleTimestamp(left);
      });
    }
    if (sort === "type") {
      return items.sort((left, right) => {
        const typeOrder = String(left?.type || "").localeCompare(String(right?.type || ""), "ja");
        if (typeOrder !== 0) return typeOrder;
        return getArticleTimestamp(right) - getArticleTimestamp(left);
      });
    }
    return items.sort((left, right) => getArticleTimestamp(right) - getArticleTimestamp(left));
  };

  const getArticleSearchSummaryLabel = (state) => {
    const parts = [];
    if (state.query) parts.push(`検索語: ${state.query}`);
    if (ensureArray(state.selectedTypes).length) {
      parts.push(`種別: ${ensureArray(state.selectedTypes).join(" / ")}`);
    }
    if (ensureArray(state.selectedTags).length) {
      parts.push(`タグ: ${ensureArray(state.selectedTags).join(" / ")}`);
    }
    if (state.mode === "or") parts.push("いずれか一致");
    return parts.join(" | ") || "条件なし";
  };

  const getArticleMatchReason = (article, pageState, articleApi) => {
    const reasons = [];
    const queryTokens = articleApi?.splitSearchTokens ? articleApi.splitSearchTokens(pageState.query) : [];
    const haystack = article?._normalized?.haystack || normalizeText([
      article?.title,
      article?.summary,
      ensureArray(article?.tags).join(" "),
      ensureArray(article?.keywords).join(" "),
    ].join(" "));
    const matchedTokens = queryTokens.filter((token) => haystack.includes(token));
    const matchedTypes = ensureArray(pageState.selectedTypes).filter((type) => type === article.type);
    const matchedTags = ensureArray(pageState.selectedTags).filter((tag) => ensureArray(article.tags).includes(tag));

    if (matchedTokens.length) reasons.push(`検索語 ${matchedTokens.join(" / ")}`);
    if (matchedTypes.length) reasons.push(`種別 ${matchedTypes.join(" / ")}`);
    if (matchedTags.length) reasons.push(`タグ ${matchedTags.join(" / ")}`);
    return reasons.join(" | ");
  };

  const getArticleCardMeta = ({ article, pageState = {} }) => {
    const hash = hashString(article.slug || article.title || article.url);
    const tone = ["white", "sand", "sage", "blue", "charcoal"][hash % 5];
    const visual = ["ladder", "cube", "wide", "frame", "grid"][hash % 5];
    const matchedTypes = ensureArray(pageState.selectedTypes).filter((type) => type === article.type);
    const matchedTags = ensureArray(pageState.selectedTags).filter((tag) => ensureArray(article.tags).includes(tag));
    const badge = matchedTypes[0] || article.type || "特集記事";
    const metaItems = [
      article.type ? `種別 ${article.type}` : "",
      article.publishedAt ? `公開 ${formatDateLabel(article.publishedAt)}` : "",
      article.tags?.[0] ? `タグ ${article.tags[0]}` : "",
    ].filter(Boolean);
    const relatedLinks = [];
    if (article.type) {
      relatedLinks.push({
        label: `${article.type}を見る`,
        href: createArticlesUrl({ selectedTypes: [article.type] }),
      });
    }
    ensureArray(article.tags)
      .slice(0, 2)
      .forEach((tag) => {
        relatedLinks.push({
          label: tag,
          href: createArticlesUrl({ selectedTags: [tag] }),
        });
      });

    return {
      badge,
      tone,
      visual,
      metaItems,
      matchLabels: unique([...matchedTypes, ...matchedTags, ...ensureArray(article.tags).slice(0, 2)]).slice(0, 4),
      relatedLinks: relatedLinks.slice(0, 3),
    };
  };

  const createArticleCard = ({ article, pageState = {}, articleApi }) => {
    const meta = getArticleCardMeta({ article, pageState });
    const reason = getArticleMatchReason(article, pageState, articleApi);
    const card = createElement("article", "plp-product-card ikea-product-card");
    const mediaLink = createElement("a", "ikea-product-card__mediaLink");
    const media = createElement("div", "ikea-product-card__media");
    const body = createElement("div", "ikea-product-card__body");
    const title = createElement("a", "ikea-product-card__title", article.title || "記事タイトル");
    const subtitle = createElement(
      "p",
      "ikea-product-card__subtitle",
      [article.type || "特集記事", article.publishedAt ? `公開 ${formatDateLabel(article.publishedAt)}` : ""]
        .filter(Boolean)
        .join("、")
    );
    const detail = createElement("p", "ikea-product-card__detail", article.summary || "");
    const metaRow = createElement("div", "ikea-product-card__metaRow");
    const swatchLabel = createElement("p", "ikea-product-card__swatchLabel", "近い切り口や次に読む記事");
    const affinityLinks = createAffinityLinks(meta.relatedLinks);
    const href = article.url || createArticlesUrl();

    mediaLink.href = href;
    title.href = href;

    if (meta.badge) {
      media.appendChild(createElement("span", "ikea-product-card__badge", meta.badge));
    }
    media.appendChild(createProductCardMediaVisual({ work: article, meta, card }));
    mediaLink.appendChild(media);

    meta.metaItems.forEach((item) => {
      metaRow.appendChild(createElement("span", "ikea-product-card__metaItem", item));
    });

    if (meta.matchLabels.length) body.appendChild(createMatchTagList(meta.matchLabels));
    body.append(title, subtitle, detail, metaRow);
    if (reason) body.appendChild(createElement("p", "ikea-product-card__reason", reason));
    if (meta.relatedLinks.length) body.append(swatchLabel, affinityLinks);
    card.append(mediaLink, body);
    return card;
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
    mountHomeSkeleton(root);

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

    const topCategoryRoot = root.querySelector("[data-home-top-categories]");
    const promoPrimaryRoot = root.querySelector("[data-home-promo-primary]");
    const promoSecondaryRoot = root.querySelector("[data-home-promo-secondary]");
    const popularRoot = root.querySelector("[data-home-popular-searches]");
    const savedRoot = root.querySelector("[data-home-saved-searches]");
    const builderRoot = root.querySelector("[data-home-builder-tools]");
    const tagGroupsRoot = root.querySelector("[data-home-tag-groups]");
    const collectionRoot = root.querySelector("[data-home-featured-collections]");
    const workRoot = root.querySelector("[data-home-featured-works]");

    if (topCategoryRoot) {
      topCategoryRoot.textContent = "";
      [
        { label: "まずここから", href: createFinderUrl({ collectionId: "start-here" }), visual: "storage" },
        { label: "TFあり", href: createFinderUrl({ includeTagIds: ["tf-present"] }), visual: "bed" },
        { label: "媒体から探す", href: createFinderUrl({ includeTagIds: ["format-comic"] }), visual: "desk" },
        { label: "苦手条件を外す", href: createFinderUrl({ includeTagIds: ["no-ntr"] }), visual: "table" },
        { label: "相棒感から入る", href: createFinderUrl({ includeTagIds: ["buddy-energy"] }), visual: "sofa" },
        { label: "ケモ率高め", href: createFinderUrl({ includeTagIds: ["dense-fur"] }), visual: "box" },
        { label: "探し方ガイド", href: "/articles/", visual: "bowl" },
      ].forEach((item) => {
        topCategoryRoot.appendChild(createTopCategoryCard(item));
      });
    }

    if (promoPrimaryRoot) {
      promoPrimaryRoot.textContent = "";
      promoPrimaryRoot.appendChild(createHomeSearchHero({ profile }));
    }

    if (promoSecondaryRoot) {
      promoSecondaryRoot.textContent = "";
      const startCollection = featuredCollections.find((collection) => collection.id === "tf-gateway") || featuredCollections[0];
      if (startCollection) {
        promoSecondaryRoot.appendChild(
          createPromoCard({
            kicker: "入口特集",
            title: startCollection.title,
            description: startCollection.description || startCollection.lead || "",
            href: `/collection/?slug=${encodeURIComponent(startCollection.slug)}`,
            tone: "image",
            visual: "frame",
          })
        );
      }
      promoSecondaryRoot.appendChild(
        createPromoCard({
          kicker: "Detailed search",
          title: "詳細条件ビルダー",
          description: "通常検索とは切り分けて、タグ・作者・除外条件をまとめて組み立てる独立導線です。",
          href: "/builder/",
          tone: "image",
          visual: "grid",
        })
      );
    }

    if (workRoot) {
      disposeMediaCyclesWithin(workRoot);
      workRoot.textContent = "";
      featuredWorks.forEach((work) => {
        workRoot.appendChild(
          createProductCard({
            work,
            uiState,
            reason: work.matchSummary || work.publicNote,
            tagMap,
          })
        );
      });
    }

    if (collectionRoot) {
      collectionRoot.textContent = "";
      featuredCollections.forEach((collection, index) => {
        collectionRoot.appendChild(
          createCategoryBannerCard({
            href: `/collection/?slug=${encodeURIComponent(collection.slug)}`,
            label: collection.title,
            description: collection.description || collection.lead || "",
            meta: `${collection.workObjects.length}件`,
            variant: ["storage", "table", "box", "frame"][index % 4],
          })
        );
      });
    }

    if (tagGroupsRoot) {
      tagGroupsRoot.textContent = "";
      groupedTags.slice(0, 5).forEach((group, index) => {
        tagGroupsRoot.appendChild(
          createCategoryBannerCard({
            href: createFinderUrl({ includeTagIds: group.tags.slice(0, 1).map((tag) => tag.id) }),
            label: group.label,
            description: group.description || "",
            meta: `${group.tags.length}条件`,
            variant: ["storage", "desk", "bed", "table", "bowl"][index % 5],
          })
        );
      });
    }

    if (popularRoot) {
      popularRoot.textContent = "";
      popularSearches.forEach((search) => {
        popularRoot.appendChild(
          createPillLink({
            label: search.label || getSearchSummaryLabel(search, tagMap),
            href: createFinderUrl(search),
            className: "ikea-pill",
          })
        );
      });
    }

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

    if (builderRoot) {
      builderRoot.textContent = "";
      builderRoot.append(
        createMiniLink({
          label: "詳細条件ビルダーを開く",
          href: "/builder/",
          meta: "タグ・作者・除外条件をまとめて組み立てます。",
          icon: "compare",
        }),
        recentWorks.length
          ? createMiniLink({
              label: `最近見た: ${recentWorks[0].title}`,
              href: `/work/?slug=${encodeURIComponent(recentWorks[0].slug)}`,
              meta: "前回の閲覧から条件を作り直せます。",
              icon: "recent",
            })
          : createMiniLink({
              label: "通常検索から始める",
              href: "/finder/",
              meta: "広い入口から見たい時はこちらです。",
              icon: "search",
            })
      );
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
  };

  const renderFinderPage = () => {
    const root = document.querySelector("[data-finder-ikea-page]");
    if (!root) return;
    mountFinderSkeleton(root);

    const queryInput = root.querySelector("[data-finder-query]");
    const creatorInput = root.querySelector("[data-finder-creator]");
    const sortSelect = root.querySelector("[data-finder-sort]");
    const sortNoteRoot = root.querySelector("[data-finder-sort-note]");
    const quickFiltersRoot = root.querySelector("[data-finder-quick-filters]");
    const resultsRoot = root.querySelector("[data-finder-results]");
    const activeRoot = root.querySelector("[data-finder-active]");
    const statusRoot = root.querySelector("[data-finder-status]");
    const headingRoot = root.querySelector("[data-finder-heading]");
    const summaryRoot = root.querySelector("[data-finder-summary-note]");
    const savedRoot = root.querySelector("[data-finder-saved-searches]");
    const presetsRoot = root.querySelector("[data-finder-presets]");
    const builderRoot = root.querySelector("[data-finder-builder-links]");
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
    const emptyCollectionsRoot = root.querySelector("[data-finder-empty-collections]");
    const emptyRecentRoot = root.querySelector("[data-finder-empty-recent]");
    const emptyHelpRoot = root.querySelector("[data-finder-empty-help]");
    const promotedRoot = root.querySelector("[data-finder-promoted]");
    const promotedWrap = root.querySelector("[data-finder-promoted-wrap]");
    const clearButton = root.querySelector("[data-finder-clear]");
    const clearInlineButton = root.querySelector("[data-finder-clear-inline]");
    const clearQueryButton = root.querySelector("[data-finder-clear-query]");
    const copyButton = root.querySelector("[data-finder-copy]");
    const saveButton = root.querySelector("[data-finder-save-search]");
    const compareClearButton = root.querySelector("[data-compare-clear]");
    const a11yLive = root.querySelector("[data-finder-a11y-live]");
    const tipsRoot = root.querySelector("[data-profile-search-tips]");
    const modeButtons = Array.from(root.querySelectorAll("[data-finder-mode]"));
    if (
      !sortSelect ||
      !resultsRoot ||
      !statusRoot
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
      characters: [createEmptyCharacterState()],
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
      pageState.characters = normalizeCharacters(readCharactersFromParams(params));
    };

    const syncControls = () => {
      if (queryInput) {
        queryInput.value = pageState.query;
        queryInput.placeholder = profile.searchPlaceholder || "作品・タグ・作者で検索";
      }
      if (creatorInput) {
        creatorInput.value = pageState.creatorQuery;
      }
      sortSelect.value = pageState.sort;
      if (sortNoteRoot) sortNoteRoot.textContent = getSortMeta(pageState.sort).description;
      modeButtons.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.finderMode === pageState.matchMode)
        );
      });
    };

    const getFinderStateSnapshot = (overrides = {}) => ({
      query: overrides.query ?? pageState.query,
      creatorQuery: overrides.creatorQuery ?? pageState.creatorQuery,
      includeTagIds: unique(overrides.includeTagIds ?? pageState.includeTagIds),
      excludeTagIds: unique(overrides.excludeTagIds ?? pageState.excludeTagIds),
      sort: overrides.sort ?? pageState.sort,
      collectionId: overrides.collectionId ?? pageState.collectionId,
      matchMode: overrides.matchMode ?? pageState.matchMode,
      characters: normalizeCharacters(overrides.characters ?? pageState.characters),
    });

    const filterFinderWorks = (overrides = {}) => {
      const searchState = getFinderStateSnapshot(overrides);
      const filtered = core.filterWorks({
        state,
        profileId: profile.id,
        query: searchState.query,
        creatorQuery: searchState.creatorQuery,
        includeTagIds: searchState.includeTagIds,
        excludeTagIds: searchState.excludeTagIds,
        sort: searchState.sort,
        collectionId: searchState.collectionId,
        matchMode: searchState.matchMode,
      });
      return filtered.filter((work) => matchesCharacters(work, searchState.characters));
    };

    const toggleCharacterFieldValue = (field, tagId) => {
      const character = normalizeCharacters(pageState.characters)[0];
      const nextCharacter = normalizeCharacterState(character);
      const key =
        field === "species"
          ? "speciesTagIds"
          : field === "body"
            ? "bodyTypeTagIds"
            : "ageFeelTagIds";
      nextCharacter[key] = ensureArray(nextCharacter[key]).includes(tagId)
        ? ensureArray(nextCharacter[key]).filter((value) => value !== tagId)
        : unique([...ensureArray(nextCharacter[key]), tagId]);
      pageState.characters = [nextCharacter];
    };

    const clearQuickFilters = () => {
      pageState.characters = [createEmptyCharacterState()];
      pageState.includeTagIds = [];
      pageState.excludeTagIds = [];
    };

    const getTagState = (tagId) => {
      if (pageState.includeTagIds.includes(tagId)) return "include";
      if (pageState.excludeTagIds.includes(tagId)) return "exclude";
      return "ignore";
    };

    const renderQuickFilters = () => {
      if (!quickFiltersRoot) return;
      quickFiltersRoot.textContent = "";

      const quickSummary = getQuickFilterSummary(pageState, tagMap);
      const character = normalizeCharacters(pageState.characters)[0];

      const wrapper = createElement("div", "ikea-quick-filters");
      const header = createElement("div", "ikea-quick-filters__header");
      const headingBlock = createElement("div", "ikea-quick-filters__heading");
      headingBlock.append(
        createElement("p", "ikea-quick-filters__eyebrow", "フィルター"),
        createElement("h2", "", "キャラクターフィルター")
      );
      header.append(
        headingBlock,
        createActionButton({
          label: "すべて解除",
          className: "ikea-quick-filters__clear",
          dataset: { quickFiltersClear: "true" },
        })
      );

      const summary = createElement("p", "ikea-quick-filters__summary", quickSummary);

      const characterCard = createElement("section", "ikea-quick-character-card");
      const characterHeader = createElement("div", "ikea-quick-character-card__header");
      characterHeader.appendChild(
        createElement("strong", "ikea-quick-character-card__title", "キャラ 1")
      );
      characterCard.appendChild(characterHeader);

      const speciesField = createElement("section", "ikea-quick-filter-field");
      const speciesLabelRow = createElement("div", "ikea-quick-filter-field__labelRow");
      const searchMoreLink = createElement("a", "ikea-quick-filter-field__link", "もっと探す");
      searchMoreLink.href = getQuickFilterBuilderHref(pageState);
      speciesLabelRow.append(
        createElement("strong", "ikea-quick-filter-field__label", "種族"),
        searchMoreLink
      );
      const speciesRow = createElement("div", "ikea-quick-filter-chipRow");
      QUICK_FILTER_SPECIES_TAG_IDS.forEach((tagId) => {
        const tag = tagMap.get(tagId);
        if (!tag) return;
        speciesRow.appendChild(
          createQuickFilterChip({
            label: tag.label,
            selected: character.speciesTagIds.includes(tagId),
            dataset: {
              quickCharacterField: "species",
              quickTagId: tagId,
            },
          })
        );
      });
      speciesField.append(speciesLabelRow, speciesRow);

      const bodyField = createElement("section", "ikea-quick-filter-field");
      bodyField.appendChild(createElement("strong", "ikea-quick-filter-field__label", "体型"));
      const bodyGrid = createElement("div", "ikea-quick-filter-bodyGrid");
      QUICK_FILTER_BODY_OPTIONS.forEach((option) => {
        bodyGrid.appendChild(
          createQuickFilterBodyButton({
            label: option.label,
            imageSrc: option.imageSrc,
            selected: character.bodyTypeTagIds.includes(option.tagId),
            dataset: {
              quickCharacterField: "body",
              quickTagId: option.tagId,
            },
          })
        );
      });
      bodyField.appendChild(bodyGrid);

      const ageField = createElement("section", "ikea-quick-filter-field");
      ageField.appendChild(createElement("strong", "ikea-quick-filter-field__label", "年齢"));
      const ageRow = createElement("div", "ikea-quick-filter-chipRow");
      QUICK_FILTER_AGE_OPTIONS.forEach((option) => {
        const tag = tagMap.get(option.tagId);
        if (!tag) return;
        ageRow.appendChild(
          createQuickFilterChip({
            label: option.label,
            selected: character.ageFeelTagIds.includes(option.tagId),
            dataset: {
              quickCharacterField: "age",
              quickTagId: option.tagId,
            },
          })
        );
      });
      ageField.appendChild(ageRow);

      characterCard.append(speciesField, bodyField, ageField);

      const includeField = createElement("section", "ikea-quick-filter-field");
      includeField.appendChild(createElement("strong", "ikea-quick-filter-field__label", "全体で含める"));
      const includeRow = createElement("div", "ikea-quick-filter-chipRow");
      QUICK_FILTER_GLOBAL_INCLUDE_TAG_IDS.forEach((tagId) => {
        const tag = tagMap.get(tagId);
        if (!tag) return;
        includeRow.appendChild(
          createQuickFilterChip({
            label: tag.label,
            selected: pageState.includeTagIds.includes(tagId),
            dataset: {
              quickGlobalState: "include",
              quickTagId: tagId,
            },
          })
        );
      });
      includeField.appendChild(includeRow);

      const excludeField = createElement("section", "ikea-quick-filter-field");
      excludeField.appendChild(createElement("strong", "ikea-quick-filter-field__label", "全体で除外"));
      const excludeRow = createElement("div", "ikea-quick-filter-chipRow");
      QUICK_FILTER_GLOBAL_EXCLUDE_TAG_IDS.forEach((tagId) => {
        const tag = tagMap.get(tagId);
        if (!tag) return;
        excludeRow.appendChild(
          createQuickFilterChip({
            label: tag.label,
            selected: pageState.excludeTagIds.includes(tagId),
            className: "plp-filter-chip--exclude",
            dataset: {
              quickGlobalState: "exclude",
              quickTagId: tagId,
            },
          })
        );
      });
      excludeField.appendChild(excludeRow);

      wrapper.append(header, summary, characterCard, includeField, excludeField);
      quickFiltersRoot.appendChild(wrapper);
    };

    const renderSavedSearches = () => {
      if (!savedRoot) return;
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

    const renderBuilderLinks = () => {
      if (!builderRoot) return;
      builderRoot.textContent = "";
      builderRoot.append(
        createMiniLink({
          label: "詳細条件ビルダーを開く",
          href: "/builder/",
          meta: "通常検索と分けて、細かい組み合わせを独立画面で作ります。",
          icon: "compare",
        }),
        createMiniLink({
          label: "この条件をビルダーへ持っていく",
          href: getQuickFilterBuilderHref(pageState),
          meta: "今のキーワードとタグを引き継いで編集できます。",
          icon: "save",
        })
      );
    };

    const renderPresets = () => {
      if (!presetsRoot) return;
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
      if (!popularRoot) return;
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
      if (!recentRoot) return;
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
      if (!tipsRoot) return;
      tipsRoot.textContent = "";
      ensureArray(profile.searchTips).forEach((tip) => {
        tipsRoot.appendChild(createElement("li", "", tip));
      });
    };

    const renderActiveChips = () => {
      if (!activeRoot) return;
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
      if (!activeRoot.childElementCount) {
        activeRoot.appendChild(createElement("span", "ikea-pill ikea-pill--muted", "条件なし"));
      }
    };

    const renderFilterGroups = () => {};

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

    const renderPromotedFilters = (filtered) => {
      if (!promotedRoot || !promotedWrap) return;
      promotedRoot.textContent = "";

      const pool = filtered.length
        ? filtered
        : filterFinderWorks({
            includeTagIds: [],
            excludeTagIds: pageState.excludeTagIds,
            sort: "recommended",
          });

      const buckets = new Map();
      pool.forEach((work) => {
        ensureArray(work.primaryTagObjects).forEach((tag) => {
          if (pageState.includeTagIds.includes(tag.id) || pageState.excludeTagIds.includes(tag.id)) return;
          const current = buckets.get(tag.id) || { tag, count: 0 };
          current.count += 1;
          buckets.set(tag.id, current);
        });
      });

      const promoted = Array.from(buckets.values())
        .sort((left, right) => right.count - left.count)
        .slice(0, 6);

      promotedWrap.hidden = promoted.length === 0;
      promoted.forEach(({ tag, count }) => {
        const button = createElement("button", "ikea-promoted-filter", `${tag.label} (${count})`);
        button.type = "button";
        button.dataset.promotedTagId = tag.id;
        promotedRoot.appendChild(button);
      });
    };

    const renderEmptyRecovery = () => {
      if (emptyCollectionsRoot) {
        emptyCollectionsRoot.textContent = "";
        core
          .getProfileCollections(state, profile.id, { publicOnly: true })
          .slice(0, 3)
          .forEach((collection) => {
            emptyCollectionsRoot.appendChild(
              createMiniLink({
                label: collection.title,
                href: createFinderUrl({ collectionId: collection.id }),
                meta: collection.lead || collection.description,
                icon: "collection",
              })
            );
          });
      }

      if (emptyRecentRoot) {
        emptyRecentRoot.textContent = "";
        const workMap = getDecoratedWorkMap(store.loadState(), profile.id);
        const recentWorks = ensureArray(store.loadState().ui?.recentWorkIds)
          .map((workId) => workMap.get(workId))
          .filter(Boolean)
          .slice(0, 3);
        if (!recentWorks.length) {
          emptyRecentRoot.appendChild(
            createMiniLink({
              label: "最近見た作品はまだありません",
              href: "/finder/",
              meta: "入口特集や人気条件から探し直せます。",
              icon: "recent",
            })
          );
        } else {
          recentWorks.forEach((work) => {
            emptyRecentRoot.appendChild(
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

      if (emptyHelpRoot) {
        emptyHelpRoot.textContent = "";
        emptyHelpRoot.append(
          createMiniLink({
            label: "通常検索へ戻る",
            href: "/finder/",
            meta: "条件を外して広い入口から再開します。",
            icon: "search",
          }),
          createMiniLink({
            label: "詳細条件ビルダーへ",
            href: getQuickFilterBuilderHref(pageState),
            meta: "今の条件を持ったまま細かく組み直せます。",
            icon: "compare",
          }),
          createMiniLink({
            label: "お問い合わせ",
            href: "/contact/",
            meta: "該当条件の追加要望を送れます。",
            icon: "save",
          })
        );
      }
    };

    const renderSuggestions = (filtered, uiState) => {
      if (!suggestionsRoot || !suggestionsWrap) return;
      disposeMediaCyclesWithin(suggestionsRoot);
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
            tagMap,
            pageState,
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
            createCategoryBannerCard({
              href: createFinderUrl({ collectionId: collection.id }),
              label: collection.title,
              description: collection.lead || collection.description,
              meta: `${relatedCount || collection.workObjects.length}件`,
              variant: ["storage", "table", "box", "frame"][relatedCount % 4],
            })
          );
        });
        return;
      }

      groupedTags.slice(0, 8).forEach((group) => {
        categoryRoot.appendChild(
          createCategoryBannerCard({
            href: createFinderUrl({ includeTagIds: group.tags.slice(0, 1).map((tag) => tag.id) }),
            label: group.label,
            description: group.description,
            meta: `${group.tags.length}条件`,
            variant: ["storage", "desk", "bed", "table", "bowl"][group.tags.length % 5],
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
          const resultCount = filterFinderWorks({
            includeTagIds: unique([...pageState.includeTagIds, tag.id]),
            excludeTagIds: pageState.excludeTagIds,
            sort: pageState.sort,
          }).length;
          if (!resultCount) return;
          pushItem({
            label: tag.label,
            href: createFinderUrl({
              query: pageState.query,
              creatorQuery: pageState.creatorQuery,
              characters: pageState.characters,
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
            const resultCount = filterFinderWorks({
              includeTagIds: pageState.includeTagIds,
              excludeTagIds: pageState.excludeTagIds,
              sort: pageState.sort,
              collectionId: collection.id,
            }).length;
            if (!resultCount) return;
            pushItem({
              label: collection.title,
              href: createFinderUrl({
                query: pageState.query,
                creatorQuery: pageState.creatorQuery,
                characters: pageState.characters,
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
        characters: normalizeCharacters(pageState.characters),
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
          characters: normalizeCharacters(pageState.characters),
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
      const filtered = filterFinderWorks();
      const displayedWorks = filtered.slice();
      if (filtered.length && filtered.length < 8) {
        core
          .suggestWorks({
            state,
            profileId: profile.id,
            query: pageState.query,
            includeTagIds: pageState.includeTagIds,
            excludeTagIds: pageState.excludeTagIds,
            limit: 8,
          })
          .forEach((work) => {
            if (displayedWorks.some((candidate) => candidate.id === work.id)) return;
            displayedWorks.push(work);
          });
      }

      const headingLabel = pageState.query
        ? `「${pageState.query}」の検索結果：${filtered.length}件`
        : collection
          ? `${collection.title}：${filtered.length}件`
          : `作品検索：${filtered.length}件`;

      if (headingRoot) {
        headingRoot.textContent = headingLabel;
      }
      if (summaryRoot) {
        summaryRoot.textContent =
          collection?.description || profile.heroDescription || "条件を組み合わせて作品を探します。";
      }
      if (a11yLive) {
        a11yLive.textContent = `${headingLabel} が見つかりました。`;
      }

      disposeMediaCyclesWithin(resultsRoot);
      resultsRoot.textContent = "";
      displayedWorks.forEach((work) => {
        resultsRoot.appendChild(
          createProductCard({
            work,
            uiState,
            reason:
              work.matchContext?.summary ||
              work.matchSummary ||
              work.publicNote ||
              (filtered.some((candidate) => candidate.id === work.id)
                ? ""
                : "近い条件の候補として表示"),
            tagMap,
            pageState,
          })
        );
      });

      const conditionFragments = [];
      if (pageState.query) conditionFragments.push(`検索語: ${pageState.query}`);
      if (pageState.creatorQuery) conditionFragments.push(`作者: ${pageState.creatorQuery}`);
      if (pageState.matchMode === "or") conditionFragments.push("いずれか一致");
      if (collection) conditionFragments.push(`特集: ${collection.title}`);
      const quickFilterSummary = getQuickFilterSummary(pageState, tagMap);
      conditionFragments.push(quickFilterSummary === "条件なし" ? "クイック条件なし" : quickFilterSummary);
      const nonQuickIncludeIds = pageState.includeTagIds.filter(
        (tagId) => !QUICK_FILTER_GLOBAL_INCLUDE_SET.has(tagId)
      );
      const nonQuickExcludeIds = pageState.excludeTagIds.filter(
        (tagId) => !QUICK_FILTER_GLOBAL_EXCLUDE_SET.has(tagId)
      );
      if (nonQuickIncludeIds.length) {
        conditionFragments.push(
          `追加条件: ${nonQuickIncludeIds.map((tagId) => tagMap.get(tagId)?.label || tagId).join(" / ")}`
        );
      }
      if (nonQuickExcludeIds.length) {
        conditionFragments.push(
          `追加除外: ${nonQuickExcludeIds.map((tagId) => tagMap.get(tagId)?.label || tagId).join(" / ")}`
        );
      }
      statusRoot.textContent = `${filtered.length}件 | ${getSortMeta(pageState.sort).label} | ${conditionFragments.join(" | ")}`;

      if (emptyRoot) emptyRoot.hidden = filtered.length !== 0;
      renderActiveChips();
      renderRescue();
      renderEmptyRecovery();
      renderCompare(uiState);
      renderRecentWorks();
      refreshCarousels(root);
      scheduleLog(filtered.length);
    };

    const applyAndRender = () => {
      state = store.loadState();
      syncControls();
      updateFinderUrl(pageState);
      renderQuickFilters();
      renderSavedSearches();
      renderBuilderLinks();
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
        const quickClearButton = event.target.closest("[data-quick-filters-clear]");
        if (quickClearButton) {
          clearQuickFilters();
          applyAndRender();
          return;
        }

        const quickCharacterButton = event.target.closest("[data-quick-character-field]");
        if (quickCharacterButton) {
          const field = quickCharacterButton.dataset.quickCharacterField;
          const tagId = quickCharacterButton.dataset.quickTagId || "";
          if (!field || !tagId) return;
          toggleCharacterFieldValue(field, tagId);
          applyAndRender();
          return;
        }

        const quickGlobalButton = event.target.closest("[data-quick-global-state]");
        if (quickGlobalButton) {
          const tagId = quickGlobalButton.dataset.quickTagId || "";
          const nextState = quickGlobalButton.dataset.quickGlobalState || "";
          if (!tagId) return;
          pageState.includeTagIds = pageState.includeTagIds.filter((value) => value !== tagId);
          pageState.excludeTagIds = pageState.excludeTagIds.filter((value) => value !== tagId);
          if (nextState === "include" && !quickGlobalButton.matches('[aria-pressed="true"]')) {
            pageState.includeTagIds = unique([...pageState.includeTagIds, tagId]);
          }
          if (nextState === "exclude" && !quickGlobalButton.matches('[aria-pressed="true"]')) {
            pageState.excludeTagIds = unique([...pageState.excludeTagIds, tagId]);
          }
          applyAndRender();
          return;
        }

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

        const promotedButton = event.target.closest("[data-promoted-tag-id]");
        if (promotedButton) {
          const tagId = promotedButton.dataset.promotedTagId || "";
          if (!tagId) return;
          pageState.excludeTagIds = pageState.excludeTagIds.filter((value) => value !== tagId);
          pageState.includeTagIds = unique([...pageState.includeTagIds, tagId]);
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

    queryInput?.addEventListener("input", () => {
      pageState.query = queryInput.value.trim();
      applyAndRender();
    });

    creatorInput?.addEventListener("input", () => {
      pageState.creatorQuery = creatorInput.value.trim();
      applyAndRender();
    });

    sortSelect.addEventListener("change", () => {
      pageState.sort = sortSelect.value;
      applyAndRender();
    });

    clearQueryButton?.addEventListener("click", () => {
      pageState.query = "";
      if (queryInput) {
        queryInput.value = "";
      }
      applyAndRender();
      queryInput?.focus();
    });

    clearButton?.addEventListener("click", () => {
      pageState.query = "";
      pageState.creatorQuery = "";
      pageState.includeTagIds = [];
      pageState.excludeTagIds = [];
      pageState.sort = "recommended";
      pageState.collectionId = "";
      pageState.matchMode = "and";
      pageState.characters = [createEmptyCharacterState()];
      applyAndRender();
    });

    clearInlineButton?.addEventListener("click", () => {
      pageState.query = "";
      pageState.creatorQuery = "";
      pageState.includeTagIds = [];
      pageState.excludeTagIds = [];
      pageState.sort = "recommended";
      pageState.collectionId = "";
      pageState.matchMode = "and";
      pageState.characters = [createEmptyCharacterState()];
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
        characters: normalizeCharacters(pageState.characters),
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

  const renderArticlesPage = () => {
    const root = document.querySelector("[data-articles-ikea-page]");
    if (!root) return;

    const articleApi = articleSearch || globalThis.ArticleSearch;
    const sourceArticles = ensureArray(Array.isArray(articleIndex) ? articleIndex : globalThis.ARTICLE_INDEX);
    if (!articleApi || !sourceArticles.length) return;

    mountFinderSkeleton(root);

    const quickFiltersRoot = root.querySelector("[data-finder-quick-filters]");
    const sortSelect = root.querySelector("[data-finder-sort]");
    const sortNoteRoot = root.querySelector("[data-finder-sort-note]");
    const resultsRoot = root.querySelector("[data-finder-results]");
    const statusRoot = root.querySelector("[data-finder-status]");
    const emptyRoot = root.querySelector("[data-finder-empty]");
    const emptyCollectionsRoot = root.querySelector("[data-finder-empty-collections]");
    const emptyRecentRoot = root.querySelector("[data-finder-empty-recent]");
    const emptyHelpRoot = root.querySelector("[data-finder-empty-help]");
    const promotedRoot = root.querySelector("[data-finder-promoted]");
    const promotedWrap = root.querySelector("[data-finder-promoted-wrap]");
    const suggestionsRoot = root.querySelector("[data-finder-suggestions]");
    const suggestionsWrap = root.querySelector("[data-finder-suggestions-wrap]");
    const categoryRoot = root.querySelector("[data-finder-categories]");
    const relatedRoot = root.querySelector("[data-finder-related-searches]");
    const compareRoot = root.querySelector("[data-finder-compare]");
    const categorySection = categoryRoot?.closest(".ikea-search-section");
    const relatedSection = relatedRoot?.closest(".ikea-search-section");
    const toolbarHeading = root.querySelector(".ikea-search-results__toolbar h2");
    const emptyTitle = emptyRoot?.querySelector("h2");
    const emptyDescription = emptyRoot?.querySelector("p");
    const emptyColumnHeadings = emptyRoot?.querySelectorAll(".ikea-search-empty-grid__column h3") || [];
    let paginationRoot = root.querySelector("[data-article-pagination]");
    if (!paginationRoot && resultsRoot) {
      paginationRoot = createElement("nav", "ikea-article-pagination");
      paginationRoot.dataset.articlePagination = "true";
      paginationRoot.setAttribute("aria-label", "記事ページ送り");
      resultsRoot.insertAdjacentElement("afterend", paginationRoot);
    }

    if (!quickFiltersRoot || !sortSelect || !resultsRoot || !statusRoot) {
      return;
    }

    const allArticles = articleApi.decorateArticles ? articleApi.decorateArticles(sourceArticles) : sourceArticles.slice();
    const filterOptions = articleApi.collectFilterOptions
      ? articleApi.collectFilterOptions(sourceArticles)
      : { types: [], tags: [] };
    const categoryVariants = ["storage", "table", "box", "frame", "desk"];
    const pageState = {
      query: "",
      selectedTypes: [],
      selectedTags: [],
      sort: "latest",
      mode: "and",
      page: 1,
    };

    const hasActiveFilters = () =>
      Boolean(pageState.query || pageState.selectedTypes.length || pageState.selectedTags.length);

    const readUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      pageState.query = params.get("q") || "";
      pageState.selectedTypes = unique(params.getAll("type"));
      pageState.selectedTags = unique(params.getAll("tag"));
      pageState.sort = ARTICLE_SORT_META[params.get("sort") || ""] ? params.get("sort") : "latest";
      pageState.mode = params.get("mode") === "or" ? "or" : "and";
      pageState.page = Math.max(Number.parseInt(params.get("page") || "1", 10) || 1, 1);
    };

    const getArticleStateSnapshot = (overrides = {}) => ({
      query: overrides.query ?? pageState.query,
      selectedTypes: unique(overrides.selectedTypes ?? pageState.selectedTypes),
      selectedTags: unique(overrides.selectedTags ?? pageState.selectedTags),
      sort: overrides.sort ?? pageState.sort,
      mode: overrides.mode ?? pageState.mode,
      page: Math.max(overrides.page ?? pageState.page, 1),
    });

    const filterAndSortArticles = (overrides = {}) => {
      const searchState = getArticleStateSnapshot(overrides);
      const filtered = articleApi.filterArticles
        ? articleApi.filterArticles({
            articles: allArticles,
            query: searchState.query,
            mode: searchState.mode,
            selectedTypes: searchState.selectedTypes,
            selectedTags: searchState.selectedTags,
          })
        : allArticles.slice();
      return sortArticles(filtered, searchState.sort);
    };

    const applyShellCopy = () => {
      if (toolbarHeading) toolbarHeading.textContent = "記事リスト";
      if (emptyTitle) emptyTitle.textContent = "一致する記事が見つかりません";
      if (emptyDescription) {
        emptyDescription.textContent = "条件を緩めるか、下の入口から近い切り口の記事を探してください。";
      }
      if (emptyColumnHeadings[0]) emptyColumnHeadings[0].textContent = "記事タイプ";
      if (emptyColumnHeadings[1]) emptyColumnHeadings[1].textContent = "最近の特集";
      if (emptyColumnHeadings[2]) emptyColumnHeadings[2].textContent = "助けが必要なとき";
      if (compareRoot) compareRoot.hidden = true;
      promotedWrap?.remove();
      suggestionsWrap?.remove();
      categorySection?.remove();
      relatedSection?.remove();
    };

    const syncSortControl = () => {
      sortSelect.textContent = "";
      Object.entries(ARTICLE_SORT_META).forEach(([value, meta]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = meta.label;
        sortSelect.appendChild(option);
      });
      sortSelect.value = pageState.sort;
      if (sortNoteRoot) {
        sortNoteRoot.textContent = getArticleSortMeta(pageState.sort).description;
      }
    };

    const renderQuickFilters = () => {
      quickFiltersRoot.textContent = "";

      const wrapper = createElement("div", "ikea-quick-filters");
      const header = createElement("div", "ikea-quick-filters__header");
      const headingBlock = createElement("div", "ikea-quick-filters__heading");
      headingBlock.append(
        createElement("p", "ikea-quick-filters__eyebrow", "Quick filters"),
        createElement("h2", "", "記事を絞る")
      );
      header.append(
        headingBlock,
        createActionButton({
          label: "すべて解除",
          className: "ikea-quick-filters__clear",
          dataset: { articleClear: "true" },
        })
      );

      const summary = createElement("p", "ikea-quick-filters__summary", getArticleSearchSummaryLabel(pageState));

      const queryField = createElement("label", "ikea-search-sidebar__field");
      const queryLabel = createElement("span", "", "記事名・タグ");
      const queryInput = document.createElement("input");
      queryInput.type = "search";
      queryInput.autocomplete = "off";
      queryInput.placeholder = "例: 比較 / CTA / 構成";
      queryInput.value = pageState.query;
      queryInput.dataset.articleQuery = "true";
      queryField.append(queryLabel, queryInput);

      const typeField = createElement("section", "ikea-quick-filter-field");
      typeField.appendChild(createElement("strong", "ikea-quick-filter-field__label", "記事タイプ"));
      const typeRow = createElement("div", "ikea-quick-filter-chipRow");
      filterOptions.types.forEach((typeOption) => {
        typeRow.appendChild(
          createQuickFilterChip({
            label: `${typeOption.value} (${typeOption.count})`,
            selected: pageState.selectedTypes.includes(typeOption.value),
            dataset: {
              articleType: typeOption.value,
            },
          })
        );
      });
      typeField.appendChild(typeRow);

      const tagField = createElement("section", "ikea-quick-filter-field");
      tagField.appendChild(createElement("strong", "ikea-quick-filter-field__label", "タグ"));
      const tagRow = createElement("div", "ikea-quick-filter-chipRow");
      filterOptions.tags.slice(0, 14).forEach((tagOption) => {
        tagRow.appendChild(
          createQuickFilterChip({
            label: `${tagOption.value} (${tagOption.count})`,
            selected: pageState.selectedTags.includes(tagOption.value),
            dataset: {
              articleTag: tagOption.value,
            },
          })
        );
      });
      tagField.appendChild(tagRow);

      wrapper.append(header, summary, queryField, typeField, tagField);
      quickFiltersRoot.appendChild(wrapper);
    };

    const renderPromotedFilters = (filtered) => {
      if (!promotedRoot || !promotedWrap) return;
      promotedWrap.hidden = true;
      promotedRoot.textContent = "";
    };

    const renderSuggestions = (filtered) => {
      if (!suggestionsRoot || !suggestionsWrap) return;
      suggestionsWrap.hidden = true;
      disposeMediaCyclesWithin(suggestionsRoot);
      suggestionsRoot.textContent = "";
    };

    const renderEmptyRecovery = () => {
      if (!emptyRoot) return;
      const filtered = filterAndSortArticles();
      emptyRoot.hidden = filtered.length !== 0;
      if (filtered.length) return;

      if (emptyCollectionsRoot) {
        emptyCollectionsRoot.textContent = "";
        filterOptions.types.forEach((typeOption) => {
          emptyCollectionsRoot.appendChild(
            createMiniLink({
              label: typeOption.value,
              href: createArticlesUrl({ selectedTypes: [typeOption.value], sort: pageState.sort }),
              meta: `${typeOption.count}件`,
              icon: "collection",
            })
          );
        });
      }

      if (emptyRecentRoot) {
        emptyRecentRoot.textContent = "";
        sortArticles(allArticles, "latest")
          .slice(0, 4)
          .forEach((article) => {
            emptyRecentRoot.appendChild(
              createMiniLink({
                label: article.title,
                href: article.url,
                meta: [article.type, article.publishedAt ? `公開 ${formatDateLabel(article.publishedAt)}` : ""]
                  .filter(Boolean)
                  .join(" / "),
                icon: "work",
              })
            );
          });
      }

      if (emptyHelpRoot) {
        emptyHelpRoot.textContent = "";
        emptyHelpRoot.append(
          createMiniLink({
            label: "記事一覧へ戻る",
            href: createArticlesUrl({ sort: pageState.sort }),
            meta: "絞り込みを外して記事一覧から再開します。",
            icon: "search",
          }),
          createMiniLink({
            label: "作品を探す",
            href: "/finder/",
            meta: "記事ではなく作品一覧から探したい時の入口です。",
            icon: "collection",
          }),
          createMiniLink({
            label: "お問い合わせ",
            href: "/contact/",
            meta: "追加してほしいテーマや記事案を送れます。",
            icon: "save",
          })
        );
      }
    };

    const renderCategories = () => {
      if (!categoryRoot || !categorySection) return;
      categorySection.hidden = true;
      categoryRoot.textContent = "";
    };

    const renderRelatedSearches = (filtered) => {
      if (!relatedRoot || !relatedSection) return;
      relatedSection.hidden = true;
      relatedRoot.textContent = "";
    };

    const createArticlePaginationButton = ({
      label,
      page,
      disabled = false,
      current = false,
    }) => {
      const button = createElement(
        "button",
        `ikea-article-pagination__button${current ? " is-current" : ""}`,
        label
      );
      button.type = "button";
      button.disabled = disabled;
      if (!disabled) {
        button.dataset.articlePageTarget = String(page);
      }
      if (current) button.setAttribute("aria-current", "page");
      return button;
    };

    const renderPagination = (totalCount) => {
      if (!paginationRoot) return;
      paginationRoot.textContent = "";
      if (!totalCount) {
        paginationRoot.hidden = true;
        return;
      }

      const totalPages = Math.max(Math.ceil(totalCount / ARTICLE_RESULTS_PER_PAGE), 1);
      const currentPage = Math.min(Math.max(pageState.page, 1), totalPages);
      const startIndex = (currentPage - 1) * ARTICLE_RESULTS_PER_PAGE + 1;
      const endIndex = Math.min(currentPage * ARTICLE_RESULTS_PER_PAGE, totalCount);
      const summary = createElement(
        "p",
        "ikea-article-pagination__summary",
        `${totalCount}件中 ${startIndex}-${endIndex}件を表示`
      );
      const controls = createElement("div", "ikea-article-pagination__controls");

      controls.appendChild(
        createArticlePaginationButton({
          label: "前へ",
          page: currentPage - 1,
          disabled: currentPage <= 1,
        })
      );

      Array.from({ length: totalPages }, (_, index) => index + 1).forEach((pageNumber) => {
        controls.appendChild(
          createArticlePaginationButton({
            label: String(pageNumber),
            page: pageNumber,
            current: pageNumber === currentPage,
          })
        );
      });

      controls.appendChild(
        createArticlePaginationButton({
          label: "次へ",
          page: currentPage + 1,
          disabled: currentPage >= totalPages,
        })
      );

      paginationRoot.hidden = false;
      paginationRoot.append(summary, controls);
    };

    const renderResults = () => {
      const filtered = filterAndSortArticles();
      const totalPages = Math.max(Math.ceil(filtered.length / ARTICLE_RESULTS_PER_PAGE), 1);
      pageState.page = Math.min(Math.max(pageState.page, 1), totalPages);
      const pageItems = filtered.slice(
        (pageState.page - 1) * ARTICLE_RESULTS_PER_PAGE,
        pageState.page * ARTICLE_RESULTS_PER_PAGE
      );
      const headingLabel = pageState.query
        ? `「${pageState.query}」の記事：${filtered.length}件`
        : pageState.selectedTypes.length === 1 && !pageState.selectedTags.length
          ? `${pageState.selectedTypes[0]}：${filtered.length}件`
          : `特集記事：${filtered.length}件`;

      statusRoot.textContent = `${filtered.length}件 | ${getArticleSortMeta(pageState.sort).label} | ${pageState.page}/${totalPages}ページ | ${getArticleSearchSummaryLabel(pageState)}`;

      disposeMediaCyclesWithin(resultsRoot);
      resultsRoot.textContent = "";
      pageItems.forEach((article) => {
        resultsRoot.appendChild(createArticleCard({ article, pageState, articleApi }));
      });

      if (toolbarHeading) {
        toolbarHeading.textContent = headingLabel;
      }

      renderPromotedFilters(filtered);
      renderSuggestions(filtered);
      renderCategories();
      renderRelatedSearches(filtered);
      renderEmptyRecovery();
      renderPagination(filtered.length);
      refreshCarousels(root);
    };

    const applyAndRender = () => {
      applyShellCopy();
      syncSortControl();
      renderQuickFilters();
      renderResults();
      updateArticlesUrl(pageState);
    };

    readUrlState();
    applyAndRender();

    if (!root.dataset.articlesBound) {
      root.addEventListener("click", (event) => {
        const clearButton = event.target.closest("[data-article-clear]");
        if (clearButton) {
          pageState.query = "";
          pageState.selectedTypes = [];
          pageState.selectedTags = [];
          pageState.page = 1;
          applyAndRender();
          return;
        }

        const typeButton = event.target.closest("[data-article-type]");
        if (typeButton) {
          const value = typeButton.dataset.articleType || "";
          if (!value) return;
          pageState.selectedTypes = pageState.selectedTypes.includes(value)
            ? pageState.selectedTypes.filter((type) => type !== value)
            : unique([...pageState.selectedTypes, value]);
          pageState.page = 1;
          applyAndRender();
          return;
        }

        const tagButton = event.target.closest("[data-article-tag]");
        if (tagButton) {
          const value = tagButton.dataset.articleTag || "";
          if (!value) return;
          pageState.selectedTags = pageState.selectedTags.includes(value)
            ? pageState.selectedTags.filter((tag) => tag !== value)
            : unique([...pageState.selectedTags, value]);
          pageState.page = 1;
          applyAndRender();
          return;
        }

        const pageButton = event.target.closest("[data-article-page-target]");
        if (pageButton) {
          const nextPage = Math.max(Number.parseInt(pageButton.dataset.articlePageTarget || "1", 10) || 1, 1);
          pageState.page = nextPage;
          applyAndRender();
          root.querySelector(".ikea-search-results__toolbar")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          return;
        }
      });

      root.addEventListener("input", (event) => {
        const queryInput = event.target.closest("[data-article-query]");
        if (!queryInput) return;
        pageState.query = queryInput.value.trim();
        pageState.page = 1;
        applyAndRender();
      });

      sortSelect.addEventListener("change", () => {
        pageState.sort = ARTICLE_SORT_META[sortSelect.value] ? sortSelect.value : "latest";
        pageState.page = 1;
        applyAndRender();
      });

      root.dataset.articlesBound = "true";
    }
  };

  const renderBuilderPage = () => {
    const root = document.querySelector("[data-builder-ikea-page]");
    if (!root) return;
    mountBuilderSkeleton(root);

    const queryInput = root.querySelector("[data-builder-query]");
    const creatorInput = root.querySelector("[data-builder-creator]");
    const collectionSelect = root.querySelector("[data-builder-collection]");
    const includeRoot = root.querySelector("[data-builder-include-groups]");
    const excludeRoot = root.querySelector("[data-builder-exclude-groups]");
    const activeRoot = root.querySelector("[data-builder-active]");
    const previewTitleRoot = root.querySelector("[data-builder-preview-title]");
    const previewSummaryRoot = root.querySelector("[data-builder-preview-summary]");
    const previewWorksRoot = root.querySelector("[data-builder-preview-works]");
    const openResultsLink = root.querySelector("[data-builder-open-results]");
    const saveButton = root.querySelector("[data-builder-save-search]");
    const copyButton = root.querySelector("[data-builder-copy-link]");
    const clearButton = root.querySelector("[data-builder-clear]");
    const modeButtons = Array.from(root.querySelectorAll("[data-builder-mode]"));

    if (
      !queryInput ||
      !creatorInput ||
      !collectionSelect ||
      !includeRoot ||
      !excludeRoot ||
      !activeRoot ||
      !previewTitleRoot ||
      !previewSummaryRoot ||
      !previewWorksRoot ||
      !openResultsLink
    ) {
      return;
    }

    let state = store.loadState();
    const profile = core.getActiveProfile(state);
    if (!profile) return;
    const visibleTags = core.getVisibleTags(state, profile.id);
    const groupedTags = core.groupTags(visibleTags, state.tagGroups);
    const tagMap = core.getTagMap(state);
    const collections = core.getProfileCollections(state, profile.id, { publicOnly: true });

    const pageState = {
      query: "",
      creatorQuery: "",
      includeTagIds: [],
      excludeTagIds: [],
      collectionId: "",
      matchMode: "and",
      sort: "recommended",
    };

    const readUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      pageState.query = params.get("q") || "";
      pageState.creatorQuery = params.get("creator") || "";
      pageState.collectionId = params.get("collection") || "";
      pageState.matchMode = params.get("mode") === "or" ? "or" : "and";
      pageState.includeTagIds = unique(params.getAll("include"));
      pageState.excludeTagIds = unique(params.getAll("exclude"));
    };

    const updateBuilderUrl = () => {
      const nextUrl = new URL(createFinderUrl(pageState), window.location.origin);
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${nextUrl.search}${window.location.hash}`
      );
    };

    const syncControls = () => {
      queryInput.value = pageState.query;
      creatorInput.value = pageState.creatorQuery;
      collectionSelect.textContent = "";
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "指定なし";
      collectionSelect.appendChild(defaultOption);
      collections.forEach((collection) => {
        const option = document.createElement("option");
        option.value = collection.id;
        option.textContent = collection.title;
        collectionSelect.appendChild(option);
      });
      collectionSelect.value = pageState.collectionId;
      modeButtons.forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.builderMode === pageState.matchMode)
        );
      });
    };

    const renderBuilderGroupSet = (targetRoot, kind) => {
      targetRoot.textContent = "";
      groupedTags.forEach((group) => {
        const section = createElement("section", "ikea-builder-group");
        const title = createElement("div", "ikea-builder-group__title");
        const chipRow = createElement("div", "ikea-builder-group__chips");
        title.append(
          createElement("strong", "", FILTER_LABEL_OVERRIDES[group.id] || group.label),
          createElement("span", "ikea-builder-group__description", group.description || "")
        );
        group.tags.forEach((tag) => {
          const chip = createElement(
            "button",
            `ikea-builder-chip${
              (kind === "include" ? pageState.includeTagIds : pageState.excludeTagIds).includes(tag.id)
                ? " is-active"
                : ""
            }`,
            tag.label
          );
          chip.type = "button";
          chip.dataset.builderTagId = tag.id;
          chip.dataset.builderKind = kind;
          chip.setAttribute(
            "aria-pressed",
            String(
              (kind === "include" ? pageState.includeTagIds : pageState.excludeTagIds).includes(tag.id)
            )
          );
          chipRow.appendChild(chip);
        });
        section.append(title, chipRow);
        targetRoot.appendChild(section);
      });
    };

    const renderActiveSummary = () => {
      activeRoot.textContent = "";
      const items = [];
      if (pageState.query) items.push(`作品: ${pageState.query}`);
      if (pageState.creatorQuery) items.push(`作者: ${pageState.creatorQuery}`);
      if (pageState.collectionId) {
        const collection = core.getCollection(state, pageState.collectionId);
        if (collection) items.push(`特集: ${collection.title}`);
      }
      if (pageState.matchMode === "or") items.push("いずれか一致");
      pageState.includeTagIds.forEach((tagId) => {
        items.push(`含める: ${tagMap.get(tagId)?.label || tagId}`);
      });
      pageState.excludeTagIds.forEach((tagId) => {
        items.push(`除外: ${tagMap.get(tagId)?.label || tagId}`);
      });
      if (!items.length) items.push("条件なし");
      items.forEach((item) => {
        activeRoot.appendChild(createElement("span", "ikea-pill", item));
      });
    };

    const renderPreview = () => {
      state = store.loadState();
      const filtered = core.filterWorks({
        state,
        profileId: profile.id,
        query: pageState.query,
        creatorQuery: pageState.creatorQuery,
        includeTagIds: pageState.includeTagIds,
        excludeTagIds: pageState.excludeTagIds,
        collectionId: pageState.collectionId,
        matchMode: pageState.matchMode,
        sort: "recommended",
      });
      previewTitleRoot.textContent = `${filtered.length}件の候補`;
      previewSummaryRoot.textContent =
        filtered.length > 0
          ? "ここでは候補数と代表作品だけを確認し、一覧へ渡して比較や再検索に進みます。"
          : "条件が厳しすぎる可能性があります。タグを減らすか、いずれか一致へ切り替えてください。";
      previewWorksRoot.textContent = "";
      if (!filtered.length) {
        previewWorksRoot.appendChild(
          createMiniLink({
            label: "通常検索に戻る",
            href: "/finder/",
            meta: "広い入口に戻して探し直せます。",
            icon: "search",
          })
        );
      } else {
        filtered.slice(0, 4).forEach((work) => {
          previewWorksRoot.appendChild(
            createMiniLink({
              label: work.title,
              href: `/work/?slug=${encodeURIComponent(work.slug)}`,
              meta: [work.format, work.creator].filter(Boolean).join(" / "),
              icon: "work",
            })
          );
        });
      }
      openResultsLink.href = createFinderUrl(pageState);
      renderActiveSummary();
    };

    const applyAndRender = () => {
      syncControls();
      updateBuilderUrl();
      renderBuilderGroupSet(includeRoot, "include");
      renderBuilderGroupSet(excludeRoot, "exclude");
      renderPreview();
    };

    readUrlState();
    applyAndRender();

    if (!root.dataset.builderBound) {
      root.addEventListener("click", (event) => {
        const modeButton = event.target.closest("[data-builder-mode]");
        if (modeButton) {
          pageState.matchMode = modeButton.dataset.builderMode === "or" ? "or" : "and";
          applyAndRender();
          return;
        }

        const tagButton = event.target.closest("[data-builder-tag-id]");
        if (tagButton) {
          const tagId = tagButton.dataset.builderTagId || "";
          const kind = tagButton.dataset.builderKind || "include";
          pageState.includeTagIds = pageState.includeTagIds.filter((value) => value !== tagId);
          pageState.excludeTagIds = pageState.excludeTagIds.filter((value) => value !== tagId);
          if (kind === "include") {
            pageState.includeTagIds = unique([...pageState.includeTagIds, tagId]);
          }
          if (kind === "exclude") {
            pageState.excludeTagIds = unique([...pageState.excludeTagIds, tagId]);
          }
          applyAndRender();
          return;
        }
      });
      root.dataset.builderBound = "true";
    }

    queryInput.addEventListener("input", () => {
      pageState.query = queryInput.value.trim();
      applyAndRender();
    });

    creatorInput.addEventListener("input", () => {
      pageState.creatorQuery = creatorInput.value.trim();
      applyAndRender();
    });

    collectionSelect.addEventListener("change", () => {
      pageState.collectionId = collectionSelect.value;
      applyAndRender();
    });

    clearButton?.addEventListener("click", () => {
      pageState.query = "";
      pageState.creatorQuery = "";
      pageState.includeTagIds = [];
      pageState.excludeTagIds = [];
      pageState.collectionId = "";
      pageState.matchMode = "and";
      applyAndRender();
    });

    saveButton?.addEventListener("click", () => {
      const defaultLabel = getSearchSummaryLabel(pageState, tagMap);
      const label = window.prompt(
        "保存する検索名",
        defaultLabel === "条件なし" ? "詳細条件ビルダー" : defaultLabel
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
        sort: "recommended",
      });
      renderPreview();
    });

    copyButton?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        copyButton.textContent = "コピー済み";
        window.setTimeout(() => {
          copyButton.textContent = "共有URLをコピー";
        }, 1200);
      } catch (error) {
        copyButton.textContent = "コピー失敗";
        window.setTimeout(() => {
          copyButton.textContent = "共有URLをコピー";
        }, 1200);
      }
    });
  };

  const init = () => {
    renderHomePage();
    renderFinderPage();
    renderArticlesPage();
    renderBuilderPage();
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
