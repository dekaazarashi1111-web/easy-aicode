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
  placements: Placement[];
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
}
