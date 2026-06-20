// Shared constants. The emoji font stack lives here so the colours we *measure*
// (palette.js) and the glyphs we *draw* (render.js) always come from the same
// font — measuring the device font is pointless if the two can drift apart.

export const EMOJI_FONT_STACK =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export const emojiFont = (px) => `${px}px ${EMOJI_FONT_STACK}`;
