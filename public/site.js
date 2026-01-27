const STRIPE_URL = "REPLACE_ME_STRIPE_LINK";
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

const enableStripe = (url) => {
  buyLinks.forEach((link) => {
    link.setAttribute("href", url);
    link.removeAttribute("aria-disabled");
    link.classList.remove("btn--disabled");
    setText(link, getEnabledText(link));
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });
};

const disableStripe = () => {
  buyLinks.forEach((link) => {
    const disabledText = link.dataset.disabledText;
    link.setAttribute("href", "#");
    link.setAttribute("aria-disabled", "true");
    link.classList.add("btn--disabled");
    setText(link, disabledText);
    link.removeAttribute("target");
    link.removeAttribute("rel");
    link.addEventListener("click", (event) => event.preventDefault());
  });
};

if (buyLinks.length > 0) {
  if (STRIPE_URL && STRIPE_URL !== "REPLACE_ME_STRIPE_LINK") {
    enableStripe(STRIPE_URL);
  } else {
    disableStripe();
  }
}

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
      blogList.innerHTML = "";
      posts.forEach((post) => {
        if (post && post.url) {
          blogList.appendChild(createBlogCard(post));
        }
      });
      if (!blogList.children.length) {
        showEmpty("現在、公開中の記事はありません。");
      }
    })
    .catch(() => {
      showEmpty("記事一覧を読み込めませんでした。");
    });
};

initBlogList();
