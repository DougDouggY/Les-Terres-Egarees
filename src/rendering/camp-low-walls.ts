import type { MilitaryCamp } from "../data/kingdom-camp-military";
/** Each occupied wall cell is filled, as in Serafew. Surface, corners and face
 * are composed inside that square; no inset or rounded gaps around the cell.
 */
export function campLowWalls(
  scene: MilitaryCamp,
  stone: HTMLImageElement,
  _architecture: HTMLImageElement,
) {
  const out = document.createElement("canvas");
  out.width = scene.width * 64;
  out.height = scene.height * 64;
  const c = out.getContext("2d")!;
  const texture = (
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    w: number,
    h: number,
  ) => {
    const a = document.createElement("canvas");
    a.width = w;
    a.height = h;
    a.getContext("2d")!.drawImage(stone, sx, sy, sw, sh, 0, 0, w, h);
    return a;
  };
  const vertical = texture(340, 0, 96, 256, 64, 128),
    horizontal = document.createElement("canvas");
  horizontal.width = 128;
  horizontal.height = 64;
  const h = horizontal.getContext("2d")!;
  h.translate(0, 64);
  h.rotate(-Math.PI / 2);
  h.drawImage(vertical, 0, 0);
  const vp = c.createPattern(vertical, "repeat")!,
    hp = c.createPattern(horizontal, "repeat")!,
    face = c.createPattern(texture(0, 88, 256, 168, 128, 84), "repeat")!;
  const occupied = new Set(scene.walls.map((p) => `${p.x},${p.y}`));
  for (const p of scene.walls) {
    const north = occupied.has(`${p.x},${p.y - 1}`),
      south = occupied.has(`${p.x},${p.y + 1}`),
      west = occupied.has(`${p.x - 1},${p.y}`),
      east = occupied.has(`${p.x + 1},${p.y}`),
      x = p.x * 64,
      y = p.y * 64;
    c.fillStyle = "#777260";
    c.fillRect(x, y, 64, 64);
    c.fillStyle = north || south ? vp : hp;
    c.fillRect(x, y, 64, 64);
    if ((north || south) && (west || east))
      c.drawImage(stone, 340, 65, 96, 80, x, y, 64, 64);
    if (!south) {
      c.fillStyle = face;
      c.fillRect(x, y + 46, 64, 18);
      c.fillStyle = "#343b3190";
      c.fillRect(x, y + 46, 64, 2);
      c.fillStyle = "#20281f80";
      c.fillRect(x, y + 62, 64, 2);
    }
    if (!north) {
      c.fillStyle = "#e2d2aa90";
      c.fillRect(x, y, 64, 2);
    }
    if (!west) {
      c.fillStyle = "#bdb18c70";
      c.fillRect(x, y, 2, 64);
    }
    if (!east) {
      c.fillStyle = "#323a2b70";
      c.fillRect(x + 62, y, 2, 64);
    }
  }
  return out;
}
