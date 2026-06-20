// Builds the emoji colour palette by rendering each glyph with the device's
// own emoji font and averaging its pixels. Done on the main thread (it needs a
// real 2D canvas + the system font) but it is one-time and cheap, then cached.
//
// Averaging what *this device* draws is deliberate: the exported mosaic uses
// the same font, so the matched colours are the colours the user will see.

import { srgbToOklab } from "./color.js";
import { emojiFont } from "./constants.js";

const RENDER_SIZE = 36; // px box we rasterise each emoji into
const CACHE_VERSION = 2; // bump to invalidate cached colours

// Render one emoji and return its alpha-weighted average colour + coverage.
function measureEmoji(ctx, ch) {
  const S = RENDER_SIZE;
  ctx.clearRect(0, 0, S, S);
  ctx.fillText(ch, S / 2, S / 2);

  const { data } = ctx.getImageData(0, 0, S, S);
  let r = 0, g = 0, b = 0, aSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    const w = a / 255;
    r += data[i] * w;
    g += data[i + 1] * w;
    b += data[i + 2] * w;
    aSum += w;
  }
  const px = (S * S);
  if (aSum === 0) return null; // glyph didn't render (unsupported)
  return {
    r: r / aSum,
    g: g / aSum,
    b: b / aSum,
    coverage: aSum / px, // fraction of the box the glyph fills
  };
}

// A platform signature so cached colours from a different OS/font are ignored.
function platformKey(chars) {
  const ua = navigator.userAgent || "";
  return `oklab:v${CACHE_VERSION}:${ua}:${chars.length}`;
}

// Build the palette for a list of emoji characters. Returns
// { chars: string[], colors: {L,a,b}[], rgb: [r,g,b][] }, dropping any glyph
// the device can't render. Results are cached in localStorage.
export function buildEmojiPalette(chars) {
  const cacheKey = `emoji62.palette.${hash(chars.join(""))}`;
  const sig = platformKey(chars);

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached && cached.sig === sig) return cached.palette;
  } catch {
    /* ignore corrupt cache */
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = RENDER_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = emojiFont(Math.round(RENDER_SIZE * 0.8));

  const outChars = [];
  const colors = [];
  for (const ch of chars) {
    const m = measureEmoji(ctx, ch);
    // Skip glyphs that don't render or are nearly empty (likely tofu).
    if (!m || m.coverage < 0.04) continue;
    outChars.push(ch);
    colors.push(srgbToOklab(m.r, m.g, m.b));
  }

  const palette = { chars: outChars, colors };
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ sig, palette }));
  } catch {
    /* storage full / disabled — fine, we just recompute next time */
  }
  return palette;
}

// Small, stable string hash for cache keys.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
