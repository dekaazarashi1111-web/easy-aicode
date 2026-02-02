import { parseEmojis } from "./emoji_parse";
import { generateScene } from "./scene_generate";
import { prepareScene, renderFrame, renderScene, PreparedScene } from "./render";
import { AspectPreset, Scene, SceneSettings } from "./types";

const presets: AspectPreset[] = [
  { id: "16:9", label: "16:9 (1200x675)", width: 1200, height: 675 },
  { id: "4:3", label: "4:3 (1200x900)", width: 1200, height: 900 },
  { id: "1:1", label: "1:1 (1200x1200)", width: 1200, height: 1200 },
  { id: "4:5", label: "4:5 (1200x1500)", width: 1200, height: 1500 },
];

const defaultEmojiInput = "🐟 🐠 🐡 🐙 🪼 🦐 🦀 🫧 ✨ 🪨 🗿 👟";

const randomSeedString = () => {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  return `${buf[0].toString(16)}-${buf[1].toString(16)}`;
};

const emojiPool = [
  "🖐️", "✋", "🤚", "🫱", "🫲", "🧿", "👁️", "👀",
  "🐟", "🐠", "🐡", "🦈", "🐙", "🪼", "🦐", "🦀", "🦑", "🪸",
  "🫧", "💦", "✨", "⭐", "🌟", "💫", "❇️", "✳️",
  "🪨", "🗿", "⚓", "🏺", "🪦", "💎", "👟", "🥽",
  "🪵", "🪝", "🧊", "🧰", "🧯", "📦", "🔱", "⚠️", "❗", "❕",
  "🌀", "🌈", "🔵", "🟦", "🟢", "🟥", "🟡", "🟣", "⚫", "⚪",
  "🥳", "😀", "😺", "😈", "👻", "🤖", "👽",
];

const shuffle = (list: string[]) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickRandomEmojis = () => {
  const count = Math.floor(Math.random() * 8) + 8;
  return shuffle(emojiPool).slice(0, count).join(" ");
};

const boolFromParam = (value: string | null, fallback: boolean) => {
  if (value === null) return fallback;
  return value === "1" || value === "true";
};

export const initApp = () => {
  const emojiInput = document.getElementById("emojiInput") as HTMLTextAreaElement;
  const emojiCount = document.getElementById("emojiCount") as HTMLSpanElement;
  const randomEmoji = document.getElementById("randomEmoji") as HTMLButtonElement;
  const seedInput = document.getElementById("seedInput") as HTMLInputElement;
  const randomSeed = document.getElementById("randomSeed") as HTMLButtonElement;
  const aspectSelect = document.getElementById("aspectSelect") as HTMLSelectElement;
  const densityRange = document.getElementById("densityRange") as HTMLInputElement;
  const densityValue = document.getElementById("densityValue") as HTMLSpanElement;
  const chaosRange = document.getElementById("chaosRange") as HTMLInputElement;
  const chaosValue = document.getElementById("chaosValue") as HTMLSpanElement;
  const strictToggle = document.getElementById("strictToggle") as HTMLInputElement;
  const chaosAddonToggle = document.getElementById("chaosAddonToggle") as HTMLInputElement;
  const twemojiToggle = document.getElementById("twemojiToggle") as HTMLInputElement;
  const frameToggle = document.getElementById("frameToggle") as HTMLInputElement;
  const animationToggle = document.getElementById("animationToggle") as HTMLInputElement;
  const generateBtn = document.getElementById("generateBtn") as HTMLButtonElement;
  const downloadBtn = document.getElementById("downloadBtn") as HTMLButtonElement;
  const shareBtn = document.getElementById("shareBtn") as HTMLButtonElement;
  const shareOutput = document.getElementById("shareOutput") as HTMLInputElement;
  const canvas = document.getElementById("sceneCanvas") as HTMLCanvasElement;
  const statusLabel = document.getElementById("statusLabel") as HTMLDivElement;
  const statusMeta = document.getElementById("statusMeta") as HTMLDivElement;
  const sizeLabel = document.getElementById("sizeLabel") as HTMLSpanElement;
  const loadingOverlay = document.getElementById("loadingOverlay") as HTMLDivElement;

  let lastScene: Scene | null = null;
  let lastSettings: SceneSettings | null = null;
  let prepared: PreparedScene | null = null;
  let rafId = 0;
  let lastTime = 0;

  const updateCounts = () => {
    const emojis = parseEmojis(emojiInput.value);
    emojiCount.textContent = `${emojis.length} 個`;
  };

  const updateSliderValues = () => {
    densityValue.textContent = densityRange.value;
    chaosValue.textContent = chaosRange.value;
  };

  const getPreset = () => presets.find((preset) => preset.id === aspectSelect.value) ?? presets[0];

  const readSettings = (): SceneSettings => {
    const preset = getPreset();
    const emojis = parseEmojis(emojiInput.value);
    return {
      seed: seedInput.value.trim() || "seed",
      emojis,
      width: preset.width,
      height: preset.height,
      density: Number(densityRange.value),
      chaos: Number(chaosRange.value),
      strict: strictToggle.checked,
      chaosAddon: chaosAddonToggle.checked,
      twemoji: twemojiToggle.checked,
      frame: frameToggle.checked,
      animate: animationToggle.checked,
    };
  };

  const setLoading = (loading: boolean) => {
    if (loading) {
      loadingOverlay.classList.add("is-visible");
      statusLabel.textContent = "生成中...";
    } else {
      loadingOverlay.classList.remove("is-visible");
    }
  };

  const stopAnimation = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const startAnimation = () => {
    if (!prepared) return;
    stopAnimation();
    const loop = (time: number) => {
      lastTime = time / 1000;
      renderFrame(canvas, prepared, {
        mode: prepared.mode,
        scale: prepared.scale,
        frame: lastSettings?.frame ?? true,
      }, lastTime);
      if (animationToggle.checked && !document.hidden) {
        rafId = requestAnimationFrame(loop);
      } else {
        rafId = 0;
      }
    };
    rafId = requestAnimationFrame(loop);
  };

  const renderStill = () => {
    if (!prepared) return;
    renderFrame(canvas, prepared, {
      mode: prepared.mode,
      scale: prepared.scale,
      frame: lastSettings?.frame ?? true,
    }, 0);
  };

  const generate = async () => {
    updateCounts();
    updateSliderValues();
    const settings = readSettings();
    if (settings.emojis.length === 0) {
      emojiInput.value = defaultEmojiInput;
      settings.emojis = parseEmojis(defaultEmojiInput);
    }
    setLoading(true);
    try {
      const scene = generateScene(settings);
      lastScene = scene;
      lastSettings = settings;
      const scale = window.devicePixelRatio || 1;
      prepared = await prepareScene(scene, {
        mode: settings.twemoji ? "twemoji" : "native",
        scale,
        frame: settings.frame,
      });
      if (settings.animate) {
        startAnimation();
      } else {
        renderStill();
      }
      statusLabel.textContent = "生成完了";
      const placementCount =
        scene.staticPlacements.length +
        scene.creatures.reduce((sum, creature) => sum + creature.placements.length, 0);
      statusMeta.textContent = `配置 ${placementCount} / ${settings.emojis.length} 絵文字`;
      sizeLabel.textContent = `${settings.width} x ${settings.height}px`;
      const shareUrl = buildShareUrl(settings);
      shareOutput.value = shareUrl;
    } catch (error) {
      console.error(error);
      statusLabel.textContent = "生成失敗";
    } finally {
      setLoading(false);
    }
  };

  const buildShareUrl = (settings: SceneSettings) => {
    const url = new URL(window.location.href);
    url.searchParams.set("seed", settings.seed);
    url.searchParams.set("emojis", settings.emojis.join(" "));
    url.searchParams.set("aspect", getPreset().id);
    url.searchParams.set("density", String(settings.density));
    url.searchParams.set("chaos", String(settings.chaos));
    url.searchParams.set("strict", settings.strict ? "1" : "0");
    url.searchParams.set("addon", settings.chaosAddon ? "1" : "0");
    url.searchParams.set("tw", settings.twemoji ? "1" : "0");
    url.searchParams.set("frame", settings.frame ? "1" : "0");
    url.searchParams.set("anim", settings.animate ? "1" : "0");
    return url.toString();
  };

  const applyParams = () => {
    const params = new URLSearchParams(window.location.search);
    const seed = params.get("seed");
    const emojis = params.get("emojis");
    const aspect = params.get("aspect");
    const density = params.get("density");
    const chaos = params.get("chaos");
    const strict = params.get("strict");
    const addon = params.get("addon");
    const tw = params.get("tw");
    const frame = params.get("frame");
    const anim = params.get("anim");

    if (seed) seedInput.value = seed;
    if (emojis) emojiInput.value = emojis;
    if (aspect && presets.some((preset) => preset.id === aspect)) {
      aspectSelect.value = aspect;
    }
    if (density) densityRange.value = density;
    if (chaos) chaosRange.value = chaos;
    strictToggle.checked = boolFromParam(strict, true);
    chaosAddonToggle.checked = boolFromParam(addon, false);
    twemojiToggle.checked = boolFromParam(tw, true);
    frameToggle.checked = boolFromParam(frame, true);
    animationToggle.checked = boolFromParam(anim, true);
  };

  const handleShare = async () => {
    if (!lastSettings) return;
    const url = buildShareUrl(lastSettings);
    shareOutput.value = url;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Chaos Emoji Aquarium",
          text: "絵文字水槽をシェアします",
          url,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      statusLabel.textContent = "共有URLをコピーしました";
    } catch (error) {
      console.error(error);
      statusLabel.textContent = "共有に失敗しました";
    }
  };

  const handleDownload = async () => {
    if (!lastScene || !lastSettings) return;
    const exportCanvas = document.createElement("canvas");
    const exportPrepared = await prepareScene(lastScene, {
      mode: lastSettings.twemoji ? "twemoji" : "native",
      scale: 1,
      frame: lastSettings.frame,
    });
    renderFrame(exportCanvas, exportPrepared, {
      mode: exportPrepared.mode,
      scale: exportPrepared.scale,
      frame: lastSettings.frame,
    }, lastSettings.animate ? lastTime : 0);
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `chaos-aquarium-${lastSettings.seed}.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  emojiInput.value = emojiInput.value.trim() || defaultEmojiInput;
  seedInput.value = seedInput.value.trim() || randomSeedString();

  applyParams();
  updateCounts();
  updateSliderValues();

  emojiInput.addEventListener("input", updateCounts);
  densityRange.addEventListener("input", updateSliderValues);
  chaosRange.addEventListener("input", updateSliderValues);
  randomSeed.addEventListener("click", () => {
    seedInput.value = randomSeedString();
  });
  randomEmoji.addEventListener("click", () => {
    emojiInput.value = pickRandomEmojis();
    updateCounts();
  });

  generateBtn.addEventListener("click", generate);
  shareBtn.addEventListener("click", handleShare);
  downloadBtn.addEventListener("click", handleDownload);
  animationToggle.addEventListener("change", () => {
    if (animationToggle.checked) {
      startAnimation();
    } else {
      stopAnimation();
      renderStill();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAnimation();
    } else if (animationToggle.checked) {
      startAnimation();
    }
  });

  generate();
};
