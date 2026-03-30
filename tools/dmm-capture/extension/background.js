const STORAGE_KEYS = {
  captures: "dmmCaptureRecords",
  captureOrder: "dmmCaptureOrder",
  lastCaptureId: "dmmCaptureLastCaptureId",
  lastError: "dmmCaptureLastError",
};

const CAPTURE_SCHEMA_VERSION = 1;
const CAPTURE_PARSER_VERSION = 1;
const MAX_CAPTURE_COUNT = 40;

chrome.action.onClicked.addListener(async (tab) => {
  await handleCapture(tab);
});

async function handleCapture(tab) {
  try {
    if (!tab || !tab.id) {
      throw new Error("有効なタブが見つかりませんでした。");
    }

    const [execution] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectDmmDetailPage,
    });

    const result = execution?.result;
    if (!result?.ok) {
      throw new Error(result?.error || "ページ情報の抽出に失敗しました。");
    }

    const captureRecord = buildCaptureRecord(result.capture, tab);
    await storeCaptureRecord(captureRecord);
    await chrome.tabs.create({
      url: chrome.runtime.getURL(
        `review.html?captureId=${encodeURIComponent(captureRecord.captureId)}`
      ),
    });
  } catch (error) {
    const payload = {
      createdAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error || "不明なエラー"),
      pageUrl: tab?.url || "",
    };
    await chrome.storage.local.set({
      [STORAGE_KEYS.lastError]: payload,
    });
    await chrome.tabs.create({
      url: chrome.runtime.getURL("review.html?error=1"),
    });
  }
}

function buildCaptureRecord(rawCapture, tab) {
  const capturedAt = new Date().toISOString();
  const sanitizedContentId = String(rawCapture.contentId || "unknown").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const captureId = `capture-${sanitizedContentId}-${Date.now()}`;

  return {
    schemaVersion: CAPTURE_SCHEMA_VERSION,
    captureParserVersion: CAPTURE_PARSER_VERSION,
    captureId,
    captureKey: rawCapture.contentId ? `dmm-${rawCapture.contentId}` : `url-${Date.now()}`,
    capturedAt,
    workflow: {
      status: "captured",
      readyForImport: false,
    },
    source: {
      platform: "dmm-doujin-detail",
      tabId: tab?.id || null,
      windowId: tab?.windowId || null,
      pageUrl: rawCapture.pageUrl || tab?.url || "",
      canonicalUrl: rawCapture.canonicalUrl || "",
      pageTitle: rawCapture.pageTitle || tab?.title || "",
      contentId: rawCapture.contentId || "",
      contentType: rawCapture.contentType || "",
      capturedWith: "chrome-extension",
    },
    scraped: rawCapture.scraped,
    manual: {
      characterObservationText: "",
      noteText: "",
      internalTagsText: "",
    },
    sync: {
      localInbox: {
        serverUrl: "http://127.0.0.1:43123",
        lastAttemptAt: "",
        lastSuccessAt: "",
        response: null,
        errorMessage: "",
      },
    },
  };
}

async function storeCaptureRecord(record) {
  const state = await chrome.storage.local.get([
    STORAGE_KEYS.captures,
    STORAGE_KEYS.captureOrder,
  ]);
  const existingCaptures = state[STORAGE_KEYS.captures] || {};
  const existingOrder = state[STORAGE_KEYS.captureOrder] || [];
  const nextCaptures = {
    ...existingCaptures,
    [record.captureId]: record,
  };
  const nextOrder = [record.captureId, ...existingOrder.filter((id) => id !== record.captureId)].slice(
    0,
    MAX_CAPTURE_COUNT
  );
  const trimmedCaptures = {};
  nextOrder.forEach((captureId) => {
    if (nextCaptures[captureId]) {
      trimmedCaptures[captureId] = nextCaptures[captureId];
    }
  });

  await chrome.storage.local.set({
    [STORAGE_KEYS.captures]: trimmedCaptures,
    [STORAGE_KEYS.captureOrder]: nextOrder,
    [STORAGE_KEYS.lastCaptureId]: record.captureId,
    [STORAGE_KEYS.lastError]: null,
  });
}

function collectDmmDetailPage() {
  const normalizeInlineText = (value) =>
    String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\u3000/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .trim();

  const normalizeMultilineText = (value) =>
    String(value || "")
      .replace(/\r/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/\u3000/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const getText = (node) => normalizeInlineText(node?.innerText || node?.textContent || "");
  const getMultilineText = (node) => normalizeMultilineText(node?.innerText || node?.textContent || "");
  const query = (selector, root = document) => root.querySelector(selector);
  const queryAll = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const unique = (values) => Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
  const parseIntValue = (value) => {
    const match = String(value || "").match(/([0-9][0-9,]*)/);
    return match ? Number.parseInt(match[1].replace(/,/g, ""), 10) : null;
  };
  const parsePriceJPY = (value) => {
    const match = String(value || "").match(/([0-9][0-9,]*)\s*円/);
    return match ? Number.parseInt(match[1].replace(/,/g, ""), 10) : null;
  };
  const parseDateToIso = (value) => {
    const match = String(value || "").match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (!match) return "";
    const [, year, month, day, hour = "00", minute = "00"] = match;
    const pad = (token) => String(token).padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+09:00`;
  };
  const safeJsonParse = (value) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  };
  const getMetaContent = (selector) => query(selector)?.getAttribute("content") || "";

  const titleNode = query(".productTitle h1");
  if (!titleNode) {
    return {
      ok: false,
      error: "DMM/FANZA 同人の作品詳細ページではないため取り込めませんでした。",
    };
  }

  const titleClone = titleNode.cloneNode(true);
  queryAll(".productTitle__txt--campaign", titleClone).forEach((node) => node.remove());
  const title = getText(titleClone);
  const contentIdMatch =
    location.href.match(/[?&/]cid=([^/?&]+)/i) || location.pathname.match(/cid=([^/]+)/i);
  const contentId = contentIdMatch ? contentIdMatch[1] : "";

  const infoMap = {};
  queryAll(".productInformation .informationList").forEach((dl) => {
    const label = getText(query(".informationList__ttl", dl));
    if (!label) return;
    const genreItems = queryAll(".genreTag__txt", dl).map((node) => getText(node)).filter(Boolean);
    if (genreItems.length) {
      infoMap[label] = genreItems;
      return;
    }
    const valueNode =
      query(".informationList__txt", dl) ||
      query(".informationList__item", dl) ||
      query("dd", dl);
    infoMap[label] = getText(valueNode);
  });

  const breadcrumbItems = queryAll(".breadcrumbList__item").map((node) => {
    const link = query("a", node);
    return {
      label: getText(link || node),
      url: link?.href || "",
    };
  });

  const jsonLdProduct = queryAll('script[type="application/ld+json"]')
    .map((node) => safeJsonParse(node.textContent || ""))
    .find((item) => item && item["@type"] === "Product");

  const sampleImageUrls = unique(
    queryAll(".productPreview a.fn-colorbox")
      .map((node) => node.getAttribute("href") || "")
      .filter(Boolean)
  );

  const thumbnailUrls = unique(
    queryAll(".previewList__item img")
      .map((node) => node.getAttribute("src") || "")
      .filter(Boolean)
  );

  const campaignBalloonTitle = getText(query(".l-areaPurchase .campaignBalloon__ttl"));
  const campaignBalloonEnds = getText(query(".l-areaPurchase .campaignBalloon__txt"));
  const currentPriceLabel = getText(query(".l-areaPurchase .priceContainer .priceList__ttl"));
  const currentPriceText = getText(query(".l-areaPurchase .priceContainer .priceList__main"));
  const regularPriceText = getText(query(".l-areaPurchase .priceContainer .priceList__sub--big"));
  const descriptionNode = query(".summary__txt");
  const favoriteText = getText(query(".favorites__txt"));
  const reviewText = getText(query(".userReview__txt"));
  const campaignBadgeText = getText(query(".productTitle__txt--campaign"));
  const circleLink = query(".circleName__txt");
  const authorLink = query('.productInformation .informationList a[href*="/article=creator/"]');

  const capture = {
    pageUrl: location.href,
    canonicalUrl: query('link[rel="canonical"]')?.href || "",
    pageTitle: document.title || "",
    contentId,
    contentType: query("#fn-featureCarousel")?.getAttribute("data-content-type") || "",
    scraped: {
      title,
      campaignBadgeText,
      circleName: getText(circleLink),
      circleUrl: circleLink?.href || "",
      authorName: Array.isArray(infoMap["作者"]) ? infoMap["作者"][0] : infoMap["作者"] || "",
      authorUrl: authorLink?.href || "",
      format: Array.isArray(infoMap["作品形式"]) ? infoMap["作品形式"][0] : infoMap["作品形式"] || "",
      pageCountText: Array.isArray(infoMap["ページ数"]) ? infoMap["ページ数"][0] : infoMap["ページ数"] || "",
      pageCount: parseIntValue(infoMap["ページ数"]),
      seriesName: Array.isArray(infoMap["シリーズ"]) ? infoMap["シリーズ"][0] : infoMap["シリーズ"] || "",
      theme: Array.isArray(infoMap["題材"]) ? infoMap["題材"][0] : infoMap["題材"] || "",
      campaignLabel:
        Array.isArray(infoMap["キャンペーン"]) ? infoMap["キャンペーン"][0] : infoMap["キャンペーン"] || "",
      releaseDateText:
        Array.isArray(infoMap["配信開始日"]) ? infoMap["配信開始日"][0] : infoMap["配信開始日"] || "",
      releaseDateIso: parseDateToIso(infoMap["配信開始日"]),
      genreLabels: Array.isArray(infoMap["ジャンル"]) ? infoMap["ジャンル"] : [],
      fileSizeText:
        Array.isArray(infoMap["ファイル容量"]) ? infoMap["ファイル容量"][0] : infoMap["ファイル容量"] || "",
      usageLimit:
        Array.isArray(infoMap["利用期限"]) ? infoMap["利用期限"][0] : infoMap["利用期限"] || "",
      descriptionText: getMultilineText(descriptionNode),
      metaDescription: getMetaContent('meta[name="description"]'),
      ogDescription: getMetaContent('meta[property="og:description"]'),
      sale: {
        currentPriceLabel,
        currentPriceText,
        currentPriceJPY: parsePriceJPY(currentPriceText),
        regularPriceText,
        regularPriceJPY: parsePriceJPY(regularPriceText),
        campaignRateText: campaignBalloonTitle.split(/\s+/)[0] || "",
        campaignEndsText: campaignBalloonEnds,
      },
      favorites: {
        text: favoriteText,
        count: parseIntValue(favoriteText),
      },
      reviews: {
        text: reviewText,
        count: parseIntValue(reviewText),
      },
      images: {
        coverUrl:
          getMetaContent('meta[property="og:image"]') ||
          (Array.isArray(jsonLdProduct?.image) ? jsonLdProduct.image[0] : jsonLdProduct?.image || ""),
        sampleImageUrls,
        thumbnailUrls,
      },
      infoMap,
      breadcrumbs: breadcrumbItems,
      jsonLdProduct: jsonLdProduct || null,
    },
  };

  return {
    ok: true,
    capture,
  };
}
