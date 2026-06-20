// App orchestration: upload -> crop -> mosaic -> share.

import { ALL_GROUP_NAMES, DEFAULT_GROUPS, buildPalette } from "../emoji-source.mjs";
import { buildEmojiPalette } from "./palette.js";
import { CropEditor } from "./crop.js";
import { renderMosaic, mosaicToBlob, shareOrDownload, mosaicToText } from "./render.js";

const GROUP_LABELS = {
  blocks: "🟦 Blocks", hearts: "❤️ Hearts", faces: "😀 Faces",
  nature: "🌿 Nature", food: "🍎 Food", animals: "🐶 Animals", objects: "⚽ Objects",
};

const $ = (sel) => document.querySelector(sel);

const state = {
  img: null,
  imgUrl: null,
  crop: null,
  srcImageData: null,
  selectedGroups: new Set(DEFAULT_GROUPS),
  palette: null, // { chars, colors, rgb }
  settings: { density: 64, dither: false, background: "#ffffff" },
  mosaic: null,
  jobId: 0,
};

let worker = null;
function getWorker() {
  if (!worker) worker = new Worker(new URL("./mosaic.worker.js", import.meta.url), { type: "module" });
  return worker;
}

/* ---------------- Step navigation ---------------- */
function goTo(step) {
  document.body.dataset.step = step;
  document.querySelectorAll(".panel").forEach((p) => {
    p.hidden = p.dataset.for !== step;
  });
  $("#restart").hidden = step === "upload";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------------- Upload ---------------- */
function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    toast("That doesn't look like an image.");
    return;
  }
  // Replace any previous object URL; keep this one alive until the crop <img>
  // (which reuses it) is done with it — revoking too early breaks loading.
  if (state.imgUrl) URL.revokeObjectURL(state.imgUrl);
  const url = URL.createObjectURL(file);
  state.imgUrl = url;

  const img = new Image();
  img.onload = () => {
    state.img = img;
    startCrop(img);
  };
  img.onerror = () => {
    toast("Couldn't read that image. Try another.");
  };
  img.src = url;
}

function initUpload() {
  const input = $("#file-input");
  const zone = $("#dropzone");
  input.addEventListener("change", () => handleFile(input.files[0]));

  ["dragenter", "dragover"].forEach((ev) =>
    zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("is-drag"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("is-drag"); })
  );
  zone.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));
}

/* ---------------- Crop ---------------- */
async function startCrop(img) {
  const frame = $("#crop-frame");
  const cropImg = $("#crop-img");
  if (state.crop) state.crop.destroy();
  goTo("crop");

  cropImg.src = img.src;
  // Wait for the crop <img> to actually decode — its naturalWidth must be set
  // before CropEditor reads it, or the scale math goes Infinity/NaN.
  try { await cropImg.decode(); } catch { /* fall through; load event still fires */ }
  state.crop = new CropEditor(frame, cropImg);
  $("#zoom").value = 1;
}

function initCrop() {
  $("#zoom").addEventListener("input", (e) => state.crop?.setZoom(parseFloat(e.target.value)));

  document.querySelectorAll("[data-aspect]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-aspect]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      $("#crop-frame").style.aspectRatio = btn.dataset.aspect;
      $("#zoom").value = 1;
      requestAnimationFrame(() => state.crop?.reset());
    });
  });

  $("#to-studio").addEventListener("click", () => {
    const canvas = state.crop.getCroppedCanvas(720);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    // Read the source pixels once; every re-convert reuses this.
    state.srcImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    goTo("studio");
    ensurePaletteAndConvert();
  });
}

/* ---------------- Studio: palette + convert ---------------- */
function buildChips() {
  const wrap = $("#palette-chips");
  wrap.innerHTML = "";
  for (const name of ALL_GROUP_NAMES) {
    const chip = document.createElement("button");
    chip.className = "chip" + (state.selectedGroups.has(name) ? " is-active" : "");
    chip.textContent = GROUP_LABELS[name] || name;
    chip.setAttribute("aria-pressed", state.selectedGroups.has(name));
    chip.addEventListener("click", () => {
      if (state.selectedGroups.has(name)) {
        if (state.selectedGroups.size === 1) return; // keep at least one
        state.selectedGroups.delete(name);
      } else {
        state.selectedGroups.add(name);
      }
      chip.classList.toggle("is-active");
      chip.setAttribute("aria-pressed", state.selectedGroups.has(name));
      state.palette = null; // force rebuild
      scheduleConvert();
    });
    wrap.appendChild(chip);
  }
}

function ensurePalette() {
  if (state.palette) return state.palette;
  const chars = buildPalette([...state.selectedGroups]);
  state.palette = buildEmojiPalette(chars);
  return state.palette;
}

function ensurePaletteAndConvert() {
  ensurePalette();
  convert();
}

let convertTimer = null;
function scheduleConvert() {
  clearTimeout(convertTimer);
  convertTimer = setTimeout(convert, 180);
}

function convert() {
  if (!state.srcImageData) return;
  const palette = ensurePalette();
  if (palette.chars.length === 0) {
    toast("This device can't render those emojis. Try another set.");
    return;
  }

  const { width: cw, height: ch, data } = state.srcImageData;
  const cols = state.settings.density;
  const rows = Math.max(1, Math.round(cols * (ch / cw)));

  showLoading(true);
  const jobId = ++state.jobId;
  // Capture the palette this job runs against, so stats stay consistent with the
  // rendered tiles even if the user changes the emoji set mid-conversion.
  const jobChars = palette.chars;

  const w = getWorker();
  w.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === "progress") {
      if (jobId === state.jobId) setProgress(msg.value);
    } else if (msg.type === "done") {
      if (jobId !== state.jobId) return; // a newer job superseded this one
      state.mosaic = { indices: msg.indices, cols: msg.cols, rows: msg.rows, chars: jobChars };
      drawResult();
      updateStats();
      showLoading(false);
    } else if (msg.type === "error") {
      if (jobId === state.jobId) { showLoading(false); toast("Something went wrong converting."); }
    }
  };

  // Send a copy of the pixels and transfer the copy — the cached source
  // ImageData stays intact so re-converts (slider/toggle changes) don't re-read.
  const pixels = data.slice();
  w.postMessage(
    { data: pixels, width: cw, height: ch, cols, rows, dither: state.settings.dither, palette: paletteToFlat(palette) },
    [pixels.buffer]
  );
}

function paletteToFlat(palette) {
  const n = palette.colors.length;
  const L = new Float32Array(n), a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = palette.colors[i].L;
    a[i] = palette.colors[i].a;
    b[i] = palette.colors[i].b;
  }
  return { L, a, b };
}

/* ---------------- Result rendering ---------------- */
function drawResult() {
  const canvas = $("#mosaic-canvas");
  // Cap on-screen cell size for sharpness without huge canvases.
  const cellPx = Math.max(6, Math.min(16, Math.floor(900 / state.mosaic.cols)));
  renderMosaic(canvas, state.mosaic, cellPx, { background: state.settings.background });
}

function updateStats() {
  $("#stat-grid").textContent = `${state.mosaic.cols}×${state.mosaic.rows}`;
  $("#stat-tiles").textContent = (state.mosaic.cols * state.mosaic.rows).toLocaleString();
  $("#stat-palette").textContent = state.mosaic.chars.length;
}

/* ---------------- Loading UI ---------------- */
function showLoading(on) {
  $("#result-loading").hidden = !on;
  if (on) setProgress(0);
}
function setProgress(v) {
  $("#spectrum-fill").style.width = `${Math.round(v * 100)}%`;
}

/* ---------------- Controls ---------------- */
function initControls() {
  const density = $("#density");
  const densityVal = $("#density-val");
  const setDensityLabel = () => { densityVal.textContent = `${density.value}×`; };
  setDensityLabel();
  density.addEventListener("input", () => {
    state.settings.density = parseInt(density.value, 10);
    setDensityLabel();
    scheduleConvert();
  });

  $("#dither").addEventListener("change", (e) => {
    state.settings.dither = e.target.checked;
    scheduleConvert();
  });

  document.querySelectorAll("[data-bg]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-bg]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.settings.background = btn.dataset.bg;
      if (state.mosaic) drawResult(); // background is render-only, no re-match
    });
  });
}

/* ---------------- Actions ---------------- */
function initActions() {
  $("#share").addEventListener("click", async () => {
    if (!state.mosaic) return;
    // Export at a crisp fixed cell size.
    const cellPx = Math.max(12, Math.min(28, Math.floor(2400 / state.mosaic.cols)));
    const blob = await mosaicToBlob(state.mosaic, cellPx, { background: state.settings.background });
    if (!blob) { toast("Export failed."); return; }
    const result = await shareOrDownload(blob, "emoji-mosaic.png");
    if (result === "downloaded") toast("Saved to your downloads.");
    else if (result === "shared") toast("Shared!");
  });

  $("#copy-text").addEventListener("click", async () => {
    if (!state.mosaic) return;
    try {
      await navigator.clipboard.writeText(mosaicToText(state.mosaic));
      toast("Emoji grid copied.");
    } catch {
      toast("Couldn't access the clipboard.");
    }
  });

  $("#restart").addEventListener("click", () => {
    $("#file-input").value = "";
    goTo("upload");
  });
}

/* ---------------- Toast ---------------- */
let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ---------------- Boot ---------------- */
initUpload();
initCrop();
buildChips();
initControls();
initActions();
goTo("upload");
