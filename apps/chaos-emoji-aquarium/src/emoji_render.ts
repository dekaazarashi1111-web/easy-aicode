import twemoji from "twemoji";
import { Placement, RenderMode } from "./types";

const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/";

const imageCache = new Map<string, Promise<HTMLImageElement>>();

const getTwemojiUrl = (emoji: string) => {
  const codepoint = twemoji.convert.toCodePoint(emoji);
  return `${TWEMOJI_BASE}${codepoint}.svg`;
};

const loadImage = (emoji: string) => {
  if (imageCache.has(emoji)) {
    return imageCache.get(emoji)!;
  }
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (event) => reject(event);
    img.src = getTwemojiUrl(emoji);
  });
  imageCache.set(emoji, promise);
  return promise;
};

export const preloadTwemoji = async (emojis: string[]) => {
  const unique = Array.from(new Set(emojis));
  await Promise.allSettled(unique.map((emoji) => loadImage(emoji)));
};

export const drawEmoji = async (
  ctx: CanvasRenderingContext2D,
  placement: Placement,
  mode: RenderMode
) => {
  ctx.save();
  ctx.translate(placement.x, placement.y);
  ctx.rotate(placement.rotation);
  if (placement.opacity !== undefined) {
    ctx.globalAlpha = placement.opacity;
  }

  const drawNative = () => {
    ctx.font = `${placement.scale}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(placement.emoji, 0, 0);
  };

  if (mode === "native") {
    drawNative();
    ctx.restore();
    return;
  }

  try {
    const img = await loadImage(placement.emoji);
    const size = placement.scale;
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
  } catch (error) {
    console.warn("[twemoji] fallback to native", placement.emoji, error);
    drawNative();
  }
  ctx.restore();
};
