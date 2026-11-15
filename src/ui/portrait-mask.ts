/** A display-only alpha mask for the supplied navy backdrops, preserving enclosed dark details. */
export function portraitBackdropMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const outside = new Uint8Array(width * height),
    queue = new Uint32Array(width * height);
  let read = 0,
    write = 0;
  const visit = (k: number) => {
    if (outside[k]) return;
    const i = k * 4,
      r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2];
    if (
      pixels[i + 3] === 0 ||
      (r < 18 && g < 26 && b < 48 && g >= r + 3 && b >= g + 4)
    ) {
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
const masks = new Map<string, string>();
/** Original portrait files and colours stay intact; only their displayed backdrop is masked. */
export function maskDialoguePortraits(root: HTMLElement) {
  for (const im of Array.from(
    root.querySelectorAll<HTMLImageElement>(".chapter-portrait img"),
  )) {
    const apply = () => {
      if (!im.naturalWidth) return;
      let mask = masks.get(im.src);
      if (!mask) {
        const c = document.createElement("canvas");
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(im, 0, 0);
        const pixels = ctx.getImageData(0, 0, c.width, c.height);
        pixels.data.set(portraitBackdropMask(pixels.data, c.width, c.height));
        ctx.putImageData(pixels, 0, 0);
        mask = c.toDataURL();
        masks.set(im.src, mask);
      }
      im.style.maskImage = `url("${mask}")`;
      im.style.maskSize = "contain";
      im.style.maskPosition = "center bottom";
      im.style.maskRepeat = "no-repeat";
      im.dataset.backdropMasked = "true";
    };
    if (im.complete) apply();
    else im.addEventListener("load", apply, { once: true });
  }
}
