import type { MilitaryCamp } from "../data/kingdom-camp-military";
import { villageTileset as tiles } from "../data/village-tileset";
import { CampTerrainRenderer, campRoadMask } from "./kingdom-camp-renderer";
/** Only close-scale individual props; never regional forest or mountain sprites. */
export class MilitaryCampRenderer {
  constructor(
    private scene: MilitaryCamp,
    private ground: HTMLImageElement,
    private architecture: HTMLImageElement,
    private construction: HTMLImageElement,
    private life: HTMLImageElement,
    private stone: HTMLImageElement,
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
    for (const wall of s.walls) {
      if (wall.material === "stone") {
        if (wall.axis === "vertical")
          c.drawImage(
            this.stone,
            340,
            0,
            96,
            256,
            wall.x * 64,
            wall.y * 64,
            64,
            64,
          );
        else
          c.drawImage(
            this.stone,
            0,
            0,
            256,
            256,
            wall.x * 64,
            wall.y * 64,
            64,
            64,
          );
      } else {
        const frame = tiles.props.fence;
        c.save();
        c.translate((wall.x + 0.5) * 64, (wall.y + 0.5) * 64);
        if (wall.axis === "vertical") c.rotate(Math.PI / 2);
        c.drawImage(
          this.architecture,
          frame[0] * 64,
          frame[1] * 64,
          64,
          64,
          -32,
          -32,
          64,
          64,
        );
        c.restore();
      }
    }
    const buildings = new CampTerrainRenderer(
      this.ground,
      this.architecture,
      this.construction,
    );
    for (const b of s.buildings) {
      const layers = buildings.buildingLayers(
        b.id === "officers" ? { ...b, kind: "warehouse" } : b,
        false,
      );
      c.drawImage(layers.walls, b.x * 64, b.y * 64);
      c.drawImage(layers.roof, b.x * 64, b.y * 64);
      if (b.id === "prison")
        for (const x of [b.x + 2, b.x + b.w - 3])
          c.drawImage(
            this.life,
            768,
            768,
            256,
            256,
            x * 64 + 16,
            (b.y + b.h - 1) * 64 + 16,
            32,
            32,
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
          scale = Math.min((p.w * 64) / sw, (p.h * 64) / sh);
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
