// Renders a mosaic (grid of palette indices) to a canvas, and handles export.
// Used for both the on-screen preview and the high-resolution download.

import { emojiFont } from "./constants.js";

// Draw the mosaic into `canvas` at `cellPx` pixels per cell.
// mosaic: { indices: Uint16Array, cols, rows, chars: string[] }
export function renderMosaic(canvas, mosaic, cellPx, { background = "#ffffff" } = {}) {
  const { indices, cols, rows, chars } = mosaic;
  canvas.width = cols * cellPx;
  canvas.height = rows * cellPx;

  const ctx = canvas.getContext("2d");
  if (background === "transparent") {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = emojiFont(Math.round(cellPx * 0.86));

  const half = cellPx / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = chars[indices[r * cols + c]];
      ctx.fillText(ch, c * cellPx + half, r * cellPx + half);
    }
  }
}

// Produce a high-res PNG blob of the mosaic.
export function mosaicToBlob(mosaic, cellPx, opts) {
  const off = document.createElement("canvas");
  renderMosaic(off, mosaic, cellPx, opts);
  return new Promise((resolve) =>
    off.toBlob((b) => resolve(b), "image/png")
  );
}

// Share on mobile (native sheet) when possible, else download the file.
export async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My emoji mosaic" });
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
      // fall through to download
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the click has been processed.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Copy the mosaic text grid (pure emoji, no image) to the clipboard — handy for
// pasting straight into a chat.
export function mosaicToText(mosaic) {
  const { indices, cols, rows, chars } = mosaic;
  let out = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) out += chars[indices[r * cols + c]];
    out += "\n";
  }
  return out;
}
