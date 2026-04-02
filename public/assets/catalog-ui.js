(function (root, factory) {
  root.CatalogFinderUi = factory(root.FinderStore, root.FinderCore, root.ArticleSearch, root.ARTICLE_INDEX);
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
  const FINDER_RESULTS_PER_PAGE = 12;

  const ensureArray = (value) => core.ensureArray(value);
  const unique = (value) => core.unique(value);
  const toWorkPath = (workOrSlug) => core.getWorkPath(workOrSlug);
  const toCollectionPath = (collectionOrSlug) => core.getCollectionPath(collectionOrSlug);

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

    if (kind === "heart") {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute(
        "d",
        "M12.001 20.727l-.752-.431C5.4 16.94 2 13.863 2 9.992 2 6.915 4.42 4.5 7.5 4.5c1.74 0 3.41.81 4.5 2.09A5.96 5.96 0 0 1 16.5 4.5C19.58 4.5 22 6.915 22 9.992c0 3.87-3.4 6.947-9.249 10.304l-.75.43z"
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.8");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      svg.appendChild(path);
      return svg;
    }

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
    fetish: "プレイ・フェチ",
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

  const QUICK_FILTER_SPECIES_TAG_ORDER = [
    "species-wolf",
    "species-dog",
    "species-fox",
    "species-cat",
    "species-bear",
    "species-tiger",
    "species-lion",
    "species-bull",
    "species-boar",
    "species-pig",
  ];

  const QUICK_FILTER_BODY_OPTIONS = [
    {
      tagId: "body-normal",
      label: "普通体型",
      imageSrc: "/assets/quick-filters/body-normal.png",
    },
    {
      tagIds: ["body-muscular", "body-beefy"],
      label: "筋肉・ガチムチ",
      imageSrc: "/assets/quick-filters/body-muscular.png",
    },
    {
      tagId: "body-fat",
      label: "デブ",
      imageSrc: "/assets/quick-filters/body-fat.png",
    },
  ];

  const QUICK_FILTER_AGE_TAG_ORDER = ["age-young", "age-adult", "age-older"];
  const getQuickFilterOptionTagIds = (option) =>
    ensureArray(option?.tagIds).length
      ? ensureArray(option.tagIds)
      : option?.tagId
        ? [option.tagId]
        : [];
  const QUICK_FILTER_TAG_PREVIEW_LIMIT = 10;
  const HOVER_GALLERY_INTERVAL_MS = 3000;

  const sortTagsByPreferredOrder = (tags, preferredIds = []) => {
    const orderMap = new Map(preferredIds.map((tagId, index) => [tagId, index]));
    return ensureArray(tags)
      .slice()
      .sort((left, right) => {
        const leftOrder = orderMap.has(left.id) ? orderMap.get(left.id) : Number.MAX_SAFE_INTEGER;
        const rightOrder = orderMap.has(right.id) ? orderMap.get(right.id) : Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.label.localeCompare(right.label, "ja");
      });
  };

  const getQuickFilterTagsByGroup = (visibleTags, groupId, preferredIds = []) =>
    sortTagsByPreferredOrder(
      ensureArray(visibleTags).filter((tag) => tag.groupId === groupId),
      preferredIds
    );

  const getAvailableQuickFilterBodyOptions = (visibleTagIdSet) =>
    QUICK_FILTER_BODY_OPTIONS.map((option) => ({
      ...option,
      availableTagIds: getQuickFilterOptionTagIds(option).filter((tagId) => visibleTagIdSet.has(tagId)),
    })).filter((option) => option.availableTagIds.length);

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
    if (tagId === "body-muscular" || tagId === "body-beefy") return "筋肉・ガチムチ";
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
      `catalog-artwork catalog-artwork--${visual}${compact ? " catalog-artwork--compact" : ""}`
    );
    art.dataset.tone = tone;
    art.dataset.seed = String(hashString(seed) % 7);
    Array.from({ length: visual === "wide" ? 6 : 5 }).forEach(() => {
      art.appendChild(createElement("span", "catalog-artwork__piece"));
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

  const collectDistinctImageUrls = (sources = []) => {
    const order = [];
    const preferredByKey = new Map();
    ensureArray(sources)
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

  const getGeneratedPosterUrl = (work) =>
    work?.slug ? `/assets/generated/work-posters/${encodeURIComponent(work.slug)}.svg` : "";

  const getSeedPublishedWorkBySlug = (slug = "") =>
    ensureArray(globalThis.FINDER_SEED?.works).find((work) => work?.status === "published" && work?.slug === slug) || null;

  const resolveCardImageUrls = (work) => {
    const directImages = collectDistinctImageUrls([
      work.primaryImage?.url,
      work.hoverImageUrl,
      ...ensureArray(work.galleryImages).map((image) => image?.url),
      ...ensureArray(work.galleryImageUrls),
      work.hoverPreviewImageUrl,
      work.cardHoverImageUrl,
    ]);
    if (directImages.length) return directImages;

    if (!ensureArray(work.relatedWorkSlugs).length) return [];

    return collectDistinctImageUrls(
      ensureArray(work.relatedWorkSlugs).flatMap((slug) => {
        const relatedWork = getSeedPublishedWorkBySlug(slug);
        if (!relatedWork) return [];
        return [
          relatedWork.primaryImage?.url,
          relatedWork.hoverImageUrl,
          ...ensureArray(relatedWork.galleryImages).map((image) => image?.url),
          ...ensureArray(relatedWork.galleryImageUrls),
          getGeneratedPosterUrl(relatedWork),
        ];
      })
    );
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
    const visuals = createElement("div", "catalog-product-card__mediaVisuals");
    const base = createElement("div", "catalog-product-card__mediaVisual catalog-product-card__mediaVisual--base");
    const hover = createElement("div", "catalog-product-card__mediaVisual catalog-product-card__mediaVisual--hover");
    const distinctImageUrls = resolveCardImageUrls(work);
    const primaryImageUrl = distinctImageUrls[0] || "";
    const alternateImageUrls = distinctImageUrls.slice(1);

    if (primaryImageUrl) {
      base.appendChild(createProductCardImage("catalog-product-card__mainImage", primaryImageUrl));
    } else {
      base.appendChild(createShelfArtwork(work.id || work.slug || work.title, meta.visual, meta.tone));
    }

    if (alternateImageUrls.length) {
      const hoverImage = createProductCardImage(
        "catalog-product-card__hoverImage",
        alternateImageUrls[0]
      );
      visuals.classList.add("catalog-product-card__mediaVisuals--hoverSwap");
      hover.appendChild(hoverImage);
      bindHoverGalleryCycle({ card, hoverImage, hoverImageUrls: alternateImageUrls });
    } else if (!primaryImageUrl) {
      visuals.classList.add("catalog-product-card__mediaVisuals--hoverSwap");
      hover.appendChild(
        createProductCardImage(
          "catalog-product-card__hoverImage",
          buildHoverPreviewPlaceholder(work, meta)
        )
      );
    }

    visuals.append(base, hover);
    return visuals;
  };

  const createMatchTagList = (labels) => {
    const wrap = createElement("div", "catalog-product-card__matchTags");
    labels.forEach((label) => {
      wrap.appendChild(createElement("span", "catalog-product-card__matchTag", label));
    });
    return wrap;
  };

  const createAffinityLinks = (links) => {
    const wrap = createElement("div", "catalog-affinity-links");
    links.forEach((item) => {
      const link = createElement("a", "catalog-affinity-link", item.label);
      link.href = item.href;
      wrap.appendChild(link);
    });
    return wrap;
  };

  const createIconActionButton = ({ kind, workId, active = false, label }) => {
    const button = createElement(
      "button",
      `catalog-product-card__iconButton catalog-product-card__iconButton--${kind}`
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
    const visual = createElement("div", "catalog-category-visual");
    visual.dataset.variant = variant;
    Array.from({ length: 5 }).forEach(() => {
      visual.appendChild(createElement("span", "catalog-category-visual__piece"));
    });
    return visual;
  };

  const createTopCategoryCard = ({ label, href, visual }) => {
    const link = createElement("a", "catalog-top-category-card");
    const body = createElement("div", "catalog-top-category-card__body");
    link.href = href;
    body.append(createCategoryVisual(visual), createElement("strong", "catalog-top-category-card__title", label));
    link.appendChild(body);
    return link;
  };

  const createPromoCard = ({ kicker = "", title = "", description = "", href = "/", tone = "image", visual = "grid" }) => {
    const link = createElement("a", `catalog-home-promo catalog-home-promo--${tone}`);
    const content = createElement("div", "catalog-home-promo__content");
    const visualWrap = createElement("div", "catalog-home-promo__visual");
    link.href = href;
    visualWrap.appendChild(createShelfArtwork(`${title}-${tone}`, visual, tone === "yellow" ? "sand" : "white"));
    if (kicker) content.appendChild(createElement("span", "catalog-home-promo__kicker", kicker));
    content.appendChild(createElement("strong", "catalog-home-promo__title", title));
    if (description) content.appendChild(createElement("p", "catalog-home-promo__description", description));
    content.appendChild(createElement("span", "catalog-home-promo__link", "見る →"));
    link.append(visualWrap, content);
    return link;
  };

  const createCategoryBannerCard = ({ href, label, description = "", variant = "storage", meta = "" }) => {
    const link = createElement("a", "catalog-category-banner");
    const body = createElement("div", "catalog-category-banner__body");
    const text = createElement("div", "catalog-category-banner__text");
    link.href = href;
    body.appendChild(createCategoryVisual(variant));
    text.append(createElement("strong", "catalog-category-banner__title", label));
    if (description) text.appendChild(createElement("p", "catalog-category-banner__description", description));
    if (meta) text.appendChild(createElement("span", "catalog-category-banner__meta", meta));
    body.appendChild(text);
    link.appendChild(body);
    return link;
  };

  const createHomeSearchHero = ({ profile }) => {
    const card = createElement("section", "catalog-home-search-hero");
    const content = createElement("div", "catalog-home-search-hero__content");
    const form = createElement("form", "catalog-home-search-hero__form");
    const field = createElement("label", "catalog-home-search-hero__field");
    const input = document.createElement("input");
    const submit = createElement("button", "catalog-home-search-hero__submit", "探す");
    const quick = createElement("div", "catalog-home-search-hero__quick");
    const links = [
      { label: "歳の差", href: createFinderUrl({ includeTagIds: ["motif-age-gap"] }) },
      { label: "TFあり", href: createFinderUrl({ includeTagIds: ["tf-present"] }) },
      { label: "NTRなし", href: createFinderUrl({ includeTagIds: ["no-ntr"] }) },
      { label: "詳細条件ビルダー", href: "/builder/" },
    ];

    form.action = "/";
    form.method = "get";
    input.type = "search";
    input.name = "q";
    input.placeholder = profile.searchPlaceholder || "タグや作品名で探す";
    input.autocomplete = "off";
    field.appendChild(input);
    form.append(field, submit);

    content.append(
      createElement("span", "catalog-home-search-hero__eyebrow", "まず探す"),
      createElement("h1", "catalog-home-search-hero__title", "何を探したいかを、そのまま入れる"),
      createElement(
        "p",
        "catalog-home-search-hero__description",
        "広い入口はここから、細かい組み合わせは詳細条件ビルダーへ。ECの販促枠だった場所を、探索の入口に置き換えています。"
      ),
      form
    );
    links.forEach((item) => {
      quick.appendChild(createPillLink({ label: item.label, href: item.href, className: "catalog-pill" }));
    });
    card.append(content, quick);
    return card;
  };

  const formatPriceJPY = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return "価格未登録";
    return `¥${new Intl.NumberFormat("ja-JP").format(amount)}`;
  };

  const formatWorkPrice = (work) => work?.priceText || formatPriceJPY(work?.priceJPY);

  const getPrimaryWorkImageUrl = (work) => resolveCardImageUrls(work)[0] || "";

  const buildHomeShowcasePlaceholderImage = (work, variant = "card") => {
    const paletteSet = [
      { background: "#2f1f55", accent: "#ff7f94", accentSoft: "#4b347e", text: "#ffffff" },
      { background: "#143c63", accent: "#6bc6ff", accentSoft: "#27547f", text: "#ffffff" },
      { background: "#5f3a12", accent: "#ffd56a", accentSoft: "#85592c", text: "#fff9ef" },
      { background: "#22443d", accent: "#76d7b0", accentSoft: "#356258", text: "#f3fffb" },
      { background: "#74254c", accent: "#f6a9d0", accentSoft: "#9a476f", text: "#fff5fb" },
    ];
    const palette = paletteSet[Math.abs(hashString(work.id || work.slug || work.title || "work")) % paletteSet.length];
    const title = String(work.title || "作品紹介").replace(/\s+/g, " ").trim();
    const creator = String(work.creator || "掲載候補").replace(/\s+/g, " ").trim();
    const label = String(work.format || "作品").replace(/\s+/g, " ").trim();
    const width = variant === "thumb" ? 480 : 720;
    const height = variant === "thumb" ? 360 : 900;
    const lines = (title.match(/.{1,10}/gu) || [title]).slice(0, 3);
    const textStartY = variant === "thumb" ? 150 : 240;
    const lineGap = variant === "thumb" ? 44 : 68;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeSvgText(title)}">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${palette.background}" />
            <stop offset="100%" stop-color="${palette.accentSoft}" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#bg)" rx="${variant === "thumb" ? 24 : 32}" />
        <rect x="${variant === "thumb" ? 22 : 34}" y="${variant === "thumb" ? 22 : 34}" width="${width - (variant === "thumb" ? 44 : 68)}" height="${height - (variant === "thumb" ? 44 : 68)}" rx="${variant === "thumb" ? 22 : 28}" fill="rgba(255,255,255,0.08)" />
        <rect x="${variant === "thumb" ? 30 : 44}" y="${variant === "thumb" ? 32 : 46}" width="${variant === "thumb" ? 120 : 154}" height="${variant === "thumb" ? 28 : 34}" rx="17" fill="${palette.accent}" />
        <circle cx="${width - (variant === "thumb" ? 72 : 104)}" cy="${variant === "thumb" ? 74 : 110}" r="${variant === "thumb" ? 42 : 68}" fill="rgba(255,255,255,0.1)" />
        <path d="M ${variant === "thumb" ? 32 : 46} ${height - (variant === "thumb" ? 120 : 188)} Q ${width / 2} ${height - (variant === "thumb" ? 210 : 300)} ${width - (variant === "thumb" ? 32 : 46)} ${height - (variant === "thumb" ? 130 : 176)} L ${width - (variant === "thumb" ? 32 : 46)} ${height - (variant === "thumb" ? 32 : 46)} L ${variant === "thumb" ? 32 : 46} ${height - (variant === "thumb" ? 32 : 46)} Z" fill="rgba(255,255,255,0.12)" />
        <text x="${variant === "thumb" ? 46 : 60}" y="${variant === "thumb" ? 51 : 69}" fill="${palette.background}" font-family="Noto Sans JP, Helvetica Neue, Arial, sans-serif" font-size="${variant === "thumb" ? 15 : 18}" font-weight="800">${escapeSvgText(label)}</text>
        ${lines
          .map(
            (line, index) => `
              <text x="${variant === "thumb" ? 42 : 58}" y="${textStartY + index * lineGap}" fill="${palette.text}" font-family="Noto Sans JP, Helvetica Neue, Arial, sans-serif" font-size="${variant === "thumb" ? 34 : 52}" font-weight="900" letter-spacing="-1.5">${escapeSvgText(line)}</text>
            `
          )
          .join("")}
        <text x="${variant === "thumb" ? 44 : 60}" y="${height - (variant === "thumb" ? 56 : 74)}" fill="rgba(255,255,255,0.78)" font-family="Noto Sans JP, Helvetica Neue, Arial, sans-serif" font-size="${variant === "thumb" ? 18 : 24}" font-weight="600">${escapeSvgText(creator)}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const createHomeShowcaseWorkImage = ({ work, className, variant = "card" }) => {
    const image = createProductCardImage(
      className,
      getPrimaryWorkImageUrl(work) || buildHomeShowcasePlaceholderImage(work, variant)
    );
    image.alt = work.title || "";
    return image;
  };

  const createHomeShowcaseAction = ({ label, href, accent = false }) => {
    const link = createElement(
      "a",
      `home-showcase-micro__action${accent ? " home-showcase-micro__action--accent" : ""}`,
      label
    );
    link.href = href;
    return link;
  };

  const createHomeShowcaseChip = ({ label, href, tone = "rose" }) => {
    const link = createElement("a", "home-showcase-linkChip", label);
    link.href = href;
    link.dataset.tone = tone;
    return link;
  };

  const createHomeShowcaseThumb = (workOrUrl, className = "home-showcase-collage__tile") => {
    const wrap = createElement("span", className);
    if (typeof workOrUrl === "string") {
      wrap.appendChild(createProductCardImage("home-showcase-collage__image", workOrUrl));
    } else {
      wrap.appendChild(
        createHomeShowcaseWorkImage({
          work: workOrUrl,
          className: "home-showcase-collage__image",
          variant: className === "home-showcase-poster__thumb" ? "card" : "thumb",
        })
      );
    }
    return wrap;
  };

  const createHomeShowcaseSpotlightBanner = ({ profile, collection, work, relatedWorks = [] }) => {
    const link = createElement("a", "home-showcase-banner home-showcase-banner--spotlight");
    const media = createElement("div", "home-showcase-banner__media");
    const scrim = createElement("span", "home-showcase-banner__scrim");
    const copy = createElement("div", "home-showcase-banner__copy");
    const chips = createElement("div", "home-showcase-banner__chipRow");
    const title = createElement("strong", "home-showcase-banner__title");
    const thumbStrip = createElement("div", "home-showcase-banner__thumbStrip");
    link.href = collection ? toCollectionPath(collection) : "/finder/";
    if (work) {
      media.appendChild(
        createHomeShowcaseWorkImage({
          work,
          className: "home-showcase-banner__image",
          variant: "card",
        })
      );
    } else {
      media.appendChild(createShelfArtwork(profile.id || profile.slug || profile.name, "frame", "charcoal"));
    }

    [
      collection?.title || "入口特集",
      work?.format || "作品紹介",
      ensureArray(work?.highlightPoints)[0] || "導入向け",
    ]
      .filter(Boolean)
      .forEach((label) => {
        chips.appendChild(createElement("span", "home-showcase-banner__chip", label));
      });

    title.append(
      createElement("span", "home-showcase-banner__titleLine", profile.shortName || "ケモホモ"),
      createElement("span", "home-showcase-banner__titleLine", "作品ファインダー")
    );

    relatedWorks.slice(0, 4).forEach((item) => {
      const thumb = createElement("span", "home-showcase-banner__thumb");
      thumb.appendChild(
        createHomeShowcaseWorkImage({
          work: item,
          className: "home-showcase-banner__thumbImage",
          variant: "thumb",
        })
      );
      thumbStrip.appendChild(thumb);
    });

    copy.append(
      createElement("span", "home-showcase-banner__badge", "注目導線"),
      title,
      createElement(
        "p",
        "home-showcase-banner__description",
        "入口作品から条件検索、特集、作品紹介までをひと続きで辿れるトップ導線。"
      ),
      chips,
      thumbStrip
    );

    link.append(media, scrim, copy);
    return link;
  };

  const createHomeShowcaseCollageBanner = ({ collection, works = [] }) => {
    const link = createElement("a", "home-showcase-banner home-showcase-banner--collage");
    const intro = createElement("div", "home-showcase-banner__intro");
    const heading = createElement("div", "home-showcase-banner__yearTitle");
    const year = createElement("strong", "home-showcase-banner__yearNumber", String(new Date().getFullYear()));
    const label = createElement("span", "home-showcase-banner__yearLabel", "入口号");
    const collage = createElement("div", "home-showcase-collage");

    link.href = collection ? toCollectionPath(collection) : "/collections/";
    heading.append(year, label);
    intro.append(
      createElement("span", "home-showcase-banner__badge home-showcase-banner__badge--light", "特集"),
      heading,
      createElement(
        "p",
        "home-showcase-banner__sideDescription",
        collection?.title || "複数の入口作品を並べて、気になる温度感から見比べるためのまとめ枠。"
      )
    );

    works.slice(0, 6).forEach((work) => {
      collage.appendChild(createHomeShowcaseThumb(work));
    });

    link.append(intro, collage);
    return link;
  };

  const createHomeShowcasePosterBanner = ({ article, work }) => {
    const link = createElement("a", "home-showcase-banner home-showcase-banner--poster");
    const badge = createElement(
      "span",
      "home-showcase-banner__badge home-showcase-banner__badge--pink",
      article ? "記事" : "作品"
    );
    const headline = createElement("div", "home-showcase-poster__headline");
    const note = createElement("p", "home-showcase-poster__note");
    const footer = createElement("div", "home-showcase-poster__footer");
    const footerText = createElement(
      "p",
      "home-showcase-poster__footerText",
      article?.title || work?.title || "作品一覧から探し方を決める"
    );

    link.href = article?.url || (work ? toWorkPath(work) : "/finder/");
    [article ? "記事から" : "作品を", article ? "始める" : "探す"].forEach((line) => {
      headline.appendChild(createElement("span", "", line));
    });
    note.textContent = article
      ? "まずは作品紹介記事から、体格やシチュの好みを掴む。"
      : "作品カードから、体格やシチュの好みに近い1冊を探す。";
    footer.append(footerText);
    if (work) {
      footer.appendChild(createHomeShowcaseThumb(work, "home-showcase-poster__thumb"));
    }

    link.append(badge, headline, note, footer);
    return link;
  };

  const createHomeShowcaseCompactBanner = ({
    badge = "特集",
    title = "",
    description = "",
    href = "/",
    tone = "light",
  }) => {
    const link = createElement(
      "a",
      `home-showcase-banner home-showcase-banner--compact${tone === "dark" ? " home-showcase-banner--compactDark" : ""}`
    );
    const titleBlock = createElement("div", "home-showcase-compact__title");
    link.href = href;
    title.split("\n").forEach((line) => {
      titleBlock.appendChild(createElement("span", "", line));
    });
    link.append(
      createElement("span", "home-showcase-banner__badge home-showcase-banner__badge--light", badge),
      titleBlock,
      createElement("p", "home-showcase-banner__sideDescription", description)
    );
    return link;
  };

  const createHomeShowcaseProductCard = ({ work }) => {
    const article = createElement("article", "home-showcase-product");
    const mediaLink = createElement("a", "home-showcase-product__media");
    const badge = createElement("span", "home-showcase-product__badge", work.format || "作品");
    const body = createElement("div", "home-showcase-product__body");
    const creator = createElement("p", "home-showcase-product__creator", work.creator || "作者未設定");
    const title = createElement("a", "home-showcase-product__title", work.title);
    const meta = createElement(
      "p",
      "home-showcase-product__meta",
      [ensureArray(work.highlightPoints)[0], ensureArray(work.highlightPoints)[1]].filter(Boolean).join(" / ")
    );
    const footer = createElement("div", "home-showcase-product__footer");
    const price = createElement("strong", "home-showcase-product__price", formatWorkPrice(work));
    const detail = createElement(
      "span",
      "home-showcase-product__detail",
      `${Math.max(1, resolveCardImageUrls(work).length)}枚`
    );
    mediaLink.href = toWorkPath(work);
    title.href = mediaLink.href;

    mediaLink.appendChild(
      createHomeShowcaseWorkImage({
        work,
        className: "home-showcase-product__image",
        variant: "card",
      })
    );
    mediaLink.appendChild(badge);

    footer.append(price, detail);
    body.append(creator, title);
    if (meta.textContent) body.appendChild(meta);
    body.appendChild(footer);

    article.append(mediaLink, body);
    return article;
  };

  const createHomeShowcaseCategoryCard = ({ label, meta, href, icon = "tag" }) => {
    const link = createElement("a", "home-showcase-category");
    const iconWrap = createElement("span", "home-showcase-category__icon");
    const text = createElement("span", "home-showcase-category__text");
    const heading = createElement("strong", "home-showcase-category__title", label);
    const description = createElement("span", "home-showcase-category__meta", meta);

    link.href = href;
    iconWrap.appendChild(createIcon(icon));
    text.append(heading, description);
    link.append(iconWrap, text);
    return link;
  };

  const createHomeShowcaseTagLink = ({ label, href }) => {
    const link = createElement("a", "home-showcase-tag", label);
    link.href = href;
    return link;
  };

  const mountBuilderSkeleton = (root) => {
    if (root.dataset.builderMounted) return;
    root.className = "main catalog-main catalog-builder-page";
    if (root.querySelector("[data-builder-include-groups]") && root.querySelector("[data-builder-preview-works]")) {
      root.dataset.builderMounted = "true";
      return;
    }
    root.innerHTML = `
      <div class="catalog-page-shell catalog-builder-shell">
        <section class="catalog-builder-hero">
          <div>
            <p class="catalog-section-heading__eyebrow">Detailed Search</p>
            <h1 class="catalog-builder-hero__title">詳細条件ビルダー</h1>
            <p class="catalog-builder-hero__summary">
              広い入口は通常検索、細かい組み合わせはここで作ります。タグ・作者・除外条件をまとめて組み立てるための独立導線です。
            </p>
          </div>
          <div class="catalog-builder-hero__actions">
            <a href="/" class="catalog-builder-hero__link">通常検索へ</a>
          </div>
        </section>
        <div class="catalog-builder-layout">
          <section class="catalog-builder-main">
            <section class="catalog-builder-card">
              <div class="catalog-section-heading">
                <div>
                  <p class="catalog-section-heading__eyebrow">Step 1</p>
                  <h2 class="catalog-section-heading__title">基本条件</h2>
                </div>
              </div>
              <div class="catalog-builder-fields">
                <label class="catalog-search-sidebar__field">
                  <span>作品名・タグ・気分</span>
                  <input type="search" autocomplete="off" placeholder="例: TF / やさしめ / ノベル" data-builder-query />
                </label>
                <label class="catalog-search-sidebar__field">
                  <span>作者・サークル</span>
                  <input type="search" autocomplete="off" placeholder="作者名やサークル名" data-builder-creator />
                </label>
                <div class="catalog-search-sidebar__field">
                  <span>一致方法</span>
                  <div class="catalog-search-modeSwitch">
                    <button type="button" data-builder-mode="and" aria-pressed="true">すべて一致</button>
                    <button type="button" data-builder-mode="or" aria-pressed="false">いずれか一致</button>
                  </div>
                </div>
              </div>
            </section>
            <section class="catalog-builder-card">
              <div class="catalog-section-heading">
                <div>
                  <p class="catalog-section-heading__eyebrow">Step 2</p>
                  <h2 class="catalog-section-heading__title">含めたい条件</h2>
                </div>
              </div>
              <div class="catalog-builder-groups" data-builder-include-groups></div>
            </section>
            <section class="catalog-builder-card">
              <div class="catalog-section-heading">
                <div>
                  <p class="catalog-section-heading__eyebrow">Step 3</p>
                  <h2 class="catalog-section-heading__title">外したい条件</h2>
                </div>
              </div>
              <div class="catalog-builder-groups" data-builder-exclude-groups></div>
            </section>
          </section>
          <aside class="catalog-builder-side">
            <section class="catalog-builder-card catalog-builder-card--sticky">
              <div class="catalog-section-heading">
                <div>
                  <p class="catalog-section-heading__eyebrow">Preview</p>
                  <h2 class="catalog-section-heading__title" data-builder-preview-title>候補を計算中</h2>
                </div>
              </div>
              <p class="catalog-builder-preview__summary" data-builder-preview-summary></p>
              <div class="catalog-pill-cloud" data-builder-active></div>
              <div class="catalog-mini-stack" data-builder-preview-works></div>
              <div class="catalog-builder-preview__actions">
                <a href="/" class="catalog-builder-preview__primary" data-builder-open-results>この条件で一覧を見る</a>
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
    root.className = "main home-showcase-page";
    if (
      root.querySelector("[data-home-hero-rail]") &&
      root.querySelector("[data-home-recommended-works]") &&
      root.querySelector("[data-home-category-grid]") &&
      root.querySelector("[data-home-tag-cloud]")
    ) {
      root.dataset.homeMounted = "true";
      return;
    }
    root.innerHTML = `
      <div class="home-showcase-shell">
        <section class="home-showcase-hero">
          <button class="home-showcase-hero__nav home-showcase-hero__nav--prev" type="button" data-home-hero-prev aria-label="前のバナーを表示">
            <span aria-hidden="true">‹</span>
          </button>
          <button class="home-showcase-hero__nav home-showcase-hero__nav--next" type="button" data-home-hero-next aria-label="次のバナーを表示">
            <span aria-hidden="true">›</span>
          </button>
          <div class="home-showcase-hero__rail" data-home-hero-rail></div>
          <div class="home-showcase-hero__footer">
            <div class="home-showcase-hero__dots" data-home-hero-dots></div>
          </div>
        </section>
        <section class="home-showcase-section">
          <div class="home-showcase-section__head">
            <h2>あなたにおすすめの商品</h2>
          </div>
          <div class="home-showcase-productGrid" data-home-recommended-works></div>
        </section>
        <section class="home-showcase-section">
          <div class="home-showcase-section__head">
            <h2>カテゴリ</h2>
          </div>
          <div class="home-showcase-categoryGrid" data-home-category-grid></div>
        </section>
        <section class="home-showcase-section">
          <div class="home-showcase-section__head">
            <h2>人気のタグ</h2>
          </div>
          <div class="home-showcase-tagCloud" data-home-tag-cloud></div>
        </section>
      </div>
    `;
    root.dataset.homeMounted = "true";
  };

  const mountFinderSkeleton = (root) => {
    if (root.dataset.finderMounted) return;
    root.className = "main catalog-main catalog-search-page";
    if (root.querySelector("[data-finder-results]") && root.querySelector("[data-finder-sort]")) {
      root.dataset.finderMounted = "true";
      return;
    }
    root.innerHTML = `
      <div class="catalog-page-shell catalog-search-shell">
        <div class="catalog-search-layout">
          <aside class="catalog-search-sidebar">
            <section class="catalog-search-sidebar__card" data-finder-quick-filters></section>
            <section class="catalog-search-sidebar__card catalog-search-sidebar__card--compact">
              <label class="catalog-search-sidebar__field">
                <span>並び替え</span>
                <select data-finder-sort>
                  <option value="recommended">ベストマッチ</option>
                  <option value="latest">新しい順</option>
                  <option value="updated">更新順</option>
                  <option value="title">名前順</option>
                </select>
              </label>
              <p class="catalog-search-sidebar__help" data-finder-sort-note></p>
            </section>
          </aside>
          <section class="catalog-search-results">
            <p aria-live="assertive" class="sr-only" data-finder-a11y-live></p>
            <div class="catalog-search-results__toolbar">
              <div>
                <h2>結果リスト</h2>
                <p data-finder-status>条件なし</p>
              </div>
            </div>
            <section class="catalog-search-results__compare" data-finder-compare hidden id="compare-tray">
              <div class="catalog-section-heading">
                <div>
                  <p class="catalog-section-heading__eyebrow">Compare tray</p>
                  <h2 class="catalog-section-heading__title">候補を見比べる</h2>
                </div>
                <button type="button" data-compare-clear>比較をクリア</button>
              </div>
              <div class="catalog-mini-stack" data-compare-items></div>
              <div class="plp-compare-grid" data-compare-grid></div>
            </section>
            <section class="catalog-search-results__empty" data-finder-empty hidden>
              <h2>一致する作品が見つかりません</h2>
              <p>条件を絞りすぎている可能性があります。下の緩和候補から近い条件の作品を探してください。</p>
              <div class="finder-relax-list" data-finder-rescue></div>
              <div class="catalog-search-empty-grid">
                <div class="catalog-search-empty-grid__column">
                  <h3>おすすめ条件</h3>
                  <div class="catalog-mini-stack" data-finder-empty-collections></div>
                </div>
                <div class="catalog-search-empty-grid__column">
                  <h3>最近見た作品</h3>
                  <div class="catalog-mini-stack" data-finder-empty-recent></div>
                </div>
                <div class="catalog-search-empty-grid__column">
                  <h3>助けが必要なとき</h3>
                  <div class="catalog-mini-stack" data-finder-empty-help></div>
                </div>
              </div>
            </section>
            <div class="catalog-product-grid catalog-product-grid--search" id="product-list" data-finder-results></div>
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
    page = 1,
  } = {}) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (creatorQuery) params.set("creator", creatorQuery);
    if (sort && sort !== "recommended") params.set("sort", sort);
    if (matchMode === "or") params.set("mode", "or");
    unique(includeTagIds).forEach((tagId) => params.append("include", tagId));
    unique(excludeTagIds).forEach((tagId) => params.append("exclude", tagId));
    appendCharacterParams(params, characters);
    if (page && page > 1) params.set("page", String(page));
    return params.toString() ? `/?${params.toString()}` : "/";
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
    ageFeelTagIds: unique(value?.ageFeelTagIds),
  });

  const normalizeCharacters = (characters) => {
    const nextCharacters = ensureArray(characters).map((character, index) =>
      normalizeCharacterState(character, `character-${index + 1}`)
    );
    return nextCharacters.length ? nextCharacters : [createEmptyCharacterState()];
  };

  const sanitizeCharactersByVisibleTagIds = (characters, visibleTagIdSet) => {
    const nextCharacters = normalizeCharacters(characters).map((character, index) =>
      normalizeCharacterState(
        {
          ...character,
          speciesTagIds: ensureArray(character.speciesTagIds).filter((tagId) => visibleTagIdSet.has(tagId)),
          bodyTypeTagIds: ensureArray(character.bodyTypeTagIds).filter((tagId) => visibleTagIdSet.has(tagId)),
          ageFeelTagIds: ensureArray(character.ageFeelTagIds).filter((tagId) => visibleTagIdSet.has(tagId)),
        },
        `character-${index + 1}`
      )
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

  const getQuickFilterBuilderHref = (state) => {
    const finderUrl = new URL(
      createFinderUrl({
        query: state.query,
        creatorQuery: state.creatorQuery,
        sort: state.sort,
        collectionId: state.collectionId,
        includeTagIds: unique([...state.includeTagIds, ...getAllCharacterTagIds(state.characters)]),
        excludeTagIds: state.excludeTagIds,
        matchMode: state.matchMode,
      }),
      window.location.origin
    );
    return `/builder/${finderUrl.search}`;
  };

  const getQuickFilterSummary = (state, tagMap) => {
    const parts = [];
    normalizeCharacters(state.characters).forEach((character, index) => {
      const labels = unique([
        ...ensureArray(character.speciesTagIds).map((tagId) => getQuickFilterTagLabel(tagId, tagMap)),
        ...ensureArray(character.bodyTypeTagIds).map((tagId) => getQuickFilterTagLabel(tagId, tagMap)),
        ...ensureArray(character.ageFeelTagIds).map((tagId) => getQuickFilterTagLabel(tagId, tagMap)),
      ]);
      if (!labels.length) return;
      parts.push(`キャラ${index + 1}: ${labels.join(" / ")}`);
    });
    const quickIncludeLabels = ensureArray(state.includeTagIds).map(
      (tagId) => tagMap.get(tagId)?.label || tagId
    );
    const quickExcludeLabels = ensureArray(state.excludeTagIds).map(
      (tagId) => tagMap.get(tagId)?.label || tagId
    );
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
      `catalog-quick-filter-chip${className ? ` ${className}` : ""}`,
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
    const button = createElement("button", "catalog-quick-filter-bodyButton");
    button.type = "button";
    button.setAttribute("aria-pressed", String(selected));
    Object.entries(dataset).forEach(([key, value]) => {
      button.dataset[key] = value;
    });

    const imageWrap = createElement("span", "catalog-quick-filter-bodyButton__image");
    if (imageSrc) {
      const image = document.createElement("img");
      image.src = imageSrc;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      imageWrap.appendChild(image);
    } else {
      imageWrap.appendChild(createElement("span", "catalog-quick-filter-bodyButton__fallback", label));
    }

    button.append(
      imageWrap,
      createElement("span", "catalog-quick-filter-bodyButton__label", label)
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
    const article = createElement("article", "plp-product-card catalog-product-card");
    const mediaLink = createElement("a", "catalog-product-card__mediaLink");
    const media = createElement("div", "catalog-product-card__media");
    const body = createElement("div", "catalog-product-card__body");
    const formatLabel = createElement("p", "catalog-product-card__subtitle", work.format || "作品");
    const title = createElement("a", "catalog-product-card__title", work.title);
    const subtitle = createElement(
      "p",
      "catalog-product-card__detail",
      work.creator || "サンプル作者"
    );
    const metaRow = createElement("div", "catalog-product-card__metaRow");
    const actionRow = createElement("div", "catalog-product-card__actionRow");
    const favoriteSet = new Set(ensureArray(uiState.favoriteWorkIds));
    const summaryText = reason || work.matchSummary || work.shortDescription || work.publicNote || "";

    article.dataset.tone = meta.tone;
    mediaLink.href = toWorkPath(work);
    mediaLink.dataset.workLink = "true";
    mediaLink.dataset.workId = work.id;
    title.href = toWorkPath(work);
    title.dataset.workLink = "true";
    title.dataset.workId = work.id;

    if (meta.badge) {
      media.appendChild(createElement("span", "catalog-product-card__badge", meta.badge));
    }
    media.appendChild(createProductCardMediaVisual({ work, meta, card: article }));
    mediaLink.appendChild(media);

    meta.metaItems.forEach((item) => {
      metaRow.appendChild(createElement("span", "catalog-product-card__metaItem", item));
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
    if (summaryText) body.appendChild(createElement("p", "catalog-product-card__reason", summaryText));
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
    return parts.join(" | ") || "キーワード・種別・タグから記事を絞れます。";
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
    const card = createElement("article", "plp-product-card catalog-product-card");
    const mediaLink = createElement("a", "catalog-product-card__mediaLink");
    const media = createElement("div", "catalog-product-card__media");
    const body = createElement("div", "catalog-product-card__body");
    const title = createElement("a", "catalog-product-card__title", article.title || "記事タイトル");
    const subtitle = createElement(
      "p",
      "catalog-product-card__subtitle",
      [article.type || "特集記事", article.publishedAt ? `公開 ${formatDateLabel(article.publishedAt)}` : ""]
        .filter(Boolean)
        .join("、")
    );
    const detail = createElement("p", "catalog-product-card__detail", article.summary || "");
    const metaRow = createElement("div", "catalog-product-card__metaRow");
    const swatchLabel = createElement("p", "catalog-product-card__swatchLabel", "近い切り口や次に読む記事");
    const affinityLinks = createAffinityLinks(meta.relatedLinks);
    const href = article.url || createArticlesUrl();

    mediaLink.href = href;
    title.href = href;

    if (meta.badge) {
      media.appendChild(createElement("span", "catalog-product-card__badge", meta.badge));
    }
    media.appendChild(createProductCardMediaVisual({ work: article, meta, card }));
    mediaLink.appendChild(media);

    meta.metaItems.forEach((item) => {
      metaRow.appendChild(createElement("span", "catalog-product-card__metaItem", item));
    });

    if (meta.matchLabels.length) body.appendChild(createMatchTagList(meta.matchLabels));
    body.append(title, subtitle, detail, metaRow);
    if (reason) body.appendChild(createElement("p", "catalog-product-card__reason", reason));
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
    const root = document.querySelector("[data-home-catalog-page]");
    if (!root) return;
    mountHomeSkeleton(root);

    const state = store.loadState();
    const profile = core.getActiveProfile(state);
    if (!profile) return;

    const tagMap = core.getTagMap(state);
    const uiState = getUiState(state);
    const workMap = getDecoratedWorkMap(state, profile.id);
    const visibleTags = core.getVisibleTags(state, profile.id);
    const featuredCollections = core
      .getProfileCollections(state, profile.id, { publicOnly: true })
      .filter((collection) => ensureArray(profile.featuredCollectionIds).includes(collection.id))
      .map((collection) => core.decorateCollection(collection, state));
    const featuredWorks = core
      .getProfileWorks(state, profile.id, { publicOnly: true })
      .filter((work) => ensureArray(profile.featuredWorkIds).includes(work.id))
      .map((work) => workMap.get(work.id))
      .filter(Boolean);
    const sourceArticles = ensureArray(Array.isArray(articleIndex) ? articleIndex : globalThis.ARTICLE_INDEX);
    const recentArticle = sourceArticles
      .slice()
      .sort((left, right) => Date.parse(right?.publishedAt || 0) - Date.parse(left?.publishedAt || 0))[0];
    const sortWorksByPriority = (left, right) => {
      const priorityOrder = Number(right.priority || 0) - Number(left.priority || 0);
      if (priorityOrder !== 0) return priorityOrder;
      return Date.parse(right.updatedAt || 0) - Date.parse(left.updatedAt || 0);
    };
    const allWorks = core
      .getProfileWorks(state, profile.id, { publicOnly: true })
      .map((work) => workMap.get(work.id))
      .filter(Boolean)
      .sort(sortWorksByPriority);
    const imageReadyWorks = allWorks
      .filter((work) => getPrimaryWorkImageUrl(work))
      .sort((left, right) => resolveCardImageUrls(right).length - resolveCardImageUrls(left).length);
    const prioritizedProfileWorks = [...imageReadyWorks, ...allWorks.filter((work) => !imageReadyWorks.includes(work))];
    const supplementalWorks = ensureArray(state?.works)
      .filter((work) => work?.status === "published" && !prioritizedProfileWorks.some((item) => item.id === work.id))
      .sort(sortWorksByPriority);
    const supplementalImageReadyWorks = supplementalWorks
      .filter((work) => getPrimaryWorkImageUrl(work))
      .sort((left, right) => resolveCardImageUrls(right).length - resolveCardImageUrls(left).length);
    const recommendedGridWorks = [
      ...prioritizedProfileWorks,
      ...supplementalImageReadyWorks,
      ...supplementalWorks.filter((work) => !supplementalImageReadyWorks.includes(work)),
    ].slice(0, 10);
    const filledRecommendedGridWorks = [];
    if (recommendedGridWorks.length) {
      while (filledRecommendedGridWorks.length < 10) {
        filledRecommendedGridWorks.push(
          recommendedGridWorks[filledRecommendedGridWorks.length % recommendedGridWorks.length]
        );
      }
    }
    const heroWorks = prioritizedProfileWorks.slice(0, 7);
    const collageSourceWork = imageReadyWorks[0] || prioritizedProfileWorks[0];
    const collageItems = collageSourceWork
      ? resolveCardImageUrls(collageSourceWork).slice(0, 6)
      : heroWorks.slice(0, 6);
    const introCollection = featuredCollections.find((collection) => collection.id === "start-here") || featuredCollections[0];
    const tfCollection = featuredCollections.find((collection) => collection.id === "tf-gateway") || featuredCollections[1] || introCollection;
    const safeCollection = featuredCollections.find((collection) => collection.id === "safe-filters") || featuredCollections[2] || introCollection;

    const heroRailRoot = root.querySelector("[data-home-hero-rail]");
    const heroDotsRoot = root.querySelector("[data-home-hero-dots]");
    const recommendedRoot = root.querySelector("[data-home-recommended-works]");
    const categoryRoot = root.querySelector("[data-home-category-grid]");
    const tagRoot = root.querySelector("[data-home-tag-cloud]");

    if (heroRailRoot) {
      heroRailRoot.textContent = "";
      const slides = [
        {
          size: "wide",
          element: createHomeShowcaseSpotlightBanner({
            profile,
            collection: introCollection,
            work: featuredWorks[0] || heroWorks[0],
            relatedWorks: heroWorks,
          }),
        },
        {
          size: "medium",
          element: createHomeShowcaseCollageBanner({
            collection: tfCollection,
            works: collageItems,
          }),
        },
        {
          size: "poster",
          element: createHomeShowcasePosterBanner({
            article: recentArticle,
            work: heroWorks[6] || heroWorks[1] || featuredWorks[0],
          }),
        },
        {
          size: "wide",
          element: createHomeShowcaseCompactBanner({
            badge: "詳細条件",
            title: "条件を\n細かく選ぶ",
            description: "タグ、作者、除外条件をまとめて組み立てる詳細条件ビルダー。",
            href: "/builder/",
            tone: "dark",
          }),
        },
        {
          size: "medium",
          element: createHomeShowcaseCompactBanner({
            badge: "除外条件",
            title: "地雷を\n先に外す",
            description: safeCollection?.title || "強い地雷を避けたい時の入口特集。",
            href: safeCollection ? toCollectionPath(safeCollection) : "/collections/",
          }),
        },
      ];

      slides.forEach((slide, index) => {
        const item = createElement("div", `home-showcase-hero__item home-showcase-hero__item--${slide.size}`);
        item.dataset.heroSlide = String(index);
        item.appendChild(slide.element);
        heroRailRoot.appendChild(item);
      });

      if (heroDotsRoot) {
        heroDotsRoot.textContent = "";
      }
    }

    if (recommendedRoot) {
      recommendedRoot.textContent = "";
      filledRecommendedGridWorks.forEach((work) => {
        recommendedRoot.appendChild(createHomeShowcaseProductCard({ work, uiState, tagMap }));
      });
    }

    if (categoryRoot) {
      categoryRoot.textContent = "";
      [
        { label: "漫画", meta: "コミック作品から入る", href: createFinderUrl({ includeTagIds: ["format-comic"] }), icon: "work" },
        { label: "CG集", meta: "イラスト中心で探す", href: createFinderUrl({ includeTagIds: ["format-cg"] }), icon: "collection" },
        { label: "小説・台本", meta: "文章から入りたい", href: createFinderUrl({ includeTagIds: ["format-novel"] }), icon: "tag" },
        { label: "TF・変身", meta: "変化ありを先に見る", href: createFinderUrl({ includeTagIds: ["tf-present"] }), icon: "compare" },
        { label: "相棒感", meta: "距離感から選ぶ", href: createFinderUrl({ includeTagIds: ["buddy-energy"] }), icon: "heart" },
        { label: "やさしめ", meta: "導入が穏やかな作品", href: createFinderUrl({ includeTagIds: ["gentle-tone"] }), icon: "save" },
        { label: "熊", meta: "熊系の入口", href: createFinderUrl({ includeTagIds: ["species-bear"] }), icon: "work" },
        { label: "狼", meta: "狼系の入口", href: createFinderUrl({ includeTagIds: ["species-wolf"] }), icon: "collection" },
        { label: "狐", meta: "狐系の入口", href: createFinderUrl({ includeTagIds: ["species-fox"] }), icon: "tag" },
        { label: "筋肉・ガチムチ", meta: "体格感から絞る", href: createFinderUrl({ includeTagIds: ["body-muscular", "body-beefy"], matchMode: "or" }), icon: "compare" },
        { label: "入口特集", meta: "特集から探し始める", href: "/collections/", icon: "save" },
        { label: "除外条件", meta: "苦手条件を外す", href: "/builder/", icon: "delete" },
      ].forEach((item) => {
        categoryRoot.appendChild(createHomeShowcaseCategoryCard(item));
      });
    }

    if (tagRoot) {
      tagRoot.textContent = "";
      visibleTags.slice(0, 24).forEach((tag) => {
        tagRoot.appendChild(
          createHomeShowcaseTagLink({
            label: tag.label,
            href: createFinderUrl({ includeTagIds: [tag.id] }),
          })
        );
      });
    }

    if (!root.dataset.homeHeroBound) {
      const heroRail = root.querySelector("[data-home-hero-rail]");
      const heroItems = Array.from(root.querySelectorAll("[data-hero-slide]"));
      const heroDotsRoot = root.querySelector("[data-home-hero-dots]");
      const prevButton = root.querySelector("[data-home-hero-prev]");
      const nextButton = root.querySelector("[data-home-hero-next]");
      let currentSnapIndex = 0;
      let heroSnapPositions = [];
      let heroDotLockIndex = null;
      let heroDotLockTarget = 0;
      let heroDotLockFrame = 0;
      let heroDotIdleTimer = 0;

      const getHeroRailPaddingStart = () => {
        if (!heroRail) return 0;
        const railStyle = window.getComputedStyle(heroRail);
        return Number.parseFloat(railStyle.paddingInlineStart || railStyle.paddingLeft || "0") || 0;
      };

      const buildHeroSnapPositions = () => {
        if (!heroRail || !heroItems.length) return [0];
        const maxScroll = Math.max(heroRail.scrollWidth - heroRail.clientWidth, 0);
        const railPaddingStart = getHeroRailPaddingStart();
        const positions = [];

        heroItems.forEach((item) => {
          const position = Math.min(Math.max(item.offsetLeft - railPaddingStart, 0), maxScroll);
          if (!positions.some((value) => Math.abs(value - position) < 2)) {
            positions.push(position);
          }
        });

        return positions.length ? positions : [0];
      };

      const getNearestHeroSnapIndex = () => {
        if (!heroRail || !heroSnapPositions.length) return 0;
        const currentLeft = heroRail.scrollLeft;
        let nearestIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;

        heroSnapPositions.forEach((position, index) => {
          const distance = Math.abs(position - currentLeft);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
          }
        });

        return nearestIndex;
      };

      const renderHeroDots = () => {
        if (!heroDotsRoot) return;
        heroDotsRoot.textContent = "";
        heroSnapPositions.forEach((_, index) => {
          const button = createElement("button", "home-showcase-hero__dot");
          button.type = "button";
          button.dataset.heroDot = String(index);
          button.setAttribute("aria-label", `バナー ${index + 1} を表示`);
          button.setAttribute("aria-pressed", index === currentSnapIndex ? "true" : "false");
          heroDotsRoot.appendChild(button);
        });
      };

      const applyHeroDots = (activeIndex) => {
        const heroDots = Array.from(root.querySelectorAll("[data-hero-dot]"));
        heroDots.forEach((dot, index) => {
          dot.setAttribute("aria-pressed", index === activeIndex ? "true" : "false");
        });
      };

      const stopHeroDotLockWatch = () => {
        if (heroDotLockFrame) {
          window.cancelAnimationFrame(heroDotLockFrame);
          heroDotLockFrame = 0;
        }
      };

      const stopHeroDotIdleSync = () => {
        if (heroDotIdleTimer) {
          window.clearTimeout(heroDotIdleTimer);
          heroDotIdleTimer = 0;
        }
      };

      const watchHeroDotLock = () => {
        if (!heroRail || heroDotLockIndex === null) return;
        if (Math.abs(heroRail.scrollLeft - heroDotLockTarget) <= 2) {
          currentSnapIndex = heroDotLockIndex;
          heroDotLockIndex = null;
          heroDotLockTarget = 0;
          heroDotLockFrame = 0;
          syncHeroDots();
          return;
        }
        heroDotLockFrame = window.requestAnimationFrame(watchHeroDotLock);
      };

      const scrollToHeroIndex = (index) => {
        if (!heroRail || !heroSnapPositions.length) return;
        const wrappedIndex = ((index % heroSnapPositions.length) + heroSnapPositions.length) % heroSnapPositions.length;
        currentSnapIndex = wrappedIndex;
        stopHeroDotLockWatch();
        stopHeroDotIdleSync();
        heroDotLockIndex = wrappedIndex;
        heroDotLockTarget = heroSnapPositions[wrappedIndex];
        applyHeroDots(wrappedIndex);
        heroRail.scrollTo({
          left: heroSnapPositions[wrappedIndex],
          behavior: "smooth",
        });
        heroDotLockFrame = window.requestAnimationFrame(watchHeroDotLock);
      };

      const syncHeroDots = () => {
        if (!heroRail || !heroSnapPositions.length) return;
        if (heroDotLockIndex !== null) {
          applyHeroDots(heroDotLockIndex);
          return;
        }
        currentSnapIndex = getNearestHeroSnapIndex();
        applyHeroDots(currentSnapIndex);
      };

      const scheduleHeroDotSync = () => {
        if (heroDotLockIndex !== null) {
          applyHeroDots(heroDotLockIndex);
          return;
        }
        stopHeroDotIdleSync();
        heroDotIdleTimer = window.setTimeout(() => {
          heroDotIdleTimer = 0;
          syncHeroDots();
        }, 90);
      };

      const refreshHeroSnapModel = () => {
        heroSnapPositions = buildHeroSnapPositions();
        const previousCount = root.querySelectorAll("[data-hero-dot]").length;
        stopHeroDotLockWatch();
        stopHeroDotIdleSync();
        heroDotLockIndex = null;
        heroDotLockTarget = 0;
        currentSnapIndex = getNearestHeroSnapIndex();
        if (previousCount !== heroSnapPositions.length) {
          renderHeroDots();
        }
        syncHeroDots();
      };

      heroRail?.addEventListener("scroll", () => {
        scheduleHeroDotSync();
      });

      heroDotsRoot?.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const dot = target.closest("[data-hero-dot]");
        if (!(dot instanceof HTMLElement)) return;
        const index = Number(dot.dataset.heroDot || 0);
        scrollToHeroIndex(index);
      });

      prevButton?.addEventListener("click", () => {
        scrollToHeroIndex(currentSnapIndex - 1);
      });

      nextButton?.addEventListener("click", () => {
        scrollToHeroIndex(currentSnapIndex + 1);
      });

      window.addEventListener("resize", () => {
        window.requestAnimationFrame(refreshHeroSnapModel);
      });

      refreshHeroSnapModel();
      root.dataset.homeHeroBound = "true";
    }
  };

  const renderFinderPage = () => {
    const root = document.querySelector("[data-finder-catalog-page]");
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
    let paginationRoot = root.querySelector("[data-finder-pagination]");
    if (!paginationRoot && resultsRoot) {
      paginationRoot = createElement("nav", "catalog-article-pagination");
      paginationRoot.dataset.finderPagination = "true";
      paginationRoot.setAttribute("aria-label", "作品ページ送り");
      resultsRoot.insertAdjacentElement("afterend", paginationRoot);
    }
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
    const visibleTagIdSet = new Set(visibleTags.map((tag) => tag.id));
    const availableQuickSpeciesTags = getQuickFilterTagsByGroup(
      visibleTags,
      "species",
      QUICK_FILTER_SPECIES_TAG_ORDER
    );
    const availableQuickBodyOptions = getAvailableQuickFilterBodyOptions(visibleTagIdSet);
    const availableQuickAgeTags = getQuickFilterTagsByGroup(
      visibleTags,
      "age-feel",
      QUICK_FILTER_AGE_TAG_ORDER
    );
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
      page: 1,
    };
    const quickTagGroups = groupedTags
      .filter((group) => !QUICK_FILTER_GROUP_IDS.has(group.id))
      .map((group) => ({
        id: group.id,
        label: FILTER_LABEL_OVERRIDES[group.id] || group.label,
        tags: ensureArray(group.tags),
      }));
    const quickSelectableTags = quickTagGroups.flatMap((group) =>
      group.tags.map((tag) => ({
        ...tag,
        groupLabel: group.label,
        searchText: normalizeText(
          [tag.label, ensureArray(tag.synonyms).join(" "), group.label].join(" ")
        ),
      }))
    );
    const quickSelectableTagMap = new Map(
      quickSelectableTags.map((tag) => [tag.id, tag])
    );
    const tagPickerState = {
      open: false,
      mode: "include",
      query: "",
    };
    let tagPickerRestoreFocus = null;

    const readUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      pageState.query = params.get("q") || "";
      pageState.creatorQuery = params.get("creator") || "";
      pageState.sort = params.get("sort") || "recommended";
      pageState.collectionId = "";
      pageState.matchMode = params.get("mode") === "or" ? "or" : "and";
      pageState.includeTagIds = unique(params.getAll("include")).filter((tagId) =>
        visibleTagIdSet.has(tagId)
      );
      pageState.excludeTagIds = unique(params.getAll("exclude")).filter((tagId) =>
        visibleTagIdSet.has(tagId)
      );
      pageState.characters = sanitizeCharactersByVisibleTagIds(
        readCharactersFromParams(params),
        visibleTagIdSet
      );
      pageState.page = Math.max(Number.parseInt(params.get("page") || "1", 10) || 1, 1);
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
      collectionId: "",
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
        collectionId: "",
        matchMode: searchState.matchMode,
      });
      return filtered.filter((work) => matchesCharacters(work, searchState.characters));
    };

    const createFinderPaginationButton = ({
      label,
      page,
      disabled = false,
      current = false,
    }) => {
      const button = createElement(
        "button",
        `catalog-article-pagination__button${current ? " is-current" : ""}`,
        label
      );
      button.type = "button";
      button.disabled = disabled;
      if (!disabled) {
        button.dataset.finderPageTarget = String(page);
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

      const totalPages = Math.max(Math.ceil(totalCount / FINDER_RESULTS_PER_PAGE), 1);
      const currentPage = Math.min(Math.max(pageState.page, 1), totalPages);
      const startIndex = (currentPage - 1) * FINDER_RESULTS_PER_PAGE + 1;
      const endIndex = Math.min(currentPage * FINDER_RESULTS_PER_PAGE, totalCount);
      const summary = createElement(
        "p",
        "catalog-article-pagination__summary",
        `${totalCount}件中 ${startIndex}-${endIndex}件を表示`
      );
      const controls = createElement("div", "catalog-article-pagination__controls");

      controls.appendChild(
        createFinderPaginationButton({
          label: "前へ",
          page: currentPage - 1,
          disabled: currentPage <= 1,
        })
      );

      Array.from({ length: totalPages }, (_, index) => index + 1).forEach((pageNumber) => {
        controls.appendChild(
          createFinderPaginationButton({
            label: String(pageNumber),
            page: pageNumber,
            current: pageNumber === currentPage,
          })
        );
      });

      controls.appendChild(
        createFinderPaginationButton({
          label: "次へ",
          page: currentPage + 1,
          disabled: currentPage >= totalPages,
        })
      );

      paginationRoot.hidden = false;
      paginationRoot.append(summary, controls);
    };

    const toggleCharacterFieldValues = (field, tagIds) => {
      const character = normalizeCharacters(pageState.characters)[0];
      const nextCharacter = normalizeCharacterState(character);
      const key =
        field === "species"
          ? "speciesTagIds"
          : field === "body"
            ? "bodyTypeTagIds"
            : "ageFeelTagIds";
      const nextTagIds = unique(ensureArray(tagIds));
      if (!nextTagIds.length) return;
      const currentValues = ensureArray(nextCharacter[key]);
      const hasAllSelected = nextTagIds.every((tagId) => currentValues.includes(tagId));
      nextCharacter[key] = hasAllSelected
        ? currentValues.filter((value) => !nextTagIds.includes(value))
        : unique([...currentValues, ...nextTagIds]);
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

    const getQuickTagPreview = (mode) => {
      const selectedTagIds = new Set(
        mode === "exclude" ? pageState.excludeTagIds : pageState.includeTagIds
      );
      const selected = [];
      const unselected = [];
      quickSelectableTags.forEach((tag) => {
        if (selectedTagIds.has(tag.id)) {
          selected.push(tag);
          return;
        }
        unselected.push(tag);
      });
      return [...selected, ...unselected].slice(0, QUICK_FILTER_TAG_PREVIEW_LIMIT);
    };

    const toggleQuickGlobalTag = (tagId, nextState, wasPressed = false) => {
      pageState.includeTagIds = pageState.includeTagIds.filter((value) => value !== tagId);
      pageState.excludeTagIds = pageState.excludeTagIds.filter((value) => value !== tagId);
      if (nextState === "include" && !wasPressed) {
        pageState.includeTagIds = unique([...pageState.includeTagIds, tagId]);
      }
      if (nextState === "exclude" && !wasPressed) {
        pageState.excludeTagIds = unique([...pageState.excludeTagIds, tagId]);
      }
    };

    const createQuickTagPicker = () => {
      const existing = document.querySelector("[data-finder-tag-picker]");
      if (existing) return existing;

      const picker = createElement("div", "catalog-tag-picker");
      picker.hidden = true;
      picker.dataset.finderTagPicker = "true";
      picker.dataset.open = "false";
      picker.setAttribute("aria-hidden", "true");

      const backdrop = createElement("button", "catalog-tag-picker__backdrop");
      backdrop.type = "button";
      backdrop.dataset.tagPickerClose = "true";
      backdrop.setAttribute("aria-label", "タグ選択を閉じる");

      const panel = createElement("div", "catalog-tag-picker__panel");
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-labelledby", "finder-tag-picker-title");

      const header = createElement("div", "catalog-tag-picker__header");
      const heading = createElement("div", "catalog-tag-picker__heading");
      const eyebrow = createElement("p", "catalog-tag-picker__eyebrow", "タグ選択");
      const title = createElement("h2", "catalog-tag-picker__title");
      title.id = "finder-tag-picker-title";
      title.dataset.tagPickerTitle = "true";
      const lead = createElement("p", "catalog-tag-picker__lead");
      lead.dataset.tagPickerLead = "true";
      heading.append(eyebrow, title, lead);

      const closeButton = createElement("button", "catalog-tag-picker__close");
      closeButton.type = "button";
      closeButton.dataset.tagPickerClose = "true";
      closeButton.setAttribute("aria-label", "タグ選択を閉じる");
      closeButton.appendChild(createIcon("delete"));
      header.append(heading, closeButton);

      const body = createElement("div", "catalog-tag-picker__body");
      const searchField = createElement("label", "catalog-tag-picker__searchField");
      const searchLabel = createElement("span", "catalog-tag-picker__searchLabel", "タグ検索");
      const searchInput = createElement("input", "catalog-tag-picker__searchInput");
      searchInput.type = "search";
      searchInput.placeholder = "タグ名や関連語で検索";
      searchInput.dataset.tagPickerQuery = "true";
      searchInput.setAttribute("aria-label", "タグ検索");
      searchField.append(searchLabel, searchInput);

      const count = createElement("p", "catalog-tag-picker__count");
      count.dataset.tagPickerCount = "true";
      const results = createElement("div", "catalog-tag-picker__results");
      results.dataset.tagPickerResults = "true";
      body.append(searchField, count, results);

      panel.append(header, body);
      picker.append(backdrop, panel);
      document.body.appendChild(picker);
      return picker;
    };

    const closeQuickTagPicker = () => {
      const picker = createQuickTagPicker();
      if (picker.hidden) return;
      tagPickerState.open = false;
      picker.hidden = true;
      picker.dataset.open = "false";
      picker.setAttribute("aria-hidden", "true");
      document.body.classList.remove("finder-tag-picker-open");
      if (tagPickerRestoreFocus && typeof tagPickerRestoreFocus.focus === "function") {
        tagPickerRestoreFocus.focus();
      }
      tagPickerRestoreFocus = null;
    };

    const openQuickTagPicker = (mode, trigger = null) => {
      const picker = createQuickTagPicker();
      tagPickerState.mode = mode === "exclude" ? "exclude" : "include";
      tagPickerState.query = "";
      tagPickerState.open = true;
      tagPickerRestoreFocus = trigger instanceof HTMLElement ? trigger : null;
      picker.hidden = false;
      picker.dataset.open = "true";
      picker.setAttribute("aria-hidden", "false");
      document.body.classList.add("finder-tag-picker-open");
      renderQuickTagPicker();
      const searchInput = picker.querySelector("[data-tag-picker-query]");
      window.requestAnimationFrame(() => {
        searchInput?.focus();
      });
    };

    const renderQuickTagPicker = () => {
      const picker = createQuickTagPicker();
      const title = picker.querySelector("[data-tag-picker-title]");
      const lead = picker.querySelector("[data-tag-picker-lead]");
      const count = picker.querySelector("[data-tag-picker-count]");
      const results = picker.querySelector("[data-tag-picker-results]");
      const searchInput = picker.querySelector("[data-tag-picker-query]");
      if (!title || !lead || !count || !results || !searchInput) return;

      const isExclude = tagPickerState.mode === "exclude";
      const normalizedQuery = normalizeText(tagPickerState.query);
      const selectedTagIds = new Set(
        isExclude ? pageState.excludeTagIds : pageState.includeTagIds
      );
      title.textContent = isExclude ? "除外タグ" : "含めるタグ";
      lead.textContent = isExclude
        ? "外したい要素をまとめて選べます。"
        : "含めたい要素をまとめて選べます。";
      searchInput.value = tagPickerState.query;

      const filteredGroups = quickTagGroups
        .map((group) => {
          const tags = group.tags
            .map((tag) => quickSelectableTagMap.get(tag.id) || tag)
            .filter((tag) => !normalizedQuery || tag.searchText.includes(normalizedQuery))
            .sort((left, right) => {
              const leftSelected = selectedTagIds.has(left.id) ? 1 : 0;
              const rightSelected = selectedTagIds.has(right.id) ? 1 : 0;
              if (leftSelected !== rightSelected) return rightSelected - leftSelected;
              return left.label.localeCompare(right.label, "ja");
            });
          return {
            ...group,
            tags,
          };
        })
        .filter((group) => group.tags.length);
      const totalCount = filteredGroups.reduce((sum, group) => sum + group.tags.length, 0);

      count.textContent = normalizedQuery
        ? `${totalCount} 件のタグが見つかりました`
        : `${quickSelectableTags.length} 件のタグを選べます`;
      results.textContent = "";

      if (!filteredGroups.length) {
        results.appendChild(
          createElement("p", "catalog-tag-picker__empty", "一致するタグはありません。")
        );
        return;
      }

      filteredGroups.forEach((group) => {
        const section = createElement("section", "catalog-tag-picker__group");
        const groupHeader = createElement("div", "catalog-tag-picker__groupHeader");
        groupHeader.append(
          createElement("h3", "catalog-tag-picker__groupTitle", group.label),
          createElement("p", "catalog-tag-picker__groupCount", `${group.tags.length}件`)
        );

        const row = createElement("div", "catalog-tag-picker__chipRow");
        group.tags.forEach((tag) => {
          row.appendChild(
            createQuickFilterChip({
              label: tag.label,
              selected: selectedTagIds.has(tag.id),
              className: isExclude ? "plp-filter-chip--exclude" : "",
              dataset: {
                tagPickerState: tagPickerState.mode,
                quickTagId: tag.id,
              },
            })
          );
        });

        section.append(groupHeader, row);
        results.appendChild(section);
      });
    };

    const renderQuickFilters = () => {
      if (!quickFiltersRoot) return;
      quickFiltersRoot.textContent = "";

      const quickSummary = getQuickFilterSummary(pageState, tagMap);
      const character = normalizeCharacters(pageState.characters)[0];

      const wrapper = createElement("div", "catalog-quick-filters");
      const header = createElement("div", "catalog-quick-filters__header");
      const headingBlock = createElement("div", "catalog-quick-filters__heading");
      headingBlock.append(
        createElement("p", "catalog-quick-filters__eyebrow", "フィルター"),
        createElement("h2", "", "キャラクターフィルター")
      );
      header.append(
        headingBlock,
        createActionButton({
          label: "すべて解除",
          className: "catalog-quick-filters__clear",
          dataset: { quickFiltersClear: "true" },
        })
      );

      const summary = createElement("p", "catalog-quick-filters__summary", quickSummary);

      const characterCard = createElement("section", "catalog-quick-character-card");
      const characterHeader = createElement("div", "catalog-quick-character-card__header");
      characterHeader.appendChild(
        createElement("strong", "catalog-quick-character-card__title", "キャラ 1")
      );
      characterCard.appendChild(characterHeader);

      const speciesField = createElement("section", "catalog-quick-filter-field");
      const speciesLabelRow = createElement("div", "catalog-quick-filter-field__labelRow");
      const searchMoreLink = createElement("a", "catalog-quick-filter-field__link", "もっと探す");
      searchMoreLink.href = getQuickFilterBuilderHref(pageState);
      speciesLabelRow.append(
        createElement("strong", "catalog-quick-filter-field__label", "種族"),
        searchMoreLink
      );
      const speciesRow = createElement("div", "catalog-quick-filter-chipRow");
      availableQuickSpeciesTags.forEach((tag) => {
        speciesRow.appendChild(
          createQuickFilterChip({
            label: tag.label,
            selected: character.speciesTagIds.includes(tag.id),
            dataset: {
              quickCharacterField: "species",
              quickTagId: tag.id,
            },
          })
        );
      });
      speciesField.append(speciesLabelRow, speciesRow);

      const bodyField = createElement("section", "catalog-quick-filter-field");
      bodyField.appendChild(createElement("strong", "catalog-quick-filter-field__label", "体型"));
      const bodyGrid = createElement("div", "catalog-quick-filter-bodyGrid");
      availableQuickBodyOptions.forEach((option) => {
        bodyGrid.appendChild(
          createQuickFilterBodyButton({
            label: option.label,
            imageSrc: option.imageSrc,
            selected: option.availableTagIds.some((tagId) => character.bodyTypeTagIds.includes(tagId)),
            dataset: {
              quickCharacterField: "body",
              quickTagIds: option.availableTagIds.join(","),
            },
          })
        );
      });
      bodyField.appendChild(bodyGrid);

      const ageField = createElement("section", "catalog-quick-filter-field");
      ageField.appendChild(createElement("strong", "catalog-quick-filter-field__label", "年齢"));
      const ageRow = createElement("div", "catalog-quick-filter-chipRow");
      availableQuickAgeTags.forEach((tag) => {
        ageRow.appendChild(
          createQuickFilterChip({
            label: tag.label,
            selected: character.ageFeelTagIds.includes(tag.id),
            dataset: {
              quickCharacterField: "age",
              quickTagId: tag.id,
            },
          })
        );
      });
      ageField.appendChild(ageRow);

      characterCard.append(speciesField, bodyField, ageField);

      const includeField = createElement("section", "catalog-quick-filter-field");
      includeField.appendChild(createElement("strong", "catalog-quick-filter-field__label", "含めるタグ"));
      const includeRow = createElement("div", "catalog-quick-filter-chipRow");
      getQuickTagPreview("include").forEach((tag) => {
        includeRow.appendChild(
          createQuickFilterChip({
            label: tag.label,
            selected: pageState.includeTagIds.includes(tag.id),
            dataset: {
              quickGlobalState: "include",
              quickTagId: tag.id,
            },
          })
        );
      });
      const includeMoreButton = createElement("button", "catalog-quick-filter-field__more", "もっと見る");
      includeMoreButton.type = "button";
      includeMoreButton.dataset.quickTagPickerOpen = "include";
      includeField.append(includeRow, includeMoreButton);

      const excludeField = createElement("section", "catalog-quick-filter-field");
      excludeField.appendChild(createElement("strong", "catalog-quick-filter-field__label", "除外タグ"));
      const excludeRow = createElement("div", "catalog-quick-filter-chipRow");
      getQuickTagPreview("exclude").forEach((tag) => {
        excludeRow.appendChild(
          createQuickFilterChip({
            label: tag.label,
            selected: pageState.excludeTagIds.includes(tag.id),
            className: "plp-filter-chip--exclude",
            dataset: {
              quickGlobalState: "exclude",
              quickTagId: tag.id,
            },
          })
        );
      });
      const excludeMoreButton = createElement("button", "catalog-quick-filter-field__more", "もっと見る");
      excludeMoreButton.type = "button";
      excludeMoreButton.dataset.quickTagPickerOpen = "exclude";
      excludeField.append(excludeRow, excludeMoreButton);

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
            href: "/",
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
      visibleTags.slice(0, 6).forEach((tag) => {
        presetsRoot.appendChild(
          createPillLink({
            label: tag.label,
            href: createFinderUrl({ includeTagIds: [tag.id] }),
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
        : visibleTags.slice(0, 4).map((tag) => ({
              label: tag.label,
              query: "",
              creatorQuery: "",
              includeTagIds: [tag.id],
              excludeTagIds: [],
              collectionId: "",
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
            href: "/",
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
            href: toWorkPath(work),
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
      if (!activeRoot.childElementCount) {
        activeRoot.appendChild(createElement("span", "catalog-pill catalog-pill--muted", "条件なし"));
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
            href: toWorkPath(work),
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
        collectionId: "",
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
        const button = createElement("button", "catalog-promoted-filter", `${tag.label} (${count})`);
        button.type = "button";
        button.dataset.promotedTagId = tag.id;
        promotedRoot.appendChild(button);
      });
    };

    const renderEmptyRecovery = () => {
      if (emptyCollectionsRoot) {
        emptyCollectionsRoot.textContent = "";
        visibleTags.slice(0, 4).forEach((tag) => {
            emptyCollectionsRoot.appendChild(
              createMiniLink({
                label: tag.label,
                href: createFinderUrl({ includeTagIds: [tag.id] }),
                meta: "この条件から探し直せます。",
                icon: "tag",
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
              href: "/",
              meta: "通常検索から探し直せます。",
              icon: "recent",
            })
          );
        } else {
          recentWorks.forEach((work) => {
            emptyRecentRoot.appendChild(
              createMiniLink({
                label: work.title,
                href: toWorkPath(work),
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
            href: "/",
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
        resultCount === 0;
      if (!shouldLog) return;

      const signature = JSON.stringify({
        query: pageState.query,
        creatorQuery: pageState.creatorQuery,
        characters: normalizeCharacters(pageState.characters),
        includeTagIds: pageState.includeTagIds.slice().sort(),
        excludeTagIds: pageState.excludeTagIds.slice().sort(),
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
          matchMode: pageState.matchMode,
          resultCount,
        });
        lastLogSignature = signature;
      }, 350);
    };

    const renderResults = () => {
      state = store.loadState();
      const uiState = getUiState(state);
      const filtered = filterFinderWorks();
      const totalPages = Math.max(Math.ceil(filtered.length / FINDER_RESULTS_PER_PAGE), 1);
      pageState.page = Math.min(Math.max(pageState.page, 1), totalPages);
      const displayedWorks = filtered.slice(
        (pageState.page - 1) * FINDER_RESULTS_PER_PAGE,
        pageState.page * FINDER_RESULTS_PER_PAGE
      );
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
        : `作品検索：${filtered.length}件`;

      if (headingRoot) {
        headingRoot.textContent = headingLabel;
      }
      if (summaryRoot) {
        summaryRoot.textContent = profile.heroDescription || "条件を組み合わせて作品を探します。";
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
      const quickFilterSummary = getQuickFilterSummary(pageState, tagMap);
      conditionFragments.push(quickFilterSummary === "条件なし" ? "クイック条件なし" : quickFilterSummary);
      statusRoot.textContent = `${filtered.length}件 | ${getSortMeta(pageState.sort).label} | ${pageState.page}/${totalPages}ページ | ${conditionFragments.join(" | ")}`;

      if (emptyRoot) emptyRoot.hidden = filtered.length !== 0;
      renderActiveChips();
      renderRescue();
      renderEmptyRecovery();
      renderCompare(uiState);
      renderPagination(filtered.length);
      renderRecentWorks();
      refreshCarousels(root);
      scheduleLog(filtered.length);
    };

    const applyAndRender = () => {
      state = store.loadState();
      syncControls();
      updateFinderUrl(pageState);
      renderQuickFilters();
      if (tagPickerState.open) renderQuickTagPicker();
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
          pageState.page = 1;
          applyAndRender();
          return;
        }

        const quickCharacterButton = event.target.closest("[data-quick-character-field]");
        if (quickCharacterButton) {
          const field = quickCharacterButton.dataset.quickCharacterField;
          const tagIds = (quickCharacterButton.dataset.quickTagIds || quickCharacterButton.dataset.quickTagId || "")
            .split(",")
            .map((tagId) => tagId.trim())
            .filter(Boolean);
          if (!field || !tagIds.length) return;
          toggleCharacterFieldValues(field, tagIds);
          pageState.page = 1;
          applyAndRender();
          return;
        }

        const quickTagPickerButton = event.target.closest("[data-quick-tag-picker-open]");
        if (quickTagPickerButton) {
          const mode = quickTagPickerButton.dataset.quickTagPickerOpen || "include";
          openQuickTagPicker(mode, quickTagPickerButton);
          return;
        }

        const quickGlobalButton = event.target.closest("[data-quick-global-state]");
        if (quickGlobalButton) {
          const tagId = quickGlobalButton.dataset.quickTagId || "";
          const nextState = quickGlobalButton.dataset.quickGlobalState || "";
          if (!tagId) return;
          toggleQuickGlobalTag(
            tagId,
            nextState,
            quickGlobalButton.matches('[aria-pressed="true"]')
          );
          pageState.page = 1;
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
          pageState.page = 1;
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
          pageState.page = 1;
          applyAndRender();
          return;
        }

        const modeButton = event.target.closest("[data-finder-mode]");
        if (modeButton) {
          pageState.matchMode = modeButton.dataset.finderMode === "or" ? "or" : "and";
          pageState.page = 1;
          applyAndRender();
          return;
        }

        const promotedButton = event.target.closest("[data-promoted-tag-id]");
        if (promotedButton) {
          const tagId = promotedButton.dataset.promotedTagId || "";
          if (!tagId) return;
          pageState.excludeTagIds = pageState.excludeTagIds.filter((value) => value !== tagId);
          pageState.includeTagIds = unique([...pageState.includeTagIds, tagId]);
          pageState.page = 1;
          applyAndRender();
          return;
        }

        const pageButton = event.target.closest("[data-finder-page-target]");
        if (pageButton) {
          const nextPage = Math.max(Number.parseInt(pageButton.dataset.finderPageTarget || "1", 10) || 1, 1);
          pageState.page = nextPage;
          applyAndRender();
          root.querySelector(".catalog-search-results__toolbar")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
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
            pageState.page = 1;
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

      const tagPicker = createQuickTagPicker();
      tagPicker.addEventListener("click", (event) => {
        if (event.target.closest("[data-tag-picker-close]")) {
          closeQuickTagPicker();
          return;
        }

        const tagButton = event.target.closest("[data-tag-picker-state]");
        if (tagButton) {
          const tagId = tagButton.dataset.quickTagId || "";
          const nextState = tagButton.dataset.tagPickerState || "include";
          if (!tagId) return;
          toggleQuickGlobalTag(
            tagId,
            nextState,
            tagButton.matches('[aria-pressed="true"]')
          );
          pageState.page = 1;
          applyAndRender();
        }
      });

      const tagPickerQueryInput = tagPicker.querySelector("[data-tag-picker-query]");
      tagPickerQueryInput?.addEventListener("input", () => {
        tagPickerState.query = tagPickerQueryInput.value;
        renderQuickTagPicker();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && tagPickerState.open) {
          closeQuickTagPicker();
        }
      });

      root.dataset.finderBound = "true";
    }

    queryInput?.addEventListener("input", () => {
      pageState.query = queryInput.value.trim();
      pageState.page = 1;
      applyAndRender();
    });

    creatorInput?.addEventListener("input", () => {
      pageState.creatorQuery = creatorInput.value.trim();
      pageState.page = 1;
      applyAndRender();
    });

    sortSelect.addEventListener("change", () => {
      pageState.sort = sortSelect.value;
      pageState.page = 1;
      applyAndRender();
    });

    clearQueryButton?.addEventListener("click", () => {
      pageState.query = "";
      pageState.page = 1;
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
      pageState.page = 1;
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
      pageState.page = 1;
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
    const root = document.querySelector("[data-articles-catalog-page]");
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
    const categorySection = categoryRoot?.closest(".catalog-search-section");
    const relatedSection = relatedRoot?.closest(".catalog-search-section");
    const toolbarHeading = root.querySelector(".catalog-search-results__toolbar h2");
    const emptyTitle = emptyRoot?.querySelector("h2");
    const emptyDescription = emptyRoot?.querySelector("p");
    const emptyColumnHeadings = emptyRoot?.querySelectorAll(".catalog-search-empty-grid__column h3") || [];
    let paginationRoot = root.querySelector("[data-article-pagination]");
    if (!paginationRoot && resultsRoot) {
      paginationRoot = createElement("nav", "catalog-article-pagination");
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

      const wrapper = createElement("div", "catalog-quick-filters catalog-quick-filters--articles");
      const header = createElement("div", "catalog-quick-filters__header");
      const headingBlock = createElement("div", "catalog-quick-filters__heading");
      headingBlock.append(
        createElement("p", "catalog-quick-filters__eyebrow", "フィルター"),
        createElement("h2", "", "記事フィルター")
      );
      header.append(
        headingBlock,
        createActionButton({
          label: "すべて解除",
          className: "catalog-quick-filters__clear",
          dataset: { articleClear: "true" },
        })
      );

      const summary = createElement("p", "catalog-quick-filters__summary", getArticleSearchSummaryLabel(pageState));

      const queryField = createElement("section", "catalog-quick-filter-field");
      const queryLabel = createElement("strong", "catalog-quick-filter-field__label", "記事名・タグ");
      const queryInput = document.createElement("input");
      queryInput.type = "search";
      queryInput.autocomplete = "off";
      queryInput.className = "catalog-quick-filter-input";
      queryInput.placeholder = "例: 比較 / CTA / 構成";
      queryInput.value = pageState.query;
      queryInput.dataset.articleQuery = "true";
      queryField.append(queryLabel, queryInput);

      const typeField = createElement("section", "catalog-quick-filter-field");
      typeField.appendChild(createElement("strong", "catalog-quick-filter-field__label", "記事タイプ"));
      const typeRow = createElement("div", "catalog-quick-filter-chipRow");
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

      const tagField = createElement("section", "catalog-quick-filter-field");
      tagField.appendChild(createElement("strong", "catalog-quick-filter-field__label", "タグ"));
      const tagRow = createElement("div", "catalog-quick-filter-chipRow");
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
            href: "/",
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
        `catalog-article-pagination__button${current ? " is-current" : ""}`,
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
        "catalog-article-pagination__summary",
        `${totalCount}件中 ${startIndex}-${endIndex}件を表示`
      );
      const controls = createElement("div", "catalog-article-pagination__controls");

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
          root.querySelector(".catalog-search-results__toolbar")?.scrollIntoView({
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
    const root = document.querySelector("[data-builder-catalog-page]");
    if (!root) return;
    mountBuilderSkeleton(root);

    const queryInput = root.querySelector("[data-builder-query]");
    const creatorInput = root.querySelector("[data-builder-creator]");
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
    const visibleTagIdSet = new Set(visibleTags.map((tag) => tag.id));
    const groupedTags = core.groupTags(visibleTags, state.tagGroups);
    const tagMap = core.getTagMap(state);

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
      pageState.collectionId = "";
      pageState.matchMode = params.get("mode") === "or" ? "or" : "and";
      pageState.includeTagIds = unique(params.getAll("include")).filter((tagId) =>
        visibleTagIdSet.has(tagId)
      );
      pageState.excludeTagIds = unique(params.getAll("exclude")).filter((tagId) =>
        visibleTagIdSet.has(tagId)
      );
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
        const section = createElement("section", "catalog-builder-group");
        const title = createElement("div", "catalog-builder-group__title");
        const chipRow = createElement("div", "catalog-builder-group__chips");
        title.append(
          createElement("strong", "", FILTER_LABEL_OVERRIDES[group.id] || group.label),
          createElement("span", "catalog-builder-group__description", group.description || "")
        );
        group.tags.forEach((tag) => {
          const chip = createElement(
            "button",
            `catalog-builder-chip${
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
      if (pageState.matchMode === "or") items.push("いずれか一致");
      pageState.includeTagIds.forEach((tagId) => {
        items.push(`含める: ${tagMap.get(tagId)?.label || tagId}`);
      });
      pageState.excludeTagIds.forEach((tagId) => {
        items.push(`除外: ${tagMap.get(tagId)?.label || tagId}`);
      });
      if (!items.length) items.push("条件なし");
      items.forEach((item) => {
        activeRoot.appendChild(createElement("span", "catalog-pill", item));
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
        collectionId: "",
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
            href: "/",
            meta: "広い入口に戻して探し直せます。",
            icon: "search",
          })
        );
      } else {
        filtered.slice(0, 4).forEach((work) => {
          previewWorksRoot.appendChild(
            createMiniLink({
              label: work.title,
              href: toWorkPath(work),
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
        collectionId: "",
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
