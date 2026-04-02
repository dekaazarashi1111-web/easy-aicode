(function (root, factory) {
  const articles = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = articles;
  }
  root.ARTICLE_INDEX = articles;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return [];
});
