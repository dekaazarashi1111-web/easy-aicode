#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_SOURCE_DIR = path.join(ROOT_DIR, "userfile", "作品一覧");
const DEFAULT_OUTPUT_PATH = path.join(ROOT_DIR, "data", "work-library-db.json");
const DB_SCHEMA_VERSION = 1;
const PARSER_VERSION = 1;
const KNOWN_METADATA_LABELS = new Set([
  "配信開始日",
  "作者",
  "作品形式",
  "ページ数",
  "シリーズ",
  "題材",
  "キャンペーン",
  "ジャンル",
  "ファイル容量",
  "利用期限",
]);

const normalizeWhitespace = (value) =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeInlineText = (value) =>
  normalizeWhitespace(value)
    .replace(/\n+/g, " ")
    .trim();

const unique = (values) => Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));

const sha1 = (value) => crypto.createHash("sha1").update(String(value || "")).digest("hex");

const toPosixPath = (value) => String(value || "").split(path.sep).join("/");

const buildHashedId = (prefix, value) => `${prefix}-${sha1(value).slice(0, 12)}`;

const pad2 = (value) => String(value).padStart(2, "0");

const slugify = (value) => {
  const normalized = normalizeInlineText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (normalized) return normalized;
  return `item-${sha1(value).slice(0, 12)}`;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    sourceDir: DEFAULT_SOURCE_DIR,
    outputPath: DEFAULT_OUTPUT_PATH,
    stdout: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") {
      const next = args[index + 1];
      if (!next) throw new Error("--source requires a path");
      options.sourceDir = path.resolve(ROOT_DIR, next);
      index += 1;
      continue;
    }
    if (arg === "--output") {
      const next = args[index + 1];
      if (!next) throw new Error("--output requires a path");
      options.outputPath = path.resolve(ROOT_DIR, next);
      index += 1;
      continue;
    }
    if (arg === "--stdout") {
      options.stdout = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        [
          "Usage:",
          "  node scripts/build_text_work_db.js [--source <dir>] [--output <file>] [--stdout]",
          "",
          "Defaults:",
          `  --source ${toPosixPath(path.relative(ROOT_DIR, DEFAULT_SOURCE_DIR))}`,
          `  --output ${toPosixPath(path.relative(ROOT_DIR, DEFAULT_OUTPUT_PATH))}`,
          "",
        ].join("\n")
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
};

const isUrl = (value) => /^https?:\/\//i.test(normalizeInlineText(value));

const isMetadataLabel = (value) => KNOWN_METADATA_LABELS.has(normalizeInlineText(value));

const looksLikeObservationLine = (value) => normalizeInlineText(value).includes("→");

const looksLikePriceLine = (value) => {
  const line = normalizeInlineText(value);
  return /円/.test(line) || /OFF/i.test(line);
};

const splitListTokens = (value) =>
  normalizeInlineText(value)
    .split(/[・/／、,]/)
    .map((item) => normalizeInlineText(item))
    .filter(Boolean);

const normalizeSubjectLabel = (value) => {
  const token = normalizeInlineText(value);
  if (!token) return "";
  if (/(狼|オオカミ|ウルフ)/i.test(token)) return "狼";
  if (/(犬|イヌ|ドーベルマン)/i.test(token)) return "犬";
  if (/(虎|トラ|白虎)/i.test(token)) return "虎";
  if (/(熊|クマ|白熊)/i.test(token)) return "熊";
  if (/(牛|ウシ)/i.test(token)) return "牛";
  if (/(猫|ネコ)/i.test(token)) return "猫";
  if (/(狐|キツネ)/i.test(token)) return "狐";
  if (/(人間|ヒト)/i.test(token)) return "人間";
  if (/(ライオン)/i.test(token)) return "ライオン";
  if (/(ヒョウ)/i.test(token)) return "ヒョウ";
  if (/(ハイエナ)/i.test(token)) return "ハイエナ";
  if (/(豚|ブタ)/i.test(token)) return "豚";
  if (/(オーク)/i.test(token)) return "オーク";
  if (/(ゴリラ)/i.test(token)) return "ゴリラ";
  if (/(鷹|タカ)/i.test(token)) return "鷹";
  return token;
};

const normalizeTraitLabel = (value) => {
  const token = normalizeInlineText(value);
  if (!token) return "";
  if (/^(筋肉|筋肉質|マッチョ|ガチムチ)$/i.test(token)) return "筋肉";
  if (/^(デブ|ぽっちゃり)$/i.test(token)) return "デブ";
  if (/^(普通|普通体型|普通体系|標準)$/i.test(token)) return "普通体型";
  return token;
};

const extractExternalId = (url) => {
  const match = String(url || "").match(/[?&/]cid=([^/?&]+)/i);
  return match ? match[1] : "";
};

const detectStorefront = (url) => {
  const value = String(url || "");
  if (/dmm\.co\.jp/i.test(value)) return "dmm";
  if (/fanza/i.test(value)) return "fanza";
  if (/booth\.pm/i.test(value)) return "booth";
  return "unknown";
};

const parsePriceJPY = (value) => {
  const match = normalizeInlineText(value).match(/([0-9][0-9,]*)円/);
  if (!match) return null;
  return Number.parseInt(match[1].replace(/,/g, ""), 10);
};

const parseDateTime = (value) => {
  const match = normalizeInlineText(value).match(
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/
  );
  if (!match) return "";
  const [, year, month, day, hour = "00", minute = "00"] = match;
  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00+09:00`;
};

const parsePageCount = (value) => {
  const match = normalizeInlineText(value).match(/(\d+)\s*ページ/);
  return match ? Number.parseInt(match[1], 10) : null;
};

const parseFileSizeMB = (value) => {
  const match = normalizeInlineText(value).match(/([\d.]+)\s*MB/i);
  return match ? Number.parseFloat(match[1]) : null;
};

const extractSequence = (title, seriesTitle) => {
  const normalizedTitle = normalizeInlineText(title);
  const normalizedSeries = normalizeInlineText(seriesTitle);
  if (!normalizedSeries || !normalizedTitle.startsWith(normalizedSeries)) {
    return {
      label: "",
      number: null,
    };
  }
  const rest = normalizeInlineText(normalizedTitle.slice(normalizedSeries.length));
  if (!rest) {
    return {
      label: "",
      number: null,
    };
  }
  const numericMatch = rest.match(/^([0-9]+)$/);
  return {
    label: rest,
    number: numericMatch ? Number.parseInt(numericMatch[1], 10) : null,
  };
};

const parseObservationLine = (line, index) => {
  const normalizedLine = normalizeInlineText(line);
  const [subjectText = "", traitText = ""] = normalizedLine.split("→");
  const subjectLabels = splitListTokens(subjectText);
  const traitLabelsRaw = splitListTokens(traitText);
  const normalizedSubjectLabels = unique(subjectLabels.map(normalizeSubjectLabel));
  const normalizedTraitLabels = unique(traitLabelsRaw.map(normalizeTraitLabel));
  const bodyTypeLabels = normalizedTraitLabels.filter((item) =>
    ["筋肉", "デブ", "普通体型"].includes(item)
  );
  return {
    id: `observation-${index + 1}`,
    rawText: normalizedLine,
    subjectText: normalizeInlineText(subjectText),
    subjectLabels,
    normalizedSubjectLabels,
    traitText: normalizeInlineText(traitText),
    traitLabelsRaw,
    normalizedTraitLabels,
    bodyTypeLabels,
  };
};

const toLineArray = (rawText) =>
  String(rawText || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

const parseFile = (absolutePath) => {
  const rawText = fs.readFileSync(absolutePath, "utf8");
  const relativePath = toPosixPath(path.relative(ROOT_DIR, absolutePath));
  const fileName = path.basename(absolutePath);
  const fileStem = path.basename(absolutePath, path.extname(absolutePath));
  const lines = toLineArray(rawText);

  if (!lines.length) {
    throw new Error(`No usable content in ${relativePath}`);
  }

  const title = lines[0] || fileStem;
  const urlIndex = lines.findIndex((line) => isUrl(line));
  const headerCreator = urlIndex > 1 ? lines[1] : lines[1] && !isUrl(lines[1]) ? lines[1] : "";
  const storefrontUrl = urlIndex >= 0 ? lines[urlIndex] : "";
  const afterUrlLines = urlIndex >= 0 ? lines.slice(urlIndex + 1) : lines.slice(2);

  const descriptionLines = [];
  const observationLines = [];
  const priceLines = [];
  let cursor = 0;

  while (cursor < afterUrlLines.length && !isMetadataLabel(afterUrlLines[cursor])) {
    const line = afterUrlLines[cursor];
    if (looksLikeObservationLine(line)) {
      observationLines.push(line);
    } else if (looksLikePriceLine(line)) {
      priceLines.push(line);
    } else if (!observationLines.length && !priceLines.length) {
      descriptionLines.push(line);
    } else if (priceLines.length) {
      priceLines.push(line);
    } else {
      descriptionLines.push(line);
    }
    cursor += 1;
  }

  const metadata = {};
  const metadataOrder = [];
  let genreLabels = [];

  while (cursor < afterUrlLines.length) {
    const label = afterUrlLines[cursor];
    if (!isMetadataLabel(label)) {
      cursor += 1;
      continue;
    }
    metadataOrder.push(label);
    if (label === "ジャンル") {
      cursor += 1;
      const values = [];
      while (cursor < afterUrlLines.length && !isMetadataLabel(afterUrlLines[cursor])) {
        values.push(afterUrlLines[cursor]);
        cursor += 1;
      }
      genreLabels = values;
      metadata[label] = values;
      continue;
    }
    metadata[label] = afterUrlLines[cursor + 1] || "";
    cursor += 2;
  }

  const externalId = extractExternalId(storefrontUrl);
  const storefront = detectStorefront(storefrontUrl);
  const sourceDocumentId = externalId
    ? `source-${storefront}-${externalId}`
    : buildHashedId("source", relativePath);
  const workId = externalId ? `work-${storefront}-${externalId}` : buildHashedId("work", title);
  const slug = externalId ? `${storefront}-${externalId}` : slugify(title);
  const description = descriptionLines.join("\n");
  const sequence = extractSequence(title, metadata["シリーズ"]);
  const contributorInputs = [
    headerCreator
      ? {
          displayName: headerCreator,
          role: "circle",
          sourceField: "header.creator",
        }
      : null,
    metadata["作者"]
      ? {
          displayName: metadata["作者"],
          role: "author",
          sourceField: "metadata.作者",
        }
      : null,
  ].filter(Boolean);

  const contributorRefs = unique(
    contributorInputs.map((item) => `${normalizeInlineText(item.displayName)}::${item.role}`)
  ).map((entry) => {
    const [displayName, role] = entry.split("::");
    const creatorId = buildHashedId("creator", displayName);
    const sourceField =
      contributorInputs.find(
        (item) =>
          normalizeInlineText(item.displayName) === displayName &&
          normalizeInlineText(item.role) === normalizeInlineText(role)
      )?.sourceField || "";
    return {
      creatorId,
      displayName,
      normalizedName: displayName,
      role,
      sourceField,
    };
  });

  const seriesTitle = normalizeInlineText(metadata["シリーズ"]);
  const seriesId = seriesTitle ? buildHashedId("series", seriesTitle) : "";
  const observationRecords = observationLines.map(parseObservationLine);
  const regularPriceJPY = priceLines[0] ? parsePriceJPY(priceLines[0]) : null;
  const campaignPriceJPY = priceLines[1] ? parsePriceJPY(priceLines[1]) : null;
  const campaignNote = priceLines[1] || metadata["キャンペーン"] || "";
  const releaseAt = parseDateTime(metadata["配信開始日"]);
  const pageCount = parsePageCount(metadata["ページ数"]);
  const fileSizeMB = parseFileSizeMB(metadata["ファイル容量"]);
  const subjectLabels = unique(observationRecords.flatMap((item) => item.normalizedSubjectLabels));
  const bodyTypeLabels = unique(observationRecords.flatMap((item) => item.bodyTypeLabels));
  const sourceSha1 = sha1(rawText);

  const sourceDocument = {
    id: sourceDocumentId,
    sourceKind: "manual-transcription",
    relativePath,
    fileName,
    fileStem,
    sha1: sourceSha1,
    importedAt: new Date().toISOString(),
    parserVersion: PARSER_VERSION,
    rawText,
    extracted: {
      title,
      headerCreator,
      storefrontUrl,
      descriptionLines,
      observationLines,
      priceLines,
      metadataOrder,
      metadata,
      genreLabels,
    },
  };

  const work = {
    id: workId,
    slug,
    workflowStatus: "imported",
    reviewStatus: "unreviewed",
    publication: {
      finderSeedStatus: "unmapped",
      siteProfileIds: [],
      collectionIds: [],
      primaryTagIds: [],
      notes: "",
    },
    titles: {
      primary: title,
      fileStem,
      aliases: unique([fileStem !== title ? fileStem : ""].filter(Boolean)),
    },
    sourceDocumentIds: [sourceDocumentId],
    sourceRefs: storefrontUrl
      ? [
          {
            kind: "storefront_listing",
            storefront,
            url: storefrontUrl,
            externalId,
          },
        ]
      : [],
    contributors: contributorRefs,
    series: seriesId
      ? {
          id: seriesId,
          title: seriesTitle,
          sequenceLabel: sequence.label,
          sequenceNumber: sequence.number,
        }
      : null,
    summaries: description
      ? [
          {
            kind: "store_description",
            text: description,
            sourceDocumentId,
          },
        ]
      : [],
    characterObservations: observationRecords,
    storefrontListings: [
      {
        id: externalId ? `listing-${storefront}-${externalId}` : buildHashedId("listing", storefrontUrl),
        storefront,
        url: storefrontUrl,
        externalId,
        formatLabel: normalizeInlineText(metadata["作品形式"]),
        pageCount,
        releaseAt,
        themeLabel: normalizeInlineText(metadata["題材"]),
        campaignLabel: normalizeInlineText(metadata["キャンペーン"]),
        genreLabels,
        fileSizeMB,
        usageLimit: normalizeInlineText(metadata["利用期限"]),
        metadata,
      },
    ].filter((item) => item.url),
    commercial: {
      regularPriceJPY,
      campaignPriceJPY,
      campaignNote,
      rawPriceLines: priceLines,
    },
    derived: {
      formatLabel: normalizeInlineText(metadata["作品形式"]),
      pageCount,
      releaseAt,
      fileSizeMB,
      genreLabels,
      normalizedSubjectLabels: subjectLabels,
      bodyTypeLabels,
      hasManualObservation: observationRecords.length > 0,
    },
    rawBlocks: {
      descriptionLines,
      observationLines,
      priceLines,
    },
    custom: {
      internalTags: [],
      notes: [],
      relatedWorkIds: [],
      sourceMemo: "",
    },
  };

  return {
    sourceDocument,
    work,
    seriesTitle,
    seriesId,
  };
};

const buildDb = (sourceDir) => {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  const fileNames = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.txt$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "ja"));

  const parsedFiles = fileNames.map((fileName) => parseFile(path.join(sourceDir, fileName)));
  const creatorMap = new Map();
  const seriesMap = new Map();

  parsedFiles.forEach(({ work }) => {
    work.contributors.forEach((contributor) => {
      const existing = creatorMap.get(contributor.creatorId) || {
        id: contributor.creatorId,
        displayName: contributor.displayName,
        normalizedName: contributor.normalizedName,
        roles: [],
        workIds: [],
        sourceFields: [],
      };
      existing.roles = unique([...existing.roles, contributor.role]);
      existing.workIds = unique([...existing.workIds, work.id]);
      existing.sourceFields = unique([...existing.sourceFields, contributor.sourceField]);
      creatorMap.set(contributor.creatorId, existing);
    });

    if (work.series?.id) {
      const existingSeries = seriesMap.get(work.series.id) || {
        id: work.series.id,
        title: work.series.title,
        workIds: [],
        entries: [],
      };
      existingSeries.workIds = unique([...existingSeries.workIds, work.id]);
      existingSeries.entries = [...existingSeries.entries, {
        workId: work.id,
        title: work.titles.primary,
        sequenceLabel: work.series.sequenceLabel,
        sequenceNumber: work.series.sequenceNumber,
      }];
      seriesMap.set(work.series.id, existingSeries);
    }
  });

  const creators = Array.from(creatorMap.values()).sort((left, right) =>
    left.displayName.localeCompare(right.displayName, "ja")
  );
  const series = Array.from(seriesMap.values())
    .map((item) => ({
      ...item,
      entries: item.entries.sort((left, right) => {
        if (left.sequenceNumber !== null && right.sequenceNumber !== null) {
          return left.sequenceNumber - right.sequenceNumber;
        }
        return left.title.localeCompare(right.title, "ja");
      }),
    }))
    .sort((left, right) => left.title.localeCompare(right.title, "ja"));
  const sourceDocuments = parsedFiles.map((item) => item.sourceDocument);
  const works = parsedFiles
    .map((item) => item.work)
    .sort((left, right) => left.titles.primary.localeCompare(right.titles.primary, "ja"));

  return {
    schemaVersion: DB_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceLibrary: {
      id: "manual-work-transcriptions",
      label: "作品一覧テキストDB",
      sourceDirectory: toPosixPath(path.relative(ROOT_DIR, sourceDir)),
      importScript: "scripts/build_text_work_db.js",
      parserVersion: PARSER_VERSION,
      description:
        "userfile/作品一覧 にある手動文字起こしテキストを保持し、後で公開用 seed へ投影できるようにするための基礎DBです。",
    },
    vocabularies: {
      workflowStatus: ["imported", "reviewed", "mapped", "published"],
      reviewStatus: ["unreviewed", "reviewed"],
      contributorRoles: ["circle", "author"],
      publicationStatus: ["unmapped", "mapped", "published", "hidden"],
      sourceKinds: ["manual-transcription"],
    },
    stats: {
      sourceDocumentCount: sourceDocuments.length,
      workCount: works.length,
      creatorCount: creators.length,
      seriesCount: series.length,
    },
    sourceDocuments,
    creators,
    series,
    works,
  };
};

const writeDb = (db, outputPath, stdout) => {
  const serialized = JSON.stringify(db, null, 2);
  if (stdout) {
    process.stdout.write(`${serialized}\n`);
    return;
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${serialized}\n`, "utf8");
};

const main = () => {
  const options = parseArgs();
  const db = buildDb(options.sourceDir);
  writeDb(db, options.outputPath, options.stdout);
  if (!options.stdout) {
    const relativeOutputPath = toPosixPath(path.relative(ROOT_DIR, options.outputPath));
    process.stdout.write(
      `Built work DB: ${relativeOutputPath} (${db.stats.workCount} works / ${db.stats.sourceDocumentCount} source documents)\n`
    );
  }
};

main();
