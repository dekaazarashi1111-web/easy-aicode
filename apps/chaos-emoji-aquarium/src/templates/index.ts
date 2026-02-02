import { Placement } from "../types";
import { randRange, randInt } from "../prng";
import { chainPoints, createSpine, fillOval, placeFan, placeRow, randomAround } from "./helpers";
import { PartTag } from "../types";

export interface GeneratorInput {
  rng: () => number;
  x: number;
  y: number;
  size: number;
  angle: number;
  pickEmoji: (tag: PartTag) => string;
}

const addEye = (
  list: Placement[],
  x: number,
  y: number,
  size: number,
  emoji: string,
  layer: number
) => {
  list.push({
    x,
    y,
    scale: size,
    rotation: 0,
    layer,
    emoji,
    partTag: "eye",
  });
};

export const fishLong = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, angle, pickEmoji } = input;
  const bodyEmoji = pickEmoji("body");
  const finEmoji = pickEmoji("fin");
  const eyeEmoji = pickEmoji("eye");
  const accentEmoji = pickEmoji("accent");

  const length = size * randRange(rng, 5.8, 7.6);
  const thickness = size * randRange(rng, 1.5, 2.3);
  const spine = createSpine(rng, x, y, length, angle, 20);
  const perpX = Math.cos(angle + Math.PI / 2);
  const perpY = Math.sin(angle + Math.PI / 2);
  const placements: Placement[] = [];

  spine.forEach((point) => {
    const taper = Math.sin(Math.PI * point.t);
    placeRow(
      placements,
      point.x,
      point.y,
      perpX,
      perpY,
      thickness * taper,
      size * randRange(rng, 0.75, 1.0),
      bodyEmoji,
      "body",
      angle,
      5,
      rng
    );
  });

  const tail = spine[spine.length - 1];
  placeFan(placements, tail.x, tail.y, angle + Math.PI, 0.8, 6, size * 0.9, finEmoji, "fin", 6, rng);

  const dorsal = spine[Math.floor(spine.length * 0.45)];
  placeFan(placements, dorsal.x, dorsal.y, angle - Math.PI / 2, 0.6, 4, size * 0.7, finEmoji, "fin", 6, rng);

  const eyePoint = spine[Math.floor(spine.length * 0.18)];
  addEye(placements, eyePoint.x + perpX * size * 0.4, eyePoint.y + perpY * size * 0.3, size * 1.1, eyeEmoji, 7);

  for (let i = 0; i < 3; i += 1) {
    const accentPoint = spine[Math.floor(spine.length * randRange(rng, 0.25, 0.75))];
    placements.push({
      x: accentPoint.x + perpX * size * randRange(rng, -0.8, 0.8),
      y: accentPoint.y + perpY * size * randRange(rng, -0.8, 0.8),
      scale: size * 0.7,
      rotation: randRange(rng, -1, 1),
      layer: 7,
      emoji: accentEmoji,
      partTag: "accent",
    });
  }

  return placements;
};

export const fishRound = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, angle, pickEmoji } = input;
  const bodyEmoji = pickEmoji("body");
  const finEmoji = pickEmoji("fin");
  const eyeEmoji = pickEmoji("eye");
  const accentEmoji = pickEmoji("accent");

  const radius = size * randRange(rng, 2.4, 3.1);
  const placements: Placement[] = [];
  placements.push(...fillOval(rng, x, y, radius, radius * 0.9, size * 0.9, bodyEmoji, "body", 5));

  placeFan(placements, x - radius * 0.6, y, angle - Math.PI / 2, 0.6, 5, size * 0.8, finEmoji, "fin", 6, rng);
  placeFan(placements, x + radius * 0.6, y, angle + Math.PI / 2, 0.6, 5, size * 0.8, finEmoji, "fin", 6, rng);

  addEye(placements, x + radius * 0.25, y - radius * 0.1, size * 1.1, eyeEmoji, 7);

  for (let i = 0; i < 8; i += 1) {
    const theta = (Math.PI * 2 * i) / 8;
    placements.push({
      x: x + Math.cos(theta) * radius,
      y: y + Math.sin(theta) * radius,
      scale: size * 0.6,
      rotation: theta,
      layer: 7,
      emoji: accentEmoji,
      partTag: "accent",
    });
  }

  return placements;
};

export const mosaicGiant = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, angle, pickEmoji } = input;
  const bodyEmoji = pickEmoji("body");
  const finEmoji = pickEmoji("fin");
  const eyeEmoji = pickEmoji("eye");
  const accentEmoji = pickEmoji("accent");
  const headEmoji = rng() < 0.6 ? accentEmoji : eyeEmoji;

  const length = size * randRange(rng, 9.5, 12.5);
  const thickness = size * randRange(rng, 3.1, 4.4);
  const spine = createSpine(rng, x, y, length, angle, 30);
  const perpX = Math.cos(angle + Math.PI / 2);
  const perpY = Math.sin(angle + Math.PI / 2);
  const placements: Placement[] = [];
  const tile = size * randRange(rng, 0.45, 0.6);

  spine.forEach((point) => {
    const taper = Math.sin(Math.PI * point.t);
    placeRow(
      placements,
      point.x,
      point.y,
      perpX,
      perpY,
      thickness * taper,
      tile,
      bodyEmoji,
      "body",
      angle,
      6,
      rng
    );
  });

  const head = spine[Math.floor(spine.length * 0.12)];
  const tail = spine[spine.length - 1];

  placeFan(placements, tail.x, tail.y, angle + Math.PI, 0.9, 10, size * 1.2, finEmoji, "fin", 7, rng);
  placeFan(placements, head.x, head.y, angle - Math.PI / 2, 0.6, 5, size * 0.9, finEmoji, "fin", 7, rng);

  addEye(placements, head.x + perpX * size * 1.1, head.y + perpY * size * 0.4, size * 1.7, eyeEmoji, 8);
  placements.push({
    x: head.x + perpX * size * 2.2,
    y: head.y + perpY * size * 0.15,
    scale: size * 4.4,
    rotation: angle * 0.2,
    layer: 9,
    emoji: headEmoji,
    partTag: "accent",
  });

  for (let i = 0; i < 6; i += 1) {
    const accentPoint = spine[Math.floor(spine.length * randRange(rng, 0.25, 0.8))];
    placements.push({
      x: accentPoint.x + perpX * size * randRange(rng, -1.6, 1.6),
      y: accentPoint.y + perpY * size * randRange(rng, -1.6, 1.6),
      scale: size * randRange(rng, 0.7, 1.1),
      rotation: randRange(rng, -1, 1),
      layer: 8,
      emoji: accentEmoji,
      partTag: "accent",
    });
  }

  return placements;
};

export const eelWorm = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, angle, pickEmoji } = input;
  const bodyEmoji = pickEmoji("body");
  const eyeEmoji = pickEmoji("eye");
  const length = size * randRange(rng, 7.5, 9.5);
  const spine = createSpine(rng, x, y, length, angle, 16);
  const perpX = Math.cos(angle + Math.PI / 2);
  const perpY = Math.sin(angle + Math.PI / 2);
  const placements: Placement[] = [];

  spine.forEach((point) => {
    const taper = 0.6 + Math.sin(Math.PI * point.t) * 0.4;
    placeRow(
      placements,
      point.x,
      point.y,
      perpX,
      perpY,
      size * 0.7 * taper,
      size * 0.7,
      bodyEmoji,
      "body",
      angle,
      4,
      rng
    );
  });

  const head = spine[Math.floor(spine.length * 0.1)];
  addEye(placements, head.x + perpX * size * 0.3, head.y + perpY * size * 0.2, size * 0.9, eyeEmoji, 6);

  return placements;
};

export const jellyfish = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, pickEmoji } = input;
  const bodyEmoji = pickEmoji("body");
  const finEmoji = pickEmoji("fin");
  const eyeEmoji = pickEmoji("eye");
  const accentEmoji = pickEmoji("accent");
  const radius = size * randRange(rng, 2.0, 2.8);
  const placements: Placement[] = [];

  placements.push(...fillOval(rng, x, y, radius, radius * 0.7, size * 0.85, bodyEmoji, "body", 4));

  const tentacleCount = randInt(rng, 4, 7);
  for (let i = 0; i < tentacleCount; i += 1) {
    const offset = randRange(rng, -radius * 0.7, radius * 0.7);
    const chain = chainPoints(rng, x + offset, y + radius * 0.3, Math.PI / 2, size * 4.2, 6, 0.35);
    chain.forEach((point, index) => {
      placements.push({
        x: point.x,
        y: point.y,
        scale: size * (index === chain.length - 1 ? 0.6 : 0.7),
        rotation: randRange(rng, -0.4, 0.4),
        layer: 5,
        emoji: finEmoji,
        partTag: "fin",
      });
    });
  }

  addEye(placements, x + radius * 0.2, y, size * 0.85, eyeEmoji, 6);

  placements.push({
    x: x - radius * 0.4,
    y: y - radius * 0.2,
    scale: size * 0.7,
    rotation: randRange(rng, -0.5, 0.5),
    layer: 6,
    emoji: accentEmoji,
    partTag: "accent",
  });

  return placements;
};

export const shrimp = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, angle, pickEmoji } = input;
  const bodyEmoji = pickEmoji("body");
  const finEmoji = pickEmoji("fin");
  const eyeEmoji = pickEmoji("eye");
  const accentEmoji = pickEmoji("accent");
  const length = size * randRange(rng, 4.2, 5.2);
  const spine = createSpine(rng, x, y, length, angle, 12);
  const perpX = Math.cos(angle + Math.PI / 2);
  const perpY = Math.sin(angle + Math.PI / 2);
  const placements: Placement[] = [];

  spine.forEach((point) => {
    const taper = Math.sin(Math.PI * point.t);
    placeRow(
      placements,
      point.x,
      point.y,
      perpX,
      perpY,
      size * 1.1 * taper,
      size * 0.8,
      bodyEmoji,
      "body",
      angle,
      5,
      rng
    );
  });

  const tail = spine[spine.length - 1];
  placeFan(placements, tail.x, tail.y, angle + Math.PI, 0.9, 5, size * 0.8, finEmoji, "fin", 6, rng);

  const head = spine[Math.floor(spine.length * 0.1)];
  const antenna = chainPoints(rng, head.x, head.y, angle - Math.PI / 2, size * 3, 4, 0.2);
  antenna.forEach((point) => {
    placements.push({
      x: point.x,
      y: point.y,
      scale: size * 0.5,
      rotation: angle - Math.PI / 2,
      layer: 6,
      emoji: accentEmoji,
      partTag: "accent",
    });
  });

  addEye(placements, head.x + perpX * size * 0.3, head.y + perpY * size * 0.3, size * 0.9, eyeEmoji, 7);

  return placements;
};

export const crab = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, pickEmoji } = input;
  const bodyEmoji = pickEmoji("body");
  const finEmoji = pickEmoji("fin");
  const eyeEmoji = pickEmoji("eye");
  const accentEmoji = pickEmoji("accent");
  const rx = size * randRange(rng, 2.2, 2.8);
  const ry = size * randRange(rng, 1.6, 2.1);
  const placements: Placement[] = [];

  placements.push(...fillOval(rng, x, y, rx, ry, size * 0.9, bodyEmoji, "body", 5));

  placeFan(placements, x - rx * 0.9, y - ry * 0.2, Math.PI * 0.9, 0.6, 4, size * 0.8, finEmoji, "fin", 6, rng);
  placeFan(placements, x + rx * 0.9, y - ry * 0.2, Math.PI * 0.1, 0.6, 4, size * 0.8, finEmoji, "fin", 6, rng);

  for (let i = 0; i < 4; i += 1) {
    const offset = randRange(rng, -rx * 0.7, rx * 0.7);
    placements.push({
      x: x + offset,
      y: y + ry * 0.9 + randRange(rng, 0, size * 0.6),
      scale: size * 0.6,
      rotation: randRange(rng, -1, 1),
      layer: 6,
      emoji: finEmoji,
      partTag: "fin",
    });
  }

  addEye(placements, x - rx * 0.2, y - ry * 0.3, size * 0.8, eyeEmoji, 7);
  placements.push({
    x: x + rx * 0.2,
    y: y - ry * 0.3,
    scale: size * 0.8,
    rotation: randRange(rng, -0.3, 0.3),
    layer: 7,
    emoji: accentEmoji,
    partTag: "accent",
  });

  return placements;
};

const miniFish = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, angle, pickEmoji } = input;
  const bodyEmoji = pickEmoji("body");
  const finEmoji = pickEmoji("fin");
  const eyeEmoji = pickEmoji("eye");
  const length = size * randRange(rng, 3.5, 4.4);
  const spine = createSpine(rng, x, y, length, angle, 8);
  const perpX = Math.cos(angle + Math.PI / 2);
  const perpY = Math.sin(angle + Math.PI / 2);
  const placements: Placement[] = [];

  spine.forEach((point) => {
    const taper = Math.sin(Math.PI * point.t);
    placeRow(
      placements,
      point.x,
      point.y,
      perpX,
      perpY,
      size * 0.9 * taper,
      size * 0.7,
      bodyEmoji,
      "body",
      angle,
      4,
      rng
    );
  });

  const tail = spine[spine.length - 1];
  placeFan(placements, tail.x, tail.y, angle + Math.PI, 0.7, 3, size * 0.6, finEmoji, "fin", 5, rng);

  const head = spine[Math.floor(spine.length * 0.2)];
  addEye(placements, head.x + perpX * size * 0.2, head.y + perpY * size * 0.2, size * 0.6, eyeEmoji, 6);

  return placements;
};

export const schoolOfFish = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, angle, pickEmoji } = input;
  const placements: Placement[] = [];
  const count = randInt(rng, 4, 7);
  for (let i = 0; i < count; i += 1) {
    const offset = randomAround(rng, x, y, size * 1.8);
    placements.push(
      ...miniFish({
        rng,
        x: offset.x,
        y: offset.y,
        size: size * randRange(rng, 0.7, 0.95),
        angle: angle + randRange(rng, -0.4, 0.4),
        pickEmoji,
      })
    );
  }
  return placements;
};

export const coralCluster = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, pickEmoji } = input;
  const propEmoji = pickEmoji("prop");
  const accentEmoji = pickEmoji("accent");
  const altEmoji = pickEmoji(rng() < 0.5 ? "accent" : "prop");
  const placements: Placement[] = [];
  const baseCount = randInt(rng, 10, 18);
  for (let i = 0; i < baseCount; i += 1) {
    placements.push({
      x: x + randRange(rng, -size * 2.2, size * 2.2),
      y: y + randRange(rng, -size * 0.4, size * 0.8),
      scale: size * randRange(rng, 0.7, 1.2),
      rotation: randRange(rng, -0.8, 0.8),
      layer: 7,
      emoji: rng() < 0.6 ? propEmoji : altEmoji,
      partTag: "prop",
    });
  }

  const branches = randInt(rng, 4, 7);
  for (let i = 0; i < branches; i += 1) {
    const baseX = x + randRange(rng, -size * 1.8, size * 1.8);
    const height = size * randRange(rng, 2.4, 4.6);
    const chain = chainPoints(rng, baseX, y, -Math.PI / 2 + randRange(rng, -0.4, 0.4), height, 5, 0.3);
    chain.forEach((point) => {
      placements.push({
        x: point.x,
        y: point.y,
        scale: size * randRange(rng, 0.7, 1.05),
        rotation: randRange(rng, -0.6, 0.6),
        layer: 7,
        emoji: rng() < 0.7 ? propEmoji : altEmoji,
        partTag: "prop",
      });
    });
    const tip = chain[chain.length - 1];
    placements.push({
      x: tip.x,
      y: tip.y - size * 0.3,
      scale: size * 0.6,
      rotation: randRange(rng, -0.6, 0.6),
      layer: 8,
      emoji: rng() < 0.5 ? accentEmoji : altEmoji,
      partTag: "accent",
    });
  }
  return placements;
};

export const octopus = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, pickEmoji } = input;
  const bodyEmoji = pickEmoji("body");
  const finEmoji = pickEmoji("fin");
  const eyeEmoji = pickEmoji("eye");
  const radius = size * randRange(rng, 2.0, 2.6);
  const placements: Placement[] = [];

  placements.push(...fillOval(rng, x, y, radius, radius, size * 0.9, bodyEmoji, "body", 5));

  const tentacles = 6 + randInt(rng, 0, 2);
  for (let i = 0; i < tentacles; i += 1) {
    const angle = randRange(rng, Math.PI * 0.2, Math.PI * 0.8);
    const chain = chainPoints(rng, x + Math.cos(angle) * radius * 0.4, y + radius * 0.4, Math.PI / 2, size * 3.6, 6, 0.2);
    chain.forEach((point) => {
      placements.push({
        x: point.x,
        y: point.y,
        scale: size * 0.7,
        rotation: randRange(rng, -0.4, 0.4),
        layer: 6,
        emoji: finEmoji,
        partTag: "fin",
      });
    });
  }

  addEye(placements, x - radius * 0.3, y - radius * 0.1, size * 0.8, eyeEmoji, 7);
  addEye(placements, x + radius * 0.3, y - radius * 0.1, size * 0.8, eyeEmoji, 7);

  return placements;
};

export const seahorse = (input: GeneratorInput): Placement[] => {
  const { rng, x, y, size, pickEmoji } = input;
  const bodyEmoji = pickEmoji("body");
  const finEmoji = pickEmoji("fin");
  const eyeEmoji = pickEmoji("eye");
  const length = size * randRange(rng, 4.2, 5.4);
  const spine = createSpine(rng, x, y, length, -Math.PI / 2, 12);
  const perpX = Math.cos(-Math.PI / 2 + Math.PI / 2);
  const perpY = Math.sin(-Math.PI / 2 + Math.PI / 2);
  const placements: Placement[] = [];

  spine.forEach((point) => {
    const taper = 0.4 + Math.sin(Math.PI * point.t) * 0.6;
    placeRow(
      placements,
      point.x,
      point.y,
      perpX,
      perpY,
      size * 0.8 * taper,
      size * 0.7,
      bodyEmoji,
      "body",
      -Math.PI / 2,
      5,
      rng
    );
  });

  const head = spine[Math.floor(spine.length * 0.15)];
  addEye(placements, head.x + size * 0.4, head.y - size * 0.1, size * 0.8, eyeEmoji, 7);

  const dorsal = spine[Math.floor(spine.length * 0.5)];
  placeFan(placements, dorsal.x, dorsal.y, -Math.PI / 2, 0.6, 4, size * 0.6, finEmoji, "fin", 6, rng);

  return placements;
};

export const creatureGenerators = [
  { id: "mosaic_giant", fn: mosaicGiant },
  { id: "fish_long", fn: fishLong },
  { id: "fish_round", fn: fishRound },
  { id: "eel", fn: eelWorm },
  { id: "jellyfish", fn: jellyfish },
  { id: "shrimp", fn: shrimp },
  { id: "crab", fn: crab },
  { id: "school_of_fish", fn: schoolOfFish },
  { id: "coral_cluster", fn: coralCluster },
  { id: "octopus", fn: octopus },
  { id: "seahorse", fn: seahorse },
];
