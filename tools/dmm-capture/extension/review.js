const STORAGE_KEYS = {
  captures: "dmmCaptureRecords",
  captureOrder: "dmmCaptureOrder",
  lastCaptureId: "dmmCaptureLastCaptureId",
  lastError: "dmmCaptureLastError",
  config: "dmmCaptureConfig",
};

const DEFAULT_SERVER_URL = "http://127.0.0.1:43123";

const state = {
  captureId: "",
  captureRecord: null,
  captures: {},
  captureOrder: [],
  saveTimer: null,
};

const elements = {
  pageTitle: document.getElementById("page-title"),
  pageSubtitle: document.getElementById("page-subtitle"),
  messageBox: document.getElementById("message-box"),
  summaryGrid: document.getElementById("summary-grid"),
  jsonPreview: document.getElementById("json-preview"),
  captureList: document.getElementById("capture-list"),
  characterObservationText: document.getElementById("character-observation-text"),
  noteText: document.getElementById("note-text"),
  internalTagsText: document.getElementById("internal-tags-text"),
  serverUrl: document.getElementById("server-url"),
  syncStatus: document.getElementById("sync-status"),
  copyJsonButton: document.getElementById("copy-json-button"),
  downloadJsonButton: document.getElementById("download-json-button"),
  pingServerButton: document.getElementById("ping-server-button"),
  sendInboxButton: document.getElementById("send-inbox-button"),
};

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await loadState();
  render();
});

function bindEvents() {
  [
    elements.characterObservationText,
    elements.noteText,
    elements.internalTagsText,
    elements.serverUrl,
  ].forEach((element) => {
    element.addEventListener("input", () => {
      syncFormIntoState();
      renderJsonPreview();
      queueSave();
    });
  });

  elements.copyJsonButton.addEventListener("click", async () => {
    if (!state.captureRecord) return;
    syncFormIntoState();
    await persistCurrentCapture();
    await navigator.clipboard.writeText(JSON.stringify(state.captureRecord, null, 2));
    setMessage("JSONをクリップボードにコピーしました。");
  });

  elements.downloadJsonButton.addEventListener("click", async () => {
    if (!state.captureRecord) return;
    syncFormIntoState();
    await persistCurrentCapture();
    const blob = new Blob([`${JSON.stringify(state.captureRecord, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const key = state.captureRecord.captureKey || state.captureRecord.captureId || "capture";
    anchor.href = url;
    anchor.download = `${key}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("JSONファイルを保存しました。");
  });

  elements.pingServerButton.addEventListener("click", async () => {
    const serverUrl = normalizeServerUrl(elements.serverUrl.value);
    if (!serverUrl) {
      setMessage("Server URL を入力してください。", true);
      return;
    }
    try {
      const response = await fetch(`${serverUrl}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      elements.syncStatus.textContent = `接続OK: ${payload.message}`;
      setMessage("ローカル inbox サーバーに接続できました。");
      await saveConfig({ serverUrl });
    } catch (error) {
      elements.syncStatus.textContent = `接続失敗: ${error.message}`;
      setMessage(`ローカル inbox サーバーへ接続できませんでした: ${error.message}`, true);
    }
  });

  elements.sendInboxButton.addEventListener("click", async () => {
    if (!state.captureRecord) return;

    const serverUrl = normalizeServerUrl(elements.serverUrl.value);
    if (!serverUrl) {
      setMessage("Server URL を入力してください。", true);
      return;
    }

    syncFormIntoState();
    state.captureRecord.sync.localInbox.serverUrl = serverUrl;
    state.captureRecord.sync.localInbox.lastAttemptAt = new Date().toISOString();
    state.captureRecord.sync.localInbox.errorMessage = "";
    await persistCurrentCapture();

    try {
      const response = await fetch(`${serverUrl}/captures`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(state.captureRecord),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      state.captureRecord.sync.localInbox.lastSuccessAt = payload.savedAt || new Date().toISOString();
      state.captureRecord.sync.localInbox.response = payload;
      state.captureRecord.sync.localInbox.errorMessage = "";
      await persistCurrentCapture();
      await saveConfig({ serverUrl });

      elements.syncStatus.textContent =
        `保存済み: ${payload.itemPath || ""} (${payload.savedAt || ""})`;
      setMessage("ローカル inbox に保存しました。");
    } catch (error) {
      state.captureRecord.sync.localInbox.errorMessage = error.message;
      await persistCurrentCapture();
      elements.syncStatus.textContent = `保存失敗: ${error.message}`;
      setMessage(`ローカル inbox への保存に失敗しました: ${error.message}`, true);
    }

    renderJsonPreview();
  });
}

async function loadState() {
  const url = new URL(window.location.href);
  const requestedCaptureId = url.searchParams.get("captureId") || "";
  const showLastError = url.searchParams.get("error") === "1";

  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.captures,
    STORAGE_KEYS.captureOrder,
    STORAGE_KEYS.lastCaptureId,
    STORAGE_KEYS.lastError,
    STORAGE_KEYS.config,
  ]);

  state.captures = stored[STORAGE_KEYS.captures] || {};
  state.captureOrder = stored[STORAGE_KEYS.captureOrder] || [];
  state.captureId =
    requestedCaptureId ||
    stored[STORAGE_KEYS.lastCaptureId] ||
    state.captureOrder[0] ||
    "";
  state.captureRecord = state.captureId ? state.captures[state.captureId] || null : null;

  const config = stored[STORAGE_KEYS.config] || {};
  elements.serverUrl.value = normalizeServerUrl(config.serverUrl) || DEFAULT_SERVER_URL;

  if (showLastError && stored[STORAGE_KEYS.lastError]?.message) {
    setMessage(stored[STORAGE_KEYS.lastError].message, true);
  } else if (!state.captureRecord) {
    setMessage("まだキャプチャがありません。DMM/FANZA作品ページでショートカットを押してください。");
  }
}

function render() {
  renderCaptureList();
  renderCaptureDetails();
  renderJsonPreview();
}

function renderCaptureList() {
  const fragment = document.createDocumentFragment();
  state.captureOrder.forEach((captureId) => {
    const capture = state.captures[captureId];
    if (!capture) return;
    const anchor = document.createElement("a");
    const title = capture.scraped?.title || capture.source?.pageTitle || capture.captureId;
    const meta = [
      capture.source?.contentId || "",
      capture.scraped?.circleName || "",
      formatDate(capture.capturedAt),
    ]
      .filter(Boolean)
      .join(" / ");

    anchor.href = `review.html?captureId=${encodeURIComponent(captureId)}`;
    if (captureId === state.captureId) {
      anchor.classList.add("is-active");
    }
    anchor.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(meta)}</span>`;
    fragment.append(anchor);
  });

  elements.captureList.replaceChildren(fragment);
}

function renderCaptureDetails() {
  if (!state.captureRecord) {
    elements.pageTitle.textContent = "キャプチャ未選択";
    elements.pageSubtitle.textContent = "";
    elements.summaryGrid.replaceChildren();
    return;
  }

  const capture = state.captureRecord;
  const scraped = capture.scraped || {};
  elements.pageTitle.textContent = scraped.title || capture.source?.pageTitle || "無題";
  elements.pageSubtitle.textContent = [
    capture.source?.contentId || "",
    scraped.circleName || "",
    formatDate(capture.capturedAt),
  ]
    .filter(Boolean)
    .join(" / ");

  elements.characterObservationText.value = capture.manual?.characterObservationText || "";
  elements.noteText.value = capture.manual?.noteText || "";
  elements.internalTagsText.value = capture.manual?.internalTagsText || "";
  elements.serverUrl.value =
    normalizeServerUrl(capture.sync?.localInbox?.serverUrl) || elements.serverUrl.value || DEFAULT_SERVER_URL;

  const sync = capture.sync?.localInbox;
  if (sync?.lastSuccessAt) {
    elements.syncStatus.textContent = `最後の保存: ${formatDate(sync.lastSuccessAt)} / ${sync.response?.itemPath || ""}`;
  } else if (sync?.errorMessage) {
    elements.syncStatus.textContent = `前回エラー: ${sync.errorMessage}`;
  } else {
    elements.syncStatus.textContent = "まだ inbox へ保存していません。";
  }

  const summaryItems = [
    summaryItem("タイトル", scraped.title),
    summaryItem("サークル", scraped.circleName),
    summaryItem("作者", scraped.authorName),
    summaryItem("CID", capture.source?.contentId),
    summaryItem("作品形式", scraped.format),
    summaryItem("ページ数", scraped.pageCountText),
    summaryItem("配信開始日", scraped.releaseDateText),
    summaryItem("シリーズ", scraped.seriesName),
    summaryItem("題材", scraped.theme),
    summaryItem("キャンペーン", scraped.campaignLabel || scraped.sale?.campaignRateText),
    summaryItem("価格", buildPriceSummary(scraped.sale)),
    summaryItem("ジャンル", (scraped.genreLabels || []).join(" / "), true),
    summaryItem("作品コメント", scraped.descriptionText, true),
    summaryItem("URL", capture.source?.pageUrl, true),
  ].filter(Boolean);

  elements.summaryGrid.replaceChildren(...summaryItems);
}

function summaryItem(label, value, fullWidth = false) {
  if (!value) return null;
  const dl = document.createElement("dl");
  dl.className = `summary-item${fullWidth ? " summary-item--full" : ""}`;
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  dl.append(dt, dd);
  return dl;
}

function buildPriceSummary(sale) {
  if (!sale) return "";
  const parts = [];
  if (sale.currentPriceText) {
    parts.push(`${sale.currentPriceLabel || "現在価格"}: ${sale.currentPriceText}`);
  }
  if (sale.regularPriceText) {
    parts.push(`元価格: ${sale.regularPriceText}`);
  }
  if (sale.campaignRateText) {
    parts.push(sale.campaignRateText);
  }
  if (sale.campaignEndsText) {
    parts.push(sale.campaignEndsText);
  }
  return parts.join(" / ");
}

function renderJsonPreview() {
  if (!state.captureRecord) {
    elements.jsonPreview.textContent = "";
    return;
  }
  elements.jsonPreview.textContent = `${JSON.stringify(state.captureRecord, null, 2)}\n`;
}

function syncFormIntoState() {
  if (!state.captureRecord) return;
  state.captureRecord.manual = {
    characterObservationText: elements.characterObservationText.value.trim(),
    noteText: elements.noteText.value.trim(),
    internalTagsText: elements.internalTagsText.value.trim(),
  };
  state.captureRecord.sync = state.captureRecord.sync || { localInbox: {} };
  state.captureRecord.sync.localInbox = state.captureRecord.sync.localInbox || {};
  state.captureRecord.sync.localInbox.serverUrl = normalizeServerUrl(elements.serverUrl.value);
}

function queueSave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(async () => {
    await persistCurrentCapture();
  }, 250);
}

async function persistCurrentCapture() {
  if (!state.captureRecord) return;
  state.captures[state.captureId] = state.captureRecord;
  await chrome.storage.local.set({
    [STORAGE_KEYS.captures]: state.captures,
  });
}

async function saveConfig(nextConfig) {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.config]);
  const config = stored[STORAGE_KEYS.config] || {};
  await chrome.storage.local.set({
    [STORAGE_KEYS.config]: {
      ...config,
      ...nextConfig,
    },
  });
}

function normalizeServerUrl(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  return trimmed || "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
}

function setMessage(text, isError = false) {
  elements.messageBox.hidden = !text;
  elements.messageBox.textContent = text || "";
  elements.messageBox.style.borderColor = isError ? "#c77944" : "#8b5e34";
  elements.messageBox.style.background = isError ? "#fff2e8" : "#f6efe2";
  elements.messageBox.style.color = isError ? "#7d3914" : "#533820";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
