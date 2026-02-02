import { drawEmoji, preloadTwemoji } from "./emoji_render";
import { RenderMode, Scene, Placement, Creature } from "./types";
import { mulberry32 } from "./prng";

interface RenderOptions {
  mode: RenderMode;
  scale: number;
  frame: boolean;
}

interface LayerCanvases {
  under: HTMLCanvasElement;
  over: HTMLCanvasElement;
  background: HTMLCanvasElement;
}

export interface CreatureSprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  center: { x: number; y: number };
  base: { x: number; y: number };
  layer: number;
  motion: { speed: number; bob: number; sway: number; rot: number; phase: number };
  static: boolean;
}

export interface PreparedScene {
  scene: Scene;
  layers: LayerCanvases;
  sprites: CreatureSprite[];
  mode: RenderMode;
  scale: number;
}

const drawBackground = (ctx: CanvasRenderingContext2D, scene: Scene) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, scene.height);
  gradient.addColorStop(0, "#0a2b66");
  gradient.addColorStop(0.5, "#0b5f97");
  gradient.addColorStop(1, "#1082b6");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, scene.width, scene.height);

  const vignette = ctx.createRadialGradient(
    scene.width * 0.5,
    scene.height * 0.4,
    scene.width * 0.2,
    scene.width * 0.5,
    scene.height * 0.4,
    scene.width * 0.9
  );
  vignette.addColorStop(0, "rgba(5, 12, 24, 0)");
  vignette.addColorStop(1, "rgba(4, 8, 20, 0.6)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, scene.width, scene.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.ellipse(scene.width * 0.65, scene.height * 0.2, scene.width * 0.4, scene.height * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, scene.seabedY + 10);
  scene.seabedWave.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(scene.width, scene.seabedY + 10);
  ctx.lineTo(scene.width, scene.height);
  ctx.lineTo(0, scene.height);
  ctx.closePath();
  const sand = ctx.createLinearGradient(0, scene.seabedY, 0, scene.height);
  sand.addColorStop(0, "#d6b684");
  sand.addColorStop(1, "#a47947");
  ctx.fillStyle = sand;
  ctx.fill();

  ctx.fillStyle = "rgba(80, 60, 30, 0.35)";
  scene.rocks.forEach((rock) => {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.tilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, rock.w / 2, rock.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
};

const drawFrame = (ctx: CanvasRenderingContext2D, scene: Scene) => {
  ctx.fillStyle = "rgba(5, 8, 16, 0.55)";
  ctx.fillRect(0, scene.height - 46, scene.width, 46);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(scene.width, 0);
  ctx.lineTo(scene.width, 40);
  ctx.stroke();
};

const setupLayer = (scene: Scene, scale: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = scene.width * scale;
  canvas.height = scene.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, ctx: null as CanvasRenderingContext2D | null };
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return { canvas, ctx };
};

const splitStaticPlacements = (placements: Placement[]) => ({
  under: placements.filter((placement) => placement.layer < 5),
  over: placements.filter((placement) => placement.layer >= 5),
});

const buildSprite = async (creature: Creature, mode: RenderMode, scale: number) => {
  const padding = 8;
  const width = creature.bounds.maxX - creature.bounds.minX + padding * 2;
  const height = creature.bounds.maxY - creature.bounds.minY + padding * 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const sorted = [...creature.placements].sort((a, b) => a.layer - b.layer);
  for (const placement of sorted) {
    const shifted = {
      ...placement,
      x: placement.x - creature.bounds.minX + padding,
      y: placement.y - creature.bounds.minY + padding,
    };
    await drawEmoji(ctx, shifted, mode);
  }
  const center = {
    x: creature.center.x - creature.bounds.minX + padding,
    y: creature.center.y - creature.bounds.minY + padding,
  };
  return { canvas, width, height, center };
};

const motionParams = (creature: Creature) => {
  const rng = mulberry32(creature.motionSeed);
  return {
    speed: 0.25 + rng() * 0.4,
    bob: 6 + rng() * 10,
    sway: 8 + rng() * 14,
    rot: 0.05 + rng() * 0.12,
    phase: rng() * Math.PI * 2,
  };
};

export const prepareScene = async (
  scene: Scene,
  options: RenderOptions
): Promise<PreparedScene> => {
  const { scale, mode } = options;
  const allEmojis = [
    ...scene.staticPlacements.map((placement) => placement.emoji),
    ...scene.creatures.flatMap((creature) => creature.placements.map((placement) => placement.emoji)),
  ];
  if (mode === "twemoji") {
    await preloadTwemoji(allEmojis);
  }

  const { canvas: background, ctx: bgCtx } = setupLayer(scene, scale);
  if (bgCtx) {
    drawBackground(bgCtx, scene);
  }

  const { under, over } = splitStaticPlacements(scene.staticPlacements);
  const { canvas: underCanvas, ctx: underCtx } = setupLayer(scene, scale);
  if (underCtx) {
    for (const placement of under) {
      await drawEmoji(underCtx, placement, mode);
    }
  }
  const { canvas: overCanvas, ctx: overCtx } = setupLayer(scene, scale);
  if (overCtx) {
    for (const placement of over) {
      await drawEmoji(overCtx, placement, mode);
    }
  }

  const sprites: CreatureSprite[] = [];
  for (const creature of scene.creatures) {
    const sprite = await buildSprite(creature, mode, scale);
    if (!sprite) continue;
    sprites.push({
      canvas: sprite.canvas,
      width: sprite.width,
      height: sprite.height,
      center: sprite.center,
      base: { ...creature.center },
      layer: creature.layer,
      motion: motionParams(creature),
      static: creature.static ?? false,
    });
  }

  sprites.sort((a, b) => a.layer - b.layer);

  return {
    scene,
    layers: { background, under: underCanvas, over: overCanvas },
    sprites,
    mode,
    scale,
  };
};

export const renderFrame = (
  canvas: HTMLCanvasElement,
  prepared: PreparedScene,
  options: RenderOptions,
  time: number
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { scene, layers, sprites, scale } = prepared;

  canvas.width = scene.width * scale;
  canvas.height = scene.height * scale;
  canvas.style.width = `${scene.width}px`;
  canvas.style.height = `${scene.height}px`;

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, scene.width, scene.height);
  ctx.drawImage(layers.background, 0, 0, scene.width, scene.height);
  ctx.drawImage(layers.under, 0, 0, scene.width, scene.height);

  sprites.forEach((sprite) => {
    const t = time * sprite.motion.speed + sprite.motion.phase;
    const dx = sprite.static ? 0 : Math.sin(t) * sprite.motion.sway;
    const dy = sprite.static ? 0 : Math.cos(t * 0.9) * sprite.motion.bob;
    const rot = sprite.static ? 0 : Math.sin(t * 0.7) * sprite.motion.rot;
    ctx.save();
    ctx.translate(sprite.base.x + dx, sprite.base.y + dy);
    ctx.rotate(rot);
    ctx.drawImage(
      sprite.canvas,
      -sprite.center.x,
      -sprite.center.y,
      sprite.width,
      sprite.height
    );
    ctx.restore();
  });

  ctx.drawImage(layers.over, 0, 0, scene.width, scene.height);
  if (options.frame) {
    drawFrame(ctx, scene);
  }
};

export const renderScene = async (
  canvas: HTMLCanvasElement,
  scene: Scene,
  options: RenderOptions
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const scale = options.scale;

  canvas.width = scene.width * scale;
  canvas.height = scene.height * scale;
  canvas.style.width = `${scene.width}px`;
  canvas.style.height = `${scene.height}px`;

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, scene.width, scene.height);

  drawBackground(ctx, scene);

  const allPlacements = [
    ...scene.staticPlacements,
    ...scene.creatures.flatMap((creature) => creature.placements),
  ];
  const sorted = [...allPlacements].sort((a, b) => a.layer - b.layer);
  if (options.mode === "twemoji") {
    await preloadTwemoji(sorted.map((placement) => placement.emoji));
  }

  for (const placement of sorted) {
    await drawEmoji(ctx, placement, options.mode);
  }

  if (options.frame) {
    drawFrame(ctx, scene);
  }
};
