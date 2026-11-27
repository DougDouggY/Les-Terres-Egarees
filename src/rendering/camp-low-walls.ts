import type { MilitaryCamp } from "../data/kingdom-camp-military";
/** Serafew-like composition: continuous overhead coping, short south face and closed ends.
 * Geometry only changes the drawing; the camp's occupied cells and passages stay intact.
 */
export function campLowWalls(
  scene: MilitaryCamp,
  stone: HTMLImageElement,
  architecture: HTMLImageElement,
) {
  const create = () => {
    const c = document.createElement("canvas");
    c.width = scene.width * 64;
    c.height = scene.height * 64;
    return c;
  };
  const result = create(),
    r = result.getContext("2d")!;
  const pattern = (
    image: HTMLImageElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    w: number,
    h: number,
  ) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);
    return c;
  };
  for (const material of ["stone", "fence"] as const) {
    const walls = scene.walls.filter((w) => w.material === material),
      occupied = new Set(walls.map((w) => `${w.x},${w.y}`));
    const mask = create(),
      m = mask.getContext("2d")!;
    m.fillStyle = "white";
    const thickness = material === "stone" ? 40 : 12,
      inset = (64 - thickness) / 2;
    for (const wall of walls) {
      const x = wall.x * 64,
        y = wall.y * 64;
      m.fillRect(x + inset, y + inset, thickness, thickness);
      if (occupied.has(`${wall.x - 1},${wall.y}`))
        m.fillRect(x, y + inset, 32, thickness);
      if (occupied.has(`${wall.x + 1},${wall.y}`))
        m.fillRect(x + 32, y + inset, 32, thickness);
      if (occupied.has(`${wall.x},${wall.y - 1}`))
        m.fillRect(x + inset, y, thickness, 32);
      if (occupied.has(`${wall.x},${wall.y + 1}`))
        m.fillRect(x + inset, y + 32, thickness, 32);
      if (material === "fence") m.fillRect(x + 23, y + 23, 18, 18);
    }
    const face = create(),
      f = face.getContext("2d")!,
      height = material === "stone" ? 12 : 6;
    f.fillStyle = f.createPattern(
      material === "stone"
        ? pattern(stone, 0, 88, 256, 168, 128, 84)
        : pattern(architecture, 8, 769, 48, 9, 96, 18),
      "repeat",
    )!;
    f.fillRect(0, 0, face.width, face.height);
    f.globalCompositeOperation = "destination-in";
    f.drawImage(mask, 0, height);
    r.save();
    r.shadowColor = "#171c1470";
    r.shadowBlur = 3;
    r.shadowOffsetY = 2;
    r.drawImage(face, 0, 0);
    r.restore();
    const cap = create(),
      c = cap.getContext("2d")!;
    if (material === "stone") {
      const vertical = pattern(stone, 340, 0, 96, 256, 40, 128);
      const horizontal = document.createElement("canvas");
      horizontal.width = 128;
      horizontal.height = 40;
      const h = horizontal.getContext("2d")!;
      h.translate(0, 40);
      h.rotate(-Math.PI / 2);
      h.drawImage(vertical, 0, 0);
      const vp = c.createPattern(vertical, "repeat")!,
        hp = c.createPattern(horizontal, "repeat")!;
      for (const wall of walls) {
        const north = occupied.has(`${wall.x},${wall.y - 1}`),
          south = occupied.has(`${wall.x},${wall.y + 1}`);
        const west = occupied.has(`${wall.x - 1},${wall.y}`),
          east = occupied.has(`${wall.x + 1},${wall.y}`);
        c.fillStyle = north || south ? vp : hp;
        c.fillRect(wall.x * 64, wall.y * 64, 64, 64);
        // A single coping block joins the two axes at a turn.
        if ((north || south) && (west || east))
          c.drawImage(
            stone,
            340,
            65,
            96,
            80,
            wall.x * 64 + 12,
            wall.y * 64 + 12,
            40,
            40,
          );
      }
    } else {
      c.fillStyle = c.createPattern(
        pattern(architecture, 8, 769, 48, 9, 96, 18),
        "repeat",
      )!;
      c.fillRect(0, 0, cap.width, cap.height);
    }
    c.globalCompositeOperation = "destination-in";
    c.drawImage(mask, 0, 0);
    r.drawImage(cap, 0, 0);
    // Outline the complete connected surface, never every individual square.
    for (const [dy, color] of [
      [2, material === "stone" ? "#d1c6a480" : "#d0a76b80"],
      [-2, "#252c2670"],
    ] as const) {
      const edge = create(),
        e = edge.getContext("2d")!;
      e.drawImage(mask, 0, 0);
      e.globalCompositeOperation = "destination-out";
      e.drawImage(mask, 0, dy);
      e.globalCompositeOperation = "source-in";
      e.fillStyle = color;
      e.fillRect(0, 0, edge.width, edge.height);
      r.drawImage(edge, 0, 0);
    }
  }
  return result;
}
