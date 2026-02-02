import { PartTag } from "./types";
import { weightedChoice } from "./prng";

const eyeSet = new Set([
  "👁️",
  "👀",
  "⚫",
  "⚪",
  "🔵",
  "🟦",
  "🟢",
  "🟥",
  "🟡",
  "🟣",
  "🔘",
  "🧿",
]);

const bubbleSet = new Set(["🫧", "💦", "✨", "⭐", "🌟", "💫", "❇️", "✳️", "🫧"]);
const accentSet = new Set(["✨", "🌟", "💫", "❇️", "✳️", "🌀", "💥", "💢", "🌈"]);
const propSet = new Set(["🪨", "🗿", "👟", "⚓", "🏺", "🪦", "💎", "🚨", "📦", "🔱"]);
const handSet = new Set(["🖐️", "✋", "🤚", "🫱", "🫲", "🦾", "🦿", "🦴", "🫀"]);

const chaosAddon = [
  "🪨",
  "🗿",
  "👟",
  "⚓",
  "🧯",
  "🪣",
  "🪙",
  "🧊",
  "🧰",
  "📦",
  "❗",
  "❕",
  "⚠️",
  "🦴",
  "🪵",
  "🪝",
];

const defaultExtra = ["🐟", "🐠", "🐡", "🪼", "🦀", "🦐", "🪸", "🫧", "✨", "🪨"];

const filterBySet = (list: string[], set: Set<string>) => list.filter((emoji) => set.has(emoji));

const addUnique = (base: string[], extra: string[]) => {
  const set = new Set(base);
  extra.forEach((item) => {
    if (!set.has(item)) {
      set.add(item);
      base.push(item);
    }
  });
  return base;
};

const weightsFor = (list: string[], tag: PartTag) =>
  list.map((emoji) => {
    let weight = 1;
    if ((tag === "body" || tag === "fin") && handSet.has(emoji)) {
      weight += 2.5;
    }
    if (tag === "eye" && eyeSet.has(emoji)) {
      weight += 3;
    }
    if (tag === "bubble" && bubbleSet.has(emoji)) {
      weight += 2.5;
    }
    if (tag === "accent" && accentSet.has(emoji)) {
      weight += 2;
    }
    if (tag === "prop" && propSet.has(emoji)) {
      weight += 2;
    }
    return weight;
  });

export const createEmojiPicker = (
  inputEmojis: string[],
  options: { strict: boolean; chaosAddon: boolean },
  rng: () => number
) => {
  const baseList = inputEmojis.length > 0 ? [...inputEmojis] : [...defaultExtra];
  const all = options.strict ? baseList : addUnique(baseList, [...defaultExtra]);

  const pools = {
    eye: filterBySet(all, eyeSet),
    bubble: filterBySet(all, bubbleSet),
    accent: filterBySet(all, accentSet),
    prop: filterBySet(all, propSet),
  };

  const pick = (tag: PartTag) => {
    let candidates = all;
    if (tag === "eye") {
      candidates = pools.eye.length ? pools.eye : all;
    } else if (tag === "bubble") {
      candidates = pools.bubble.length ? pools.bubble : all;
    } else if (tag === "accent") {
      candidates = pools.accent.length ? pools.accent : all;
    } else if (tag === "prop") {
      candidates = pools.prop.length ? pools.prop : all;
      if (options.chaosAddon) {
        candidates = addUnique([...candidates], [...chaosAddon]);
      }
    }
    return weightedChoice(rng, candidates, weightsFor(candidates, tag));
  };

  return { pick, all };
};
