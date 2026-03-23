(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.ArticleSearch = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TYPE_ORDER = ["比較記事", "レビュー記事", "使い方ガイド", "ニュース", "コラム"];

  const normalizeSearchValue = (value) =>
    (value || "")
      .toString()
      .toLowerCase()
      .replace(/\u3000/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const splitSearchTokens = (value) =>
    normalizeSearchValue(value)
      .split(" ")
      .map((token) => token.trim())
      .filter(Boolean);

  const normalizeList = (values) =>
    (values || [])
      .map((value) => normalizeSearchValue(value))
      .filter(Boolean);

  const decorateArticle = (article) => {
    const tags = Array.isArray(article.tags) ? article.tags.filter(Boolean) : [];
    const keywords = Array.isArray(article.keywords) ? article.keywords.filter(Boolean) : [];
    return {
      ...article,
      tags,
      keywords,
      _normalized: {
        title: normalizeSearchValue(article.title),
        summary: normalizeSearchValue(article.summary),
        type: normalizeSearchValue(article.type),
        tags: normalizeList(tags),
        keywords: normalizeList(keywords),
        haystack: normalizeSearchValue(
          [article.title, article.summary, article.type, tags.join(" "), keywords.join(" ")].join(" ")
        ),
      },
    };
  };

  const decorateArticles = (articles) => (articles || []).map(decorateArticle);

  const sortByTypeOrder = (left, right) => {
    const leftIndex = TYPE_ORDER.indexOf(left.value);
    const rightIndex = TYPE_ORDER.indexOf(right.value);
    const normalizedLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    if (normalizedLeftIndex !== normalizedRightIndex) {
      return normalizedLeftIndex - normalizedRightIndex;
    }
    return left.value.localeCompare(right.value, "ja");
  };

  const collectFilterOptions = (articles) => {
    const decorated = decorateArticles(articles);
    const typeCounts = new Map();
    const tagCounts = new Map();

    decorated.forEach((article) => {
      typeCounts.set(article.type, (typeCounts.get(article.type) || 0) + 1);
      article.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const types = Array.from(typeCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort(sortByTypeOrder);

    const tags = Array.from(tagCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return left.value.localeCompare(right.value, "ja");
      });

    return { types, tags };
  };

  const matchesText = (tokens, haystack, mode) => {
    if (!tokens.length) return null;
    return mode === "and"
      ? tokens.every((token) => haystack.includes(token))
      : tokens.some((token) => haystack.includes(token));
  };

  const matchesList = (selectedValues, itemValues, mode) => {
    if (!selectedValues.length) return null;
    const normalizedSelectedValues = normalizeList(selectedValues);
    const normalizedItemValues = new Set(normalizeList(itemValues));
    return mode === "and"
      ? normalizedSelectedValues.every((value) => normalizedItemValues.has(value))
      : normalizedSelectedValues.some((value) => normalizedItemValues.has(value));
  };

  const filterArticles = ({
    articles,
    query = "",
    mode = "and",
    selectedTypes = [],
    selectedTags = [],
  }) => {
    const decorated = decorateArticles(articles);
    const normalizedMode = mode === "or" ? "or" : "and";
    const queryTokens = splitSearchTokens(query);

    return decorated.filter((article) => {
      const checks = [];
      const textMatch = matchesText(queryTokens, article._normalized.haystack, normalizedMode);
      const typeMatch = matchesList(selectedTypes, [article.type], normalizedMode);
      const tagMatch = matchesList(selectedTags, article.tags, normalizedMode);

      if (textMatch !== null) checks.push(textMatch);
      if (typeMatch !== null) checks.push(typeMatch);
      if (tagMatch !== null) checks.push(tagMatch);

      if (!checks.length) return true;
      return normalizedMode === "and" ? checks.every(Boolean) : checks.some(Boolean);
    });
  };

  return {
    normalizeSearchValue,
    splitSearchTokens,
    normalizeList,
    decorateArticles,
    collectFilterOptions,
    filterArticles,
  };
});
