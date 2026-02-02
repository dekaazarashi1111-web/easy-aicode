import { Scene, SceneSettings, Placement, RockShape, Creature } from "./types";
import { createEmojiPicker } from "./emoji_pool";
import { hashStringToUint32, mulberry32, randInt, randRange, pickOne } from "./prng";
import { creatureGenerators } from "./templates";

const createSeed = (settings: SceneSettings) =>
  `${settings.seed}|${settings.width}x${settings.height}|${settings.emojis.join("")}|${settings.density}|${settings.chaos}|${settings.strict ? 1 : 0}|${settings.chaosAddon ? 1 : 0}`;

const addLayerOffset = (placements: Placement[], offset: number) => {
  placements.forEach((placement) => {
    placement.layer += offset;
  });
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const generateScene = (settings: SceneSettings): Scene => {
  const rng = mulberry32(hashStringToUint32(createSeed(settings)));
  const picker = createEmojiPicker(settings.emojis, {
    strict: settings.strict,
    chaosAddon: settings.chaosAddon,
  }, rng);

  const staticPlacements: Placement[] = [];
  const creatures: Creature[] = [];
  const occupied: { x: number; y: number; r: number }[] = [];
  const seabedY = settings.height * 0.82;

  const seabedWave = Array.from({ length: 7 }, (_, i) => ({
    x: (settings.width / 6) * i,
    y: seabedY + randRange(rng, -18, 18),
  }));

  const rocks: RockShape[] = Array.from({ length: randInt(rng, 2, 4) }, () => ({
    x: randRange(rng, settings.width * 0.05, settings.width * 0.95),
    y: randRange(rng, seabedY + 10, settings.height - 20),
    w: randRange(rng, 60, 140),
    h: randRange(rng, 30, 80),
    tilt: randRange(rng, -0.4, 0.4),
  }));

  const bubbleCount = Math.max(6, Math.round(settings.width * settings.height / 180000) + Math.round(settings.chaos / 12));
  for (let i = 0; i < bubbleCount; i += 1) {
    staticPlacements.push({
      x: randRange(rng, 40, settings.width - 40),
      y: randRange(rng, 30, seabedY - 40),
      scale: randRange(rng, 12, 28),
      rotation: randRange(rng, -0.4, 0.4),
      layer: 1,
      emoji: picker.pick("bubble"),
      partTag: "bubble",
      opacity: randRange(rng, 0.5, 0.9),
    });
  }

  const propCount = Math.max(2, Math.round(settings.chaos / 8));
  for (let i = 0; i < propCount; i += 1) {
    const size = randRange(rng, 24, 64);
    staticPlacements.push({
      x: randRange(rng, 40, settings.width - 40),
      y: randRange(rng, seabedY - 30, settings.height - 40),
      scale: size,
      rotation: randRange(rng, -1.2, 1.2),
      layer: 6,
      emoji: picker.pick("prop"),
      partTag: "prop",
    });
  }

  if (settings.chaos > 60 && rng() < 0.7) {
    staticPlacements.push({
      x: randRange(rng, settings.width * 0.2, settings.width * 0.8),
      y: randRange(rng, seabedY - 40, settings.height - 80),
      scale: randRange(rng, 90, 130),
      rotation: randRange(rng, -0.3, 0.3),
      layer: 7,
      emoji: picker.pick("prop"),
      partTag: "prop",
    });
  }

  const swimmingGenerators = creatureGenerators.filter((entry) => entry.id !== "coral_cluster" && entry.id !== "mosaic_giant");
  const coralGenerator = creatureGenerators.find((entry) => entry.id === "coral_cluster");
  const heroGenerator = creatureGenerators.find((entry) => entry.id === "mosaic_giant");
  const schoolGenerator = creatureGenerators.find((entry) => entry.id === "school_of_fish");

  const total = Math.max(5, settings.density);
  const bigCount = Math.max(1, Math.round(total * 0.18));
  const midCount = Math.max(1, Math.round(total * 0.4));
  const smallCount = Math.max(0, total - bigCount - midCount);

  const tryPlace = (radius: number, yMin: number, yMax: number) => {
    for (let i = 0; i < 30; i += 1) {
      const x = randRange(rng, radius + 20, settings.width - radius - 20);
      const y = randRange(rng, yMin, yMax);
      const hit = occupied.some((item) => distance({ x, y }, item) < (radius + item.r) * 0.65);
      if (!hit) {
        occupied.push({ x, y, r: radius });
        return { x, y };
      }
    }
    const fallback = {
      x: randRange(rng, radius + 20, settings.width - radius - 20),
      y: randRange(rng, yMin, yMax),
    };
    occupied.push({ x: fallback.x, y: fallback.y, r: radius });
    return fallback;
  };

  const buildCreature = (id: string, created: Placement[], isStatic = false): Creature => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let minLayer = Number.POSITIVE_INFINITY;
    created.forEach((placement) => {
      const half = placement.scale * 0.6;
      minX = Math.min(minX, placement.x - half);
      maxX = Math.max(maxX, placement.x + half);
      minY = Math.min(minY, placement.y - half);
      maxY = Math.max(maxY, placement.y + half);
      minLayer = Math.min(minLayer, placement.layer);
    });
    const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    return {
      id,
      placements: created,
      bounds: { minX, minY, maxX, maxY },
      center,
      layer: minLayer === Number.POSITIVE_INFINITY ? 5 : minLayer,
      motionSeed: randInt(rng, 0, 0xffffffff),
      static: isStatic,
    };
  };

  const addCreature = (size: number, yMin: number, yMax: number, layerOffset: number) => {
    const generator = pickOne(rng, swimmingGenerators);
    const radius = size * 3.2;
    const pos = tryPlace(radius, yMin, yMax);
    const angle = randRange(rng, -0.6, 0.6) + (rng() < 0.5 ? Math.PI : 0);
    const created = generator.fn({
      rng,
      x: pos.x,
      y: pos.y,
      size,
      angle,
      pickEmoji: picker.pick,
    });
    addLayerOffset(created, layerOffset);
    creatures.push(buildCreature(generator.id, created));
  };

  const heroCenter = { x: settings.width * 0.52, y: settings.height * 0.42 };
  const heroAngle = (rng() < 0.5 ? 0 : Math.PI) + randRange(rng, -0.08, 0.08);

  if (heroGenerator) {
    const heroSize = randRange(rng, 44, 58);
    const heroPlacements = heroGenerator.fn({
      rng,
      x: heroCenter.x,
      y: heroCenter.y,
      size: heroSize,
      angle: heroAngle,
      pickEmoji: picker.pick,
    });
    addLayerOffset(heroPlacements, 2);
    creatures.push(buildCreature(heroGenerator.id, heroPlacements));
    occupied.push({ x: heroCenter.x, y: heroCenter.y, r: heroSize * 5.6 });
  }

  for (let i = 0; i < bigCount; i += 1) {
    addCreature(randRange(rng, 26, 36), settings.height * 0.25, seabedY - 80, 1);
  }

  for (let i = 0; i < midCount; i += 1) {
    addCreature(randRange(rng, 20, 30), settings.height * 0.2, seabedY - 50, 2);
  }

  for (let i = 0; i < smallCount; i += 1) {
    addCreature(randRange(rng, 14, 20), settings.height * 0.15, seabedY - 30, 3);
  }

  if (schoolGenerator) {
    const clusterCount = randInt(rng, 1, 2);
    for (let i = 0; i < clusterCount; i += 1) {
      const clusterAngle = heroAngle + (rng() < 0.5 ? 0.6 : -0.6);
      const offsetX = Math.cos(clusterAngle) * randRange(rng, 80, 140);
      const offsetY = Math.sin(clusterAngle) * randRange(rng, 40, 90);
      const schoolPlacements = schoolGenerator.fn({
        rng,
        x: heroCenter.x + offsetX,
        y: heroCenter.y + offsetY,
        size: randRange(rng, 16, 20),
        angle: clusterAngle,
        pickEmoji: picker.pick,
      });
      addLayerOffset(schoolPlacements, 3);
      creatures.push(buildCreature(schoolGenerator.id, schoolPlacements));
    }
  }

  if (coralGenerator) {
    const coralCount = randInt(rng, 1, 3);
    for (let i = 0; i < coralCount; i += 1) {
      const posX = i === 0 ? randRange(rng, 80, settings.width * 0.35) : randRange(rng, settings.width * 0.65, settings.width - 80);
      const created = coralGenerator.fn({
        rng,
        x: posX,
        y: randRange(rng, seabedY + 10, settings.height - 30),
        size: randRange(rng, 18, 24),
        angle: -Math.PI / 2,
        pickEmoji: picker.pick,
      });
      addLayerOffset(created, 4);
      creatures.push(buildCreature(coralGenerator.id, created, true));
    }
  }

  const foregroundProps = randInt(rng, 2, 3);
  for (let i = 0; i < foregroundProps; i += 1) {
    staticPlacements.push({
      x: randRange(rng, 60, settings.width - 60),
      y: randRange(rng, seabedY + 20, settings.height - 40),
      scale: randRange(rng, 80, 140),
      rotation: randRange(rng, -0.4, 0.4),
      layer: 9,
      emoji: picker.pick("prop"),
      partTag: "prop",
    });
  }

  if (rng() < 0.65) {
    staticPlacements.push({
      x: settings.width * randRange(rng, 0.86, 1.05),
      y: settings.height * randRange(rng, 0.45, 0.62),
      scale: randRange(rng, 180, 280),
      rotation: randRange(rng, -0.2, 0.2),
      layer: 0,
      emoji: picker.pick("prop"),
      partTag: "prop",
      opacity: randRange(rng, 0.18, 0.32),
    });
  }

  const sparkleCount = randInt(rng, 5, 9);
  for (let i = 0; i < sparkleCount; i += 1) {
    staticPlacements.push({
      x: randRange(rng, 40, settings.width - 40),
      y: randRange(rng, 30, settings.height * 0.35),
      scale: randRange(rng, 10, 18),
      rotation: randRange(rng, -0.6, 0.6),
      layer: 2,
      emoji: picker.pick("accent"),
      partTag: "accent",
      opacity: randRange(rng, 0.6, 0.9),
    });
  }

  if (!staticPlacements.some((placement) => placement.partTag === "bubble")) {
    staticPlacements.push({
      x: settings.width * 0.2,
      y: settings.height * 0.3,
      scale: 18,
      rotation: 0,
      layer: 1,
      emoji: picker.pick("bubble"),
      partTag: "bubble",
    });
  }

  if (!staticPlacements.some((placement) => placement.partTag === "prop")) {
    staticPlacements.push({
      x: settings.width * 0.8,
      y: seabedY + 20,
      scale: 60,
      rotation: 0,
      layer: 6,
      emoji: picker.pick("prop"),
      partTag: "prop",
    });
  }

  const ensureTag = (tag: "accent" | "fin" | "eye", x: number, y: number, size: number, layer: number) => {
    if (staticPlacements.some((placement) => placement.partTag === tag)) return;
    staticPlacements.push({
      x,
      y,
      scale: size,
      rotation: 0,
      layer,
      emoji: picker.pick(tag),
      partTag: tag,
    });
  };

  ensureTag("fin", settings.width * 0.6, settings.height * 0.4, 22, 6);
  ensureTag("accent", settings.width * 0.3, settings.height * 0.35, 18, 7);
  ensureTag("eye", settings.width * 0.4, settings.height * 0.3, 20, 7);

  return {
    width: settings.width,
    height: settings.height,
    seabedY,
    seabedWave,
    rocks,
    staticPlacements,
    creatures,
  };
};
