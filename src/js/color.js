// Colour-space utilities for perceptual matching.
//
// We match in OKLab: it is perceptually uniform enough that plain Euclidean
// distance is a good stand-in for perceived colour difference, and it is far
// cheaper than CIEDE2000 (no trig, no piecewise terms) — which matters when we
// run the distance function millions of times in the matching loop.
//
// Pipeline: sRGB (0-255) -> linear sRGB -> OKLab.

// sRGB transfer function (gamma) -> linear light.
export function srgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// Linear sRGB -> OKLab. Constants from Björn Ottosson's OKLab definition.
export function linearRgbToOklab(r, g, b) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

// Convenience: sRGB (0-255) -> OKLab.
export function srgbToOklab(r, g, b) {
  return linearRgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
}

// Note: the per-tile nearest-neighbour distance is inlined in mosaic.worker.js
// (squared OKLab Euclidean) to keep the hot loop allocation-free.
