#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn, spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DEFAULT_ROUTES = [
  "/",
  "/finder/?include=tf-present",
  "/builder/?include=tf-present&include=no-ntr",
  "/work/?slug=pocket-shift-memo",
];
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4173;
const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 3200;
const DEFAULT_TIMEOUT_MS = 60000;

function log(message) {
  process.stdout.write(`[local-screens] ${message}\n`);
}

function fail(message) {
  process.stderr.write(`[local-screens] ${message}\n`);
  process.exit(1);
}

function getRoutes() {
  const raw = process.env.LOCAL_SCREENSHOT_ROUTES;
  if (!raw) return DEFAULT_ROUTES;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function resolveBrowser() {
  const candidates = [
    process.env.LOCAL_SCREENSHOT_BROWSER,
    process.env.CHROME_BIN,
    "chromium",
    "/snap/bin/chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable",
    "chrome",
  ].filter(Boolean);

  if (process.platform === "win32") {
    candidates.push(
      String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
      String.raw`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
    );
  }

  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], {
      cwd: ROOT,
      timeout: 5000,
      stdio: "ignore",
    });
    if (probe.status === 0) return candidate;
  }

  fail("Chromium 系ブラウザが見つかりません。LOCAL_SCREENSHOT_BROWSER を指定してください。");
}

function getTimestamp() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];
  return parts.join("");
}

function buildOutputDir() {
  const configured = process.env.LOCAL_SCREENSHOT_OUTPUT_DIR;
  if (configured) return path.resolve(configured);
  return path.join(ROOT, "artifacts", "local-ui-screenshots", getTimestamp());
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

function resolvePublicPath(urlPathname) {
  const decoded = decodeURIComponent(urlPathname);
  let targetPath = path.join(PUBLIC_DIR, decoded);
  if (decoded.endsWith("/")) {
    targetPath = path.join(PUBLIC_DIR, decoded, "index.html");
  } else if (!path.extname(decoded)) {
    targetPath = path.join(PUBLIC_DIR, decoded, "index.html");
    if (!fs.existsSync(targetPath)) {
      targetPath = path.join(PUBLIC_DIR, decoded);
    }
  }
  return targetPath;
}

function startServer(host, port) {
  const server = http.createServer((req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", `http://${host}:${port}`);
      let filePath = resolvePublicPath(requestUrl.pathname);

      if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end("forbidden");
        return;
      }

      if (!fs.existsSync(filePath) && !path.extname(filePath)) {
        filePath = path.join(filePath, "index.html");
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }

      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      res.writeHead(200, { "Content-Type": getMimeType(filePath) });
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve(server));
  });
}

function buildOutputPath(route, outputDir) {
  const url = new URL(route, "http://local.test");
  const segments = url.pathname.split("/").filter(Boolean);
  const cleanedSegments = segments.map((segment) =>
    segment.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "index"
  );
  let fileName = cleanedSegments.length ? "index" : "index";
  const dir = cleanedSegments.length ? path.join(outputDir, ...cleanedSegments) : outputDir;
  const queryParts = [];
  url.searchParams.sort();
  for (const [key, value] of url.searchParams.entries()) {
    queryParts.push(`${key}-${value}`.replace(/[^A-Za-z0-9._-]+/g, "-"));
  }
  if (queryParts.length) {
    fileName += `__${queryParts.join("__")}`;
  }
  return path.join(dir, `${fileName}.png`);
}

function runBrowser(browserPath, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(browserPath, args, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    const stdout = [];
    const stderr = [];
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`chromium が ${timeoutMs}ms を超えました`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(Buffer.concat(stderr).toString("utf8")));
        return;
      }
      resolve({
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}

async function main() {
  const browserPath = resolveBrowser();
  const outputDir = buildOutputDir();
  const routes = getRoutes();
  const width = Number.parseInt(process.env.LOCAL_SCREENSHOT_WIDTH || `${DEFAULT_WIDTH}`, 10);
  const height = Number.parseInt(process.env.LOCAL_SCREENSHOT_HEIGHT || `${DEFAULT_HEIGHT}`, 10);
  const timeoutMs = Number.parseInt(process.env.LOCAL_SCREENSHOT_TIMEOUT_MS || `${DEFAULT_TIMEOUT_MS}`, 10);
  const host = process.env.LOCAL_SCREENSHOT_HOST || DEFAULT_HOST;
  const port = Number.parseInt(process.env.LOCAL_SCREENSHOT_PORT || `${DEFAULT_PORT}`, 10);

  fs.mkdirSync(outputDir, { recursive: true });
  const server = await startServer(host, port);
  log(`server: http://${host}:${port}/`);
  log(`output: ${path.relative(ROOT, outputDir)}`);

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: `http://${host}:${port}/`,
    pageCount: routes.length,
    pages: [],
  };

  try {
    for (const route of routes) {
      const targetUrl = new URL(route, manifest.baseUrl).toString();
      const outputPath = buildOutputPath(route, outputDir);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      await runBrowser(
        browserPath,
        [
          "--headless",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--hide-scrollbars",
          "--no-sandbox",
          `--window-size=${width},${height}`,
          `--screenshot=${path.relative(ROOT, outputPath)}`,
          targetUrl,
        ],
        timeoutMs
      );
      manifest.pages.push({
        route,
        url: targetUrl,
        screenshot: path.relative(ROOT, outputPath),
      });
      log(`captured: ${route}`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(
    path.join(outputDir, "summary.txt"),
    [
      `generatedAt: ${manifest.generatedAt}`,
      `baseUrl: ${manifest.baseUrl}`,
      `pageCount: ${manifest.pageCount}`,
      "",
      ...manifest.pages.map((page) => `- ${page.route} -> ${page.screenshot}`),
      "",
    ].join("\n")
  );

  log(`manifest: ${path.relative(ROOT, path.join(outputDir, "manifest.json"))}`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
