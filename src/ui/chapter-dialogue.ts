import {
  PatrolStaging,
  PATROL_APPROACH_MS,
  PATROL_DEPLOY_MS,
  patrolDuration,
} from "../game/patrol-staging";
import { controlsOwner, sessionView } from "../game/cooperation";
import type { PatrolChoice } from "../game/forest-chapter";
import { anatomicalPlacement } from "../sprites/display-scale";
import type { Campaign, Unit } from "../game/types";
import {
  chapterLines,
  storyUnit,
  chapterOwnerForFaction,
  ruinsCenter,
  temporaryRuinsCells,
} from "../game/prologue";
import {
  chapterPortraits,
  type Speaker,
  type DialogueLine,
} from "../data/prologue";
import { village } from "../game/active-map";
import { makeClassUnit } from "../game/units";
import {
  unitSpriteProfile,
  drawResourceFrame,
  warmSprites,
} from "../sprites/resources";
import { resolveClip } from "../sprites/catalog";
import { colorForOwner } from "../game/team-colors";
export type ChapterMapFrame = {
  owner: 1 | 2;
  center: { x: number; y: number };
  reveal: number[];
  hideUnits: boolean;
  actors: {
    unit: Unit;
    x: number;
    y: number;
    animation: string;
    frame: number;
    flip?: boolean;
    alpha?: number;
  }[];
  flash?: { x: number; y: number; strength: number };
  zoom?: number;
  glow: boolean;
};
const ease = (n: number) => {
  n = Math.max(0, Math.min(1, n));
  return n * n * (3 - 2 * n);
};
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
/** A disposable presentation layer. It never adds units, changes PV or writes visibility. */
export class ChapterDirector {
  private staging?: PatrolStaging;
  private autoplaySent = false;
  private lines: DialogueLine[];
  private started = performance.now();
  private shown = false;
  private ready = false;
  private patrolElapsed = 0;
  private patrolLast?: number;
  private from: { x: number; y: number };
  private target: { x: number; y: number };
  private camera: { x: number; y: number };
  private witch = makeClassUnit(
    "chapter-witch",
    1,
    1,
    "sorcerer",
    "La sorcière",
    0,
    0,
    "female",
  );
  private monster = makeClassUnit(
    "chapter-ambush",
    0,
    1,
    "skeleton",
    "Sans-Repos",
    0,
    0,
  );
  private key = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) return;
    e.stopImmediatePropagation();
    if ([" ", "Enter"].includes(e.key)) {
      e.preventDefault();
      this.next();
    } else if (
      [
        "Escape",
        "Tab",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key)
    ) {
      e.preventDefault();
      this.root.querySelector<HTMLButtonElement>("[data-story-next]")?.focus();
    }
  };
  constructor(
    private root: HTMLElement,
    private s: Campaign,
    private advance: () => void,
    private draw: (t: number, frame: ChapterMapFrame) => void,
    private reader?: 1 | 2,
    private vote?: (owner: 1 | 2, choice: PatrolChoice) => void,
    private confirm?: (
      owner: 1 | 2 | undefined,
      choice: PatrolChoice,
      revision: number,
    ) => void,
  ) {
    const p = s.chapter1!.pending!;
    if (s.forestChapter?.stagingVersion) this.staging = new PatrolStaging(s);
    this.witch.owner = chapterOwnerForFaction(s, "knight");
    this.witch.front = this.witch.owner;
    this.lines = chapterLines(s, p.id);
    this.camera = this.group();
    this.from = { ...this.camera };
    this.target = { ...this.camera };
    this.refresh();
    window.addEventListener("keydown", this.key, true);
    void warmSprites(
      [...s.units, this.witch, this.monster],
      s.teamColors,
      s.forestChapter ? ["idle", "move"] : ["idle", "move", "attack"],
    ).then(() => {
      this.ready = true;
      this.started = performance.now();
    });
  }
  private group() {
    const p = this.s.chapter1!.pending!,
      units = this.s.units.filter(
        (u) => u.owner === p.owner && u.hp > 0 && !u.summonedBy,
      );
    const u = units.find((u) => u.leader) ?? units[0];
    return u ? { x: u.x + 0.5, y: u.y + 0.5 } : ruinsCenter;
  }
  private staged() {
    return ["meeting", "alliance"].includes(this.s.chapter1!.pending!.id);
  }
  refresh() {
    const p = this.s.chapter1!.pending!;
    this.lines = chapterLines(this.s, p.id);
    const l = this.lines[p.page];
    this.autoplaySent = !!this.reader && !!p.readBy?.includes(this.reader);
    if (p.id === "c1-choice") {
      this.renderChoice();
      return;
    }
    this.from = { ...this.camera };
    const lastCue = this.lines
      .slice(0, p.page + 1)
      .map((l) => l.cue)
      .filter(Boolean)
      .at(-1);
    this.target = this.staged()
      ? { x: village.entry.x + 0.5, y: village.entry.y + 2 }
      : lastCue === "ruins"
        ? ruinsCenter
        : this.group();
    this.started = performance.now();
    this.patrolElapsed = 0;
    this.patrolLast = undefined;
    this.shown = false;
    const u =
        storyUnit(this.s, l.speaker) ??
        (l.speaker === "witch" ? this.witch : undefined),
      name = ["witch", "unknown", "narrator"].includes(l.speaker)
        ? {
            witch:
              this.s.chapter1?.witchNamed || this.s.forestChapter
                ? "Maëlys"
                : "La sorcière",
            unknown: "???",
            narrator: "Les Terres Égarées",
          }[l.speaker as "witch" | "unknown" | "narrator"]
        : (u?.name ?? "Un survivant");
    const portrait = chapterPortraits[l.speaker];
    this.root.innerHTML = `<section class="chapter-dialogue ${l.speaker === "narrator" ? "narration-only" : ""}" role="dialog" aria-modal="true" aria-label="${p.id.startsWith("c1-") ? "Dialogue du chapitre 1" : "Dialogue du prologue"}" data-story-scene="${p.id}" data-story-line="${p.page}">${l.speaker === "narrator" ? "" : `<div class="chapter-portrait ${["witch", "unknown"].includes(l.speaker) ? "mysterious" : ""}">${portrait ? `<img src="${esc(portrait.src)}" alt="${esc(name)}">` : u && !["unknown", "narrator"].includes(l.speaker) ? '<canvas width="140" height="160" aria-hidden="true"></canvas>' : "<b>???</b>"}</div>`}<div class="chapter-speech"><strong class="chapter-speaker">${esc(name)}</strong><p class="chapter-text" aria-live="off"></p><footer><small>Entrée / Espace · lire puis continuer</small><button data-story-next>Suivant <span>›</span></button></footer></div></section>`;
    this.root.classList.toggle("cave-scene", p.id === "c1-cave");
    this.root.querySelector<HTMLElement>(".chapter-dialogue")!.hidden = [
      "c1-deploy",
      "c1-approach",
    ].includes(p.id);
    this.root
      .querySelector("[data-story-next]")!
      .addEventListener("click", (e) => {
        e.stopPropagation();
        this.next();
      });
    this.root.querySelector("button")?.focus({ preventScroll: true });
  }
  private syncSplit() {
    const split =
      !!this.s.developmentTest &&
      sessionView().mode === "local" &&
      window.innerWidth >= 800;
    const parent = this.root.parentElement!;
    parent.classList.toggle("split-story", split);
    let peer = parent.querySelector<HTMLCanvasElement>("#story-map-peer");
    if (split && !peer) {
      peer = document.createElement("canvas");
      peer.id = "story-map-peer";
      peer.setAttribute("aria-label", "Vue du joueur 2 · test local");
      parent.insertBefore(peer, this.root);
    }
    if (!split) peer?.remove();
  }
  private renderChoice() {
    const v = sessionView(),
      owners = v.mode === "coop" ? [v.owner] : ([1, 2] as const);
    const votes = this.s.forestChapter!.votes,
      disagree = !!votes[1] && !!votes[2] && votes[1] !== votes[2];
    const agreed = !!votes[1] && votes[1] === votes[2],
      confirmed = !!(
        v.mode === "coop" &&
        this.s.forestChapter!.confirmedBy?.includes(v.owner)
      );
    const shownRevision = this.s.forestChapter!.voteRevision ?? 0,
      shownChoice = votes[1];
    this.root.classList.remove("cave-scene");
    this.root.innerHTML = `<section class="patrol-choice" role="dialog" aria-modal="true" aria-label="Choix commun face à Valdren"><h2>Que répondez-vous ?</h2><p class="patrol-hint">Mettez-vous d’accord.</p><div class="patrol-voters">${owners.map((owner) => `<section aria-label="Choix du joueur ${owner}"><h3>Joueur ${owner} · ${this.s.factions[owner - 1] === "north" ? "Vikings" : "Chevaliers"}</h3>${(["travelers", "storm"] as const).map((choice) => `<button data-patrol-owner="${owner}" data-patrol-choice="${choice}" aria-pressed="${votes[owner] === choice}" ${controlsOwner(owner) ? "" : "disabled"}>${choice === "travelers" ? "Nous sommes des voyageurs." : "Nous sommes arrivés par une tempête rouge."}</button>`).join("")}</section>`).join("")}</div><p class="patrol-status ${disagree ? "disagree" : ""}" role="status">${disagree ? "Vous n’êtes pas d’accord. Chacun peut modifier son choix." : agreed ? (confirmed ? "En attente de la confirmation de l’autre joueur…" : "Accord trouvé. Cliquez sur Valider.") : Object.keys(votes).length ? "En attente du choix de l’autre joueur…" : "Choisissez votre réponse."}</p><button class="primary patrol-confirm" data-patrol-confirm ${!agreed || confirmed ? "disabled" : ""}>Valider</button></section>`;
    this.root
      .querySelectorAll<HTMLButtonElement>("[data-patrol-choice]")
      .forEach((b) =>
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          this.vote?.(
            Number(b.dataset.patrolOwner) as 1 | 2,
            b.dataset.patrolChoice as PatrolChoice,
          );
        }),
      );
    this.root
      .querySelector<HTMLButtonElement>("[data-patrol-confirm]")!
      .addEventListener("click", (e) => {
        e.stopPropagation();
        if (!agreed || confirmed) return;
        this.confirm?.(
          v.mode === "coop" ? v.owner : undefined,
          shownChoice!,
          shownRevision,
        );
      });
    this.syncSplit();
  }
  private next() {
    if (this.s.chapter1!.pending!.id === "c1-choice") return;
    const l = this.lines[this.s.chapter1!.pending!.page];
    if (this.reader && this.s.chapter1!.pending!.readBy?.includes(this.reader))
      return;
    const scripted = ["c1-approach", "c1-deploy"].includes(
      this.s.chapter1!.pending!.id,
    );
    if (
      !this.ready ||
      (scripted ? this.patrolElapsed : performance.now() - this.started) <
        this.lock(l)
    )
      return;
    if (!this.shown) {
      this.shown = true;
      return;
    }
    this.advance();
  }
  private lock(l: DialogueLine) {
    const p = this.s.chapter1?.pending;
    if (p?.id === "c1-deploy")
      return patrolDuration(this.s, "deployment") + 2800;
    if (p?.id === "c1-approach") return patrolDuration(this.s, "approach");
    if (
      this.staging &&
      p?.id === "c1-warning" &&
      p.page === 1 &&
      this.s.forestChapter?.stagingVersion !== 3
    )
      return PATROL_APPROACH_MS;
    return l.cue === "rescue"
      ? 2100
      : l.cue === "depart"
        ? 0
        : ["ruins", "group", "witch"].includes(l.cue ?? "")
          ? 1000
          : 0;
  }
  tick(time: number) {
    const pending = this.s.chapter1?.pending;
    if (!pending) return;
    if (pending.id === "c1-choice") {
      this.syncSplit();
      this.root.dataset.ready = String(this.ready);
      this.draw(time, {
        owner: pending.owner,
        center:
          this.s.mapId === "forest-compact"
            ? { x: 9.5, y: 9.5 }
            : { x: 19.5, y: 24.5 },
        reveal: [],
        hideUnits: !!this.staging,
        actors: this.staging?.actors("approach", Infinity) ?? [],
        glow: false,
      });
      return;
    }
    const l = this.lines[pending.page];
    const motion = pending.id === "c1-deploy" ? "deployment" : "approach";
    const automatic =
      pending.id === "c1-deploy" || pending.id === "c1-approach";
    let elapsed = this.ready
      ? this.reader && pending.readBy?.includes(this.reader) && automatic
        ? patrolDuration(this.s, motion) + (motion === "deployment" ? 2801 : 1)
        : time - this.started
      : 0;
    if (automatic && this.ready) {
      const acknowledged = this.reader && pending.readBy?.includes(this.reader);
      if (!acknowledged) {
        if (this.patrolLast !== undefined)
          this.patrolElapsed += Math.max(
            0,
            Math.min(50, time - this.patrolLast),
          );
        elapsed = this.patrolElapsed;
      }
      this.patrolLast = time;
    }
    if (this.staged()) {
      const canvas =
        this.root.parentElement?.querySelector<HTMLCanvasElement>("#story-map");
      const box = this.root
        .querySelector<HTMLElement>(".chapter-dialogue")
        ?.getBoundingClientRect();
      const bounds = canvas?.getBoundingClientRect();
      const rows = Number(canvas?.dataset.viewRows) || 12;
      this.target = {
        x: village.entry.x + 0.5,
        y: Math.max(
          village.entry.y + 4,
          village.entry.y +
            2.7 +
            (rows * (box?.height ?? 240)) / (2 * (bounds?.height || 900)),
        ),
      };
    }
    const t = ease(elapsed / 950);
    this.camera = {
      x: this.from.x + (this.target.x - this.from.x) * t,
      y: this.from.y + (this.target.y - this.from.y) * t,
    };
    this.root.dataset.ready = String(this.ready);
    const text = this.root.querySelector(".chapter-text")!;
    const n = this.shown ? l.text.length : Math.floor(elapsed / 24);
    text.textContent = l.text.slice(0, n);
    if (n >= l.text.length) this.shown = true;
    const button =
      this.root.querySelector<HTMLButtonElement>("[data-story-next]")!;
    const waiting = !!this.reader && !!pending.readBy?.includes(this.reader);
    button.disabled = waiting || !this.ready || elapsed < this.lock(l);
    if (waiting) button.textContent = "En attente de l’autre joueur…";
    button.setAttribute(
      "aria-label",
      this.shown ? "Réplique suivante" : "Afficher toute la réplique",
    );
    const portrait = this.root.querySelector<HTMLCanvasElement>(
      ".chapter-portrait canvas",
    );
    const u =
      storyUnit(this.s, l.speaker) ??
      (l.speaker === "witch" ? this.witch : undefined);
    if (portrait && u) {
      const ctx = portrait.getContext("2d")!;
      ctx.clearRect(0, 0, 140, 160);
      ctx.imageSmoothingEnabled = false;
      drawResourceFrame(
        ctx,
        unitSpriteProfile(u),
        "idle",
        0,
        8,
        0,
        124,
        150,
        true,
        colorForOwner(this.s.teamColors, u.owner),
        "world",
        anatomicalPlacement(unitSpriteProfile(u), "idle", 124),
      );
    }
    const frame: ChapterMapFrame = {
      owner: pending.owner,
      center: this.camera,
      reveal: [],
      hideUnits: !this.ready || this.staged() || pending.id === "c1-cave",
      actors: [],
      glow: this.staged() || pending.id.startsWith("ruins"),
      zoom:
        this.staged() && window.innerWidth < 700
          ? Math.min(
              1.7,
              Math.max(1, window.innerHeight / window.innerWidth / 1.1),
            )
          : undefined,
    };
    if (
      this.staging &&
      [
        "c1-warning",
        "c1-approach",
        "c1-captain",
        "c1-travelers",
        "c1-storm",
        "c1-deploy",
      ].includes(pending.id)
    ) {
      const deployment = pending.id === "c1-deploy",
        fresh = this.s.forestChapter?.stagingVersion === 3;
      const clock = automatic
        ? elapsed
        : pending.id === "c1-warning"
          ? fresh
            ? 0
            : pending.page >= 2
              ? Infinity
              : pending.page === 1
                ? elapsed
                : 0
          : Infinity;
      frame.hideUnits = true;
      frame.glow = false;
      frame.actors = this.staging.actors(
        deployment ? "deployment" : "approach",
        clock,
      );
      const origin =
        this.s.mapId === "forest-compact"
          ? { x: 10.5, y: 9.5 }
          : { x: 20.5, y: 24.5 };
      frame.center = origin;
      if (deployment) {
        const duration = patrolDuration(this.s, "deployment"),
          out = ease(elapsed / (duration * 0.27)),
          back = ease((elapsed - duration - 2000) / 800),
          wide = out * (1 - back);
        frame.zoom = 1 - 0.5 * wide;
        frame.center = {
          x: origin.x + (fresh ? 6.5 : 10) * wide,
          y: origin.y - (fresh ? 0 : 1.5) * wide,
        };
      }
      this.draw(time, frame);
      if (
        automatic &&
        this.ready &&
        elapsed >= patrolDuration(this.s, motion) + (deployment ? 2800 : 0) &&
        !this.autoplaySent
      ) {
        this.autoplaySent = true;
        this.advance();
      }
      return;
    }
    if (
      pending.id.startsWith("ruins") &&
      (this.target === ruinsCenter || (l.cue === "group" && elapsed < 950))
    )
      frame.reveal = temporaryRuinsCells();
    if (this.staged()) {
      frame.reveal = temporaryRuinsCells();
      const nx = village.entry.x - 1,
        ky = village.entry.y + 2;
      const nc = storyUnit(this.s, "north-chief"),
        kc = storyUnit(this.s, "knight-chief");
      const rescue = l.cue === "rescue";
      const travel = rescue
        ? ease((elapsed - 450) / 400) * (1 - ease((elapsed - 1500) / 400))
        : 0;
      const depart = l.cue === "depart" ? ease(elapsed / 2800) : 0;
      const canvas =
        this.root.parentElement?.querySelector<HTMLCanvasElement>("#story-map");
      const right =
          Number(canvas?.dataset.cameraX) + Number(canvas?.dataset.viewCols),
        bottom =
          Number(canvas?.dataset.cameraY) + Number(canvas?.dataset.viewRows);
      const distance = Math.max(
        8,
        right - (nx - 3) + 2,
        (bottom - ky + 2) / 0.75,
      );
      for (const unit of this.s.units.filter(
        (u) => u.owner !== 0 && u.hp > 0 && !u.summonedBy,
      )) {
        const north = unit.owner === chapterOwnerForFaction(this.s, "north");
        const chief = unit.id === (north ? nc : kc)?.id;
        const companions = this.s.units.filter(
          (u) =>
            u.owner === unit.owner &&
            u.hp > 0 &&
            u.id !== (north ? nc : kc)?.id &&
            !u.summonedBy,
        );
        const i = Math.max(0, companions.indexOf(unit));
        let x = chief ? (north ? nx : nx + 2) : north ? nx - 1 - i : nx + 3;
        let y = chief ? ky : ky + 1;
        if (unit.id === nc?.id) x += travel * 2.7;
        x += depart * distance;
        y += depart * distance * 0.75;
        const animation =
          depart >= 1
            ? "idle"
            : depart
              ? "move"
              : unit.id === nc?.id && rescue && elapsed > 750 && elapsed < 1250
                ? "attack"
                : travel > 0 && unit.id === nc?.id
                  ? "move"
                  : "idle";
        const clip = resolveClip(unitSpriteProfile(unit), animation);
        frame.actors.push({
          unit,
          x,
          y,
          animation: clip ? animation : "idle",
          frame:
            animation === "attack"
              ? Math.floor((elapsed - 750) / 90)
              : animation === "idle"
                ? 0
                : Math.floor(time / 140),
          flip: !north,
        });
      }
      if (rescue && elapsed < 1450) {
        const alpha =
          elapsed < 400
            ? ease(elapsed / 400)
            : elapsed > 850
              ? (Math.floor(elapsed / 70) % 2 ? 0.2 : 1) *
                (1 - ease((elapsed - 1050) / 400))
              : 1;
        frame.actors.push({
          unit: this.monster,
          x: nx + 3.1,
          y: ky,
          animation: "idle",
          frame: 0,
          flip: true,
          alpha,
        });
        if (elapsed > 850 && elapsed < 1300)
          frame.flash = {
            x: nx + 3.1,
            y: ky + 0.5,
            strength: 1 - (elapsed - 850) / 450,
          };
      }
      const witchVisible = pending.id === "alliance" && pending.page >= 8;
      if (witchVisible) {
        const walk = l.cue === "witch" ? ease(elapsed / 1600) : 1;
        frame.actors.push({
          unit: this.witch,
          x: village.entry.x + depart * distance,
          y: village.entry.y + walk * 3 + depart * distance * 0.75,
          animation:
            depart >= 1 ? "idle" : walk < 1 || depart ? "move" : "idle",
          frame: walk < 1 || depart ? Math.floor(time / 140) : 0,
        });
      }
    }
    if (l.cue === "depart") {
      const c =
        this.root.parentElement?.querySelector<HTMLCanvasElement>("#story-map");
      const left = Number(c?.dataset.cameraX),
        top = Number(c?.dataset.cameraY),
        right = left + Number(c?.dataset.viewCols),
        bottom = top + Number(c?.dataset.viewRows);
      frame.actors = frame.actors.filter(
        (a) =>
          a.x + 1 >= left &&
          a.y + 1 >= top &&
          a.x - 1 <= right &&
          a.y - 1 <= bottom,
      );
    }
    if (!this.ready) frame.actors = [];
    this.draw(time, frame);
  }
  dispose() {
    window.removeEventListener("keydown", this.key, true);
    this.root.replaceChildren();
  }
}
