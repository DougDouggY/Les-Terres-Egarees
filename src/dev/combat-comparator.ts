import "./tools.css";
import { capabilityFixture } from "./capability-fixture";
import * as E from "../engine";
import { createSandbox, trainingUnit } from "../game/sandbox";
import { visualClasses } from "../sprites/visual-classes";
import { spriteCatalog } from "../sprites/resources";
import { combatSkin } from "../sprites/combat-skins";
import {
  profileKey,
  resolveClip,
  type SpriteProfile,
  animationNames,
} from "../sprites/catalog";
import { CombatSceneV2 } from "../ui/combat-v2";
import type { VisualStrike } from "../ui/combat-v2-timeline";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const scenarios: Record<string, string> = {
  hit: "Frappe simple",
  miss: "Raté et esquive",
  parry: "Parade et riposte",
  "counter-miss": "Parade et riposte ratée",
  "no-counter": "Parade sans riposte",
  arrow: "Tir",
  intercept: "Projectile arrêté au bouclier",
  "double-agility": "Deux activations par agilité",
  "dual-axes": "Deux haches",
  "dual-swords": "Deux épées",
  four: "Deux blocs de deux armes",
  right: "Attaque depuis la droite",
  death: "Mise hors de combat",
};
/** Deterministic comparison scenarios, explicitly separate from the tactical resolver.
 * Outcomes mirror scenarios-valides.json; they never read or save a campaign. */
export function comparatorStrikes(
  scenario: string,
  a: E.Unit,
  b: E.Unit,
): VisualStrike[] {
  let serial = 0;
  const hp = new Map([
    [a.id, a.hp],
    [b.id, b.hp],
  ]);
  const strike = (
    att: E.Unit,
    def: E.Unit,
    opts: Partial<VisualStrike> = {},
  ) => {
    const damage = opts.damage ?? 6,
      hit = opts.hit ?? true,
      blocked = opts.blocked ?? false;
    hp.set(
      def.id,
      Math.max(0, hp.get(def.id)! - (hit && !blocked ? damage : 0)),
    );
    return {
      attacker: att.id,
      defender: def.id,
      damage: hit && !blocked ? damage : 0,
      hpAfter: hp.get(def.id)!,
      hit,
      blocked,
      ...opts,
    };
  };
  if (scenario === "parry" || scenario === "counter-miss")
    return [
      strike(b, a, { blocked: true }),
      strike(a, b, {
        counter: true,
        parryCounter: true,
        hit: scenario !== "counter-miss",
      }),
    ];
  if (scenario === "no-counter") return [strike(b, a, { blocked: true })];
  if (scenario === "intercept") return [strike(b, a, { blocked: true })];
  if (scenario === "right") return [strike(b, a)];
  if (scenario === "double-agility")
    return [
      strike(a, b, { followUp: false }),
      strike(b, a, { counter: true }),
      strike(a, b, { followUp: true }),
    ];
  if (["dual-axes", "dual-swords", "four"].includes(scenario)) {
    const out: VisualStrike[] = [];
    for (let group = 0; group < (scenario === "four" ? 2 : 1); group++)
      out.push(
        strike(a, b, { weaponIndex: 0, group }),
        strike(a, b, { weaponIndex: 1, group }),
      );
    return out;
  }
  return [
    strike(a, b, {
      hit: scenario !== "miss",
      damage: scenario === "death" ? b.hp : 6,
    }),
  ];
}
export function makeComparisonActor(
  p: SpriteProfile,
  id: string,
  owner: 0 | 1,
) {
  const s = createSandbox();
  const unit = trainingUnit(
    s,
    E.classes[p.classId] ? p.classId : "skeleton",
    1,
    1,
    owner,
  );
  unit.id = id;
  unit.name = visualClasses[p.classId]?.name ?? p.classId;
  unit.combatSkinId = profileKey(p);
  unit.gender = p.gender === "female" ? "female" : "male";
  const w = Object.values(E.weaponCatalog).find(
    (w) => w.visual === p.equipment,
  );
  if (w) {
    unit.activeWeaponId = w.id;
    unit.carriedWeapons = Array.from(
      new Set([...(unit.carriedWeapons ?? []), w.id]),
    );
    E.syncWeapon(unit);
  }
  unit.hp = unit.maxHp = 100;
  return unit;
}

export function openCombatComparator(app: HTMLElement, onBack: () => void) {
  let classId = "man_at_arms",
    equipment = "sword-shield",
    skinId = "",
    scenario = "hit",
    action = "scenario",
    speed = 1,
    mirror = false,
    diagnostic = false,
    playing = false,
    elapsed = 0,
    last = 0,
    scene: CombatSceneV2 | undefined,
    revision = 0,
    disposed = false,
    raf = 0;
  const background = new Image();
  background.src = import.meta.env.BASE_URL + "assets/battle-3.png";
  function profiles() {
    return spriteCatalog.profiles.filter(
      (p) => p.classId === classId && p.equipment === equipment,
    );
  }
  function selected() {
    return profiles().find((p) => profileKey(p) === skinId) ?? profiles()[0];
  }
  function status(text: string) {
    const e = app.querySelector("#compare-status");
    if (e) e.textContent = text;
  }
  function validScenario(p: SpriteProfile | undefined, id: string) {
    const c = combatSkin(p)?.profile;
    if (!c) return false;
    if (["parry", "counter-miss", "no-counter", "intercept"].includes(id))
      return !!resolveClip(c, "block") && p!.equipment.includes("shield");
    if (["dual-axes", "dual-swords", "four"].includes(id))
      return !!resolveClip(c, "attack_offhand");
    if (id === "arrow") return ["bow", "crossbow"].includes(p!.equipment);
    return !!resolveClip(c, "attack");
  }
  async function prepare(auto = false) {
    const ticket = ++revision;
    playing = false;
    elapsed = 0;
    scene = undefined;
    const p = selected();
    if (!p) {
      scene = undefined;
      status("Skin manquant pour cette classe et cet équipement.");
      return;
    }
    skinId = profileKey(p);
    const target = spriteCatalog.profiles.find(
      (p) =>
        p.classId === (scenario === "intercept" ? "hunter" : "raider") &&
        p.equipment === (scenario === "intercept" ? "bow" : "axe-shield"),
    )!;
    let a = makeComparisonActor(p, "compare-left", 1),
      b = makeComparisonActor(target, "compare-right", 0);
    const isCapability =
      [
        "heal",
        "bandage",
        "transform",
        "fortify",
        "fortify-move",
        "area",
        "charge",
        "summon",
        "buff",
        "banner",
      ].includes(action) && !!E.classes[p.classId];
    let fixture: ReturnType<typeof capabilityFixture> | undefined;
    try {
      fixture = isCapability ? capabilityFixture(p, action) : undefined;
    } catch (error) {
      status(
        `Essai indisponible : ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
    if (fixture) {
      a = fixture.before;
      b = fixture.targetBefore;
    }
    const next = new CombatSceneV2(
      fixture && action === "summon" ? [a] : [a, b],
      fixture?.strikes ??
        (action === "scenario" ? comparatorStrikes(scenario, a, b) : []),
    );
    if (action !== "scenario" && !fixture?.strikes)
      next.preview = {
        actorId: a.id,
        animation: fixture?.animation ?? action,
        targetId: fixture && action !== "summon" ? b.id : undefined,
        duration: fixture
          ? 2400
          : Math.max(
              1250,
              ((resolveClip(combatSkin(p)?.profile, action)?.frames.length ??
                1) /
                (resolveClip(combatSkin(p)?.profile, action)?.fps ?? 7)) *
                1000,
            ),
      };
    if (fixture && !fixture.strikes) {
      if (next.actors[1]) next.actors[1].side = 1;
      const result = new CombatSceneV2(
        [fixture.after, fixture.targetAfter],
        [],
      );
      result.actors[1].side = 1;
      next.previewResult = { scene: result, at: 1200, duration: 2400 };
      await result.prepare();
    }
    next.mirror = mirror;
    next.diagnostic = diagnostic;
    const play = app.querySelector<HTMLButtonElement>("[data-compare-play]");
    if (play) play.disabled = true;
    status("Chargement des poses du skin…");
    await next.prepare();
    if (disposed || ticket !== revision) return;
    scene = next;
    playing = auto;
    last = performance.now();
    if (play) play.disabled = false;
    const issues = [
      ...next.missing,
      ...(next.actors[0].skin?.issues.map(
        (i) => `${i.animation} : ${i.reason}`,
      ) ?? []),
    ];
    status(
      !E.classes[p.classId] && action !== "scenario"
        ? "Prévisualisation graphique : cette entrée Sans-Repos n’a pas de capacité tactique définie."
        : fixture
          ? `Résultat réel : ${JSON.stringify(fixture.details)}`
          : issues.length
            ? `${issues.length} réserve(s) graphique(s) · détails dans le diagnostic.`
            : "Prêt · séquence déterministe indépendante.",
    );
    const info = app.querySelector("#compare-diagnostic");
    if (info)
      info.textContent = JSON.stringify(
        { ...next.diagnosticJSON(), capability: fixture?.details },
        null,
        2,
      );
  }
  function render() {
    const p = selected(),
      c = combatSkin(p)?.profile;
    const capabilityNames = new Set(Object.keys(c?.clips ?? {}));
    const skills = E.classes[classId]?.skills ?? [];
    for (const name of [
      "heal",
      "bandage",
      "transform",
      "fortify",
      "area",
      "charge",
      "summon",
      "buff",
      "banner",
    ])
      if (skills.includes(name as E.SkillId)) capabilityNames.add(name);
    if (skills.includes("fortify")) capabilityNames.add("fortify-move");
    if (p.state === "planted") capabilityNames.delete("banner");
    if (p.equipment !== "spell") capabilityNames.delete("area");
    const choices = Object.values(visualClasses),
      weapons = [
        ...new Set(
          spriteCatalog.profiles
            .filter((p) => p.classId === classId)
            .map((p) => p.equipment),
        ),
      ];
    app.innerHTML = `<main class="combat-lab-simple comparator-v2"><header class="arena-toolbar"><strong>Comparateur de combats · V4</strong><label>Classe<select id="compare-class">${choices.map((c) => `<option value="${c.id}" ${c.id === classId ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label><label>Arme<select id="compare-weapon">${weapons.map((w) => `<option ${w === equipment ? "selected" : ""}>${esc(w)}</option>`).join("")}</select></label><label>Skin<select id="compare-skin">${profiles()
      .map(
        (p) =>
          `<option value="${profileKey(p)}" ${profileKey(p) === skinId ? "selected" : ""}>${p.gender} · ${p.state}</option>`,
      )
      .join(
        "",
      )}</select></label><button data-compare-back>Retour</button></header><div class="compare-controls"><label>Scénario<select id="compare-scenario">${Object.entries(
      scenarios,
    )
      .map(
        ([id, label]) =>
          `<option value="${id}" ${id === scenario ? "selected" : ""} ${validScenario(p, id) ? "" : "disabled"}>${label}${validScenario(p, id) ? "" : " · indisponible"}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Pose / capacité<select id="compare-action"><option value="scenario">Scénario complet</option>${[
      ...capabilityNames,
    ]
      .map(
        (name) =>
          `<option value="${name}" ${name === action ? "selected" : ""}>${esc(name === "fortify-move" ? "Pavois puis déplacement" : (animationNames[name] ?? name))}</option>`,
      )
      .join(
        "",
      )}</select></label><label><input id="compare-mirror" type="checkbox" ${mirror ? "checked" : ""}>Miroir</label><label><input id="compare-anchors" type="checkbox" ${diagnostic ? "checked" : ""}>Ancres et diagnostic</label></div><section class="arena-field"><canvas id="compare-canvas" width="960" height="600" aria-label="Comparaison des poses du même skin"></canvas><pre id="compare-diagnostic" ${diagnostic ? "" : "hidden"}></pre></section><footer class="arena-controls"><button data-compare-play>Jouer / Rejouer</button><button data-compare-pause>Pause</button><label>Vitesse<select id="compare-speed"><option value="1">×1</option><option value="0.5">×0,5</option><option value="0.2">×0,2</option></select></label><input id="compare-progress" type="range" min="0" max="1000" value="0" aria-label="Position dans l’animation"><button data-compare-export>Diagnostic JSON</button><span id="compare-status" role="status"></span></footer></main>`;
    app.querySelector<HTMLElement>("[data-compare-back]")!.onclick = onBack;
    const change = () => {
      render();
      void prepare();
    };
    app.querySelector<HTMLSelectElement>("#compare-class")!.onchange = (e) => {
      classId = (e.target as HTMLSelectElement).value;
      equipment =
        spriteCatalog.profiles.find((p) => p.classId === classId)?.equipment ??
        "";
      skinId = "";
      scenario = "hit";
      action = "scenario";
      const p = selected();
      if (!validScenario(p, scenario)) action = "idle";
      change();
    };
    app.querySelector<HTMLSelectElement>("#compare-weapon")!.onchange = (e) => {
      equipment = (e.target as HTMLSelectElement).value;
      skinId = "";
      if (!validScenario(selected(), scenario)) action = "idle";
      change();
    };
    app.querySelector<HTMLSelectElement>("#compare-skin")!.onchange = (e) => {
      skinId = (e.target as HTMLSelectElement).value;
      change();
    };
    app.querySelector<HTMLSelectElement>("#compare-scenario")!.onchange = (
      e,
    ) => {
      scenario = (e.target as HTMLSelectElement).value;
      action = "scenario";
      change();
    };
    app.querySelector<HTMLSelectElement>("#compare-action")!.onchange = (e) => {
      action = (e.target as HTMLSelectElement).value;
      change();
    };
    app.querySelector<HTMLSelectElement>("#compare-speed")!.value =
      String(speed);
    app.querySelector<HTMLSelectElement>("#compare-speed")!.onchange = (e) => {
      speed = Number((e.target as HTMLSelectElement).value);
    };
    app.querySelector<HTMLInputElement>("#compare-mirror")!.onchange = (e) => {
      mirror = (e.target as HTMLInputElement).checked;
      if (scene) scene.mirror = mirror;
    };
    app.querySelector<HTMLInputElement>("#compare-anchors")!.onchange = (e) => {
      diagnostic = (e.target as HTMLInputElement).checked;
      if (scene) scene.diagnostic = diagnostic;
      app.querySelector<HTMLElement>("#compare-diagnostic")!.hidden =
        !diagnostic;
    };
    app.querySelector<HTMLElement>("[data-compare-play]")!.onclick = () =>
      void prepare(true);
    app.querySelector<HTMLElement>("[data-compare-pause]")!.onclick = (e) => {
      playing = !playing;
      (e.currentTarget as HTMLElement).textContent = playing
        ? "Pause"
        : "Reprendre";
      last = performance.now();
    };
    app.querySelector<HTMLInputElement>("#compare-progress")!.oninput = (e) => {
      playing = false;
      scene?.resetPresentation();
      elapsed =
        (Number((e.target as HTMLInputElement).value) / 1000) *
        (scene?.preview?.duration ?? scene?.timeline.duration ?? 1250);
    };
    app.querySelector<HTMLElement>("[data-compare-export]")!.onclick = () => {
      if (!scene) return;
      const a = document.createElement("a"),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(scene.diagnosticJSON(), null, 2)], {
            type: "application/json",
          }),
        );
      a.href = url;
      a.download = `combat-v2-${classId}-${scenario}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  }
  function tick(now: number) {
    if (disposed) return;
    const dt = last ? now - last : 0;
    last = now;
    if (playing) elapsed += dt * speed;
    const canvas = app.querySelector<HTMLCanvasElement>("#compare-canvas");
    if (canvas) {
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 960, 600);
      if (background.complete && background.naturalWidth)
        ctx.drawImage(background, 0, 0, 960, 600);
      else {
        ctx.fillStyle = "#1e3027";
        ctx.fillRect(0, 0, 960, 600);
      }
      scene?.draw(ctx, elapsed, undefined, () => {
        playing = false;
      });
      canvas.dataset.ready = String(!!scene);
      const progress = app.querySelector<HTMLInputElement>("#compare-progress");
      if (progress && playing)
        progress.value = String(
          Math.min(
            1000,
            (elapsed /
              (scene?.preview?.duration ?? scene?.timeline.duration ?? 1250)) *
              1000,
          ),
        );
    }
    raf = requestAnimationFrame(tick);
  }
  render();
  void prepare();
  raf = requestAnimationFrame(tick);
  return () => {
    disposed = true;
    revision++;
    cancelAnimationFrame(raf);
  };
}
