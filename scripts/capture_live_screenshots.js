#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DEFAULT_BASE_URL = "https://wintergator.com/";
const DEFAULT_OUTPUT_DIR = path.join(ROOT, "artifacts", "live-screenshots", "latest");
const DEFAULT_MAX_PAGES = 200;
const DEFAULT_VIRTUAL_TIME_BUDGET_MS = 5000;
const DEFAULT_WINDOW_WIDTH = 1440;
const DEFAULT_WINDOW_HEIGHT = 9000;
const DEFAULT_COMMAND_TIMEOUT_MS = 60000;
const SAME_PATH_QUERY_CHAIN_BLOCKLIST = new Set(["/finder/", "/articles/"]);

function log(message) {
  process.stdout.write(`[screenshots] ${message}\n`);
}

function warn(message) {
  process.stderr.write(`[screenshots] ${message}\n`);
}

function fail(message) {
  warn(message);
  process.exit(1);
}

function getIntEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function printHelp() {
  process.stdout.write(
    [
      "usage: node scripts/capture_live_screenshots.js [base-url]",
      "",
      "env:",
      "  LIVE_SCREENSHOT_BASE_URL        default: https://wintergator.com/",
      "  LIVE_SCREENSHOT_OUTPUT_DIR      default: artifacts/live-screenshots/latest",
      "  LIVE_SCREENSHOT_BROWSER         chromium executable path",
      "  LIVE_SCREENSHOT_MAX_PAGES       default: 200",
      "  LIVE_SCREENSHOT_VIRTUAL_TIME_MS default: 5000",
      "  LIVE_SCREENSHOT_WINDOW_WIDTH    default: 1440",
      "  LIVE_SCREENSHOT_WINDOW_HEIGHT   default: 9000",
      "  LIVE_SCREENSHOT_TIMEOUT_MS      default: 60000",
    ].join("\n") + "\n"
  );
}

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

const baseUrlInput = process.env.LIVE_SCREENSHOT_BASE_URL || argv[0] || DEFAULT_BASE_URL;
let baseUrl;

try {
  baseUrl = new URL(baseUrlInput);
} catch (error) {
  fail(`base URL を解釈できません: ${baseUrlInput}`);
}

if (!["http:", "https:"].includes(baseUrl.protocol)) {
  fail(`HTTP/HTTPS の URL を指定してください: ${baseUrlInput}`);
}

baseUrl.hash = "";
const baseOrigin = baseUrl.origin;
const outputDir = path.resolve(process.env.LIVE_SCREENSHOT_OUTPUT_DIR || DEFAULT_OUTPUT_DIR);
const maxPages = getIntEnv("LIVE_SCREENSHOT_MAX_PAGES", DEFAULT_MAX_PAGES);
const virtualTimeMs = getIntEnv("LIVE_SCREENSHOT_VIRTUAL_TIME_MS", DEFAULT_VIRTUAL_TIME_BUDGET_MS);
const windowWidth = getIntEnv("LIVE_SCREENSHOT_WINDOW_WIDTH", DEFAULT_WINDOW_WIDTH);
const windowHeight = getIntEnv("LIVE_SCREENSHOT_WINDOW_HEIGHT", DEFAULT_WINDOW_HEIGHT);
const commandTimeoutMs = getIntEnv("LIVE_SCREENSHOT_TIMEOUT_MS", DEFAULT_COMMAND_TIMEOUT_MS);

function resolveBrowser() {
  const candidates = [
    process.env.LIVE_SCREENSHOT_BROWSER,
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
      String.raw`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`,
      String.raw`C:\Program Files\Chromium\Application\chrome.exe`
    );
  }

  const seen = new Set();
  for (const candidate of candidates) {
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    const probe = spawnSync(candidate, ["--version"], {
      cwd: ROOT,
      timeout: 5000,
      stdio: "ignore",
    });
    if (probe.status === 0) {
      return candidate;
    }
  }

  fail("Chromium 系ブラウザが見つかりません。LIVE_SCREENSHOT_BROWSER を指定してください。");
}

const browserPath = resolveBrowser();

function runBrowser(args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(browserPath, args, {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`${label} が ${commandTimeoutMs}ms を超えました。`));
    }, commandTimeoutMs);

    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const stderrTail = stderr.trim().split("\n").slice(-8).join("\n");
      reject(new Error(`${label} が終了コード ${code} で失敗しました。\n${stderrTail}`));
    });
  });
}

function buildBrowserArgs(extraArgs, targetUrl) {
  return [
    "--headless",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--no-sandbox",
    "--run-all-compositor-stages-before-draw",
    `--virtual-time-budget=${virtualTimeMs}`,
    ...extraArgs,
    targetUrl,
  ];
}

async function dumpDom(targetUrl) {
  const result = await runBrowser(
    buildBrowserArgs(["--dump-dom"], targetUrl),
    `DOM取得: ${targetUrl}`
  );
  return result.stdout;
}

async function captureScreenshot(targetUrl, destinationPath) {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  const relativeDestination = path.relative(ROOT, destinationPath);
  await runBrowser(
    buildBrowserArgs(
      [`--window-size=${windowWidth},${windowHeight}`, `--screenshot=${relativeDestination}`],
      targetUrl
    ),
    `スクリーンショット取得: ${targetUrl}`
  );
}

function sanitizeToken(value) {
  const ascii = value.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
  const cleaned = ascii.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (cleaned) {
    return cleaned;
  }
  return Buffer.from(value).toString("hex").slice(0, 32) || "page";
}

function buildScreenshotRelativePath(targetUrl) {
  const url = new URL(targetUrl);
  const segments = url.pathname.split("/").filter(Boolean).map(sanitizeToken);
  let fileStem = "index";

  if (segments.length === 0) {
    fileStem = "index";
  } else {
    const lastSegment = segments[segments.length - 1];
    if (path.extname(lastSegment)) {
      segments.pop();
      fileStem = lastSegment.replace(/\.[^.]+$/, "");
    } else {
      fileStem = "index";
    }
  }

  const queryParts = [];
  url.searchParams.sort();
  for (const [key, value] of url.searchParams.entries()) {
    const keyPart = sanitizeToken(key);
    const valuePart = value ? sanitizeToken(value) : "empty";
    queryParts.push(`${keyPart}-${valuePart}`);
  }
  if (queryParts.length > 0) {
    fileStem += `__${queryParts.join("__")}`;
  }

  return path.join(...segments, `${fileStem}.png`);
}

function shouldSkipHref(href) {
  if (!href) {
    return true;
  }
  const normalized = href.trim();
  return (
    normalized === "" ||
    normalized.startsWith("#") ||
    normalized.startsWith("mailto:") ||
    normalized.startsWith("tel:") ||
    normalized.startsWith("javascript:")
  );
}

function decodeHtmlAttribute(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function looksLikeHtmlPath(pathname) {
  const extension = path.extname(pathname).toLowerCase();
  if (!extension) {
    return true;
  }
  return extension === ".html" || extension === ".htm";
}

function hasSuspiciousQuotedPath(pathname) {
  const lowerPathname = pathname.toLowerCase();
  if (lowerPathname.includes("%22") || lowerPathname.includes("%27")) {
    return true;
  }

  try {
    return /['"]/.test(decodeURIComponent(pathname));
  } catch (error) {
    return /['"]/.test(pathname);
  }
}

function normalizeSameOriginUrl(rawHref, currentUrl) {
  if (shouldSkipHref(rawHref)) {
    return null;
  }
  const decodedHref = decodeHtmlAttribute(rawHref).trim().replace(/^['"]+|['"]+$/g, "");
  const normalizedLowerHref = decodedHref.toLowerCase();
  if (
    normalizedLowerHref.includes("support.google.com/chrome") ||
    normalizedLowerHref.includes("p=rl_error")
  ) {
    return null;
  }
  if (shouldSkipHref(decodedHref)) {
    return null;
  }
  let target;
  try {
    target = new URL(decodedHref, currentUrl);
  } catch (error) {
    return null;
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return null;
  }
  if (target.origin !== baseOrigin) {
    return null;
  }
  if (target.pathname.includes(";")) {
    return null;
  }
  if (target.pathname === "/404.html") {
    return null;
  }
  if (!looksLikeHtmlPath(target.pathname)) {
    return null;
  }
  if (hasSuspiciousQuotedPath(target.pathname)) {
    return null;
  }

  target.hash = "";
  target.searchParams.sort();
  return target.toString();
}

function shouldEnqueueDiscoveredLink(currentUrl, nextUrl) {
  const current = new URL(currentUrl);
  const next = new URL(nextUrl);

  if (
    current.search &&
    next.search &&
    current.pathname === next.pathname &&
    SAME_PATH_QUERY_CHAIN_BLOCKLIST.has(current.pathname)
  ) {
    return false;
  }

  return true;
}

function extractLinksFromDom(dom, currentUrl) {
  const links = new Set();
  const pattern = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match;

  while ((match = pattern.exec(dom)) !== null) {
    const href = match[1] || match[2] || match[3] || "";
    const normalizedUrl = normalizeSameOriginUrl(href, currentUrl);
    if (normalizedUrl) {
      links.add(normalizedUrl);
    }
  }

  return Array.from(links).sort();
}

function extractTitle(dom) {
  const match = dom.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function collectLocalSeedUrls() {
  const seeds = new Set([baseUrl.toString()]);

  function walk(directoryPath) {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".html")) {
        continue;
      }

      const relative = path.relative(PUBLIC_DIR, fullPath).split(path.sep).join("/");
      if (relative === "404.html") {
        continue;
      }

      let routePath;
      if (relative === "index.html") {
        routePath = "/";
      } else if (relative.endsWith("/index.html")) {
        routePath = `/${relative.slice(0, -"index.html".length)}`;
      } else {
        routePath = `/${relative}`;
      }
      seeds.add(new URL(routePath, baseUrl).toString());
    }
  }

  if (fs.existsSync(PUBLIC_DIR)) {
    walk(PUBLIC_DIR);
  }
  return Array.from(seeds).sort();
}

async function collectSitemapSeedUrls() {
  const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), commandTimeoutMs);

  try {
    const response = await fetch(sitemapUrl, {
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) {
      warn(`sitemap の取得に失敗しました: ${response.status} ${sitemapUrl}`);
      return [];
    }

    const xml = await response.text();
    const urls = new Set();
    const matches = xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi);
    for (const match of matches) {
      const rawLoc = match[1].trim();
      try {
        const parsed = new URL(rawLoc, baseUrl);
        const rewritten = new URL(`${parsed.pathname}${parsed.search}`, baseUrl);
        rewritten.hash = "";
        rewritten.searchParams.sort();
        if (looksLikeHtmlPath(rewritten.pathname)) {
          urls.add(rewritten.toString());
        }
      } catch (error) {
        warn(`sitemap のURLを解釈できませんでした: ${rawLoc}`);
      }
    }
    return Array.from(urls).sort();
  } catch (error) {
    warn(`sitemap の取得をスキップしました: ${error.message}`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function resetOutputDirectory() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
}

async function main() {
  resetOutputDirectory();

  log(`base URL: ${baseUrl.toString()}`);
  log(`browser: ${browserPath}`);
  log(`output: ${path.relative(ROOT, outputDir) || "."}`);

  const localSeeds = collectLocalSeedUrls();
  const sitemapSeeds = await collectSitemapSeedUrls();
  const seedSet = new Set([...localSeeds, ...sitemapSeeds]);
  const queue = Array.from(seedSet).sort();
  const queued = new Set(queue);
  const discoveredBy = new Map();
  const visited = new Set();
  const pages = [];
  const failures = [];

  for (const url of localSeeds) {
    discoveredBy.set(url, "local-seed");
  }
  for (const url of sitemapSeeds) {
    if (discoveredBy.has(url)) {
      discoveredBy.set(url, `${discoveredBy.get(url)}, sitemap-seed`);
    } else {
      discoveredBy.set(url, "sitemap-seed");
    }
  }

  log(`初期URL数: ${queue.length}`);

  while (queue.length > 0 && pages.length < maxPages) {
    const currentUrl = queue.shift();
    queued.delete(currentUrl);
    if (visited.has(currentUrl)) {
      continue;
    }
    visited.add(currentUrl);

    log(`処理中 (${pages.length + 1}/${maxPages}): ${currentUrl}`);

    let dom = "";
    try {
      dom = await dumpDom(currentUrl);
    } catch (error) {
      failures.push({ url: currentUrl, phase: "dump-dom", message: error.message });
      warn(`DOM取得失敗: ${currentUrl}`);
      continue;
    }

    const relativeScreenshotPath = buildScreenshotRelativePath(currentUrl);
    const absoluteScreenshotPath = path.join(outputDir, relativeScreenshotPath);
    try {
      await captureScreenshot(currentUrl, absoluteScreenshotPath);
    } catch (error) {
      failures.push({ url: currentUrl, phase: "screenshot", message: error.message });
      warn(`スクリーンショット失敗: ${currentUrl}`);
      continue;
    }

    const discoveredLinks = extractLinksFromDom(dom, currentUrl);
    for (const link of discoveredLinks) {
      if (!shouldEnqueueDiscoveredLink(currentUrl, link)) {
        continue;
      }
      if (!visited.has(link) && !queued.has(link)) {
        queue.push(link);
        queued.add(link);
        if (!discoveredBy.has(link)) {
          discoveredBy.set(link, currentUrl);
        }
      }
    }
    queue.sort();

    pages.push({
      url: currentUrl,
      title: extractTitle(dom),
      screenshot: path.relative(ROOT, absoluteScreenshotPath),
      discoveredFrom: discoveredBy.get(currentUrl) || null,
      discoveredLinks: discoveredLinks.length,
    });
  }

  if (queue.length > 0) {
    failures.push({
      url: baseUrl.toString(),
      phase: "crawl",
      message: `上限 ${maxPages} ページに達しました。LIVE_SCREENSHOT_MAX_PAGES を増やしてください。`,
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: baseUrl.toString(),
    browser: browserPath,
    outputDir: path.relative(ROOT, outputDir),
    maxPages,
    localSeedCount: localSeeds.length,
    sitemapSeedCount: sitemapSeeds.length,
    pageCount: pages.length,
    failureCount: failures.length,
    pages,
    failures,
  };

  fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const summaryLines = [
    `generatedAt: ${manifest.generatedAt}`,
    `baseUrl: ${manifest.baseUrl}`,
    `browser: ${manifest.browser}`,
    `pageCount: ${manifest.pageCount}`,
    `failureCount: ${manifest.failureCount}`,
    "",
    "pages:",
    ...pages.map((page) => `- ${page.url} -> ${page.screenshot}`),
  ];

  if (failures.length > 0) {
    summaryLines.push("", "failures:");
    summaryLines.push(...failures.map((failure) => `- [${failure.phase}] ${failure.url}: ${failure.message}`));
  }

  fs.writeFileSync(path.join(outputDir, "summary.txt"), `${summaryLines.join("\n")}\n`, "utf8");

  log(`完了: ${pages.length} ページ`);
  log(`manifest: ${path.relative(ROOT, path.join(outputDir, "manifest.json"))}`);
  log(`summary: ${path.relative(ROOT, path.join(outputDir, "summary.txt"))}`);

  if (failures.length > 0) {
    fail(`${failures.length} 件の失敗があります。summary.txt を確認してください。`);
  }
}

main().catch((error) => {
  fail(error && error.message ? error.message : String(error));
});
