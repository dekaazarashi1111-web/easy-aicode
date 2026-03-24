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
    entrance: "サイズ",
    style: "色",
    transformation: "価格",
    relationship: "カテゴリ",
    format: "素材",
    curation: "シリーズ",
    avoid: "在庫状況",
  };

  const PRODUCT_PRICE_STEPS = [1499, 1999, 2499, 4999, 7999, 8999, 11999, 17990, 19990, 29990, 66000];
  const PRODUCT_SWATCHES = ["white", "oak", "black", "green", "red", "blue", "beige"];

  const hashString = (value) => {
    let hash = 0;
    String(value || "")
      .split("")
      .forEach((char) => {
        hash = (hash * 33 + char.charCodeAt(0)) % 2147483647;
      });
    return Math.abs(hash);
  };

  const formatPrice = (value) => `¥${Number(value || 0).toLocaleString("ja-JP")}`;

  const getProductDisplayMeta = (work) => {
    const hash = hashString(work.id || work.slug || work.title);
    const price = PRODUCT_PRICE_STEPS[hash % PRODUCT_PRICE_STEPS.length];
    const rating = 3.7 + (hash % 12) / 10;
    const reviews = 25 + (hash % 7400);
    const badge = ensureArray(work.primaryTagObjects).some((tag) => tag.id === "gateway-pick")
      ? "人気商品"
      : ensureArray(work.primaryTagObjects).some((tag) => tag.id === "manual-pick")
        ? "New"
        : "";
    const variantCount = 2 + (hash % 6);
    const tone = ["white", "sand", "sage", "blue", "charcoal"][hash % 5];
    const visual = ["ladder", "cube", "wide", "frame", "grid"][hash % 5];
    const swatches = Array.from({ length: Math.min(4, variantCount) }, (_, index) => {
      return PRODUCT_SWATCHES[(hash + index) % PRODUCT_SWATCHES.length];
    });

    return {
      price,
      rating,
      reviews,
      badge,
      tone,
      visual,
      variantCount,
      swatches,
    };
  };

  const createStars = (rating) => {
    const wrap = createElement("div", "ikea-rating");
    const value = Math.max(0, Math.min(5, rating));
    for (let index = 0; index < 5; index += 1) {
      const star = createElement("span", "ikea-rating__star", index + 1 <= Math.round(value) ? "★" : "☆");
      wrap.appendChild(star);
    }
    return wrap;
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

  const createSwatchList = (colors, extraCount = 0) => {
    const wrap = createElement("div", "ikea-swatch-list");
    colors.forEach((color) => {
      const swatch = createElement("span", "ikea-swatch");
      swatch.dataset.color = color;
      wrap.appendChild(swatch);
    });
    if (extraCount > colors.length) {
      wrap.appendChild(createElement("span", "ikea-swatch-list__more", `+${extraCount - colors.length}`));
    }
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
              <p class="ikea-section-heading__eyebrow">人気の商品</p>
              <h2 class="ikea-section-heading__title">おすすめ商品</h2>
            </div>
            <a href="/finder/" class="ikea-section-heading__link">もっと見る</a>
          </div>
          <div class="ikea-product-grid ikea-product-grid--home" data-home-featured-works></div>
        </section>
        <section class="ikea-home-section">
          <div class="ikea-section-heading">
            <div>
              <p class="ikea-section-heading__eyebrow">カテゴリに移動</p>
              <h2 class="ikea-section-heading__title">人気カテゴリ</h2>
            </div>
          </div>
          <div class="ikea-banner-row" data-home-featured-collections></div>
        </section>
        <section class="ikea-home-section ikea-home-assist">
          <div>
            <div class="ikea-section-heading">
              <div>
                <p class="ikea-section-heading__eyebrow">検索導線</p>
                <h2 class="ikea-section-heading__title">よく使われる検索</h2>
              </div>
            </div>
            <div class="ikea-pill-cloud" data-home-popular-searches></div>
          </div>
          <div>
            <div class="ikea-section-heading">
              <div>
                <p class="ikea-section-heading__eyebrow">続きから探す</p>
                <h2 class="ikea-section-heading__title">保存した検索</h2>
              </div>
            </div>
            <div class="ikea-mini-stack" data-home-saved-searches></div>
          </div>
          <div>
            <div class="ikea-section-heading">
              <div>
                <p class="ikea-section-heading__eyebrow">最近見た作品</p>
                <h2 class="ikea-section-heading__title">履歴</h2>
              </div>
            </div>
            <div class="ikea-mini-stack" data-home-recent-works></div>
          </div>
        </section>
        <section class="ikea-home-section">
          <div class="ikea-section-heading">
            <div>
              <p class="ikea-section-heading__eyebrow">カテゴリに移動</p>
              <h2 class="ikea-section-heading__title">入口タグから探す</h2>
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
        <section class="ikea-search-alert">大型配送がお得に！45,000円以上の購入で最大半額。IKEA Family限定。</section>
        <section class="ikea-search-hero">
          <div>
            <h1 class="ikea-search-hero__title" data-finder-heading>検索結果</h1>
            <p class="ikea-search-hero__summary" data-finder-summary-note>条件を組み合わせて作品を探します。</p>
          </div>
          <div class="ikea-pill-cloud" data-finder-active></div>
        </section>
        <div class="ikea-search-layout">
          <aside class="ikea-search-sidebar">
            <a href="#product-list" class="ikea-search-sidebar__skip">結果へスキップ</a>
            <section class="ikea-search-sidebar__card">
              <form class="ikea-inline-search" action="/finder/" method="get">
                <div class="ikea-inline-search__field">
                  <svg viewBox="0 0 24 24" focusable="false" width="24" height="24" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.9804 15.3946c-1.0361.7502-2.3099 1.1925-3.6869 1.1925C6.8177 16.5871 4 13.7694 4 10.2935 4 6.8177 6.8177 4 10.2935 4c3.4759 0 6.2936 2.8177 6.2936 6.2935 0 1.377-.4423 2.6508-1.1925 3.6869l4.6016 4.6016-1.4142 1.4142-4.6016-4.6016zm.6067-5.1011c0 2.3713-1.9223 4.2936-4.2936 4.2936C7.9223 14.5871 6 12.6648 6 10.2935 6 7.9223 7.9223 6 10.2935 6c2.3713 0 4.2936 1.9223 4.2936 4.2935z"></path></svg>
                  <input type="search" name="q" placeholder="棚" autocomplete="off" data-finder-query />
                  <button type="button" data-finder-clear-query>クリア</button>
                  <button type="submit">検索</button>
                </div>
              </form>
              <label class="ikea-search-sidebar__field">
                <span>作者・サークル</span>
                <input type="search" autocomplete="off" placeholder="作者名やサークル名" data-finder-creator />
              </label>
              <div class="ikea-search-sidebar__field">
                <span>一致条件</span>
                <div class="ikea-search-modeSwitch">
                  <button type="button" data-finder-mode="and" aria-pressed="true">すべて一致</button>
                  <button type="button" data-finder-mode="or" aria-pressed="false">いずれか一致</button>
                </div>
              </div>
              <div class="ikea-search-sidebar__actions">
                <button type="button" data-finder-save-search>条件を保存</button>
                <button type="button" data-finder-copy>検索URLをコピー</button>
                <button type="button" data-finder-clear>条件をクリア</button>
              </div>
            </section>
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
            <section class="ikea-search-sidebar__card ikea-search-sidebar__card--compact">
              <h2>保存した検索</h2>
              <div class="ikea-mini-stack" data-finder-saved-searches></div>
            </section>
            <section class="ikea-search-sidebar__card ikea-search-sidebar__card--compact">
              <h2>よく使われる検索</h2>
              <div class="ikea-pill-cloud" data-finder-popular-searches></div>
            </section>
            <section class="ikea-search-sidebar__card ikea-search-sidebar__card--compact">
              <h2>入口特集</h2>
              <div class="ikea-pill-cloud" data-finder-presets></div>
            </section>
            <section class="ikea-search-sidebar__card ikea-search-sidebar__card--compact">
              <h2>検索のコツ</h2>
              <ul class="ikea-search-tips" data-profile-search-tips></ul>
            </section>
            <div class="ikea-filter-groups" data-finder-groups></div>
          </aside>
          <section class="ikea-search-results">
            <p aria-live="assertive" class="sr-only" data-finder-a11y-live></p>
            <div class="ikea-search-results__toolbar">
              <div>
                <h2>結果リスト</h2>
                <p data-finder-status>条件なし</p>
              </div>
              <span class="ikea-search-results__pill">商品・棚</span>
            </div>
            <section class="ikea-search-results__compare" data-finder-compare hidden>
              <div class="ikea-section-heading">
                <div>
                  <p class="ikea-section-heading__eyebrow">比較トレイ</p>
                  <h2 class="ikea-section-heading__title">候補を並べて比較する</h2>
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
            </section>
            <div class="ikea-product-grid ikea-product-grid--search" id="product-list" data-finder-results></div>
            <section class="ikea-search-section" data-finder-suggestions-wrap hidden>
              <div class="ikea-section-heading">
                <div>
                  <p class="ikea-section-heading__eyebrow">類似商品</p>
                  <h2 class="ikea-section-heading__title">近い条件の商品</h2>
                </div>
              </div>
              <div class="ikea-product-grid ikea-product-grid--search" data-finder-suggestions></div>
            </section>
            <section class="ikea-search-section">
              <div class="ikea-section-heading">
                <div>
                  <p class="ikea-section-heading__eyebrow">カテゴリに移動</p>
                  <h2 class="ikea-section-heading__title">人気カテゴリ</h2>
                </div>
              </div>
              <div class="ikea-banner-row" data-finder-categories></div>
            </section>
            <section class="ikea-search-section">
              <div class="ikea-section-heading">
                <div>
                  <p class="ikea-section-heading__eyebrow">関連する検索</p>
                  <h2 class="ikea-section-heading__title">絞り込みを広げる</h2>
                </div>
              </div>
              <ul class="ikea-related-searches" data-finder-related-searches></ul>
            </section>
            <section class="ikea-search-section">
              <div class="ikea-section-heading">
                <div>
                  <p class="ikea-section-heading__eyebrow">最近見た作品</p>
                  <h2 class="ikea-section-heading__title">履歴</h2>
                </div>
              </div>
              <div class="ikea-mini-stack" data-finder-recent></div>
            </section>
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
    const meta = getProductDisplayMeta(work);
    const article = createElement("article", "plp-product-card ikea-product-card");
    const mediaLink = createElement("a", "ikea-product-card__mediaLink");
    const media = createElement("div", "ikea-product-card__media");
    const body = createElement("div", "ikea-product-card__body");
    const title = createElement("a", "ikea-product-card__title", work.title);
    const subtitle = createElement(
      "p",
      "ikea-product-card__subtitle",
      [work.creator || "サンプル作者", work.format || "作品"].filter(Boolean).join("、")
    );
    const detail = createElement(
      "p",
      "ikea-product-card__detail",
      work.highlightPoints?.[0] || work.shortDescription || work.publicNote || ""
    );
    const price = createElement("p", "ikea-product-card__price", formatPrice(meta.price));
    const ratingRow = createElement("div", "ikea-product-card__ratingRow");
    const swatchLabel = createElement("p", "ikea-product-card__swatchLabel", "他の色・サイズなどを見る");
    const swatches = createSwatchList(meta.swatches, meta.variantCount);
    const actionRow = createElement("div", "ikea-product-card__actionRow");
    const compareSet = new Set(ensureArray(uiState.compareWorkIds));
    const favoriteSet = new Set(ensureArray(uiState.favoriteWorkIds));

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
    media.appendChild(createShelfArtwork(work.id || work.slug || work.title, meta.visual, meta.tone));
    mediaLink.appendChild(media);

    ratingRow.append(
      createStars(meta.rating),
      createElement("span", "ikea-product-card__ratingCount", `(${meta.reviews})`)
    );

    if (showActions) {
      actionRow.append(
        createIconActionButton({
          kind: "compare",
          workId: work.id,
          active: compareSet.has(work.id),
          label: compareSet.has(work.id) ? "比較中" : "比較に追加",
        }),
        createIconActionButton({
          kind: "favorite",
          workId: work.id,
          active: favoriteSet.has(work.id),
          label: favoriteSet.has(work.id) ? "保存済み" : "保存する",
        })
      );
    }

    body.append(title, subtitle, detail, price, ratingRow);
    if (reason) body.appendChild(createElement("p", "ikea-product-card__reason", reason));
    if (showActions) body.appendChild(actionRow);
    body.append(swatchLabel, swatches);
    article.append(mediaLink, body);
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
    const recentRoot = root.querySelector("[data-home-recent-works]");
    const tagGroupsRoot = root.querySelector("[data-home-tag-groups]");
    const collectionRoot = root.querySelector("[data-home-featured-collections]");
    const workRoot = root.querySelector("[data-home-featured-works]");

    if (topCategoryRoot) {
      topCategoryRoot.textContent = "";
      [
        { label: "収納家具", href: createFinderUrl({ collectionId: "start-here" }), visual: "storage" },
        { label: "ソファ＆パーソナルチェア", href: createFinderUrl({ includeTagIds: ["buddy-energy"] }), visual: "sofa" },
        { label: "デスク・チェア", href: createFinderUrl({ includeTagIds: ["format-comic"] }), visual: "desk" },
        { label: "ベッド・マットレス", href: createFinderUrl({ collectionId: "tf-gateway" }), visual: "bed" },
        { label: "テーブル・チェア", href: createFinderUrl({ includeTagIds: ["distance-close"] }), visual: "table" },
        { label: "小物収納", href: createFinderUrl({ includeTagIds: ["manual-pick"] }), visual: "box" },
        { label: "調理器具・食器", href: "/articles/", visual: "bowl" },
      ].forEach((item) => {
        topCategoryRoot.appendChild(createTopCategoryCard(item));
      });
    }

    if (promoPrimaryRoot) {
      promoPrimaryRoot.textContent = "";
      promoPrimaryRoot.appendChild(
        createPromoCard({
          kicker: "特集",
          title: "New",
          description: "入口タグから深掘り条件まで、まずは見つけやすい構成で探す。",
          href: createFinderUrl({ collectionId: "start-here" }),
          tone: "yellow",
          visual: "wide",
        })
      );
    }

    if (promoSecondaryRoot) {
      promoSecondaryRoot.textContent = "";
      featuredCollections.slice(0, 2).forEach((collection, index) => {
        promoSecondaryRoot.appendChild(
          createPromoCard({
            kicker: index === 0 ? "特集を見る" : "人気カテゴリ",
            title: collection.title,
            description: collection.description || collection.lead || "",
            href: `/collection/?slug=${encodeURIComponent(collection.slug)}`,
            tone: "image",
            visual: index % 2 === 0 ? "frame" : "grid",
          })
        );
      });
    }

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
          label: FILTER_LABEL_OVERRIDES[group.id] || group.label,
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

      headingRoot.textContent = headingLabel;
      if (summaryRoot) {
        summaryRoot.textContent =
          collection?.description || profile.heroDescription || "条件を組み合わせて作品を探します。";
      }
      if (a11yLive) {
        a11yLive.textContent = `${headingLabel} が見つかりました。`;
      }

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
