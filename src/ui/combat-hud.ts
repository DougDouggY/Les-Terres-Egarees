export type CombatHudUnit = {
  id: string;
  name: string;
  weapon: string;
  hp: number;
  maxHp: number;
  hit: number | null;
  damage: number | null;
  crit?: number | null;
  color: readonly number[];
};
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
/** Shared compact combat frame: names above the field, weapon/stats/HP below it. */
export function combatHud(units: [CombatHudUnit, CombatHudUnit]) {
  const color = (u: CombatHudUnit) => `--duel-team:${u.color.join(",")}`;
  return `<div class="duel-nameplates">${units.map((u) => `<strong style="${color(u)}">${esc(u.name)}</strong>`).join("")}</div><div class="duel-panels">${units.map((u, i) => `<section class="duel-panel" style="${color(u)}"><div class="duel-weapon"><strong>${esc(u.weapon)}</strong><dl class="duel-metrics"><div><dt>PRÉC</dt><dd id="hit-${esc(u.id)}">${u.hit === null ? "—" : u.hit + "%"}</dd></div><div><dt>DÉG</dt><dd id="damage-${esc(u.id)}">${u.damage ?? "—"}</dd></div><div><dt>CRIT</dt><dd>${u.crit === null || u.crit === undefined ? "—" : u.crit + "%"}</dd></div></dl></div><div class="duel-life"><b id="value-${esc(u.id)}" data-combat-value="${i}">${u.hp} / ${u.maxHp} PV</b><div class="bar hp duel-hp"><i id="hp-${esc(u.id)}" data-combat-hp="${i}" style="width:${Math.max(0, (u.hp / u.maxHp) * 100)}%"></i></div></div></section>`).join("")}</div>`;
}
