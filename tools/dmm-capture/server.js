#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const ITEMS_DIR = path.join(DATA_DIR, "dmm-capture-items");
const INBOX_PATH = path.join(DATA_DIR, "dmm-capture-inbox.json");
const HOST = process.env.DMM_CAPTURE_HOST || "127.0.0.1";
const PORT = Number.parseInt(process.env.DMM_CAPTURE_PORT || "43123", 10);
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const INBOX_SCHEMA_VERSION = 1;

const normalizeText = (value) =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const ensureDataDirs = () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(ITEMS_DIR, { recursive: true });
};

const readInbox = () => {
  ensureDataDirs();
  if (!fs.existsSync(INBOX_PATH)) {
    return {
      schemaVersion: INBOX_SCHEMA_VERSION,
      updatedAt: "",
      items: [],
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(INBOX_PATH, "utf8"));
    if (!parsed || typeof parsed !== "object") {
      throw new Error("inbox root must be an object");
    }
    return {
      schemaVersion: parsed.schemaVersion || INBOX_SCHEMA_VERSION,
      updatedAt: parsed.updatedAt || "",
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch (error) {
    throw new Error(`Failed to read inbox file: ${error.message}`);
  }
};

const writeInbox = (inbox) => {
  ensureDataDirs();
  fs.writeFileSync(INBOX_PATH, `${JSON.stringify(inbox, null, 2)}\n`, "utf8");
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
};

const sendHtml = (response, html) => {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  response.end(html);
};

const parseRequestBody = (request) =>
  new Promise((resolve, reject) => {
    let size = 0;
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large"));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on("end", () => {
      resolve(body);
    });
    request.on("error", (error) => {
      reject(error);
    });
  });

const buildItemPath = (captureId) => path.join(ITEMS_DIR, `${captureId}.json`);

const validatePayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be an object");
  }
  if (!payload.captureId || typeof payload.captureId !== "string") {
    throw new Error("captureId is required");
  }
  if (!payload.captureKey || typeof payload.captureKey !== "string") {
    throw new Error("captureKey is required");
  }
  if (!payload.source || typeof payload.source !== "object") {
    throw new Error("source is required");
  }
  if (!payload.source.pageUrl) {
    throw new Error("source.pageUrl is required");
  }
};

const buildInboxSummary = (payload, savedAt, itemPath) => {
  const scraped = payload.scraped || {};
  return {
    captureId: payload.captureId,
    captureKey: payload.captureKey,
    savedAt,
    capturedAt: payload.capturedAt || "",
    contentId: payload.source?.contentId || "",
    pageUrl: payload.source?.pageUrl || "",
    title: scraped.title || payload.source?.pageTitle || "",
    circleName: scraped.circleName || "",
    authorName: scraped.authorName || "",
    manualCharacterObservationText: normalizeText(payload.manual?.characterObservationText || ""),
    manualNoteText: normalizeText(payload.manual?.noteText || ""),
    inboxItemPath: path.relative(ROOT_DIR, itemPath).split(path.sep).join("/"),
  };
};

const saveCapture = (payload) => {
  validatePayload(payload);
  ensureDataDirs();

  const savedAt = new Date().toISOString();
  const itemPath = buildItemPath(payload.captureId);
  const nextPayload = {
    ...payload,
    workflow: {
      ...(payload.workflow || {}),
      lastInboxSavedAt: savedAt,
    },
  };

  fs.writeFileSync(itemPath, `${JSON.stringify(nextPayload, null, 2)}\n`, "utf8");

  const inbox = readInbox();
  const summary = buildInboxSummary(nextPayload, savedAt, itemPath);
  const remainingItems = inbox.items.filter((item) => item.captureKey !== summary.captureKey);

  inbox.updatedAt = savedAt;
  inbox.items = [summary, ...remainingItems].sort((left, right) =>
    String(right.savedAt || "").localeCompare(String(left.savedAt || ""))
  );
  writeInbox(inbox);

  return {
    ok: true,
    savedAt,
    captureId: payload.captureId,
    captureKey: payload.captureKey,
    itemPath: path.relative(ROOT_DIR, itemPath).split(path.sep).join("/"),
    inboxPath: path.relative(ROOT_DIR, INBOX_PATH).split(path.sep).join("/"),
  };
};

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      message: "DMM capture inbox server is running",
      host: HOST,
      port: PORT,
      inboxPath: path.relative(ROOT_DIR, INBOX_PATH).split(path.sep).join("/"),
    });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/captures") {
    try {
      sendJson(response, 200, readInbox());
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error.message,
      });
    }
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/captures") {
    try {
      const rawBody = await parseRequestBody(request);
      const payload = JSON.parse(rawBody);
      const result = saveCapture(payload);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 400, {
        ok: false,
        error: error.message,
      });
    }
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/") {
    const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>DMM Capture Inbox Server</title>
    <style>
      body { font-family: "Yu Gothic UI", "Yu Gothic", sans-serif; margin: 2rem; line-height: 1.6; color: #1f1b16; background: #f7f2e8; }
      code, pre { background: #fffaf2; padding: 0.2rem 0.35rem; border-radius: 6px; }
      pre { padding: 1rem; overflow: auto; border: 1px solid #d7c8b1; }
    </style>
  </head>
  <body>
    <h1>DMM Capture Inbox Server</h1>
    <p>Windows Chrome の拡張から受け取った JSON をローカル保存するサーバーです。</p>
    <ul>
      <li><code>GET /health</code></li>
      <li><code>GET /captures</code></li>
      <li><code>POST /captures</code></li>
    </ul>
    <p>保存先:</p>
    <pre>${path.relative(ROOT_DIR, INBOX_PATH).split(path.sep).join("/")}\n${path
      .relative(ROOT_DIR, ITEMS_DIR)
      .split(path.sep)
      .join("/")}/&lt;captureId&gt;.json</pre>
  </body>
</html>`;
    sendHtml(response, html);
    return;
  }

  sendJson(response, 404, {
    ok: false,
    error: "Not found",
  });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(
    [
      `DMM capture inbox server listening on http://${HOST}:${PORT}`,
      `Inbox file: ${path.relative(ROOT_DIR, INBOX_PATH).split(path.sep).join("/")}`,
      `Item dir: ${path.relative(ROOT_DIR, ITEMS_DIR).split(path.sep).join("/")}`,
      "",
    ].join("\n")
  );
});
