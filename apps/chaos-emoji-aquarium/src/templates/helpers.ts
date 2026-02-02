import { Placement, PartTag } from "../types";
import { randRange, randInt } from "../prng";

export interface SpinePoint {
  x: number;
  y: number;
  t: number;
}

export const createSpine = (
  rng: () => number,
  centerX: number,
  centerY: number,
  length: number,
  angle: number,
  segments: number
): SpinePoint[] => {
  const points: SpinePoint[] = [];
  const dx = Math.cos(angle) * length;
  const dy = Math.sin(angle) * length;
  const startX = centerX - dx * 0.5;
  const startY = centerY - dy * 0.5;
  const perpX = Math.cos(angle + Math.PI / 2);
  const perpY = Math.sin(angle + Math.PI / 2);
  const waveAmp = length * randRange(rng, 0.03, 0.08);
  const waveFreq = randRange(rng, 1.6, 3.1);
  const phase = randRange(rng, 0, Math.PI * 2);

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const baseX = startX + dx * t;
    const baseY = startY + dy * t;
    const wave = Math.sin(t * Math.PI * waveFreq + phase) * waveAmp;
    points.push({
      x: baseX + perpX * wave,
      y: baseY + perpY * wave,
      t,
    });
  }
  return points;
};

export const placeRow = (
  list: Placement[],
  x: number,
  y: number,
  perpX: number,
  perpY: number,
  thickness: number,
  size: number,
  emoji: string,
  partTag: PartTag,
  rotation: number,
  layer: number,
  rng: () => number
) => {
  const count = Math.max(1, Math.round(thickness / (size * 0.8)));
  for (let i = -count; i <= count; i += 1) {
    const offset = (i / count) * thickness;
    const jitter = randRange(rng, -size * 0.08, size * 0.08);
    list.push({
      x: x + perpX * offset + jitter,
      y: y + perpY * offset + jitter,
      scale: size,
      rotation: rotation + randRange(rng, -0.2, 0.2),
      layer,
      emoji,
      partTag,
    });
  }
};

export const placeFan = (
  list: Placement[],
  x: number,
  y: number,
  baseAngle: number,
  spread: number,
  count: number,
  size: number,
  emoji: string,
  partTag: PartTag,
  layer: number,
  rng: () => number
) => {
  for (let i = 0; i < count; i += 1) {
    const angle = baseAngle + randRange(rng, -spread, spread);
    const dist = randRange(rng, size * 0.4, size * 1.4);
    list.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      scale: size * randRange(rng, 0.7, 1.05),
      rotation: angle,
      layer,
      emoji,
      partTag,
    });
  }
};

export const fillOval = (
  rng: () => number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  size: number,
  emoji: string,
  partTag: PartTag,
  layer: number
) => {
  const placements: Placement[] = [];
  const area = Math.PI * rx * ry;
  const count = Math.max(12, Math.round(area / (size * size * 1.2)));
  for (let i = 0; i < count; i += 1) {
    const t = Math.sqrt(rng());
    const angle = randRange(rng, 0, Math.PI * 2);
    const x = cx + Math.cos(angle) * rx * t;
    const y = cy + Math.sin(angle) * ry * t;
    placements.push({
      x,
      y,
      scale: size * randRange(rng, 0.8, 1.1),
      rotation: randRange(rng, -Math.PI, Math.PI),
      layer,
      emoji,
      partTag,
    });
  }
  return placements;
};

export const chainPoints = (
  rng: () => number,
  startX: number,
  startY: number,
  angle: number,
  length: number,
  segments: number,
  wobble = 0.4
) => {
  const points: SpinePoint[] = [];
  const step = length / segments;
  const perpX = Math.cos(angle + Math.PI / 2);
  const perpY = Math.sin(angle + Math.PI / 2);
  let x = startX;
  let y = startY;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const wave = Math.sin(t * Math.PI * 2 + randRange(rng, 0, Math.PI * 2)) * step * wobble;
    points.push({
      x: x + perpX * wave,
      y: y + perpY * wave,
      t,
    });
    x += Math.cos(angle) * step;
    y += Math.sin(angle) * step;
  }
  return points;
};

export const randomAround = (rng: () => number, x: number, y: number, radius: number) => ({
  x: x + randRange(rng, -radius, radius),
  y: y + randRange(rng, -radius, radius),
});

export const randomPickIndex = (rng: () => number, length: number) =>
  randInt(rng, 0, Math.max(0, length - 1));
