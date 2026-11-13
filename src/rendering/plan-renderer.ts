import {
  wallJunction,
  exposedCornerCap,
  sideDoorHiddenSide,
  exteriorFacadeCells,
  planDoorAxis,
  carpetVisualBounds,
  storageSprites,
} from "./plan-geometry";
import {
  roofVisible,
  doorAvailable,
  type PlanMap,
  type PlanObject,
  type PlanState,
} from "../data/plan-maps";
import {
  CASTLE,
  SHIP,
  MATERIAL_PIXELS,
  periodicWater,
  loadMaterialImages,
  type MaterialImages,
  type Crop,
} from "../dev/material-renderer";
/** Logical navigation remains 32 px; approved art retains its 96 texels per cell. */
export const PLAN_RENDER_TILE = MATERIAL_PIXELS;
const P = PLAN_RENDER_TILE;
export type PlanArtwork = MaterialImages & {
  props: HTMLImageElement;
  shipDetails: HTMLImageElement;
  directional: HTMLImageElement;
};
let artwork: Promise<PlanArtwork> | undefined;
export function loadPlanArtwork() {
  return (artwork ??= Promise.all([
    loadMaterialImages(),
    ...["plan-props.png", "ship-details.png", "directional-props.png"].map(
      (file) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () =>
            reject(Error(`Ressource illustrée introuvable : ${file}`));
          i.src = import.meta.env.BASE_URL + "assets/material-tests/" + file;
        }),
    ),
  ]).then(
    ([images, props, shipDetails, directional]) =>
      ({ ...images, props, shipDetails, directional }) as PlanArtwork,
  ));
}
export async function loadPlanOutdoorAtlas() {
  return (await loadPlanArtwork()).regional;
}
function surface(map: PlanMap) {
  const a = document.createElement("canvas");
  a.width = map.width * P;
  a.height = map.height * P;
  return a;
}
function painter(c: CanvasRenderingContext2D, images: PlanArtwork) {
  const stamp = (
    im: CanvasImageSource,
    src: Crop,
    x: number,
    y: number,
    w = P,
    h = P,
  ) => c.drawImage(im, ...src, x, y, w, h);
  function wallH(x: number, y: number) {
    stamp(images.castle, CASTLE.face, x, y + 25, P, P - 25);
    stamp(images.castle, CASTLE.coping, x, y, P, 25);
  }
  function wallV(x: number, y: number) {
    stamp(images.corrections, [321, 630, 302, 620], x, y);
  }
  const water = c.createPattern(periodicWater(images.corrections), "repeat")!;
  water.setTransform(new DOMMatrix().scale((2 * P) / 256));
  const wood = document.createElement("canvas");
  wood.width = wood.height = 256;
  const wc = wood.getContext("2d")!;
  wc.imageSmoothingEnabled = false;
  wc.drawImage(images.corrections, 3, 3, 620, 620, 0, 0, 256, 256);
  const deck = c.createPattern(wood, "repeat")!;
  deck.setTransform(new DOMMatrix().scale((2 * P) / 256));
  const fill = (pattern: CanvasPattern, x: number, y: number, w = P, h = P) => {
    c.fillStyle = pattern;
    c.fillRect(x, y, w, h);
  };
  return { stamp, wallH, wallV, water, deck, fill };
}
function doorSprite(
  c: CanvasRenderingContext2D,
  images: PlanArtwork,
  o: PlanObject,
  state: PlanState,
) {
  const x = o.x * P,
    y = o.y * P,
    w = o.w * P,
    h = o.h * P;
  if (planDoorAxis(state.map, o) === "vertical") {
    // Floor remains visible next to the half coping, even over the closed roof layer.
    for (let dy = 0; dy < o.h; dy++) {
      c.drawImage(
        images.castle,
        ...((o.x + o.y + dy) % 3 ? CASTLE.floor : CASTLE.floor2),
        x,
        y + dy * P,
        w,
        P,
      );
      c.fillStyle = "#285d942a";
      c.fillRect(x, y + dy * P, w, P);
    }
    const right = sideDoorHiddenSide(state, o) === "right";
    const edge = x + (right ? w * 0.52 : 0),
      width = w * 0.48;
    c.drawImage(images.corrections, 321, 630, 151, 620, edge, y, width, h);
    c.fillStyle = "#594a35";
    c.fillRect(right ? edge : edge + width - 3, y, 3, h);
    // A recessed latch at the floor-facing edge is the only visible door hardware.
    const latch = right ? edge - 4 : edge + width - 2;
    c.fillStyle = "#3a3025";
    c.fillRect(latch, y + h * 0.48, 6, 13);
    c.fillStyle = "#bd9c61";
    c.fillRect(latch + 1, y + h * 0.48 + 3, 4, 5);
  } else {
    // Lower the panel inside its original footprint and close the frame with stone.
    c.drawImage(images.castleDetails, 450, 600, 114, 154, x, y + 23, w, h - 23);
    c.drawImage(images.castle, ...CASTLE.coping, x, y, w, 23);
    c.fillStyle = "#655039";
    c.fillRect(x, y + 23, w, 3);
    for (const edge of [x, x + w - 7])
      c.drawImage(images.castle, ...CASTLE.coping, edge, y + 23, 7, h - 23);
  }
}
/** A raised wooden wall: continuous upper beam, shaded upright face and end grain.
 * All projection remains inside the existing blocked tile, never over a gangway. */
function paintBulwark(
  c: CanvasRenderingContext2D,
  images: PlanArtwork,
  ironBand: boolean,
  northEnd: boolean,
  southEnd: boolean,
) {
  // Dark upright planking and iron straps use the approved wooden wall material.
  c.drawImage(images.corrections, 633, 630, 302, 620, 8, 0, 88, P);
  c.fillStyle = "#180d09";
  c.fillRect(0, 0, 8, P); // cast contact shadow on the deck side
  // Broad top of the beam, raised above the recessed outside face.
  c.drawImage(images.corrections, 960, 640, 80, 600, 8, 0, 46, P);
  c.fillStyle = "#f5ce87";
  c.fillRect(8, 0, 3, P);
  c.fillStyle = "#ba793c";
  c.fillRect(11, 0, 3, P);
  // Stepped, beveled cornice projects past the facade: a hard lit edge and a
  // deep undercut separate the top surface from the vertical wooden boards.
  c.fillStyle = "#f4c779";
  c.fillRect(50, 0, 5, P);
  c.fillStyle = "#b87836";
  c.fillRect(55, 0, 5, P);
  c.fillStyle = "#573018";
  c.fillRect(60, 0, 6, P);
  c.fillStyle = "#1c110bbd";
  c.fillRect(66, 0, 8, P);
  c.fillStyle = "#1a100be6";
  c.fillRect(92, 0, 4, P);
  if (ironBand) {
    // A metal binding wraps over the beam and down its face (not a floor post).
    c.fillStyle = "#241d18";
    c.fillRect(8, 36, 84, 14);
    c.fillStyle = "#78634a";
    c.fillRect(8, 36, 47, 3);
    c.fillStyle = "#bba37e";
    for (const x of [19, 43, 81]) c.fillRect(x, 41, 3, 3);
  }
  for (const y of [northEnd ? 0 : -1, southEnd ? P - 14 : -1]) {
    if (y < 0) continue;
    c.drawImage(images.corrections, 1148, 641, 86, 63, 8, y, 84, 14);
    c.fillStyle = "#f2c77b";
    c.fillRect(8, y, 84, 2);
    c.fillStyle = "#2f1b0f";
    c.fillRect(8, y + 12, 84, 2);
  }
}

/** South-facing exterior walls project one additional course onto the grass.
 * This is visual height, never new map geometry; stairs retain their full footprint.
 */
function paintExteriorFacades(
  c: CanvasRenderingContext2D,
  map: PlanMap,
  images: PlanArtwork,
) {
  for (const k of exteriorFacadeCells(map)) {
    const x = (k % map.width) * P,
      y = (Math.floor(k / map.width) + 1) * P;
    c.fillStyle = "#7c6143";
    c.fillRect(x, y, P, P);
    c.drawImage(images.castle, ...CASTLE.face, x, y, P, P);
    c.fillStyle = "#493c2b";
    c.fillRect(x, y + P - 3, P, 3);
  }
}

export function renderPlanBase(s: PlanState, images?: PlanArtwork) {
  const map = s.map,
    a = surface(map);
  if (!images) return a;
  const c = a.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const { stamp, wallH, wallV, water, deck, fill } = painter(c, images);
  const decks = map.objects.filter(
    (o) => o.type === "deck1" || o.type === "deck2",
  );
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const k = y * map.width + x,
        t = map.tiles[k],
        xx = x * P,
        yy = y * P;
      c.save();
      c.beginPath();
      c.rect(xx, yy, P, P);
      c.clip();
      if (map.id === "boarding") {
        const hull = decks.find((o) => x >= o.x && x < o.x + o.w),
          boundary = hull && (x === hull.x || x === hull.x + hull.w - 1);
        if (t === "water" || t === "bridge" || boundary) {
          fill(water, xx, yy);
          if (boundary) {
            const deckOnRight = x === hull.x,
              edgeX = xx + (deckOnRight ? (3 * P) / 4 : 0);
            if (t !== "rail") fill(deck, edgeX, yy, P / 4, P);
            if (t === "rail") {
              c.save();
              if (deckOnRight) {
                c.translate(xx + P, yy);
                c.scale(-1, 1);
              } else c.translate(xx, yy);
              paintBulwark(
                c,
                images,
                y % 2 === 0,
                y === 0 || map.tiles[(y - 1) * map.width + x] !== "rail",
                y === map.height - 1 ||
                  map.tiles[(y + 1) * map.width + x] !== "rail",
              );
              c.restore();
            }
          }
        } else fill(deck, xx, yy);
      } else if (t === "grass" || t === "path") {
        const sw = images.regional.width / 8,
          sh = images.regional.height / 4,
          index = t === "grass" ? 0 : 2;
        c.save();
        c.translate(xx + (x % 2 ? P : 0), yy + (y % 2 ? P : 0));
        c.scale(x % 2 ? -1 : 1, y % 2 ? -1 : 1);
        c.drawImage(images.regional, index * sw, 0, sw, sh, 0, 0, P, P);
        c.restore();
      } else {
        stamp(
          images.castle,
          (x + y) % 3 ? CASTLE.floor : CASTLE.floor2,
          xx,
          yy,
        );
        c.fillStyle = "#285d942a";
        c.fillRect(xx, yy, P, P);
        if (t === "wall" && exposedCornerCap(s, x, y)) {
          stamp(images.corrections, [321, 630, 302, 620], xx, yy);
        } else if (t === "wall") {
          const joint = wallJunction(map, x, y, s.opened);
          if (joint.axis === "vertical") {
            wallV(xx, yy);
            if (joint.openS) wallH(xx, yy);
            if (joint.openN) {
              stamp(images.castle, CASTLE.coping, xx, yy, P, 8);
              c.fillStyle = "#635640";
              c.fillRect(xx, yy + 8, P, 2);
            }
          } else {
            wallH(xx, yy);
            if (joint.northJoin) {
              c.save();
              c.beginPath();
              c.rect(xx, yy, P, 25);
              c.clip();
              wallV(xx, yy);
              c.restore();
            }
            if (joint.openW)
              stamp(images.corrections, [321, 630, 302, 620], xx, yy, 8, P);
            if (joint.openE)
              stamp(
                images.corrections,
                [321, 630, 302, 620],
                xx + P - 8,
                yy,
                8,
                P,
              );
          }
        }
      }
      c.restore();
    }
  paintExteriorFacades(c, s.map, images);
  // Decoration follows authored rectangles, never the layout in the reference illustrations.
  for (const o of map.objects.filter((o) => o.type === "carpet"))
    paintRunner(c, images, carpetVisualBounds(map, o));
  for (const o of map.objects) {
    const x = o.x * P,
      y = o.y * P,
      w = o.w * P,
      h = o.h * P;
    if (o.type === "pillar")
      stamp(images.castle, CASTLE.pillar, x + 18, y, 60, 94);
    if (o.type === "chest")
      stamp(images.chest, [328, 178, 875, 657], x + 8, y + 15, w - 16, h - 30);
    if (o.type === "throne")
      stamp(images.directional, [305, 24, 420, 800], x, y, w, h);
    if (o.type === "door" && !s.opened.has(o.id)) doorSprite(c, images, o, s);
    if (o.type === "stairs") paintEntranceSteps(c, images, o);
    if (o.type === "reinforcement")
      stamp(images.castle, [949, 950, 298, 294], x, y, w, h);
    if (o.type === "hatch") paintHatch(c, images, o);
    if (o.type === "crate" || o.type === "barrel")
      for (const prop of storageSprites(o)) {
        stamp(
          images.boarding,
          prop.type === "crate" ? [974, 965, 249, 269] : [670, 950, 229, 292],
          prop.x * P,
          prop.y * P,
          prop.w * P,
          prop.h * P,
        );
      }
    if (o.type === "mast") paintMastDisk(c, images, x + w / 2, y + h / 2, w);
    if (o.type === "half_mast_top" || o.type === "half_mast_bottom") {
      const cy = o.type === "half_mast_top" ? y : y + h;
      paintMastDisk(c, images, x + w / 2, cy, w);
    }
  }
  // Extend onto a full deck cell at both ends; only the JSON gap is water beneath.
  for (const o of map.objects.filter((o) => o.type === "gangway"))
    stamp(
      images.boarding,
      SHIP.plank,
      (o.x - 2) * P,
      o.y * P,
      (o.w + 4) * P,
      o.h * P,
    );
  return a;
}
function paintRunner(
  c: CanvasRenderingContext2D,
  images: PlanArtwork,
  o: PlanObject,
) {
  const x = o.x * P,
    y = o.y * P,
    w = o.w * P,
    h = o.h * P,
    b = 12,
    im = images.castleDetails;
  const stamp = (src: Crop, xx: number, yy: number, ww: number, hh: number) =>
    c.drawImage(im, ...src, xx, yy, ww, hh);
  // Nine-slice border: long runners keep the same gold trim and undistorted motifs.
  const center = document.createElement("canvas");
  center.width = center.height = 64;
  center.getContext("2d")!.drawImage(im, 109, 1125, 24, 24, 0, 0, 64, 64);
  c.fillStyle = c.createPattern(center, "repeat")!;
  c.fillRect(x + b, y + b, w - 2 * b, h - 2 * b);
  for (let yy = y + b; yy < y + h - b; yy += P) {
    const hh = Math.min(P, y + h - b - yy);
    stamp([60, 1070, 16, 120], x, yy, b, hh);
    stamp([332, 1070, 16, 120], x + w - b, yy, b, hh);
  }
  stamp([76, 1053, 256, 16], x + b, y, w - 2 * b, b);
  stamp([76, 1197, 256, 16], x + b, y + h - b, w - 2 * b, b);
  for (const [dx, dy, sx, sy] of [
    [0, 0, 60, 1053],
    [w - b, 0, 332, 1053],
    [0, h - b, 60, 1197],
    [w - b, h - b, 332, 1197],
  ])
    stamp([sx, sy, 16, 16], x + dx, y + dy, b, b);
  if (w > h) {
    for (let xx = x + P; xx < x + w - P / 2; xx += 2 * P)
      stamp([183, 1091, 58, 80], xx - 25, y + h / 2 - 34, 50, 68);
  } else
    for (let yy = y + P / 2; yy < y + h - P / 2; yy += 2 * P)
      stamp([183, 1091, 58, 80], x + w / 2 - 25, yy - 34, 50, 68);
}
function paintMastDisk(
  c: CanvasRenderingContext2D,
  images: PlanArtwork,
  cx: number,
  cy: number,
  diameter: number,
) {
  c.save();
  c.beginPath();
  c.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
  c.clip();
  c.drawImage(
    images.props,
    1063,
    222,
    534,
    534,
    cx - diameter / 2,
    cy - diameter / 2,
    diameter,
    diameter,
  );
  c.restore();
}
function paintEntranceSteps(
  c: CanvasRenderingContext2D,
  images: PlanArtwork,
  o: PlanObject,
) {
  const x = o.x * P,
    y = o.y * P,
    w = o.w * P,
    h = o.h * P,
    step = P / 3;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  for (let yy = 0; yy < h; yy += step)
    for (let xx = 0; xx < w; xx += P) {
      c.drawImage(images.castle, ...CASTLE.coping, x + xx, y + yy, P, step - 9);
      c.drawImage(
        images.castle,
        8,
        738,
        294,
        35,
        x + xx,
        y + yy + step - 9,
        P,
        9,
      );
      c.fillStyle = "#eed9ab";
      c.fillRect(x + xx, y + yy + step - 10, P, 2);
      c.fillStyle = "#625440";
      c.fillRect(x + xx, y + yy + step - 1, P, 1);
    }
  c.restore();
}
function paintHatch(
  c: CanvasRenderingContext2D,
  images: PlanArtwork,
  o: PlanObject,
) {
  const x = o.x * P,
    y = o.y * P,
    w = o.w * P,
    h = o.h * P,
    b = P / 12,
    mesh = P / 3;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  // Repeat an actual iron lattice cell, not a stretched photograph or flat grid.
  for (let yy = 0; yy < h; yy += mesh)
    for (let xx = 0; xx < w; xx += mesh)
      c.drawImage(
        images.shipDetails,
        1036,
        1044,
        32,
        30,
        x + xx,
        y + yy,
        mesh,
        mesh,
      );
  c.drawImage(images.shipDetails, 1028, 1010, 10, 164, x, y, b, h);
  c.drawImage(images.shipDetails, 1196, 1010, 12, 164, x + w - b, y, b, h);
  c.drawImage(images.shipDetails, 1028, 1009, 179, 10, x, y, w, b);
  c.drawImage(images.shipDetails, 1028, 1163, 179, 12, x, y + h - b, w, b);
  c.restore();
}
export function renderPlanRoof(s: PlanState, images?: PlanArtwork) {
  const a = surface(s.map);
  if (!images || s.map.id !== "castle") return a;
  const c = a.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const { wallH, wallV, stamp } = painter(c, images),
    map = s.map;
  const sections = map.objects.filter(
    (o) => o.type === "room" || o.type === "corridor",
  );
  const gradients = new Map<number, CanvasGradient>();
  const building = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < map.width &&
    y < map.height &&
    map.building.has(y * map.width + x);
  for (const k of map.building)
    if (
      roofVisible(s, k) &&
      !(k === 24 * map.width + 9 && s.revealed.has(23 * map.width + 8))
    ) {
      const gx = k % map.width,
        gy = Math.floor(k / map.width),
        x = gx * P,
        y = gy * P;
      c.fillStyle = "#22364a";
      c.fillRect(x, y, P, P);
      stamp(images.castle, CASTLE.roof, x, y);
      const section = sections.find(
        (o) => gx >= o.x && gy >= o.y && gx < o.x + o.w && gy < o.y + o.h,
      );
      if (section) {
        let shade = gradients.get(section.id);
        if (!shade) {
          shade = c.createLinearGradient(
            section.x * P,
            0,
            (section.x + section.w) * P,
            0,
          );
          shade.addColorStop(0, "#07182b44");
          shade.addColorStop(0.48, "#cbd9e526");
          shade.addColorStop(0.5, "#d4e0e338");
          shade.addColorStop(0.51, "#07132666");
          shade.addColorStop(1, "#07132618");
          gradients.set(section.id, shade);
        }
        c.fillStyle = shade;
        c.fillRect(x, y, P, P);
        const ridge = (section.x + section.w / 2) * P;
        if (ridge >= x && ridge < x + P) {
          c.fillStyle = "#14273d";
          c.fillRect(ridge - 4, y, 9, P);
          c.fillStyle = "#8398aa";
          c.fillRect(ridge - 3, y, 4, P);
          c.fillStyle = "#485f78";
          c.fillRect(ridge + 1, y, 3, P);
          for (let yy = 0; yy < P; yy += P / 4) {
            c.fillStyle = "#b1bfc4";
            c.fillRect(ridge - 3, y + yy, 7, 2);
          }
        }
      }
      // The exterior stone faces remain visible beneath the roofs; interior cells stay opaque.
      if (map.tiles[k] === "wall" && exposedCornerCap(s, gx, gy)) {
        stamp(images.corrections, [321, 630, 302, 620], x, y);
      } else if (map.tiles[k] === "wall") {
        if (!building(gx - 1, gy) || !building(gx + 1, gy)) wallV(x, y);
        if (!building(gx, gy - 1))
          stamp(images.castle, CASTLE.coping, x, y, P, 18);
        if (!building(gx, gy + 1)) wallH(x, y);
      }
    }
  paintExteriorFacades(c, map, images);
  // A closed accessible gate is visible on its facade; opened gates leave no sprite.
  for (const door of s.map.doors)
    if (doorAvailable(s, door)) doorSprite(c, images, door, s);
  return a;
}
export function compositePlan(s: PlanState, images?: PlanArtwork) {
  const base = renderPlanBase(s, images);
  base.getContext("2d")!.drawImage(renderPlanRoof(s, images), 0, 0);
  return base;
}
