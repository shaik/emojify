// Mosaic matching loop — runs off the main thread.
//
// Receives the source image pixels plus a palette of OKLab colours, and emits a
// grid of palette indices (one emoji per cell). No canvas here on purpose: the
// worker is pure number-crunching so it runs everywhere a Worker does, and the
// main thread owns all rendering.

import { srgbToLinear, linearRgbToOklab } from "./color.js";

// sRGB channel values are integers 0-255, so precompute the gamma curve once
// instead of calling Math.pow millions of times in the averaging loop.
const SRGB_LUT = new Float32Array(256);
for (let i = 0; i < 256; i++) SRGB_LUT[i] = srgbToLinear(i);

// Floyd-Steinberg error-diffusion weights (denominator 16).
const FS = [
  { dx: 1, dy: 0, w: 7 / 16 },
  { dx: -1, dy: 1, w: 3 / 16 },
  { dx: 0, dy: 1, w: 5 / 16 },
  { dx: 1, dy: 1, w: 1 / 16 },
];

self.onmessage = (e) => {
  const { data, width, height, cols, rows, palette, dither } = e.data;
  try {
    const result = buildMosaic(data, width, height, cols, rows, palette, dither);
    // Transfer the index buffer back to avoid a copy.
    self.postMessage({ type: "done", ...result }, [result.indices.buffer]);
  } catch (err) {
    self.postMessage({ type: "error", message: String(err && err.message || err) });
  }
};

function buildMosaic(data, width, height, cols, rows, palette, dither) {
  const n = cols * rows;

  // 1. Average each cell of the source image in linear light, then to OKLab.
  //    target* arrays are mutable so dithering can push error into them.
  const targetL = new Float32Array(n);
  const targetA = new Float32Array(n);
  const targetB = new Float32Array(n);

  for (let cy = 0; cy < rows; cy++) {
    const y0 = Math.floor((cy * height) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * height) / rows));
    for (let cx = 0; cx < cols; cx++) {
      const x0 = Math.floor((cx * width) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * width) / cols));

      let lr = 0, lg = 0, lb = 0, count = 0;
      for (let y = y0; y < y1; y++) {
        let p = (y * width + x0) * 4;
        for (let x = x0; x < x1; x++, p += 4) {
          lr += SRGB_LUT[data[p]];
          lg += SRGB_LUT[data[p + 1]];
          lb += SRGB_LUT[data[p + 2]];
          count++;
        }
      }
      const lab = linearRgbToOklab(lr / count, lg / count, lb / count);
      const idx = cy * cols + cx;
      targetL[idx] = lab.L;
      targetA[idx] = lab.a;
      targetB[idx] = lab.b;
    }
    if ((cy & 15) === 0) postProgress((cy / rows) * 0.5);
  }

  // 2. Match each cell to the nearest palette colour (optionally dithering).
  const pL = palette.L, pA = palette.a, pB = palette.b;
  const pc = pL.length;
  const indices = new Uint16Array(n);

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const i = cy * cols + cx;
      const tL = targetL[i], tA = targetA[i], tB = targetB[i];

      // Nearest neighbour — linear scan (palette is small; this is plenty fast).
      let best = 0, bestD = Infinity;
      for (let k = 0; k < pc; k++) {
        const dL = tL - pL[k], da = tA - pA[k], db = tB - pB[k];
        const d = dL * dL + da * da + db * db;
        if (d < bestD) { bestD = d; best = k; }
      }
      indices[i] = best;

      if (dither) {
        const eL = tL - pL[best], eA = tA - pA[best], eB = tB - pB[best];
        for (const { dx, dy, w } of FS) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || nx >= cols || ny >= rows) continue;
          const j = ny * cols + nx;
          targetL[j] += eL * w;
          targetA[j] += eA * w;
          targetB[j] += eB * w;
        }
      }
    }
    if ((cy & 15) === 0) postProgress(0.5 + (cy / rows) * 0.5);
  }

  postProgress(1);
  return { indices, cols, rows };
}

function postProgress(value) {
  self.postMessage({ type: "progress", value });
}
