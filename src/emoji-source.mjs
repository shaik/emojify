// Single source of truth for the emoji palette.
// Curated for mosaic use: a spread of hues and lightness levels, with an
// emphasis on emojis that read as a fairly solid block of colour.
// Colours themselves are computed at runtime from the device font
// (see memory: runtime-emoji-color-precompute) — only the characters live here.

// Groups let the UI offer palette "styles". Every group is plain data so the
// build step can emit it as JSON without executing anything.

export const GROUPS = {
  // Solid colour blocks — the backbone of good coverage.
  blocks: [
    "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬛", "⬜",
    "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪",
  ],
  hearts: [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💗", "💖",
  ],
  faces: [
    "😀", "😄", "😁", "😆", "😅", "😂", "🙂", "😊", "😇", "😍", "🥰",
    "😋", "😎", "🤩", "🥳", "😴", "🤤", "😭", "😡", "🤬", "🥶", "🥵",
    "🤢", "🤮", "🤡", "👹", "👺", "👻", "💀", "👽", "🤖", "🎃",
  ],
  nature: [
    "🌵", "🌲", "🌳", "🌴", "🌱", "🍀", "🍃", "🍂", "🍁", "🌾", "🌻",
    "🌼", "🌷", "🌹", "🌸", "🌺", "🌞", "🌝", "🌚", "⭐", "🌟", "🔥",
    "💧", "🌊", "❄️", "☁️", "⛅", "🌈", "🍄",
  ],
  food: [
    "🍎", "🍏", "🍊", "🍋", "🍌", "🍉", "🍓", "🫐", "🍇", "🍈", "🍑",
    "🍒", "🥝", "🥥", "🥑", "🍅", "🌽", "🥕", "🥔", "🍞", "🧀", "🍫",
    "🍪", "🍩", "🍰", "🧁", "🍭", "🍬",
  ],
  animals: [
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁",
    "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦉", "🐝",
    "🐞", "🦋", "🐢", "🐠", "🐙", "🦀",
  ],
  objects: [
    "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🎱", "🔮", "💎", "💰", "📦",
    "📮", "✏️", "📌", "🧲", "🔋", "💡", "🎈", "🎁", "🪀", "🧊", "🧱",
  ],
};

// A reasonable default palette: everything except the busiest face set,
// which the user can opt into.
export const DEFAULT_GROUPS = ["blocks", "hearts", "nature", "food", "animals", "objects"];

export function buildPalette(groupNames = DEFAULT_GROUPS) {
  const seen = new Set();
  const out = [];
  for (const name of groupNames) {
    for (const ch of GROUPS[name] || []) {
      if (!seen.has(ch)) {
        seen.add(ch);
        out.push(ch);
      }
    }
  }
  return out;
}

export const ALL_GROUP_NAMES = Object.keys(GROUPS);
