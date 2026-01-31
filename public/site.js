const SITE_CONFIG = window.SITE_CONFIG || {};
const STRIPE_URL = SITE_CONFIG.BUY_URL || "";
const START_URL = SITE_CONFIG.START_URL || "/start";
const DEFAULT_BLOG_COVER = "/blog/assets/blog-hero.svg";

const buyLinks = document.querySelectorAll('a[data-stripe="buy"]');

const getEnabledText = (link) => {
  if (!link.dataset.enabledText) {
    link.dataset.enabledText = link.textContent.trim();
  }
  return link.dataset.enabledText;
};

const setText = (link, text) => {
  if (text) {
    link.textContent = text;
  }
};

const shouldOpenInNewTab = (url) => /^https?:\/\//i.test(url) || /\{\{.+\}\}/.test(url);

const enableStripe = (url) => {
  buyLinks.forEach((link) => {
    link.setAttribute("href", url);
    link.removeAttribute("aria-disabled");
    link.classList.remove("btn--disabled");
    setText(link, getEnabledText(link));
    if (shouldOpenInNewTab(url)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    } else {
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }
  });
};

if (buyLinks.length > 0) {
  const targetUrl = STRIPE_URL || START_URL;
  enableStripe(targetUrl);
}

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

  const handleMatch = SITE_CONFIG.X_PROFILE_URL.match(/x\\.com\\/([^/?#]+)/i);
  const handle = handleMatch ? `@${handleMatch[1]}` : null;
  if (!handle) return;
  const twitterSite = document.querySelector('meta[name="twitter:site"]');
  if (twitterSite) twitterSite.setAttribute("content", handle);
  const twitterCreator = document.querySelector('meta[name="twitter:creator"]');
  if (twitterCreator) twitterCreator.setAttribute("content", handle);
};

updateXProfileLinks();

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const createBlogCard = (post) => {
  const article = document.createElement("article");
  article.className = "card blog-card";
  if (Array.isArray(post.tags)) {
    article.dataset.tags = post.tags.join(",");
  }

  const link = document.createElement("a");
  link.className = "blog-card__link";
  link.href = post.url;

  const media = document.createElement("div");
  media.className = "blog-card__media";

  const image = document.createElement("img");
  image.className = "blog-card__image";
  image.src = post.cover || DEFAULT_BLOG_COVER;
  image.alt = post.title || "記事のヘッダー画像";
  image.loading = "lazy";
  media.appendChild(image);

  const body = document.createElement("div");
  body.className = "stack";

  const meta = document.createElement("div");
  meta.className = "blog-card__meta";

  const date = document.createElement("span");
  date.textContent = formatDate(post.date);
  meta.appendChild(date);

  const badge = document.createElement("span");
  badge.className = "pill";
  badge.textContent = "記事";
  meta.appendChild(badge);

  const title = document.createElement("h3");
  title.className = "blog-card__title";
  title.textContent = post.title || "Untitled";

  const desc = document.createElement("p");
  desc.className = "muted";
  desc.textContent = post.description || "";

  const cta = document.createElement("span");
  cta.className = "btn btn--ghost btn--sm blog-card__cta";
  cta.textContent = "続きを読む";

  body.appendChild(meta);
  body.appendChild(title);
  if (post.description) {
    body.appendChild(desc);
  }
  body.appendChild(cta);

  link.appendChild(media);
  link.appendChild(body);
  article.appendChild(link);
  return article;
};

const normalizeTag = (value) => value.trim().toLowerCase();

const applyTagFilter = (tag) => {
  const blogList = document.querySelector("[data-blog-list]");
  if (!blogList) return;

  const cards = blogList.querySelectorAll(".blog-card");
  if (cards.length === 0) return;
  const emptyState = document.querySelector("[data-blog-empty]");
  let matches = 0;

  cards.forEach((card) => {
    const raw = card.dataset.tags || "";
    const tags = raw.split(",").map(normalizeTag).filter(Boolean);
    const isMatch = tag === "all" || tags.includes(normalizeTag(tag));
    card.style.display = isMatch ? "" : "none";
    if (isMatch) matches += 1;
  });

  if (emptyState) {
    if (matches === 0) {
      emptyState.textContent = "該当する記事がありません。";
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
    }
  }
};

const initTagFilters = () => {
  const container = document.querySelector("[data-blog-tags]");
  if (!container) return;

  const buttons = Array.from(container.querySelectorAll("[data-tag]"));
  if (buttons.length === 0) return;

  const setActive = (activeTag) => {
    buttons.forEach((button) => {
      const isActive = button.dataset.tag === activeTag;
      button.setAttribute("aria-pressed", String(isActive));
    });
    applyTagFilter(activeTag);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setActive(button.dataset.tag || "all");
    });
  });

  setActive("all");
};

const initBlogList = () => {
  const blogList = document.querySelector("[data-blog-list]");
  if (!blogList) return;

  const emptyState = document.querySelector("[data-blog-empty]");
  const postsUrl = blogList.dataset.postsUrl || "/blog/posts.json";

  const showEmpty = (message) => {
    if (!emptyState) return;
    if (message) {
      emptyState.textContent = message;
    }
    emptyState.hidden = false;
  };

  fetch(postsUrl, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load posts: ${response.status}`);
      }
      return response.json();
    })
    .then((posts) => {
      if (!Array.isArray(posts) || posts.length === 0) {
        showEmpty("現在、公開中の記事はありません。");
        return;
      }
      if (!blogList.querySelector(".blog-card")) {
        blogList.innerHTML = "";
        posts.forEach((post) => {
          if (post && post.url) {
            blogList.appendChild(createBlogCard(post));
          }
        });
      }
      if (!blogList.children.length) {
        showEmpty("現在、公開中の記事はありません。");
      }
      initTagFilters();
    })
    .catch(() => {
      showEmpty("記事一覧を読み込めませんでした。");
      initTagFilters();
    });
};

initBlogList();
