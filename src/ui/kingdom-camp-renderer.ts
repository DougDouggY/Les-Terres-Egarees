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
} from "../data/kingdom-camp-map";

/** Street-scale kit. Regional groves and miniature villages are deliberately not rendered. */
export class CampTerrainRenderer {
  constructor(
    private ground: HTMLImageElement,
    private architecture: HTMLImageElement,
  ) {}
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
    const grass = document.createElement("canvas");
    grass.width = grass.height = 256;
    const g = grass.getContext("2d")!;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        g.save();
        g.translate(x ? 256 : 0, y ? 256 : 0);
        g.scale(x ? -1 : 1, y ? -1 : 1);
        g.drawImage(this.ground, 0, 0, 128, 128, 0, 0, 128, 128);
        g.restore();
      }
    c.fillStyle = c.createPattern(grass, "repeat")!;
    c.fillRect(0, 0, CAMP_W * 32, CAMP_H * 32);
    const prop = (type: VillageProp, x: number, y: number, w = 1, h = 1) => {
      const [sx, sy] = tiles.props[type];
      c.drawImage(
        this.architecture,
        sx * 128,
        sy * 128,
        128,
        128,
        x * 32,
        y * 32,
        w * 32,
        h * 32,
      );
    };
    for (const cell of map) {
      if (cell.terrain === "road") prop("path", cell.x, cell.y);
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
    }
    for (const p of campProps)
      if (p.type === "garden") prop(p.type, p.x, p.y, p.w, p.h);
    for (const b of campBuildings) {
      const frame = tiles.houses[b.variant];
      if (!opened.has(b.id)) {
        c.drawImage(
          this.architecture,
          frame.x * 128,
          frame.y * 128,
          640,
          640,
          b.x * 32,
          b.y * 32,
          160,
          160,
        );
        continue;
      }
      for (let dy = 0; dy < 5; dy++)
        for (let dx = 0; dx < 5; dx++) prop("floor", b.x + dx, b.y + dy);
      for (let dx = 0; dx < 5; dx++) prop("fence", b.x + dx, b.y);
      for (let dy = 0; dy < 5; dy++)
        for (const dx of [0, 4]) {
          c.save();
          c.translate((b.x + dx + 0.5) * 32, (b.y + dy + 0.5) * 32);
          c.rotate(Math.PI / 2);
          const [sx, sy] = tiles.props.fence;
          c.drawImage(
            this.architecture,
            sx * 128,
            sy * 128,
            128,
            128,
            -16,
            -16,
            32,
            32,
          );
          c.restore();
        }
      // Retain the original lower facade on each side of the open doorway.
      c.drawImage(
        this.architecture,
        frame.x * 128,
        (frame.y + 4) * 128,
        256,
        128,
        b.x * 32,
        (b.y + 4) * 32,
        64,
        32,
      );
      c.drawImage(
        this.architecture,
        (frame.x + 3) * 128,
        (frame.y + 4) * 128,
        256,
        128,
        (b.x + 3) * 32,
        (b.y + 4) * 32,
        64,
        32,
      );
      prop("crate", b.x + 1, b.y + 1);
    }
    // Tall vegetation is drawn last so its actual canopy is visible at the correct scale.
    for (const p of campProps)
      if (p.type !== "garden") prop(p.type, p.x, p.y, p.w, p.h);
    return layer;
  }
}
