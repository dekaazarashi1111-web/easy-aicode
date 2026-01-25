const STRIPE_URL = "REPLACE_ME_STRIPE_LINK";

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
