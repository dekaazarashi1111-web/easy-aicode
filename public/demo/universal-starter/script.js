(function () {
  const THEMES = new Set(["minimal", "cute", "business", "dark"]);

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("theme");
  const embed = params.get("embed");
  const fromStorage = (() => {
    try {
      return localStorage.getItem("cc_theme");
    } catch {
      return null;
    }
  })();

  const theme = THEMES.has(fromQuery) ? fromQuery : THEMES.has(fromStorage) ? fromStorage : "minimal";

  document.documentElement.dataset.theme = theme;
  if (embed === "1" || embed === "true") {
    document.documentElement.dataset.embed = "true";
  }
  // Helps native controls (e.g. form inputs) in some browsers
  document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";

  const label = document.querySelector("[data-theme-label]");
  if (label) label.textContent = theme;

  // Persist last theme (unless explicitly disabled)
  try {
    if (fromQuery && THEMES.has(fromQuery)) {
      localStorage.setItem("cc_theme", fromQuery);
    } else if (!fromStorage) {
      localStorage.setItem("cc_theme", theme);
    }
  } catch {
    // ignore
  }
})();
