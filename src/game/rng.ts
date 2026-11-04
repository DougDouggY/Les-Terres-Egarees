export function randomPercent(s: { seed: number }) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return (s.seed / 4294967296) * 100;
}
export function hashSeed(text: string) {
  let value = 2166136261;
  for (const c of text) value = Math.imul(value ^ c.charCodeAt(0), 16777619);
  return value >>> 0;
}
