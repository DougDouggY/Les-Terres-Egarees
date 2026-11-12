import { STUDY_TILE as T, type StudyMap, type StudyTile } from "./map-studies";

// Original pixel tiles. Integer coordinates and a single 32 px world grid.
// Adjacency controls masonry ends, floor borders and breaks in the ship rails.
const noise = (x: number, y: number, seed = 0) => {
  let n = Math.imul(x + seed * 73, 374761393) ^ Math.imul(y + 17, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
};
export function renderStudy(map: StudyMap): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = map.width * T;
  canvas.height = map.height * T;
  const c = canvas.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };
  const tile = (x: number, y: number): StudyTile | undefined =>
    x < 0 || y < 0 || x >= map.width || y >= map.height
      ? undefined
      : map.tiles[y * map.width + x];
  // The ocean is drawn in world space so its wave bands don't reset at cell edges.
  if (map.id === "boarding") {
    rect(0, 0, canvas.width, canvas.height, "#193f49");
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++) {
        const wave =
          Math.sin(x / 8 + Math.sin(y / 14) * 2 + y / 4) +
          Math.sin(x / 17 - y / 10);
        const n = noise(x, y, 3) % 11;
        if (wave > 1.5) rect(x, y, 1, 1, n < 4 ? "#568b8d" : "#3c7178");
        else if (wave < -1.1) rect(x, y, 1, 1, "#12333e");
        else if (n < 3) rect(x, y, 1, 1, "#25535e");
      }
  }
  for (let gy = 0; gy < map.height; gy++)
    for (let gx = 0; gx < map.width; gx++) {
      const kind = tile(gx, gy),
        x = gx * T,
        y = gy * T;
      if (kind === "water") continue;
      if (kind === "grass") {
        rect(x, y, T, T, "#496146");
        for (let i = 0; i < 150; i++) {
          const n = noise(gx * 200 + i, gy, 8),
            px = x + (n % 32),
            py = y + ((n >>> 8) % 32);
          rect(
            px,
            py,
            1,
            1 + (n % 3 === 0 ? 1 : 0),
            ["#61734b", "#354d3a", "#788052"][n % 3],
          );
        }
        continue;
      }
      if (kind === "path") {
        rect(x, y, T, T, "#8b846c");
        for (let j = 0; j < 4; j++)
          for (let i = 0; i < 3; i++) {
            const ox = i * 13 - (j % 2) * 6,
              n = noise(gx * 3 + i, gy * 4 + j);
            c.save();
            c.beginPath();
            c.rect(x, y, T, T);
            c.clip();
            rect(
              x + ox,
              y + j * 8,
              12,
              7,
              ["#a09a7c", "#999274", "#8f896e"][n % 3],
            );
            rect(x + ox + 1, y + j * 8, 10, 1, "#b7ae8e");
            c.restore();
          }
        continue;
      }
      if (kind === "floor" || kind === "rug") {
        // Four flagstones per cell: restrained teal, darker seams, worn highlights.
        for (let j = 0; j < 2; j++)
          for (let i = 0; i < 2; i++) {
            const n = noise(gx * 2 + i, gy * 2 + j),
              xx = x + i * 16,
              yy = y + j * 16;
            rect(xx, yy, 16, 16, "#3b5556");
            rect(
              xx + 1,
              yy + 1,
              14,
              14,
              ["#627c77", "#6b8178", "#58726e", "#72877c"][n % 4],
            );
            rect(xx + 2, yy + 1, 12, 1, "#85978a");
            rect(xx + 14, yy + 3, 1, 11, "#4b6661");
            for (let k = 0; k < 4; k++) {
              const v = noise(k + gx * 9 + i, gy * 3 + j);
              rect(
                xx + 2 + (v % 11),
                yy + 3 + ((v >>> 8) % 10),
                2,
                1,
                v % 2 ? "#7a8d7e" : "#506c65",
              );
            }
            if (n % 7 === 0) {
              rect(xx + 5, yy + 10, 1, 4, "#435e58");
              rect(xx + 6, yy + 9, 3, 1, "#435e58");
            }
          }
        for (const [dx, dy] of [
          [0, -1],
          [-1, 0],
          [1, 0],
          [0, 1],
        ]) {
          if (tile(gx + dx, gy + dy) !== "wall") continue;
          rect(
            x + (dx === 1 ? 29 : 0),
            y + (dy === 1 ? 29 : 0),
            dx ? 3 : 32,
            dy ? 3 : 32,
            "#344844",
          );
          rect(
            x + (dx === 1 ? 28 : dx === -1 ? 3 : 0),
            y + (dy === 1 ? 28 : dy === -1 ? 3 : 0),
            dx ? 1 : 32,
            dy ? 1 : 32,
            "#ab9e78",
          );
        }
        if (kind === "rug") {
          rect(x, y, T, T, "#753d39");
          for (let j = 0; j < T; j += 4)
            for (let i = 0; i < T; i += 4) rect(x + i, y + j, 1, 1, "#98574a");
          const edges: [number, number][] = [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0],
          ];
          for (const [dx, dy] of edges)
            if (tile(gx + dx, gy + dy) !== "rug") {
              const xx = x + (dx === 1 ? 28 : 0),
                yy = y + (dy === 1 ? 28 : 0);
              rect(xx, yy, dx ? 4 : 32, dy ? 4 : 32, "#b79858");
              rect(
                xx + (dx ? 1 : 0),
                yy + (dy ? 1 : 0),
                dx ? 1 : 32,
                dy ? 1 : 32,
                "#e0c88c",
              );
            }
          // Woven diamonds: a continuous motif, not a repeated tile outline.
          if ((gx + gy) % 2 === 0) {
            c.strokeStyle = "#b18a52";
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(x + 16, y + 8);
            c.lineTo(x + 24, y + 16);
            c.lineTo(x + 16, y + 24);
            c.lineTo(x + 8, y + 16);
            c.closePath();
            c.stroke();
            rect(x + 15, y + 15, 2, 2, "#ccb17a");
          }
        }
        continue;
      }
      if (kind === "wall") {
        const south = tile(gx, gy + 1) !== "wall";
        const west = tile(gx - 1, gy) !== "wall",
          east = tile(gx + 1, gy) !== "wall";
        // Stone coping seen from above, with a separate vertical facade below it.
        rect(x, y, T, T, "#6d6d61");
        const capHeight = south ? 12 : 32;
        for (let j = 0; j < capHeight; j += 8)
          for (let i = 0; i < 3; i++) {
            const xx = x + i * 16 - (Math.floor((y + j) / 8) % 2) * 8;
            c.save();
            c.beginPath();
            c.rect(x, y, T, capHeight);
            c.clip();
            rect(
              xx,
              y + j,
              15,
              7,
              ["#acaa91", "#b7b39a", "#a19f88"][noise(gx + i, gy + j) % 3],
            );
            rect(xx + 1, y + j, 13, 1, "#d0c8aa");
            c.restore();
          }
        if (west) {
          rect(x, y, 2, capHeight, "#dfd3b2");
          rect(x + 2, y, 1, capHeight, "#8a8c76");
        }
        if (east) {
          rect(x + 29, y, 1, capHeight, "#d1c5a3");
          rect(x + 30, y, 2, capHeight, "#4a514b");
        }
        if (!south && east) {
          rect(x + 22, y, 2, 32, "#d6c8a6");
          rect(x + 24, y, 6, 32, "#777d70");
          rect(x + 25, y, 1, 32, "#9b9e88");
          for (let j = 0; j < 32; j += 8)
            rect(x + 24, y + j + 7, 6, 1, "#454f47");
        }
        if (!south && west) {
          rect(x + 3, y, 2, 32, "#d6c8a6");
          rect(x + 5, y, 1, 32, "#696f61");
        }
        if (south) {
          rect(x, y + 11, 32, 2, "#e1d5b5");
          rect(x, y + 13, 32, 2, "#535952");
          for (let j = 0; j < 2; j++)
            for (let i = 0; i < 3; i++) {
              const xx = x + i * 16 - (j % 2) * 8;
              c.save();
              c.beginPath();
              c.rect(x, y + 15, T, 16);
              c.clip();
              rect(
                xx,
                y + 15 + j * 8,
                15,
                7,
                ["#8b8b7d", "#929283", "#7d8277"][noise(gx + i, gy + j) % 3],
              );
              rect(xx + 1, y + 15 + j * 8, 13, 1, "#b2af97");
              c.restore();
            }
          rect(x, y + 29, 32, 1, "#b2ad91");
          rect(x, y + 30, 32, 2, "#414d46");
        }
        // Pilaster at exposed ends; straight lintel-free openings remain open.
        if (south && (west || east)) {
          const xx = x + (west ? 0 : 24);
          rect(xx, y + 14, 8, 16, "#555e54");
          rect(xx + 1, y + 14, 5, 15, "#b5af96");
          rect(xx + 2, y + 15, 1, 13, "#ded0ad");
          rect(xx, y + 28, 8, 2, "#c6bc9e");
        }
        if (noise(gx, gy) % 4 === 0) {
          rect(x + 8, y + 7, 3, 1, "#737d61");
          rect(x + 9, y + 8, 2, 2, "#6a765c");
        }
        continue;
      }
      if (kind === "deck" || kind === "bridge" || kind === "rail") {
        const left = gx < map.width / 2;
        const bridge = kind === "bridge";
        const palette = bridge
          ? ["#9f8054", "#ad8c5f", "#92764e"]
          : left
            ? ["#79573e", "#846045", "#906b49", "#806047"]
            : ["#9c845c", "#a18b63", "#907c58", "#ac9167"];
        rect(x, y, T, T, "#4e4132");
        for (let i = 0; i < 4; i++) {
          const xx = x + i * 8,
            n = noise(gx * 4 + i, gy);
          rect(xx + 1, y, 7, 32, palette[n % palette.length]);
          rect(
            xx + 1,
            y,
            1,
            32,
            bridge ? "#c9ac78" : left ? "#aa895e" : "#c1a77a",
          );
          const joint = (n % 23) + 4;
          rect(xx + 1, y + joint, 7, 1, "#514430");
          rect(xx + 2, y + joint + 1, 5, 1, bridge ? "#c3a270" : "#b29567");
          rect(xx + 2, y + joint - 2, 1, 1, "#353b34");
          rect(xx + 5, y + joint + 2, 1, 1, "#3b3c30");
          for (let k = 0; k < 8; k++) {
            const v = noise(gx * 71 + i * 17 + k, gy, 11);
            rect(
              xx + 2 + (v % 4),
              y + ((v >>> 8) % 30),
              1,
              1 + ((v >>> 13) % 3),
              v % 2 ? "#b3976a" : "#64513b",
            );
          }
          if (n % 4 === 0) {
            rect(xx + 3, y + 18, 3, 1, "#574734");
            rect(xx + 2, y + 19, 1, 2, "#574734");
            rect(xx + 4, y + 21, 2, 1, "#b29a6d");
          }
        }
        if (bridge) {
          if (tile(gx, gy - 1) !== "bridge") {
            rect(x, y, 32, 3, "#4e4231");
            rect(x, y, 32, 1, "#d3b47b");
          }
          if (tile(gx, gy + 1) !== "bridge") {
            rect(x, y + 29, 32, 3, "#4e4231");
            rect(x, y + 29, 32, 1, "#d3b47b");
          }
          // Iron attachment bands on either end, with inset rivets.
          if (gx === 7 || gx === 12) {
            const xx = x + (gx === 7 ? 3 : 25);
            rect(xx, y, 4, 32, "#555b50");
            rect(xx, y, 1, 32, "#b5b194");
            for (const yy of [y + 5, y + 23]) {
              rect(xx + 1, yy, 2, 2, "#252e29");
              rect(xx + 1, yy, 1, 1, "#d1c8a5");
            }
          }
        }
        if (kind === "rail") {
          const xx = x + (left ? 20 : 4);
          rect(xx + 2, y, 9, 32, "#112f37");
          rect(xx, y, 7, 32, "#493d2d");
          rect(xx, y, 2, 32, "#c4ad7c");
          rect(xx + 2, y, 3, 32, "#8b714c");
          for (const yy of [y + 2, y + 24]) {
            rect(xx - 3, yy, 12, 6, "#493e30");
            rect(xx - 2, yy, 10, 4, "#c2a77a");
            rect(xx, yy + 1, 6, 2, "#8f7c59");
          }
          const waterX = left ? x + 29 : x;
          rect(waterX, y, left ? 3 : 4, 32, "#193d44");
        }
      }
    }
  return canvas;
}
