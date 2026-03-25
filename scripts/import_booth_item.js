#!/usr/bin/env node

const core = require("../public/assets/finder-core.js");

const DEFAULT_PROFILE_IDS = ["kemohomo-main"];
const DEFAULT_PRIORITY = 65;
const IMAGE_HEADER_BYTE_LIMIT = 262144;
const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
};

const fetchHtml = async (url) => {
  const response = await fetch(url, {
    headers: {
      ...REQUEST_HEADERS,
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) {
    throw new Error(`BOOTH page fetch failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
};

const cleanText = (value) =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const extractMatch = (text, pattern, group = 1) => {
  const match = text.match(pattern);
  return match ? match[group] : "";
};

const extractJsonLdProduct = (html) => {
  const matches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.["@type"] === "Product") return parsed;
    } catch (error) {
      continue;
    }
  }
  return null;
};

const extractGalleryImages = (html, fallbackImage = "") => {
  const block =
    extractMatch(
      html,
      /<div class="primary-image-area">([\s\S]*?)<section class="main-info-column">/i
    ) || html;
  const urls = new Set();
  const matches = block.matchAll(/(?:data-origin|data-lazy|src)="([^"]+)"/g);
  for (const match of matches) {
    const value = match[1];
    if (!value) continue;
    if (!/^https?:\/\//i.test(value)) continue;
    if (/\/c\/72x72_/i.test(value)) continue;
    urls.add(value);
  }
  if (fallbackImage) urls.add(fallbackImage);
  return Array.from(urls);
};

const normalizeImageIdentity = (url) =>
  String(url || "")
    .trim()
    .replace(/https?:\/\/[^/]+/i, "")
    .replace(/\/c\/[^/]+\//i, "/")
    .replace(/_base_resized(?=\.[a-z0-9]+$)/i, "");

const getImageVariantScore = (url) => {
  const value = String(url || "");
  let score = 0;
  if (/_base_resized(?=\.[a-z0-9]+$)/i.test(value)) score += 4;
  if (/\/c\/\d+x\d+/i.test(value)) score += 2;
  return score;
};

const collapseGalleryImageUrls = (urls) => {
  const order = [];
  const preferredByKey = new Map();
  core.ensureArray(urls)
    .filter(Boolean)
    .forEach((url) => {
      const key = normalizeImageIdentity(url);
      if (!key) return;
      if (!preferredByKey.has(key)) {
        preferredByKey.set(key, url);
        order.push(key);
        return;
      }
      const current = preferredByKey.get(key);
      if (getImageVariantScore(url) > getImageVariantScore(current)) {
        preferredByKey.set(key, url);
      }
    });
  return order.map((key) => preferredByKey.get(key)).filter(Boolean);
};

const parsePngSize = (bytes) => {
  if (bytes.length < 24) return null;
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) return null;
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
};

const parseGifSize = (bytes) => {
  if (bytes.length < 10) return null;
  const signature = bytes.subarray(0, 6).toString("ascii");
  if (signature !== "GIF87a" && signature !== "GIF89a") return null;
  return {
    width: bytes.readUInt16LE(6),
    height: bytes.readUInt16LE(8),
  };
};

const parseWebpSize = (bytes) => {
  if (bytes.length < 30) return null;
  if (bytes.subarray(0, 4).toString("ascii") !== "RIFF") return null;
  if (bytes.subarray(8, 12).toString("ascii") !== "WEBP") return null;
  const chunk = bytes.subarray(12, 16).toString("ascii");
  if (chunk === "VP8 ") {
    if (bytes.length < 30) return null;
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    if (bytes.length < 25) return null;
    const bits =
      bytes[21] |
      (bytes[22] << 8) |
      (bytes[23] << 16) |
      (bytes[24] << 24);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (chunk === "VP8X") {
    if (bytes.length < 30) return null;
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
    };
  }
  return null;
};

const parseJpegSize = (bytes) => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 <= bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (!marker || marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
        marker
      )
    ) {
      return {
        width: bytes.readUInt16BE(offset + 5),
        height: bytes.readUInt16BE(offset + 3),
      };
    }
    offset += segmentLength;
  }
  return null;
};

const parseImageSize = (bytes) =>
  parsePngSize(bytes) || parseGifSize(bytes) || parseWebpSize(bytes) || parseJpegSize(bytes);

const fetchImageSize = async (url) => {
  const response = await fetch(url, {
    headers: {
      ...REQUEST_HEADERS,
      accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      range: `bytes=0-${IMAGE_HEADER_BYTE_LIMIT - 1}`,
    },
  });
  if (!response.ok) {
    throw new Error(`image fetch failed: ${response.status} ${response.statusText}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const size = parseImageSize(bytes);
  if (!size) {
    throw new Error(`image size parse failed for ${url}`);
  }
  return size;
};

const buildImageRecord = async (url) => {
  const size = await fetchImageSize(url);
  return {
    url,
    width: size.width,
    height: size.height,
  };
};

const detectFormat = (text) => {
  if (/(漫画|マンガ|コミック)/i.test(text)) {
    return { label: "漫画", tagId: "format-comic" };
  }
  if (/(cg|イラスト|画集|イラスト集)/i.test(text)) {
    return { label: "CG・イラスト", tagId: "format-cg" };
  }
  if (/(小説|ノベル|テキスト)/i.test(text)) {
    return { label: "ノベル", tagId: "format-novel" };
  }
  return { label: "作品", tagId: "" };
};

const detectSpeciesTag = (text) => {
  const map = [
    { pattern: /(白熊|熊|クマ)/i, tagId: "species-bear" },
    { pattern: /(狼|ウルフ)/i, tagId: "species-wolf" },
    { pattern: /(犬|イヌ)/i, tagId: "species-dog" },
    { pattern: /(狐|キツネ)/i, tagId: "species-fox" },
    { pattern: /(猫|ネコ)/i, tagId: "species-cat" },
  ];
  return map.find((item) => item.pattern.test(text))?.tagId || "";
};

const detectBodyTag = (text) => {
  if (/(筋肉|筋肉質|マッチョ)/i.test(text)) return "body-muscular";
  if (/(デブ|ぽっちゃり|恰幅)/i.test(text)) return "body-fat";
  return "body-normal";
};

const detectAgeTag = (text) => {
  if (/(年上|熟年|兄貴肌)/i.test(text)) return "age-older";
  if (/(少年|若い|若め|年下)/i.test(text)) return "age-young";
  return "age-adult";
};

const detectStyleTag = (text) => {
  if (/(イチャイチャ|穏やか|やさし|恋人|カップル)/i.test(text)) return "gentle-tone";
  if (/(軽め|読みやす|短め)/i.test(text)) return "light-tone";
  if (/(秘密|父|帰ってきて|シリアス|切ない)/i.test(text)) return "serious-tone";
  return "";
};

const detectRelationshipTag = (text) => {
  if (/(相棒|バディ|共犯)/i.test(text)) return "buddy-energy";
  if (/(カップル|付き合って|恋人|イチャイチャ|従者)/i.test(text)) return "distance-close";
  if (/(初見|入りやすい|導入)/i.test(text)) return "easy-entry";
  return "";
};

const truncate = (value, max) => {
  const normalized = cleanText(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trim()}…`;
};

const buildWorkFromBooth = async ({ url, html, importedAt }) => {
  const product = extractJsonLdProduct(html);
  if (!product) {
    throw new Error("BOOTH product JSON-LD was not found.");
  }

  const canonical = product.url || extractMatch(html, /<link rel="canonical" href="([^"]+)"/i) || url;
  const itemId = extractMatch(canonical, /\/items\/(\d+)/i) || `${Date.now()}`;
  const title = cleanText(product.name || extractMatch(html, /<title>([^<]+)<\/title>/i));
  const shopName = cleanText(
    product?.brand?.name ||
      extractMatch(
        html,
        /<a[^>]+href="https:\/\/[^"]+\.booth\.pm\/"[^>]*>\s*<img[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i
      )
  );
  const description = cleanText(product.description || "");
  const heroImage = product.image || extractMatch(html, /<meta property="og:image" content="([^"]+)"/i);
  const collapsedImageUrls = collapseGalleryImageUrls(extractGalleryImages(html, heroImage));
  const primaryImageUrl =
    collapsedImageUrls.find((candidate) => normalizeImageIdentity(candidate) === normalizeImageIdentity(heroImage)) ||
    collapsedImageUrls[0] ||
    heroImage ||
    "";
  const galleryImageUrls = collapsedImageUrls.filter(
    (candidate) => normalizeImageIdentity(candidate) !== normalizeImageIdentity(primaryImageUrl)
  );
  const primaryImage = primaryImageUrl ? await buildImageRecord(primaryImageUrl) : null;
  const galleryImages = await Promise.all(galleryImageUrls.map((imageUrl) => buildImageRecord(imageUrl)));
  const textForHeuristics = [title, shopName, description].filter(Boolean).join("\n");
  const format = detectFormat(textForHeuristics);
  const speciesTagId = detectSpeciesTag(textForHeuristics);
  const bodyTagId = detectBodyTag(textForHeuristics);
  const ageTagId = detectAgeTag(textForHeuristics);
  const styleTagId = detectStyleTag(textForHeuristics);
  const relationshipTagId = detectRelationshipTag(textForHeuristics);
  const tagIds = core.unique(
    [
      "kemo-entry",
      "manual-pick",
      speciesTagId ? "dense-fur" : "",
      speciesTagId,
      bodyTagId,
      ageTagId,
      styleTagId,
      relationshipTagId,
      format.tagId,
    ].filter(Boolean)
  );
  const highlightPoints = core.unique(
    [
      speciesTagId === "species-bear" ? "熊系" : "",
      relationshipTagId === "distance-close" ? "距離が近い" : "",
      styleTagId === "gentle-tone" ? "やさしめ" : "",
      format.label !== "作品" ? format.label : "",
    ].filter(Boolean)
  );
  const primaryTagIds = core.unique(
    [speciesTagId, format.tagId, relationshipTagId, "manual-pick"].filter(Boolean)
  ).slice(0, 4);
  const price = Number(product?.offers?.price || 0);

  return {
    id: `work-booth-${itemId}`,
    slug: `booth-item-${itemId}`,
    siteProfileIds: DEFAULT_PROFILE_IDS,
    status: "published",
    title,
    creator: shopName || "BOOTH出品者",
    format: format.label,
    shortDescription: truncate(description, 88),
    publicNote: truncate(description, 150),
    internalNote: `BOOTH URL から自動取り込み: ${canonical}`,
    matchSummary:
      highlightPoints.length >= 2
        ? `${highlightPoints.slice(0, 2).join("、")}を起点に見つけやすくするために BOOTH から取り込みました。`
        : "BOOTH 商品ページから自動取り込みした公開作品です。",
    cautionNote: "",
    highlightPoints: highlightPoints.length ? highlightPoints : ["BOOTH取込"],
    tagIds,
    primaryTagIds,
    collectionIds: format.tagId === "format-comic" ? ["comic-door"] : [],
    priority: DEFAULT_PRIORITY,
    releasedAt: "",
    updatedAt: importedAt,
    hoverImageUrl: primaryImage?.url || "",
    galleryImageUrls: galleryImages.map((image) => image.url),
    primaryImage,
    galleryImages,
    sourceUrl: canonical,
    importSource: "booth",
    priceJPY: Number.isFinite(price) ? price : 0,
    externalLinks: [
      {
        id: `link-booth-${itemId}`,
        label: "BOOTHで作品を見る",
        partner: "BOOTH",
        url: canonical,
      },
    ],
  };
};

const main = async () => {
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error("Usage: node scripts/import_booth_item.js <booth-item-url>");
    process.exit(1);
  }

  const importedAt = new Date().toISOString().slice(0, 10);
  const html = await fetchHtml(targetUrl);
  const work = await buildWorkFromBooth({ url: targetUrl, html, importedAt });
  process.stdout.write(`${JSON.stringify(work, null, 2)}\n`);
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  buildWorkFromBooth,
  extractGalleryImages,
  extractJsonLdProduct,
};
