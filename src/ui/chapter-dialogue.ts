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
} from "../game/chapter1";
import {
  chapterPortraits,
  type Speaker,
  type DialogueLine,
} from "../data/chapter1";
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
  private lines: DialogueLine[];
  private started = performance.now();
  private shown = false;
  private ready = false;
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
  ) {
    const p = s.chapter1!.pending!;
    this.witch.owner = chapterOwnerForFaction(s, "knight");
    this.witch.front = this.witch.owner;
    this.lines = chapterLines(s, p.id);
    this.camera = this.group();
    this.from = { ...this.camera };
    this.target = { ...this.camera };
    this.refresh();
    window.addEventListener("keydown", this.key, true);
    void warmSprites([...s.units, this.witch, this.monster], s.teamColors, [
      "idle",
      "move",
      "attack",
    ]).then(() => {
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
    if (p.id === "c1-choice") {
      this.root.innerHTML = `<section class="patrol-choice wood-sheet" role="dialog" aria-modal="true" aria-label="Choix commun face à Valdren"><span class="eyebrow">VALDREN · DÉCISION COMMUNE</span><h2>Que répondez-vous ?</h2><p>Les deux expéditions doivent choisir la même réponse.</p><div class="patrol-voters">${([1, 2] as const).map((owner) => `<section><h3>Expédition ${owner} · ${this.s.factions[owner - 1] === "north" ? "Vikings" : "Chevaliers"}</h3>${(["travelers", "storm"] as const).map((choice) => `<button data-patrol-owner="${owner}" data-patrol-choice="${choice}" aria-pressed="${this.s.forestChapter!.votes[owner] === choice}" ${controlsOwner(owner) ? "" : "disabled"}>${choice === "travelers" ? "Nous sommes des voyageurs." : "Nous sommes arrivés par une tempête rouge."}</button>`).join("")}</section>`).join("")}</div><p class="patrol-status" role="status">${this.s.forestChapter!.votes[1] && this.s.forestChapter!.votes[2] ? "Vos réponses diffèrent. Discutez et ajustez votre choix." : Object.keys(this.s.forestChapter!.votes).length ? "En attente du choix de l’autre expédition…" : "Chaque expédition choisit sa réponse."}</p></section>`;
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
    this.shown = false;
    const u =
        storyUnit(this.s, l.speaker) ??
        (l.speaker === "witch" ? this.witch : undefined),
      name = ["witch", "unknown", "narrator"].includes(l.speaker)
        ? {
            witch: "La sorcière",
            unknown: "???",
            narrator: "Les Terres Égarées",
          }[l.speaker as "witch" | "unknown" | "narrator"]
        : (u?.name ?? "Un survivant");
    const portrait = chapterPortraits[l.speaker];
    this.root.innerHTML = `<aside class="chapter-context">${p.id.startsWith("c1-") ? "CHAPITRE 1 · POUR NE PAS OUBLIER" : "PROLOGUE"} · ${p.id.startsWith("c1-") ? (p.id === "c1-cave" ? "LA CACHETTE" : p.id === "c1-recruit" ? "UNE MAIN TENDUE" : "LA PATROUILLE DE VALDREN") : p.id.startsWith("arrival") ? "APRÈS LA TEMPÊTE" : p.id.startsWith("ruins") ? "UNE LUEUR DANS LA BRUME" : p.id.startsWith("waiting") ? "UN SEUIL À SÉCURISER" : p.id === "meeting" ? "AU SEUIL DES RUINES" : "UNE ALLIANCE FRAGILE"}<small>${this.staged() || p.id.startsWith("c1-") ? "Les deux expéditions" : `Expédition ${p.owner} · ${this.s.factions[p.owner - 1] === "north" ? "Vikings" : "Chevaliers"}`}</small></aside><section class="chapter-dialogue" role="dialog" aria-modal="true" aria-label="${p.id.startsWith("c1-") ? "Dialogue du chapitre 1" : "Dialogue du prologue"}" data-story-scene="${p.id}" data-story-line="${p.page}"><div class="chapter-portrait ${["witch", "unknown"].includes(l.speaker) ? "mysterious" : ""}">${portrait ? `<img src="${esc(portrait.src)}" alt="${esc(name)}">` : u && !["unknown", "narrator"].includes(l.speaker) ? '<canvas width="140" height="160" aria-hidden="true"></canvas>' : `<b>${l.speaker === "narrator" ? "ᛟ" : "???"}</b>`}</div><div class="chapter-speech"><strong class="chapter-speaker">${esc(name)}</strong><p class="chapter-text" aria-live="off"></p><footer><small>Entrée / Espace · lire puis continuer</small><button data-story-next>Suivant <span>›</span></button></footer></div></section>`;
    this.root.classList.toggle("cave-scene", p.id === "c1-cave");
    this.root
      .querySelector("[data-story-next]")!
      .addEventListener("click", (e) => {
        e.stopPropagation();
        this.next();
      });
    this.root.querySelector("button")?.focus({ preventScroll: true });
  }
  private next() {
    if (this.s.chapter1!.pending!.id === "c1-choice") return;
    const l = this.lines[this.s.chapter1!.pending!.page];
    if (this.reader && this.s.chapter1!.pending!.readBy?.includes(this.reader))
      return;
    if (!this.ready || performance.now() - this.started < this.lock(l)) return;
    if (!this.shown) {
      this.shown = true;
      return;
    }
    this.advance();
  }
  private lock(l: DialogueLine) {
    return l.cue === "rescue"
      ? 2100
      : l.cue === "depart"
        ? 2400
        : ["ruins", "group", "witch"].includes(l.cue ?? "")
          ? 1000
          : 0;
  }
  tick(time: number) {
    const pending = this.s.chapter1?.pending;
    if (!pending) return;
    if (pending.id === "c1-choice") {
      this.root.dataset.ready = String(this.ready);
      this.draw(time, {
        owner: pending.owner,
        center: this.group(),
        reveal: [],
        hideUnits: false,
        actors: [],
        glow: false,
      });
      return;
    }
    const l = this.lines[pending.page],
      elapsed = this.ready ? time - this.started : 0;
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
    };
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
      const depart = l.cue === "depart" ? ease(elapsed / 2400) : 0;
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
        x += depart * 2;
        y += depart * 1.5;
        const animation = depart
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
          x: village.entry.x + depart * 2,
          y: village.entry.y + walk * 3 + depart * 1.5,
          animation: walk < 1 || depart ? "move" : "idle",
          frame: walk < 1 || depart ? Math.floor(time / 140) : 0,
        });
      }
    }
    if (!this.ready) frame.actors = [];
    this.draw(time, frame);
  }
  dispose() {
    window.removeEventListener("keydown", this.key, true);
    this.root.replaceChildren();
  }
}
