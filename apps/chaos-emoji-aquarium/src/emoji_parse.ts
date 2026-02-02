import emojiRegex from "emoji-regex";

const dedupe = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    if (seen.has(value)) return;
    seen.add(value);
    result.push(value);
  });
  return result;
};

export const parseEmojis = (input: string) => {
  const regex = emojiRegex();
  const matches = input.match(regex) ?? [];
  const list = matches.length > 0
    ? matches
    : input
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter(Boolean);
  return dedupe(list);
};
