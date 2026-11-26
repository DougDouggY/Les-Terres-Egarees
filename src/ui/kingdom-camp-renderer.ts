import type { Faction } from "../game/types";
import type { TerrainStyle } from "../terrain";
import { map } from "../game/active-map";
import {
  villageTileset as tiles,
  type VillageProp,
} from "../data/village-tileset";
import {
  CAMP_W,
  CAMP_H,
  campBuildings,
  campProps,
  campFurniture,
} from "../data/kingdom-camp-map";
type Building = (typeof campBuildings)[number];
/** The chapter-I road mask is reused here without changing its protected renderer. */
export function campRoadMask() {
  const raw = document.createElement("canvas");
  raw.width = CAMP_W * 64;
  raw.height = CAMP_H * 64;
  const r = raw.getContext("2d")!;
  r.fillStyle = "white";
  for (const cell of map)
    if (cell.terrain === "road") r.fillRect(cell.x * 64, cell.y * 64, 64, 64);
  const soft = document.createElement("canvas");
  soft.width = raw.width;
  soft.height = raw.height;
  const s = soft.getContext("2d")!;
  s.filter = "blur(10px)";
  s.drawImage(raw, 0, 0);
  s.filter = "none";
  const image = s.getImageData(0, 0, soft.width, soft.height);
  for (let i = 3; i < image.data.length; i += 4)
    image.data[i] = Math.max(
      0,
      Math.min(255, ((image.data[i] - 72) * 255) / 110),
    );
  s.putImageData(image, 0, 0);
  return soft;
}
export class CampTerrainRenderer {
  constructor(
    private ground: HTMLImageElement,
    private architecture: HTMLImageElement,
  ) {}
  private tile(
    c: CanvasRenderingContext2D,
    frame: readonly number[],
    x: number,
    y: number,
    w = 32,
    h = 32,
  ) {
    c.drawImage(
      this.architecture,
      frame[0] * 64,
      frame[1] * 64,
      64,
      64,
      x,
      y,
      w,
      h,
    );
  }
  /** Independent layers make wall/floor invariants observable and prevent roof-state art substitution. */
  buildingLayers(b: Building, open: boolean) {
    const create = () => {
      const c = document.createElement("canvas");
      c.width = b.w * 64;
      c.height = b.h * 64;
      return c;
    };
    const floor = create(),
      walls = create(),
      furniture = create(),
      roof = create();
    const f = floor.getContext("2d")!,
      w = walls.getContext("2d")!,
      p = furniture.getContext("2d")!,
      r = roof.getContext("2d")!;
    for (const c of [f, w, p, r]) {
      c.scale(2, 2);
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";
    }
    for (let y = 1; y < b.h - 1; y++)
      for (let x = 1; x < b.w - 1; x++)
        this.tile(f, tiles.walls.floor, x * 32, y * 32);
    if (open)
      this.tile(f, tiles.walls.floor, (b.entry.x - b.x) * 32, (b.h - 1) * 32);
    for (let y = 0; y < b.h; y++)
      for (let x = 0; x < b.w; x++) {
        if (x !== 0 && x !== b.w - 1 && y !== 0 && y !== b.h - 1) continue;
        const door = b.x + x === b.entry.x && b.y + y === b.entry.y;
        const frame = door
          ? open
            ? tiles.walls.doorOpen
            : tiles.walls.doorClosed
          : y === 0
            ? x === 0
              ? tiles.walls.nw
              : x === b.w - 1
                ? tiles.walls.ne
                : tiles.walls.north
            : y === b.h - 1
              ? x === 0
                ? tiles.walls.sw
                : x === b.w - 1
                  ? tiles.walls.se
                  : tiles.walls.south
              : x === 0
                ? tiles.walls.west
                : tiles.walls.east;
        this.tile(w, frame, x * 32, y * 32);
      }
    for (const item of campFurniture(b)) {
      const frame =
        item.type === "bed"
          ? tiles.walls.bed
          : item.type === "crate"
            ? tiles.walls.stack
            : item.type === "barrel"
              ? tiles.props.barrel
              : tiles.walls[item.type];
      this.tile(
        p,
        frame,
        (item.x - b.x) * 32,
        (item.y - b.y) * 32,
        item.w * 32,
        item.h * 32,
      );
    }
    if (!open) {
      const frame = tiles.roofs[b.variant];
      r.drawImage(
        this.architecture,
        frame.x * 64,
        frame.y * 64,
        frame.w * 64,
        frame.h * 64,
        0,
        0,
        b.w * 32,
        (b.h - 1) * 32,
      );
    }
    return { floor, walls, furniture, roof };
  }
  layer(
    _style: TerrainStyle,
    _factions: readonly Faction[],
    opened: ReadonlySet<string> = new Set(),
  ) {
    const layer = document.createElement("canvas");
    layer.width = CAMP_W * 64;
    layer.height = CAMP_H * 64;
    const c = layer.getContext("2d")!;
    c.scale(2, 2);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    const texture = (index: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const t = canvas.getContext("2d")!;
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++) {
          t.save();
          t.translate(x ? 256 : 0, y ? 256 : 0);
          t.scale(x ? -1 : 1, y ? -1 : 1);
          t.drawImage(
            this.ground,
            (index % 8) * 128,
            Math.floor(index / 8) * 128,
            128,
            128,
            0,
            0,
            128,
            128,
          );
          t.restore();
        }
      return canvas;
    };
    c.fillStyle = c.createPattern(texture(0), "repeat")!;
    c.fillRect(0, 0, CAMP_W * 32, CAMP_H * 32);
    const paths = document.createElement("canvas");
    paths.width = layer.width;
    paths.height = layer.height;
    const pc = paths.getContext("2d")!;
    pc.scale(2, 2);
    pc.fillStyle = pc.createPattern(texture(2), "repeat")!;
    pc.fillRect(0, 0, CAMP_W * 32, CAMP_H * 32);
    pc.setTransform(1, 0, 0, 1, 0, 0);
    pc.globalCompositeOperation = "destination-in";
    pc.drawImage(campRoadMask(), 0, 0);
    c.drawImage(paths, 0, 0, CAMP_W * 32, CAMP_H * 32);
    const prop = (type: VillageProp, x: number, y: number, w = 1, h = 1) =>
      this.tile(c, tiles.props[type], x * 32, y * 32, w * 32, h * 32);
    for (const cell of map)
      if (cell.terrain === "water")
        c.drawImage(
          this.ground,
          4 * 128,
          0,
          128,
          128,
          cell.x * 32,
          cell.y * 32,
          32,
          32,
        );
    for (const item of campProps)
      if (item.type === "garden")
        prop(item.type, item.x, item.y, item.w, item.h);
    for (const b of campBuildings) {
      const layers = this.buildingLayers(b, opened.has(b.id));
      for (const piece of [
        layers.floor,
        layers.furniture,
        layers.walls,
        layers.roof,
      ])
        c.drawImage(piece, b.x * 32, b.y * 32, b.w * 32, b.h * 32);
    }
    for (const item of campProps)
      if (item.type !== "garden")
        prop(item.type, item.x, item.y, item.w, item.h);
    return layer;
  }
}
