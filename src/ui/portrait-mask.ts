import {
  opaquePortraitBounds,
  sheetPortraitPlacement,
} from "./portrait-layout";
/** Flood the edge-connected navy background, protecting the body silhouette below the hair. */
export function portraitBackdropMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  bodyStart = 0.47,
  trimRight = 0,
  portraitId = "",
) {
  const outside = new Uint8Array(width * height),
    queue = new Uint32Array(width * height),
    protectedBody = new Uint8Array(width * height);
  const background = (k: number) => {
    const i = k * 4,
      r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2];
    return (
      (trimRight > 0 &&
        k % width >= width - trimRight &&
        Math.floor(k / width) > height * 0.75) ||
      pixels[i + 3] === 0 ||
      (r < 18 && g < 26 && b < 48 && g >= r + 3 && b >= g + 4)
    );
  };
  // The original flood could enter navy collars/armour from the bottom edge. Keep their
  // row envelope intact; hair above this boundary still permits connected background gaps.
  for (let y = Math.floor(height * bodyStart); y < height; y++) {
    let left = width,
      right = -1;
    for (let x = 0; x < width; x++)
      if (!background(y * width + x)) {
        left = Math.min(left, x);
        right = x;
      }
    for (let x = left; x <= right; x++) protectedBody[y * width + x] = 1;
  }
  // Explicit eye contours from the unchanged C03/C04/C06 originals. These dark
  // marks touch the exterior and must not be traversed by the backdrop flood.
  const eyes: Record<string, number[][]> = {
    C03: [
      [0.225, 0.28],
      [0.28, 0.28],
      [0.3, 0.315],
      [0.275, 0.35],
      [0.24, 0.34],
    ],
    C04: [
      [0.18, 0.24],
      [0.245, 0.24],
      [0.27, 0.29],
      [0.235, 0.32],
      [0.21, 0.3],
    ],
    C06: [
      [0.22, 0.25],
      [0.28, 0.25],
      [0.3, 0.3],
      [0.265, 0.34],
      [0.24, 0.32],
    ],
  };
  const polygon = eyes[portraitId];
  if (polygon)
    for (let y = 0; y < height * 0.4; y++)
      for (let x = 0; x < width * 0.5; x++) {
        const px = x / width,
          py = y / height;
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const [ax, ay] = polygon[i],
            [bx, by] = polygon[j];
          if (
            ay > py !== by > py &&
            px < ((bx - ax) * (py - ay)) / (by - ay) + ax
          )
            inside = !inside;
        }
        if (inside) protectedBody[y * width + x] = 1;
      }
  let read = 0,
    write = 0;
  const visit = (k: number) => {
    if (!outside[k] && !protectedBody[k] && background(k)) {
      outside[k] = 1;
      queue[write++] = k;
    }
  };
  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  while (read < write) {
    const k = queue[read++],
      x = k % width,
      y = Math.floor(k / width);
    if (x) visit(k - 1);
    if (x + 1 < width) visit(k + 1);
    if (y) visit(k - width);
    if (y + 1 < height) visit(k + width);
  }
  const mask = new Uint8ClampedArray(pixels.length);
  for (let k = 0; k < outside.length; k++) {
    mask[k * 4] = mask[k * 4 + 1] = mask[k * 4 + 2] = 255;
    mask[k * 4 + 3] = outside[k] ? 0 : pixels[k * 4 + 3];
  }
  return mask;
}
const images = new Map<string, string>();
const prepared = new WeakSet<HTMLImageElement>();
/** Shared by dialogue, creation, unit sheets and recruitment: original files stay untouched. */
export function maskDialoguePortraits(root: HTMLElement) {
  for (const im of Array.from(
    root.querySelectorAll<HTMLImageElement>("img.identity-portrait"),
  )) {
    if (prepared.has(im)) continue;
    prepared.add(im);
    const source = im.dataset.portraitSource || im.src;
    im.dataset.portraitSource = source;
    const apply = () => {
      if (!im.naturalWidth) return;
      im.closest<HTMLElement>(".dialogue-portrait-identity")?.style.setProperty(
        "--portrait-ratio",
        String(im.naturalWidth / im.naturalHeight),
      );
      const id = source.match(/\/([CVRN]\d\d)\.png/)?.[1];
      if (!id) return;
      const sheet = !!im.closest(".character-portrait-slot"),
        key = source + (sheet ? ":sheet" : ":dialogue");
      let display = images.get(key);
      if (!display) {
        const c = document.createElement("canvas");
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(im, 0, 0);
        const p = ctx.getImageData(0, 0, c.width, c.height),
          mask = portraitBackdropMask(
            p.data,
            c.width,
            c.height,
            id.startsWith("V") ? 0.68 : 0.47,
            id === "R03" ? 7 : id === "C07" ? 2 : 0,
            id,
          );
        for (let k = 3; k < p.data.length; k += 4) p.data[k] = mask[k];
        ctx.putImageData(p, 0, 0);
        const b = opaquePortraitBounds(p.data, c.width, c.height),
          out = document.createElement("canvas");
        out.width = sheet ? 512 : b.width;
        out.height = sheet ? 384 : b.height;
        const draw = out.getContext("2d")!;
        draw.imageSmoothingEnabled = false;
        const placement = sheet
          ? sheetPortraitPlacement(id, b)
          : { x: 0, y: 0, width: b.width, height: b.height };
        draw.drawImage(
          c,
          b.x,
          b.y,
          b.width,
          b.height,
          placement.x,
          placement.y,
          placement.width,
          placement.height,
        );
        display = out.toDataURL();
        images.set(key, display);
      }
      const displayed = new Image();
      displayed.onload = () => {
        im.closest<HTMLElement>(
          ".dialogue-portrait-identity",
        )?.style.setProperty(
          "--portrait-ratio",
          String(displayed.naturalWidth / displayed.naturalHeight),
        );
      };
      displayed.src = display;
      im.src = display;
      im.dataset.backdropMasked = "true";
    };
    if (im.complete && im.naturalWidth) apply();
    else im.addEventListener("load", apply, { once: true });
  }
}
export function installPortraitMasks(root: HTMLElement) {
  const observer = new MutationObserver(() => maskDialoguePortraits(root));
  observer.observe(root, { childList: true, subtree: true });
  maskDialoguePortraits(root);
  return () => observer.disconnect();
}
