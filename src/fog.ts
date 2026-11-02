/** Continuous animated mist. Receives only the active perspective's visibility mask. */
export class Mist {
  private texture = document.createElement("canvas");
  private cloud = document.createElement("canvas");
  private blend = document.createElement("canvas");
  private layers = new Map<
    number,
    {
      signature: string;
      mask: HTMLCanvasElement;
      previous: HTMLCanvasElement;
      changed: number;
    }
  >();
  constructor(
    private cols: number,
    private rows: number,
    private tile = 32,
  ) {
    this.texture.width = this.texture.height = 128;
    const c = this.texture.getContext("2d")!,
      data = c.createImageData(128, 128);
    const hash = (x: number, y: number, n: number) => {
      const v =
        Math.sin((((x % n) + n) % n) * 127.1 + (((y % n) + n) % n) * 311.7) *
        43758.5453;
      return v - Math.floor(v);
    };
    const noise = (x: number, y: number, n: number) => {
      const ix = Math.floor(x),
        iy = Math.floor(y),
        fx = x - ix,
        fy = y - iy,
        sx = fx * fx * (3 - 2 * fx),
        sy = fy * fy * (3 - 2 * fy);
      return (
        (hash(ix, iy, n) * (1 - sx) + hash(ix + 1, iy, n) * sx) * (1 - sy) +
        (hash(ix, iy + 1, n) * (1 - sx) + hash(ix + 1, iy + 1, n) * sx) * sy
      );
    };
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const v =
          noise(x / 32, y / 32, 4) * 0.57 +
          noise(x / 16, y / 16, 8) * 0.28 +
          noise(x / 8, y / 8, 16) * 0.15;
        const i = (y * 128 + x) * 4;
        data.data[i] = 74 + v * 88;
        data.data[i + 1] = 94 + v * 85;
        data.data[i + 2] = 103 + v * 85;
        data.data[i + 3] = 255;
      }
    c.putImageData(data, 0, 0);
    this.cloud.width = cols * tile;
    this.cloud.height = rows * tile;
    this.blend.width = this.cloud.width;
    this.blend.height = this.cloud.height;
  }
  reset() {
    this.layers.clear();
  }
  private mask(visible: ReadonlySet<number>) {
    const pad = 32,
      w = this.cols * this.tile,
      h = this.rows * this.tile;
    const raw = document.createElement("canvas"),
      soft = document.createElement("canvas");
    raw.width = soft.width = w + pad * 2;
    raw.height = soft.height = h + pad * 2;
    const r = raw.getContext("2d")!;
    r.fillStyle = "#fff";
    r.fillRect(0, 0, raw.width, raw.height);
    for (const k of visible)
      if (k >= 0 && k < this.cols * this.rows)
        r.clearRect(
          pad + (k % this.cols) * this.tile,
          pad + Math.floor(k / this.cols) * this.tile,
          this.tile,
          this.tile,
        );
    const c = soft.getContext("2d")!;
    c.filter = "blur(11px)";
    c.drawImage(raw, 0, 0);
    return soft;
  }
  draw(
    ctx: CanvasRenderingContext2D,
    visible: ReadonlySet<number>,
    perspective: number,
    time: number,
  ) {
    const signature = [...visible].join(",");
    let layer = this.layers.get(perspective);
    if (!layer) {
      const mask = this.mask(visible);
      layer = { signature, mask, previous: mask, changed: time - 600 };
      this.layers.set(perspective, layer);
    } else if (layer.signature !== signature) {
      layer.previous = layer.mask;
      layer.mask = this.mask(visible);
      layer.signature = signature;
      layer.changed = time;
    }
    const c = this.cloud.getContext("2d")!,
      w = this.cloud.width,
      h = this.cloud.height;
    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over";
    c.fillStyle = "#667f89";
    c.fillRect(0, 0, w, h);
    c.imageSmoothingEnabled = true;
    for (const [size, rate, alpha] of [
      [640, 0.009, 0.85],
      [380, -0.015, 0.23],
    ]) {
      const dx = (time * rate) % size,
        dy = (time * rate * 0.31) % size;
      c.globalAlpha = alpha;
      const pattern = c.createPattern(this.texture, "repeat")!;
      pattern.setTransform(new DOMMatrix().translate(dx, dy).scale(size / 128));
      c.fillStyle = pattern;
      c.fillRect(0, 0, w, h);
    }
    c.globalAlpha = 1;
    const t = Math.min(1, Math.max(0, (time - layer.changed) / 550));
    c.globalCompositeOperation = "destination-in";
    if (t === 1) c.drawImage(layer.mask, -32, -32);
    else {
      const mix = this.blend;
      const m = mix.getContext("2d")!;
      m.clearRect(0, 0, w, h);
      m.globalCompositeOperation = "source-over";
      m.globalAlpha = 1 - t;
      m.drawImage(layer.previous, -32, -32);
      m.globalCompositeOperation = "lighter";
      m.globalAlpha = t;
      m.drawImage(layer.mask, -32, -32);
      c.drawImage(mix, 0, 0);
    }
    c.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.cloud, 0, 0);
    ctx.restore();
  }
}
