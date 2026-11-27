import type { TerrainDraft } from "../data/future-terrain-maps";
import type { Land } from "../data/landscape-drafts";
/** Same 32px world cells / 64px export cells as the existing terrain previews. */
export function landscapeLayers(
  m: TerrainDraft,
  images: ReadonlyMap<string, HTMLImageElement>,
  interiors = false,
) {
  const l = m.layout!;
  const create = () => {
    const c = document.createElement("canvas");
    c.width = m.width * 64;
    c.height = m.height * 64;
    return c;
  };
  const ground = create(),
    structures = create(),
    roofs = create(),
    doors = create(),
    objects = create();
  let c = ground.getContext("2d")!;
  const rc = roofs.getContext("2d")!,
    d = doors.getContext("2d")!,
    o = objects.getContext("2d")!;
  for (const ctx of [c, rc, structures.getContext("2d")!, d, o]) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }
  const regional = images.get("regional")!,
    camp = images.get("camp")!,
    fort = images.get("fortress")!,
    props = images.get("objects")!;
  const tile = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    index: number,
    x: number,
    y: number,
    w = 1,
    h = 1,
  ) =>
    ctx.drawImage(
      image,
      (index % 4) * 256,
      Math.floor(index / 4) * 256,
      256,
      256,
      x * 64,
      y * 64,
      w * 64,
      h * 64,
    );
  const prop = (
    ctx: CanvasRenderingContext2D,
    index: number,
    x: number,
    y: number,
    w = 1,
    h = 1,
  ) => {
    const size = Math.min(w, h) * 64;
    ctx.drawImage(
      props,
      (index % 4) * 256,
      Math.floor(index / 4) * 256,
      256,
      256,
      x * 64 + (w * 64 - size) / 2,
      y * 64 + (h * 64 - size) / 2,
      size,
      size,
    );
  };
  const pattern = (
    image: HTMLImageElement,
    x: number,
    y: number,
    size: number,
    out = 128,
  ) => {
    const t = document.createElement("canvas");
    t.width = t.height = out;
    const tc = t.getContext("2d")!;
    tc.drawImage(image, x, y, size, size, 0, 0, out, out);
    return t;
  };
  c.fillStyle = c.createPattern(pattern(regional, 0, 0, 128), "repeat")!;
  c.fillRect(0, 0, ground.width, ground.height);
  const layers: {
    land: Land;
    image: HTMLImageElement;
    sx: number;
    sy: number;
    size: number;
    soft: number;
  }[] = [
    { land: "paving", image: fort, sx: 0, sy: 512, size: 256, soft: 2 },
    { land: "road", image: regional, sx: 256, sy: 0, size: 128, soft: 8 },
    { land: "forest", image: regional, sx: 5 * 128, sy: 0, size: 128, soft: 6 },
    { land: "rock", image: regional, sx: 6 * 128, sy: 128, size: 128, soft: 5 },
    {
      land: "mountain",
      image: regional,
      sx: 7 * 128,
      sy: 0,
      size: 128,
      soft: 7,
    },
    { land: "water", image: regional, sx: 4 * 128, sy: 0, size: 128, soft: 3 },
  ];
  for (const t of layers) {
    const mask = create(),
      mc = mask.getContext("2d")!;
    mc.fillStyle = "white";
    l.terrain.forEach((v, k) => {
      if (v === t.land)
        mc.fillRect((k % m.width) * 64, Math.floor(k / m.width) * 64, 64, 64);
    });
    const fill = create(),
      fc = fill.getContext("2d")!;
    fc.fillStyle = fc.createPattern(
      pattern(t.image, t.sx, t.sy, t.size),
      "repeat",
    )!;
    fc.fillRect(0, 0, fill.width, fill.height);
    fc.globalCompositeOperation = "destination-in";
    fc.filter = `blur(${t.soft}px)`;
    fc.drawImage(mask, 0, 0);
    c.drawImage(fill, 0, 0);
  }
  // Bridges are terrain with a continuous plank surface; no repeated terminal posts.
  const wood = pattern(camp, 512, 512, 256, 128);
  c.fillStyle = c.createPattern(wood, "repeat")!;
  l.terrain.forEach((v, k) => {
    if (v === "bridge")
      c.fillRect((k % m.width) * 64, Math.floor(k / m.width) * 64, 64, 64);
  });
  c = structures.getContext("2d")!;
  for (const wall of l.walls) {
    const vertical = wall.x === 12 || wall.x === 44;
    if (vertical)
      c.drawImage(fort, 256 + 84, 0, 96, 256, wall.x * 64, wall.y * 64, 64, 64);
    else tile(c, fort, 0, wall.x, wall.y);
  }
  for (const t of l.towers) {
    tile(c, fort, 13, t.x, t.y, 3, 3);
    tile(c, fort, 11, t.x + 1, t.y + 1);
    if (!interiors) tile(rc, fort, 7, t.x, t.y, 3, 3);
  }
  for (const b of l.buildings) {
    for (let y = 0; y < b.h; y++)
      for (let x = 0; x < b.w; x++) {
        const dx = b.x + x,
          dy = b.y + y;
        if (x > 0 && x < b.w - 1 && y > 0 && y < b.h - 1)
          tile(c, camp, 10, dx, dy);
        else if (y === b.h - 1)
          tile(c, camp, x === 0 ? 6 : x === b.w - 1 ? 7 : 4, dx, dy);
        else if (x === 0 || x === b.w - 1) tile(c, camp, 2, dx, dy);
        else tile(c, camp, 4, dx, dy);
      }
    if (!interiors)
      for (let y = 0; y < b.h - 1; y++)
        for (let x = 0; x < b.w; x++)
          tile(
            rc,
            b.kind === "house" || b.kind === "stable" ? camp : fort,
            b.kind === "house" ? 0 : b.kind === "stable" ? 1 : 10,
            b.x + x,
            b.y + y,
          );
    const doorX = b.x + Math.floor(b.w / 2),
      doorY = b.y + b.h - 1;
    // The permanent frame remains in terrain; only the moving leaf is in doors.
    c.fillStyle = "#6d5136";
    c.fillRect(doorX * 64, doorY * 64, 64, 64);
    tile(c, camp, 10, doorX, doorY);
    prop(d, interiors ? 7 : 6, doorX, doorY);
  }
  for (const g of l.gates) {
    d.save();
    if (g.vertical) {
      // Reuse the approved overhead side-door leaf, rather than rotate a facade.
      if (!interiors)
        for (let dy = 0; dy < g.h; dy++) {
          d.fillStyle = "#685038";
          d.fillRect(g.x * 64 + 24, (g.y + dy) * 64, 16, 64);
          d.drawImage(
            images.get("sideGate")!,
            24,
            0,
            8,
            32,
            g.x * 64 + 24,
            (g.y + dy) * 64,
            16,
            64,
          );
        }
    } else prop(d, interiors ? 5 : 4, g.x, g.y - 2, 3, 3);
    d.restore();
  }
  for (const p of l.props) prop(o, p.frame, p.x, p.y, p.w, p.h);
  const composite = create(),
    compositeContext = composite.getContext("2d")!;
  compositeContext.drawImage(ground, 0, 0);
  compositeContext.drawImage(structures, 0, 0);
  compositeContext.drawImage(roofs, 0, 0);
  return {
    ground: composite,
    terrain: ground,
    structures,
    roofs,
    doors,
    objects,
  };
}
export function landscapePassable(
  m: TerrainDraft,
  interiors: boolean,
  x: number,
  y: number,
) {
  if (x < 0 || y < 0 || x >= m.width || y >= m.height) return false;
  const l = m.layout!;
  if (
    l.gates.some((g) => x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h)
  )
    return interiors;
  const b = l.buildings.find(
    (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h,
  );
  if (b)
    return (
      interiors &&
      ((x > b.x && x < b.x + b.w - 1 && y > b.y && y < b.y + b.h - 1) ||
        (x === b.x + Math.floor(b.w / 2) && y === b.y + b.h - 1))
    );
  return !m.blocked[y * m.width + x];
}
