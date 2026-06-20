// Touch-friendly crop editor: pan by dragging, zoom by pinch or slider.
// The image is always kept covering the crop frame, so there are never empty
// edges. `getCroppedCanvas()` extracts whatever the frame currently shows.

export class CropEditor {
  // frame: the fixed viewport element (overflow hidden). img: an HTMLImageElement.
  constructor(frame, img) {
    this.frame = frame;
    this.img = img;
    this.scale = 1; // user zoom multiplier (>= 1)
    this.tx = 0;
    this.ty = 0;
    this.pointers = new Map();
    this.pinchStart = null;

    img.style.transformOrigin = "0 0";
    img.style.position = "absolute";
    img.style.willChange = "transform";
    img.draggable = false;

    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);

    frame.addEventListener("pointerdown", this._onDown);
    frame.addEventListener("pointermove", this._onMove);
    frame.addEventListener("pointerup", this._onUp);
    frame.addEventListener("pointercancel", this._onUp);

    this.reset();
  }

  get frameW() { return this.frame.clientWidth; }
  get frameH() { return this.frame.clientHeight; }
  // Scale that makes the image exactly cover the frame.
  get baseScale() {
    return Math.max(this.frameW / this.img.naturalWidth, this.frameH / this.img.naturalHeight);
  }

  reset() {
    this.scale = 1;
    this._center();
    this._apply();
  }

  _center() {
    const s = this.baseScale * this.scale;
    this.tx = (this.frameW - this.img.naturalWidth * s) / 2;
    this.ty = (this.frameH - this.img.naturalHeight * s) / 2;
  }

  // Zoom while keeping the point (fx, fy) in frame coordinates fixed.
  // Defaults to the frame centre (used by the slider); pinch passes its midpoint.
  setZoom(z, fx = this.frameW / 2, fy = this.frameH / 2) {
    const old = this.baseScale * this.scale;
    const px = (fx - this.tx) / old;
    const py = (fy - this.ty) / old;
    this.scale = Math.max(1, Math.min(8, z));
    const ns = this.baseScale * this.scale;
    this.tx = fx - px * ns;
    this.ty = fy - py * ns;
    this._apply();
  }

  _clamp() {
    const s = this.baseScale * this.scale;
    const w = this.img.naturalWidth * s;
    const h = this.img.naturalHeight * s;
    this.tx = Math.min(0, Math.max(this.frameW - w, this.tx));
    this.ty = Math.min(0, Math.max(this.frameH - h, this.ty));
  }

  _apply() {
    this._clamp();
    const s = this.baseScale * this.scale;
    this.img.style.transform = `translate(${this.tx}px,${this.ty}px) scale(${s})`;
  }

  _onDown(e) {
    this.frame.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      this.pinchStart = { dist: this._pinchDist(), scale: this.scale };
    }
  }

  _onMove(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const prev = this.pointers.get(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2 && this.pinchStart) {
      const ratio = this._pinchDist() / this.pinchStart.dist;
      const [a, b] = [...this.pointers.values()];
      const rect = this.frame.getBoundingClientRect();
      const fx = (a.x + b.x) / 2 - rect.left;
      const fy = (a.y + b.y) / 2 - rect.top;
      this.setZoom(this.pinchStart.scale * ratio, fx, fy);
    } else if (this.pointers.size === 1) {
      this.tx += e.clientX - prev.x;
      this.ty += e.clientY - prev.y;
      this._apply();
    }
  }

  _onUp(e) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchStart = null;
  }

  _pinchDist() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // Extract the visible crop to a canvas no larger than `maxDim` on its long side.
  getCroppedCanvas(maxDim = 720) {
    const s = this.baseScale * this.scale;
    // Frame rectangle expressed in source-image pixels, clamped to the image so
    // float rounding at a pan extreme can never sample outside it.
    const iw = this.img.naturalWidth, ih = this.img.naturalHeight;
    const sw = Math.min(iw, this.frameW / s);
    const sh = Math.min(ih, this.frameH / s);
    const sx = Math.max(0, Math.min(iw - sw, -this.tx / s));
    const sy = Math.max(0, Math.min(ih - sh, -this.ty / s));

    const aspect = sw / sh;
    let outW, outH;
    if (aspect >= 1) { outW = Math.min(maxDim, Math.round(sw)); outH = Math.round(outW / aspect); }
    else { outH = Math.min(maxDim, Math.round(sh)); outW = Math.round(outH * aspect); }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(this.img, sx, sy, sw, sh, 0, 0, outW, outH);
    return canvas;
  }

  destroy() {
    this.frame.removeEventListener("pointerdown", this._onDown);
    this.frame.removeEventListener("pointermove", this._onMove);
    this.frame.removeEventListener("pointerup", this._onUp);
    this.frame.removeEventListener("pointercancel", this._onUp);
  }
}
