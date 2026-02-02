export type PartTag = "body" | "eye" | "fin" | "accent" | "bubble" | "prop";

export type RenderMode = "twemoji" | "native";

export interface Placement {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  layer: number;
  emoji: string;
  partTag: PartTag;
  opacity?: number;
}

export interface Creature {
  id: string;
  placements: Placement[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  center: { x: number; y: number };
  layer: number;
  motionSeed: number;
  static?: boolean;
}

export interface RockShape {
  x: number;
  y: number;
  w: number;
  h: number;
  tilt: number;
}

export interface SeabedWave {
  x: number;
  y: number;
}

export interface Scene {
  width: number;
  height: number;
  seabedY: number;
  seabedWave: SeabedWave[];
  rocks: RockShape[];
  staticPlacements: Placement[];
  creatures: Creature[];
}

export interface AspectPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface SceneSettings {
  seed: string;
  emojis: string[];
  width: number;
  height: number;
  density: number;
  chaos: number;
  strict: boolean;
  chaosAddon: boolean;
  twemoji: boolean;
  frame: boolean;
  animate: boolean;
}
