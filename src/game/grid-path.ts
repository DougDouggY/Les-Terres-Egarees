/** Shared orthogonal navigation for tactical boards and independent map previews. */
export function gridPath(
  width: number,
  height: number,
  from: number,
  to: number,
  costAt: (index: number) => number | null,
): { cost: number; steps: number[] } | null {
  const count = width * height;
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= count ||
    to >= count
  )
    return null;
  const distance = new Map<number, number>([[from, 0]]),
    previous = new Map<number, number>(),
    open = [from];
  while (open.length) {
    open.sort((a, b) => distance.get(a)! - distance.get(b)!);
    const k = open.shift()!;
    if (k === to) {
      const steps = [to];
      while (steps[0] !== from) steps.unshift(previous.get(steps[0])!);
      return { cost: distance.get(k)!, steps };
    }
    const x = k % width,
      y = Math.floor(k / width);
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nk = ny * width + nx,
        step = costAt(nk);
      if (step === null || !Number.isFinite(step) || step < 0) continue;
      const cost = distance.get(k)! + step;
      if (cost < (distance.get(nk) ?? Infinity)) {
        distance.set(nk, cost);
        previous.set(nk, k);
        if (!open.includes(nk)) open.push(nk);
      }
    }
  }
  return null;
}
