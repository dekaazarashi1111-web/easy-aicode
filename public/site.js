const STRIPE_URL = "REPLACE_ME_STRIPE_LINK";

const buyLinks = document.querySelectorAll('a[data-stripe="buy"]');

const enableStripe = (url) => {
  buyLinks.forEach((link) => {
    link.setAttribute("href", url);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });
};

const disableStripe = () => {
  buyLinks.forEach((link) => {
    link.setAttribute("href", "#");
    link.setAttribute("aria-disabled", "true");
    link.classList.add("btn--disabled");
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
