import { drawEmoji, preloadTwemoji } from "./emoji_render";
import { RenderMode, Scene } from "./types";

interface RenderOptions {
  mode: RenderMode;
  scale: number;
  frame: boolean;
}

const drawBackground = (ctx: CanvasRenderingContext2D, scene: Scene, frame: boolean) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, scene.height);
  gradient.addColorStop(0, "#082357");
  gradient.addColorStop(0.55, "#0b4a85");
  gradient.addColorStop(1, "#0d7cb0");
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

  if (frame) {
    ctx.fillStyle = "rgba(5, 8, 16, 0.55)";
    ctx.fillRect(0, scene.height - 46, scene.width, 46);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(scene.width, 0);
    ctx.lineTo(scene.width, 40);
    ctx.stroke();
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

  drawBackground(ctx, scene, options.frame);

  const sorted = [...scene.placements].sort((a, b) => a.layer - b.layer);
  if (options.mode === "twemoji") {
    await preloadTwemoji(sorted.map((placement) => placement.emoji));
  }

  for (const placement of sorted) {
    await drawEmoji(ctx, placement, options.mode);
  }
};
