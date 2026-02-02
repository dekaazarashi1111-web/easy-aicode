export const hashStringToUint32 = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const randRange = (rng: () => number, min: number, max: number) =>
  min + (max - min) * rng();

export const randInt = (rng: () => number, min: number, max: number) =>
  Math.floor(randRange(rng, min, max + 1));

export const pickOne = <T,>(rng: () => number, list: T[]): T =>
  list[Math.floor(rng() * list.length)];

export const weightedChoice = (rng: () => number, list: string[], weights: number[]): string => {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const target = rng() * total;
  let acc = 0;
  for (let i = 0; i < list.length; i += 1) {
    acc += weights[i];
    if (target <= acc) return list[i];
  }
  return list[list.length - 1];
};
