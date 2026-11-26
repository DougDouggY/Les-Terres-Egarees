import { TerrainRenderer, type TerrainStyle } from "../terrain";
import { map, currentMapId } from "../game/active-map";
import type { Faction } from "../game/types";
import { campTileset } from "../data/camp-tileset";
import { campVillage, campMountainPatches } from "../data/kingdom-camp-map";

/** Only the supplied compact village is layered over the regional landscape. */
export class CampTerrainRenderer extends TerrainRenderer {
  private campLayer: HTMLCanvasElement | null = null;
  constructor(
    atlas: HTMLImageElement,
    private architecture: HTMLImageElement,
  ) {
    super(atlas);
  }
  override layer(style: TerrainStyle, factions: readonly Faction[]) {
    const base = super.layer(style, factions);
    if (!base || currentMapId !== "kingdom-camp") return base;
    if (this.campLayer) return this.campLayer;
    const layer = document.createElement("canvas");
    layer.width = base.width;
    layer.height = base.height;
    const ctx = layer.getContext("2d")!;
    ctx.drawImage(base, 0, 0);
    ctx.scale(2, 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    ctx.beginPath();
    for (const c of map)
      if (c.terrain === "rock") ctx.rect(c.x * 32, c.y * 32, 32, 32);
    ctx.clip();
    for (const p of campMountainPatches) {
      const size = (Math.max(p.rx, p.ry) * 2 + 1) * 32;
      ctx.drawImage(
        this.architecture,
        7 * 128,
        0,
        128,
        128,
        (p.x + 0.5) * 32 - size / 2,
        (p.y + 0.5) * 32 - size / 2,
        size,
        size,
      );
    }
    ctx.restore();
    const v = campTileset.village;
    ctx.drawImage(
      this.architecture,
      v.x * 128,
      v.y * 128,
      v.w * 128,
      v.h * 128,
      campVillage.x * 32,
      campVillage.y * 32,
      96,
      96,
    );
    this.campLayer = layer;
    return layer;
  }
}
