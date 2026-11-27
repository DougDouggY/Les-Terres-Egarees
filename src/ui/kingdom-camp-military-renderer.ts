import type { MilitaryCamp } from "../data/kingdom-camp-military";
import { villageTileset as tiles } from "../data/village-tileset";
import { campLowWalls } from "../rendering/camp-low-walls";
import { campRoadMask } from "./kingdom-camp-renderer";
/** Only close-scale individual props; never regional forest or mountain sprites. */
export class MilitaryCampRenderer {
  constructor(
    private scene: MilitaryCamp,
    private ground: HTMLImageElement,
    private architecture: HTMLImageElement,
    private life: HTMLImageElement,
    private stone: HTMLImageElement,
    private houses: HTMLImageElement,
  ) {}
  layer() {
    const s = this.scene,
      out = document.createElement("canvas");
    out.width = s.width * 64;
    out.height = s.height * 64;
    const c = out.getContext("2d")!;
    c.imageSmoothingQuality = "high";
    const texture = (index: number) => {
      const a = document.createElement("canvas");
      a.width = a.height = 512;
      const t = a.getContext("2d")!;
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++) {
          t.save();
          t.translate(x ? 512 : 0, y ? 512 : 0);
          t.scale(x ? -1 : 1, y ? -1 : 1);
          t.drawImage(
            this.ground,
            (index % 8) * 128,
            Math.floor(index / 8) * 128,
            128,
            128,
            0,
            0,
            256,
            256,
          );
          t.restore();
        }
      return a;
    };
    c.fillStyle = c.createPattern(texture(0), "repeat")!;
    c.fillRect(0, 0, out.width, out.height);
    const paths = document.createElement("canvas");
    paths.width = out.width;
    paths.height = out.height;
    const pc = paths.getContext("2d")!;
    pc.fillStyle = pc.createPattern(texture(2), "repeat")!;
    pc.fillRect(0, 0, paths.width, paths.height);
    pc.globalCompositeOperation = "destination-in";
    pc.drawImage(campRoadMask(s.cells, s.width, s.height), 0, 0);
    c.drawImage(paths, 0, 0);
    for (const cell of s.cells)
      if (cell.terrain === "water")
        c.drawImage(
          this.ground,
          512,
          0,
          128,
          128,
          cell.x * 64,
          cell.y * 64,
          64,
          64,
        );
    c.drawImage(campLowWalls(s, this.stone, this.architecture), 0, 0);
    // Whole building illustrations, not scaled-down rooms or repeated roof tiles.
    for (const b of s.buildings) {
      const sw = this.houses.width / 3,
        sh = this.houses.height / 2;
      const sample = document.createElement("canvas");
      sample.width = sw;
      sample.height = sh;
      const sc = sample.getContext("2d")!;
      sc.drawImage(
        this.houses,
        (b.variant % 3) * sw,
        Math.floor(b.variant / 3) * sh,
        sw,
        sh,
        0,
        0,
        sw,
        sh,
      );
      const pixels = sc.getImageData(0, 0, sw, sh).data;
      let left = sw,
        top = sh,
        right = 0,
        bottom = 0;
      for (let y = 0; y < sh; y++)
        for (let x = 0; x < sw; x++)
          if (pixels[(y * sw + x) * 4 + 3] > 32) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x + 1);
            bottom = Math.max(bottom, y + 1);
          }
      const w = Math.max(1, right - left),
        h = Math.max(1, bottom - top),
        scale = Math.min((b.w * 64) / w, (b.h * 64) / h);
      c.drawImage(
        sample,
        left,
        top,
        w,
        h,
        b.x * 64 + (b.w * 64 - w * scale) / 2,
        (b.y + b.h) * 64 - h * scale,
        w * scale,
        h * scale,
      );
    }
    for (const p of [...s.props].sort((a, b) => a.y + a.h - b.y - b.h)) {
      if (p.sprite !== undefined) {
        const cellW = this.life.width / 4,
          cellH = this.life.height / 4;
        const sample = document.createElement("canvas");
        sample.width = cellW;
        sample.height = cellH;
        sample
          .getContext("2d")!
          .drawImage(
            this.life,
            (p.sprite % 4) * cellW,
            Math.floor(p.sprite / 4) * cellH,
            cellW,
            cellH,
            0,
            0,
            cellW,
            cellH,
          );
        const rgba = sample
          .getContext("2d")!
          .getImageData(0, 0, cellW, cellH).data;
        let left = cellW,
          top = cellH,
          right = 0,
          bottom = 0;
        for (let y = 0; y < cellH; y++)
          for (let x = 0; x < cellW; x++)
            if (rgba[(y * cellW + x) * 4 + 3] > 32) {
              left = Math.min(left, x);
              top = Math.min(top, y);
              right = Math.max(right, x + 1);
              bottom = Math.max(bottom, y + 1);
            }
        const sw = Math.max(1, right - left),
          sh = Math.max(1, bottom - top),
          scale =
            Math.min((p.w * 64) / sw, (p.h * 64) / sh) *
            (p.type === "bush" ? 0.65 : 1);
        c.drawImage(
          sample,
          left,
          top,
          sw,
          sh,
          p.x * 64 + (p.w * 64 - sw * scale) / 2,
          p.y * 64 + (p.h * 64 - sh * scale) / 2,
          sw * scale,
          sh * scale,
        );
      } else {
        const frame = tiles.props.well;
        c.drawImage(
          this.architecture,
          frame[0] * 64,
          frame[1] * 64,
          64,
          64,
          p.x * 64,
          p.y * 64,
          p.w * 64,
          p.h * 64,
        );
      }
    }
    return out;
  }
}
