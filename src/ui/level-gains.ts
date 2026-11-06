import type { Unit } from "../game/types";
import { powerLabel } from "../game/progression";
export const levelStats = [
  "maxHp",
  "strength",
  "defense",
  "agility",
  "initiative",
  "accuracy",
  "move",
  "parryPoints",
] as const;
export type StatSnapshot = Partial<Record<(typeof levelStats)[number], number>>;
export const statSnapshot = (u: Unit): StatSnapshot =>
  Object.fromEntries(levelStats.map((k) => [k, u[k] ?? 0]));
export function levelRows(
  u: Unit,
  previous?: StatSnapshot,
  gains?: Record<string, number>,
) {
  const labels = {
    maxHp: "PV maximum",
    strength: powerLabel(u),
    defense: "Défense",
    agility: "Agilité",
    initiative: "Initiative",
    accuracy: "Précision",
    move: "Mouvement",
    parryPoints: "Parade",
  };
  return `<div class="level-stat-list">${levelStats
    .map((k) => {
      const bonus = k === "initiative" && u.leader ? 1 : 0,
        after = (u[k] ?? 0) + bonus,
        before =
          previous?.[k] !== undefined
            ? previous[k]! + bonus
            : after - (gains?.[k] ?? 0),
        gain = after - before;
      return `<div class="level-stat" data-level-stat="${k}" data-after="${after}" data-gain="${gain}"><span>${labels[k]}</span><strong><b data-level-value>${before}</b><em class="stat-gain" title="${labels[k]} : +${gain}" aria-label="Gain de ${gain}" hidden>+${gain}</em></strong></div>`;
    })
    .join("")}</div>`;
}
export async function animateLevelGains(root: HTMLElement) {
  const rows = Array.from(
    root.querySelectorAll<HTMLElement>("[data-level-stat]"),
  );
  const pause = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));
  const short = matchMedia("(prefers-reduced-motion: reduce)").matches;
  await pause(short ? 50 : 400);
  for (const row of rows) {
    if (!root.isConnected) return;
    if (Number(row.dataset.gain) <= 0) continue;
    row.querySelector<HTMLElement>(".stat-gain")!.hidden = false;
    row.classList.add("stat-revealed");
    await pause(short ? 60 : 550);
  }
  await pause(short ? 50 : 950);
  if (!root.isConnected) return;
  // One final update, only after every gain has been presented. No RNG or gameplay writes.
  for (const row of rows) {
    row.querySelector("[data-level-value]")!.textContent = row.dataset.after!;
    row.querySelector<HTMLElement>(".stat-gain")!.hidden = true;
  }
  root.dataset.levelFinal = "true";
}
