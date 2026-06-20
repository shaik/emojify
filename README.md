# Emojify

Turn any photo into a mosaic of emojis — a grid of emojis whose colours
approximate the original image. Upload, crop, tune, and share. **Everything runs
in your browser; your photo never leaves your device.**

![mobile](https://img.shields.io/badge/mobile-first-7C5CFC) ![static](https://img.shields.io/badge/100%25-static-22C7A9)

## How it works

1. **Upload & crop** — pick a photo (or take one on mobile). Pan and pinch-zoom
   into a square / portrait / landscape frame.
2. **Match** — the cropped image is split into a grid of cells. Each cell's
   average colour is matched to the closest emoji by **perceptual colour
   distance**.
3. **Tune** — adjust detail (grid density), the emoji set, dithering, and
   background.
4. **Share** — save a high-res PNG (native share sheet on mobile), or copy the
   mosaic as plain emoji text to paste into a chat.

### The matching algorithm

- **Colour space: OKLab, squared Euclidean distance.** OKLab is perceptually
  uniform enough that plain Euclidean distance tracks perceived colour
  difference, while being far cheaper than CIEDE2000 (no trig). Research-backed
  — see the algorithm notes in the project memory.
- **Per-emoji colour is measured on *your* device.** Each glyph is rendered to a
  canvas and its pixels averaged. Apple, Google, and Microsoft draw emojis
  differently, so measuring the device font means the matched colours are the
  colours you'll actually see in the export. Results are cached in
  `localStorage`.
- **Per-cell colour is averaged in linear light**, then converted to OKLab.
- **Floyd–Steinberg dithering** (optional) diffuses quantisation error across
  cells to smooth gradients.
- The heavy matching loop runs in a **Web Worker** (pure computation, no canvas)
  so the UI stays responsive. Plain JS beats WASM at these grid sizes.

## Project layout

```
src/
  index.html            markup + CSP
  styles.css            "Mosaic Pop" design system + self-hosted @font-face
  fonts/                Space Grotesk + Space Mono (latin subset, woff2)
  emoji-source.mjs      single source of truth for the emoji palette
  js/
    app.js              orchestration: upload → crop → convert → share
    crop.js             pan/pinch-zoom crop editor (pointer events)
    palette.js          renders + measures emoji colours (cached)
    color.js            sRGB ↔ linear ↔ OKLab
    mosaic.worker.js    the matching loop (off main thread)
    render.js           draws the mosaic; PNG export + share
    constants.js        shared emoji font stack
build.mjs               assembles dist/ + generates emoji-palette.json
serve.mjs               zero-dependency dev server
```

## Develop

No dependencies, no bundler. Node 18+ only for the dev server and build.

```sh
npm run dev        # serve src/ at http://localhost:5173
npm run build      # assemble dist/ (validates emoji list, generates assets)
npm run preview    # build, then serve dist/
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which runs
`node build.mjs` and publishes `dist/` to GitHub Pages.

One-time setup: in the repo, **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

## Privacy

The photo is read, cropped, matched, and exported entirely client-side. There is
no backend and no analytics. Fonts are self-hosted, so the page makes **no
third-party network requests at all**, and a strict Content-Security-Policy is
enforced.
