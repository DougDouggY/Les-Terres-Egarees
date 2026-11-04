import "./tools.css";
import * as E from "../engine";
import {
  createSandbox,
  trainingUnit,
  simulateDuels,
  copyValidatedMap,
  placeTrainingUnit,
  moveTrainingUnit,
  finishTrainingActivation,
} from "../game/sandbox";
import {
  drawResourceFrame,
  unitSpriteProfile,
  unitVisualNote,
} from "../sprites/resources";
import {
  resolveClip,
  animationNames,
  animationStatus,
  statusNames,
} from "../sprites/catalog";
import { combatPose, linkedStrikes } from "../ui/combat-timeline";
import { TerrainRenderer } from "../terrain";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function openWorkshop(app: HTMLElement, onBack: () => void) {
  let s = createSandbox(),
    left = "man_at_arms",
    right = "raider",
    level = 1,
    promotedLevel = 1,
    seed = 12345,
    animation = "idle",
    playing = true,
    flip = false,
    started = performance.now(),
    result: E.Battle | undefined,
    index = 0,
    applied = false,
    mode = "place",
    output =
      "Aucune campagne chargée. Les paramètres ci-dessous concernent seulement cet atelier.",
    selected = "";
  const mapCopy = copyValidatedMap(),
    terrainImage = new Image();
  terrainImage.src = import.meta.env.BASE_URL + "assets/regional-tiles.png";
  const terrain = new TerrainRenderer(terrainImage);
  let raf = 0;
  function reset() {
    s = createSandbox(seed);
    const a = trainingUnit(s, left, level, promotedLevel),
      b = trainingUnit(s, right, level, promotedLevel, 0);
    b.x = a.x + Math.max(1, a.minRange);
    b.y = a.y;
    selected = a.id;
    result = undefined;
    index = 0;
    render();
  }
  const options = (id: string) =>
    Object.values(E.classes)
      .filter((c) => c.stage !== "recruit")
      .map(
        (c) =>
          `<option value="${c.id}" ${c.id === id ? "selected" : ""}>${c.name}</option>`,
      )
      .join("");
  function render() {
    app.innerHTML = `<main class="dev-screen workshop"><header class="dev-top"><div><span class="dev-badge">ATELIER INDÉPENDANT · AUCUNE MISSION</span><h1>Animations et équilibrage</h1></div><div><button data-action="dev-combat-preview">Essai des deux combattants</button><button data-back>Retour au menu</button></div></header><p class="dev-note">Ressources graphiques partagées avec le jeu. Aucune sauvegarde de campagne n’est lue ou écrite. Les promotions sont construites après 20 niveaux de leur classe d’origine.</p><div class="dev-controls"><label>Unité gauche<select id="lab-left">${options(left)}</select></label><label>Adversaire<select id="lab-right">${options(right)}</select></label><label>Niveau de base<select id="lab-level">${[1, 10, 20].map((n) => `<option ${n === level ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>Niveau promu<select id="lab-promoted">${[1, 10, 20].map((n) => `<option ${n === promotedLevel ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>Graine<input id="lab-seed" type="number" value="${seed}"></label><button data-reset>Reconstruire les unités</button></div><div class="dev-controls"><button data-duel>Jouer l’échange réel</button><label>Action visuelle<select id="lab-animation">${Object.entries(
      animationNames,
    )
      .map(
        ([id, label]) =>
          `<option value="${id}" ${id === animation ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label><button data-play>${playing ? "Arrêter" : "Lancer"}</button><button data-replay>Rejouer</button><label><input id="lab-flip" type="checkbox" ${flip ? "checked" : ""}>Orientation inversée</label></div><div class="lab-panels">${s.units
      .slice(0, 2)
      .map((u) => {
        const p = E.forecast(
          u,
          s.units.find((t) => t.id !== u.id)!,
          s,
          { counter: u.owner === 0 },
        );
        return `<section style="border-color:rgb(${E.teamPalette[E.colorForOwner(s.teamColors, u.owner)].rgb})"><h2>${esc(u.name)}</h2><p>${E.weaponName(u)} · ${E.powerLabel(u)} ${u.strength} · DÉF ${u.defense} · AGI ${E.effectiveAgility(u)} · INIT ${u.initiative}</p><b>PRÉCISION ${p.hit}% · DÉGÂTS ${p.damage}</b><div class="bar hp"><i data-lab-hp="${u.id}" style="width:${(u.hp / u.maxHp) * 100}%"></i></div><span data-lab-value="${u.id}">${u.hp} / ${u.maxHp} PV</span><p>${esc(unitVisualNote(u))}</p></section>`;
      })
      .join(
        "",
      )}</div><canvas id="lab-battle" width="1200" height="480" aria-label="Scène d’inspection des animations"></canvas><p id="lab-status" role="status"></p><div class="dev-controls"><button data-skill="transform">Transformation / retour</button><button data-skill="heal">Soins d’un allié blessé</button><button data-skill="buff">Amélioration Völva</button><button data-skill="banner">Bannière</button><button data-skill="fortify">Pavois</button><button data-skill="summon">Invocation</button><button data-skill="area">Sort de zone réel</button><button data-skill="charge">Préparer déplacement de charge (3 cases)</button><button data-skill="next">Activation suivante</button></div><p>Les capacités non possédées sont refusées par le moteur. Critique, double, double arme, parade, esquive et mort proviennent des tirages réels de l’échange, sans résultat forcé.</p><h2>Simulations indépendantes</h2><p>Résolution partagée avec le jeu ; arène sans couvert. Alternance des engagements, rapprochement à portée et rechargements. Aucun événement de chapitre ni gain d’expérience pendant les duels.</p><div class="dev-controls">${[100, 1000, 10000].map((n) => `<button data-sim="${n}">${n} duels</button>`).join("")}</div><pre id="lab-output">${esc(output)}</pre><h2>Copie de la carte validée</h2><div class="dev-controls"><label>Interaction<select id="lab-mode"><option value="place" ${mode === "place" ? "selected" : ""}>Placer une unité</option><option value="move" ${mode === "move" ? "selected" : ""}>Déplacer l’unité sélectionnée</option></select></label><label>Unité<select id="lab-unit">${s.units.map((u) => `<option value="${u.id}" ${u.id === selected ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></label></div><p>Placer utilise la classe de gauche. Déplacer vérifie les obstacles, le budget et les cases occupées. Cliquez sur la copie : aucun décor n’est modifié.</p><canvas id="lab-map" width="1920" height="1280" aria-label="Copie indépendante de la carte"></canvas></main>`;
    app.querySelector<HTMLElement>("[data-back]")!.onclick = onBack;
    for (const id of ["left", "right", "level", "promoted", "seed"])
      app.querySelector<HTMLSelectElement>("#lab-" + id)!.onchange = () => {
        left = (app.querySelector("#lab-left") as HTMLSelectElement).value;
        right = (app.querySelector("#lab-right") as HTMLSelectElement).value;
        level = Number(
          (app.querySelector("#lab-level") as HTMLSelectElement).value,
        );
        promotedLevel = Number(
          (app.querySelector("#lab-promoted") as HTMLSelectElement).value,
        );
        seed = Number(
          (app.querySelector("#lab-seed") as HTMLInputElement).value,
        );
      };
    app.querySelector<HTMLElement>("[data-reset]")!.onclick = reset;
    app.querySelector<HTMLElement>("[data-duel]")!.onclick = () => {
      try {
        result = E.resolve(s, s.units[0], s.units[1]);
        index = 0;
        applied = false;
        started = performance.now();
        playing = true;
        output = JSON.stringify(result.strikes, null, 2);
        (app.querySelector("#lab-output") as HTMLElement).textContent = output;
      } catch (e) {
        status((e as Error).message);
      }
    };
    app.querySelector<HTMLSelectElement>("#lab-animation")!.onchange = (e) => {
      animation = (e.target as HTMLSelectElement).value;
      result = undefined;
      started = performance.now();
    };
    app.querySelector<HTMLElement>("[data-play]")!.onclick = () => {
      playing = !playing;
      (app.querySelector("[data-play]") as HTMLElement).textContent = playing
        ? "Arrêter"
        : "Lancer";
    };
    app.querySelector<HTMLElement>("[data-replay]")!.onclick = () => {
      result = undefined;
      started = performance.now();
      playing = true;
    };
    app.querySelector<HTMLInputElement>("#lab-flip")!.onchange = (e) =>
      (flip = (e.target as HTMLInputElement).checked);
    app.querySelector<HTMLSelectElement>("#lab-mode")!.onchange = (e) =>
      (mode = (e.target as HTMLSelectElement).value);
    app.querySelector<HTMLSelectElement>("#lab-unit")!.onchange = (e) =>
      (selected = (e.target as HTMLSelectElement).value);
    app.querySelectorAll<HTMLButtonElement>("[data-sim]").forEach(
      (b) =>
        (b.onclick = async () => {
          b.disabled = true;
          status("Simulation en cours…");
          await new Promise((r) => requestAnimationFrame(r));
          try {
            output = JSON.stringify(
              simulateDuels({
                left,
                right,
                count: Number(b.dataset.sim) as 100 | 1000 | 10000,
                level: level as 1 | 10 | 20,
                promotedLevel: promotedLevel as 1 | 10 | 20,
                seed,
              }),
              null,
              2,
            );
            app.querySelector("#lab-output")!.textContent = output;
            status("Simulation terminée.");
          } finally {
            b.disabled = false;
          }
        }),
    );
    app.querySelectorAll<HTMLElement>("[data-skill]").forEach(
      (b) =>
        (b.onclick = () => {
          try {
            const u = s.units[0];
            s.common.index = s.common.queue.indexOf(u.id);
            s.active = 1;
            const action = b.dataset.skill;
            if (action === "transform") {
              E.transformBear(s, u);
              animation = "transform";
            } else if (action === "banner") {
              E.plantBanner(s, u);
              animation = "banner";
            } else if (action === "fortify") {
              E.fortify(s, u);
              animation = "fortify";
            } else if (action === "summon") {
              const c = E.summonCells(s, u)[0];
              if (!c) throw Error("Aucune case disponible");
              E.summon(s, u, c.x, c.y);
              animation = "summon";
            } else if (action === "area") {
              result = E.resolveArea(s, u, s.units[1]);
              index = 0;
              applied = false;
              started = performance.now();
            } else if (action === "charge") {
              if (!E.hasSkill(u, "charge"))
                throw Error("Cette classe ne possède pas Charge");
              u.movedDistance = 3;
              animation = "charge";
            } else if (action === "next") {
              finishTrainingActivation(s);
            } else {
              if (
                action === "heal" &&
                !E.hasSkill(u, "heal") &&
                !E.hasSkill(u, "bandage")
              )
                throw Error("Cette classe ne soigne pas");
              const t = trainingUnit(s, "man_at_arms", 1, 1, 1);
              t.x = u.x;
              t.y = u.y + 1;
              t.hp = Math.max(1, t.maxHp - 16);
              if (action === "heal") {
                const w = u.carriedWeapons?.find(
                  (id) => E.weaponCatalog[id].category === "healing",
                );
                if (w) E.equipWeapon(s, u, w);
                E.healTarget(s, u, t);
                animation = "heal";
              } else {
                E.improveAlly(s, u, t);
                animation = "buff";
              }
            }
            started = performance.now();
            render();
          } catch (e) {
            status((e as Error).message);
          }
        }),
    );
    app.querySelector<HTMLCanvasElement>("#lab-map")!.onclick = (e) => {
      const canvas = e.currentTarget as HTMLCanvasElement,
        r = canvas.getBoundingClientRect(),
        x = Math.floor(((e.clientX - r.left) / r.width) * E.W),
        y = Math.floor(((e.clientY - r.top) / r.height) * E.H);
      try {
        if (mode === "place") {
          const u = trainingUnit(s, left, level, promotedLevel);
          try {
            placeTrainingUnit(s, u, x, y);
            selected = u.id;
          } catch (e) {
            s.units.pop();
            s.common.queue.pop();
            throw e;
          }
        } else {
          const u = s.units.find((u) => u.id === selected)!;
          moveTrainingUnit(s, u, x, y);
        }
        render();
      } catch (e) {
        status((e as Error).message);
      }
    };
  }
  function status(t: string) {
    const el = app.querySelector("#lab-status");
    if (el) el.textContent = t;
  }
  let pausedTime = 0,
    last = performance.now();
  function tick(now: number) {
    if (!playing) started += now - last;
    last = now;
    const canvas = app.querySelector<HTMLCanvasElement>("#lab-battle");
    if (canvas) {
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 1200, 480);
      ctx.fillStyle = "#162821";
      ctx.fillRect(0, 0, 1200, 480);
      ctx.strokeStyle = "#d1c49b88";
      ctx.beginPath();
      ctx.moveTo(0, 420);
      ctx.lineTo(1200, 420);
      ctx.stroke();
      const hit = result?.strikes[index];
      let pose: ReturnType<typeof combatPose> | undefined,
        attacker: E.Unit | undefined;
      if (hit) {
        attacker = s.units.find((u) => u.id === hit.attacker)!;
        const c = resolveClip(
          unitSpriteProfile(attacker),
          hit.counter ? "counter" : "attack",
        );
        pose = combatPose(
          now - started,
          c?.frames.length ?? 1,
          c?.fps ?? 8,
          attacker.range > 1,
          hit.counter,
          c?.impactFrame,
          {
            linkedBefore: linkedStrikes(result?.strikes[index - 1], hit),
            linkedAfter: linkedStrikes(hit, result?.strikes[index + 1]),
          },
        );
        if (now - started >= pose.impact && !applied) {
          E.applyStrike(s, hit);
          applied = true;
          const bar = app.querySelector<HTMLElement>(
              `[data-lab-hp="${hit.defender}"]`,
            ),
            u = s.units.find((u) => u.id === hit.defender)!;
          if (bar) bar.style.width = `${(u.hp / u.maxHp) * 100}%`;
          const value = app.querySelector(`[data-lab-value="${u.id}"]`);
          if (value) value.textContent = `${u.hp} / ${u.maxHp} PV`;
          status(
            `${hit.critical ? "CRITIQUE · " : ""}${hit.blocked ? "PARADE · " : ""}${hit.hit ? "-" + hit.damage + " PV" : "ESQUIVE"}${hit.counter ? " · RIPOSTE" : ""}`,
          );
        }
        if (now - started > pose.total) {
          index++;
          started = now;
          applied = false;
        }
      }
      for (const [i, u] of s.units.slice(0, 2).entries()) {
        const p = unitSpriteProfile(u),
          isAtt = attacker?.id === u.id;
        let action = hit
          ? isAtt
            ? pose!.animation
            : applied
              ? u.hp === 0
                ? "death"
                : hit.hit
                  ? hit.blocked
                    ? "block"
                    : "damage"
                  : "evade"
              : "idle"
          : animation;
        const c = resolveClip(p, action),
          f = hit
            ? isAtt
              ? pose!.index
              : Math.floor(
                  (Math.max(0, now - started - (pose?.impact ?? 0)) *
                    (c?.fps ?? 8)) /
                    1000,
                )
            : Math.floor(((now - started) * (c?.fps ?? 8)) / 1000);
        let x = i === 0 ? 160 : 800;
        if (isAtt) x += (i === 0 ? 1 : -1) * (pose?.travel ?? 0) * 420;
        ctx.save();
        if ((i === 1) !== flip) {
          ctx.translate(x + 220, 0);
          ctx.scale(-1, 1);
          x = 0;
        }
        drawResourceFrame(
          ctx,
          p,
          c ? action : "idle",
          f,
          x,
          210,
          220,
          220,
          true,
          E.colorForOwner(s.teamColors, u.owner),
        );
        ctx.restore();
        if (!hit) {
          ctx.fillStyle = "#ecdab7";
          ctx.font = "15px sans-serif";
          ctx.fillText(
            `${E.classes[u.classId!].name} · ${statusNames[animationStatus(p, action)]}`,
            i === 0 ? 80 : 700,
            450,
          );
        }
      }
    }
    const m = app.querySelector<HTMLCanvasElement>("#lab-map"),
      surface = terrain.layer("regional", s.factions);
    if (m && surface) {
      const ctx = m.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(surface, 0, 0, m.width, m.height);
      for (const u of s.units.filter((u) => u.hp > 0))
        drawResourceFrame(
          ctx,
          unitSpriteProfile(u),
          "idle",
          Math.floor(now / 500) % 2,
          u.x * 32,
          u.y * 32,
          32,
          32,
          true,
          E.colorForOwner(s.teamColors, u.owner),
        );
    }
    raf = requestAnimationFrame(tick);
  }
  reset();
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    terrain.reset();
  };
}
