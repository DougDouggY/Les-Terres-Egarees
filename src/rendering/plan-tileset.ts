/** Reusable original 32 px pixel-art tiles; never a fixed illustration backdrop. */
export const PLAN_TILE = 32;
export const TILE_NAMES = [
  "stone",
  "room",
  "rug",
  "wood",
  "plank",
  "water",
  "roof",
  "wall",
  "rail",
  "stairs",
] as const;
export type PlanTileName = (typeof TILE_NAMES)[number];
export const hash = (x: number, y: number) => {
  let n = Math.imul(x + 91, 374761393) ^ Math.imul(y + 71, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
};
export function makePlanTileset(): HTMLCanvasElement {
  const a = document.createElement("canvas");
  a.width = TILE_NAMES.length * 32;
  a.height = 128;
  const c = a.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };
  for (let v = 0; v < 4; v++)
    TILE_NAMES.forEach((name, i) => {
      c.save();
      c.translate(i * 32, v * 32);
      c.beginPath();
      c.rect(0, 0, 32, 32);
      c.clip();
      if (name === "stone" || name === "room") {
        const p =
          name === "stone"
            ? ["#455a62", "#697c80", "#839292", "#35474e"]
            : ["#665d64", "#8b7d7a", "#b3a18c", "#4b4b50"];
        r(0, 0, 32, 32, p[0]);
        for (let yy = 0; yy < 2; yy++)
          for (let xx = 0; xx < 2; xx++) {
            const x = xx * 16,
              y = yy * 16,
              n = hash(xx + v * 3, yy + v);
            r(x + 1, y + 1, 14, 14, p[1]);
            r(x + 2, y + 1, 12, 1, p[2]);
            r(x + 1, y + 2, 1, 12, p[2]);
            r(x + 2, y + 14, 13, 1, p[3]);
            r(x + 14, y + 2, 1, 12, p[3]);
            for (let j = 0; j < 7; j++) {
              const q = hash(j + v, xx + yy * 3);
              r(
                x + 3 + (q % 10),
                y + 3 + ((q >>> 8) % 10),
                1 + ((q >>> 16) % 2),
                1,
                q % 2 ? p[0] : p[2] + "66",
              );
            }
            if (n % 4 === 0) {
              r(x + 5, y + 10, 1, 3, p[0]);
              r(x + 6, y + 9, 3, 1, p[0]);
            }
          }
      } else if (name === "rug") {
        r(0, 0, 32, 32, "#802e32");
        for (let y = 0; y < 32; y += 4)
          for (let x = 0; x < 32; x += 4) r(x, y, 1, 1, "#a84c43");
        c.strokeStyle = "#c29649";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(16, 6);
        c.lineTo(26, 16);
        c.lineTo(16, 26);
        c.lineTo(6, 16);
        c.closePath();
        c.stroke();
        r(15, 15, 2, 2, "#e8c66d");
      } else if (name === "wood" || name === "plank") {
        r(0, 0, 32, 32, "#513824");
        for (let j = 0; j < 4; j++) {
          const x = j * 8,
            n = hash(j, v),
            join = 4 + (n % 24);
          r(
            x + 1,
            0,
            7,
            32,
            ["#a87b40", "#b88a49", "#996b34", "#ac8044"][(v + j) % 4],
          );
          r(x + 1, 0, 1, 32, "#d4a461");
          r(x + 7, 0, 1, 32, "#6c492c");
          r(x + 1, join, 7, 1, "#553b27");
          r(x + 2, join + 1, 5, 1, "#d8a55f");
          r(x + 2, join - 2, 1, 1, "#3b382b");
          for (let k = 0; k < 9; k++) {
            const q = hash(j * 15 + k, v);
            r(
              x + 2 + (q % 4),
              (q >>> 8) % 28,
              1,
              2 + ((q >>> 16) % 3),
              q % 2 ? "#c39a5b" : "#845c33",
            );
          }
        }
      } else if (name === "water") {
        r(0, 0, 32, 32, "#10485c");
        for (let y = 0; y < 32; y++)
          for (let x = 0; x < 32; x++) {
            const f =
              Math.sin(
                ((x - y) * Math.PI) / 16 + Math.sin((y * Math.PI) / 16),
              ) +
              0.45 * Math.sin(((x + y) * Math.PI) / 8);
            r(
              x,
              y,
              1,
              1,
              f > 1.23
                ? "#4c98a3"
                : f > 1.04
                  ? "#277c91"
                  : f > 0.7
                    ? "#1b6279"
                    : f < -0.7
                      ? "#092f46"
                      : "#10485c",
            );
          }
      } else if (name === "roof") {
        r(0, 0, 32, 32, "#1b293d");
        for (let y = 0; y < 32; y += 8)
          for (let j = -1; j < 4; j++) {
            const x = j * 12 + ((y / 8) % 2) * 6;
            r(
              x + 1,
              y + 1,
              11,
              6,
              ["#40516a", "#3a4a65", "#465a73", "#354960"][(j + v + 4) % 4],
            );
            r(x + 1, y + 1, 10, 1, "#718199");
            r(x + 2, y + 2, 8, 1, "#526b83");
            r(x + 10, y + 3, 1, 4, "#24374e");
            r(x + 2, y + 7, 10, 1, "#122238");
            if (hash(j + v, y) % 3 === 0) r(x + 4, y + 4, 2, 1, "#7c8791");
          }
      } else if (name === "wall") {
        r(0, 0, 32, 32, "#6d634d");
        for (let y = 0; y < 32; y += 8)
          for (let j = -1; j < 3; j++) {
            const x = j * 16 + ((y / 8) % 2) * 8;
            r(
              x + 1,
              y + 1,
              15,
              7,
              ["#b6a580", "#aa9977", "#c4b28a", "#ac9d7e"][(j + v + 4) % 4],
            );
            r(x + 1, y + 1, 14, 1, "#ede0b3");
            r(x + 1, y + 2, 1, 4, "#d5c39b");
            r(x + 2, y + 7, 14, 1, "#80775e");
            r(x + 5, y + 4, 4, 1, "#9d9073");
          }
      } else if (name === "rail") {
        r(0, 0, 32, 32, "#876036");
        r(3, 0, 25, 32, "#ba8c4b");
        r(3, 0, 3, 32, "#efd195");
        r(26, 0, 6, 32, "#493626");
        for (const y of [2, 23]) {
          r(0, y, 32, 7, "#513e2a");
          r(1, y, 29, 5, "#d6ae6a");
          r(2, y, 27, 1, "#f3d899");
          r(8, y + 2, 16, 2, "#b48747");
        }
      } else if (name === "stairs") {
        r(0, 0, 32, 32, "#4a514e");
        for (let y = 0; y < 32; y += 5) {
          r(0, y, 32, 1, "#f2dfb2");
          r(0, y + 1, 32, 2, "#bcb399");
          r(0, y + 3, 32, 2, "#68716c");
        }
      }
      c.restore();
    });
  return a;
}
let atlas: HTMLCanvasElement | undefined;
export function planTileset() {
  return (atlas ??= makePlanTileset());
}
export function paintPlanTile(
  c: CanvasRenderingContext2D,
  name: PlanTileName,
  x: number,
  y: number,
  variant = 0,
) {
  c.drawImage(
    planTileset(),
    TILE_NAMES.indexOf(name) * 32,
    (variant % 4) * 32,
    32,
    32,
    x,
    y,
    32,
    32,
  );
}
