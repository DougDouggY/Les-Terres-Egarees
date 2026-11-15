import { fittedBackdrop } from "./introduction-layout";
import { resolveClip } from "../sprites/catalog";
import * as E from "../engine";
import { companionIntroductions } from "../data/companions";
import { portraitAsset } from "../data/portraits";
import { creationPortraits } from "../game/portraits";
import { portraitMarkup } from "./portraits";
import { maskDialoguePortraits } from "./portrait-mask";
import { anatomicalPlacement } from "../sprites/display-scale";
import {
  unitSpriteProfile,
  warmSprites,
  drawResourceFrame,
} from "../sprites/resources";
import type { Unit } from "../game/types";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const introductionBackdrops = {
  knight: "assets/introduction/knight-clearing-rrr.png",
  north: "assets/introduction/viking-drakkar-rrtt.png",
} as const;
type Phase =
  | "loading"
  | "approach"
  | "hood"
  | "face"
  | "ready"
  | "invite"
  | "relocate"
  | "recruit"
  | "arrival"
  | "words"
  | "ending"
  | "error";
type Point = { x: number; y: number };
export type IntroductionOptions = {
  index: 0 | 1;
  heroes: [E.HeroConfig, E.HeroConfig];
  companions: [string[], string[]];
  colors: E.TeamColors;
  flow: E.CreationFlow;
  complete: () => void;
  back: () => void;
};
export function introductionMarkup(h: E.HeroConfig, index: number) {
  return `<main class="introduction-scene" aria-label="Introduction ${h.faction === "north" ? "Viking" : "Chevalier"}" data-intro-owner="${index}" data-intro-phase="loading"><img class="intro-backdrop" src="${import.meta.env.BASE_URL + introductionBackdrops[h.faction]}" alt="${h.faction === "north" ? "Clairière avec le drakkar à gauche" : "Clairière au milieu de la forêt"}"><canvas class="intro-actors" aria-label="Personnages de la scène"></canvas><div class="intro-interface"></div><button type="button" class="intro-back" data-intro-back>← Retour aux paramètres</button><span class="intro-loading" role="status">Chargement…</span></main>`;
}
/** A local presentation controller: no campaign units, map data, statistics or story state are changed. */
export class IntroductionScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement;
  private ui: HTMLElement;
  private phase: Phase = "loading";
  private disposed = false;
  private raf = 0;
  private phaseStarted = 0;
  private hero: Unit;
  private host: Unit;
  private recruits: Unit[] = [];
  private recruitAssets: string[] = [];
  private recruitIndex = 0;
  private ready = false;
  private motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0.12
    : 1;
  private heroPosition: Point;
  private hostPosition: Point;
  private start: Point;
  private stop: Point;
  private left: Point;
  private endTimer = 0;
  constructor(
    private root: HTMLElement,
    private options: IntroductionOptions,
  ) {
    this.canvas = root.querySelector(".intro-actors")!;
    this.ctx = this.canvas.getContext("2d")!;
    this.image = root.querySelector(".intro-backdrop")!;
    this.ui = root.querySelector(".intro-interface")!;
    const h = this.config,
      owner = (options.index + 1) as 1 | 2;
    this.hero = E.makeClassUnit(
      "creation-hero",
      owner,
      owner,
      h.classId,
      h.name,
      0,
      0,
      h.gender,
    );
    if (h.weaponId) {
      this.hero.activeWeaponId = h.weaponId;
      E.syncWeapon(this.hero);
    }
    this.host = E.makeClassUnit(
      "creation-host",
      owner,
      owner,
      h.faction === "north" ? "raider" : "man_at_arms",
      "",
      0,
      0,
      "male",
    );
    this.start = { x: h.faction === "north" ? 0.3 : 0.34, y: 0.64 };
    this.stop = { x: h.faction === "north" ? 0.51 : 0.47, y: 0.46 };
    this.left = { x: h.faction === "north" ? 0.3 : 0.28, y: 0.56 };
    this.heroPosition = { ...this.start };
    this.hostPosition = { x: this.stop.x + 0.12, y: 0.46 };
    const loaded =
      this.image.complete && this.image.naturalWidth
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            this.image.addEventListener("load", () => resolve(), {
              once: true,
            });
            this.image.addEventListener(
              "error",
              () =>
                reject(
                  Error(
                    `Décor illisible : ${introductionBackdrops[h.faction]}`,
                  ),
                ),
              { once: true },
            );
          });
    void Promise.all([
      loaded,
      warmSprites([this.hero, this.host], options.colors, ["idle", "move"]),
    ])
      .then(() => {
        if (this.disposed) return;
        this.ready = true;
        root.querySelector(".intro-loading")?.remove();
        this.enter("approach");
      })
      .catch((error) => {
        if (this.disposed) return;
        this.enter("error");
        this.ui.innerHTML = `<p role="alert">${esc(String(error))}</p>`;
      });
    root
      .querySelector("[data-intro-back]")!
      .addEventListener("click", () => options.back());
    root.addEventListener("click", this.click);
    window.addEventListener("keydown", this.key);
    this.raf = requestAnimationFrame(this.draw);
  }
  private get config() {
    return this.options.heroes[this.options.index];
  }
  private get selected() {
    return this.options.companions[this.options.index];
  }
  private enter(phase: Phase) {
    this.phase = phase;
    this.phaseStarted = performance.now();
    this.root.dataset.introPhase = phase;
    this.render();
  }
  private bubble(text: string) {
    return `<aside class="intro-bubble" role="dialog" aria-label="Dialogue de la scène"><p>${esc(text)}</p><button type="button" data-intro-next aria-label="Suite du dialogue">Suite ▾</button></aside>`;
  }
  private render() {
    const h = this.config;
    let html = "";
    if (this.phase === "hood")
      html = this.bubble("Approche, enlève ta capuche.");
    if (this.phase === "ready")
      html = this.bubble(E.afterFaceLine(h.faction, h.gender));
    if (this.phase === "invite")
      html = this.bubble(E.recruitmentVoice(h.faction)[1]);
    if (this.phase === "face")
      html = `<section class="intro-face-panel" aria-label="Choix du visage"><div class="intro-face-carousel"><button type="button" data-intro-face="-1" aria-label="Visage précédent">‹</button><div class="intro-face-image chapter-portrait" data-face-id="${h.portraitId ?? ""}">${portraitMarkup(h.portraitId ? portraitAsset(h.portraitId) : undefined, h.name)}</div><button type="button" data-intro-face="1" aria-label="Visage suivant">›</button></div><button type="button" class="primary" data-intro-confirm-face>Valider</button></section>`;
    if (this.phase === "recruit")
      html = `<section class="intro-recruit-panel" aria-label="Choix des compagnons"><h2>${h.faction === "north" ? "Vos compagnons" : "Votre compagnon"}</h2><div class="intro-candidates">${E.companionRoster
        .filter((c) => c.faction === h.faction)
        .map(
          (c) =>
            `<button type="button" data-intro-candidate="${c.id}" aria-pressed="${this.selected.includes(c.id)}"><strong>${esc(c.name)}</strong><span>${esc(c.gender === "female" ? (E.classes[c.classId].femaleName ?? E.classes[c.classId].name) : E.classes[c.classId].name)}</span><small>${c.gender === "female" ? "Femme" : "Homme"}</small></button>`,
        )
        .join(
          "",
        )}</div><button type="button" class="primary" data-intro-confirm-party ${this.selected.length === E.companionCount(h.faction) ? "" : "disabled"}>Valider</button></section>`;
    if (this.phase === "words" || this.phase === "arrival") {
      html = `<div class="intro-recruit-portraits">${this.recruits
        .slice(
          0,
          this.phase === "arrival" ? this.recruitIndex : this.recruitIndex + 1,
        )
        .map(
          (u, j) =>
            `<div class="chapter-portrait ${j === this.recruitIndex ? "speaking" : "listening"}" data-intro-portrait="${j}">${portraitMarkup(this.recruitAssets[j], u.name, false)}</div>`,
        )
        .join("")}</div>`;
      if (this.phase === "words")
        html += this.bubble(
          companionIntroductions[this.selected[this.recruitIndex]],
        );
    }
    this.ui.innerHTML = html;
    maskDialoguePortraits(this.ui);
    this.root.querySelector<HTMLButtonElement>(".intro-back")!.hidden = [
      "arrival",
      "words",
      "ending",
    ].includes(this.phase);
  }
  private click = (event: MouseEvent) => {
    if (!E.controlsOwner(this.options.index + 1)) return;
    const el = (event.target as Element).closest<HTMLElement>("button");
    if (!el) return;
    if (el.hasAttribute("data-intro-next")) {
      this.next();
      return;
    }
    if (el.dataset.introFace && this.phase === "face") {
      this.config.portraitId = E.cycleFace(
        this.config.faction,
        this.config.gender,
        this.config.portraitId,
        Number(el.dataset.introFace) as -1 | 1,
        [this.options.heroes[1 - this.options.index].portraitId ?? ""],
      );
      this.render();
      return;
    }
    if (el.hasAttribute("data-intro-confirm-face") && this.phase === "face") {
      this.options.flow.faceStage[this.options.index] = "confirmed";
      this.enter("ready");
      return;
    }
    if (el.dataset.introCandidate && this.phase === "recruit") {
      this.options.companions[this.options.index] = E.toggleCompanion(
        this.config.faction,
        this.selected,
        el.dataset.introCandidate,
        !this.selected.includes(el.dataset.introCandidate),
      );
      this.render();
      return;
    }
    if (el.hasAttribute("data-intro-confirm-party") && this.phase === "recruit")
      void this.confirmParty();
  };
  private key = (e: KeyboardEvent) => {
    if (
      !this.root.isConnected ||
      e.ctrlKey ||
      e.metaKey ||
      !E.controlsOwner(this.options.index + 1)
    )
      return;
    if (
      ["Enter", " "].includes(e.key) &&
      ["hood", "ready", "invite", "words"].includes(this.phase)
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.next();
    }
    if (this.phase === "face" && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      this.config.portraitId = E.cycleFace(
        this.config.faction,
        this.config.gender,
        this.config.portraitId,
        e.key === "ArrowLeft" ? -1 : 1,
        [this.options.heroes[1 - this.options.index].portraitId ?? ""],
      );
      this.render();
    }
  };
  private next() {
    if (this.phase === "hood") this.enter("face");
    else if (this.phase === "ready") this.enter("invite");
    else if (this.phase === "invite") this.enter("relocate");
    else if (this.phase === "words") {
      if (this.recruitIndex + 1 < this.recruits.length) {
        this.recruitIndex++;
        this.enter("arrival");
      } else {
        this.enter("ending");
        this.root.classList.add("intro-ending");
        this.endTimer = window.setTimeout(() => {
          if (!this.disposed) this.options.complete();
        }, 650 * this.motion);
      }
    }
  }
  private async confirmParty() {
    E.validateCompanions(this.config.faction, this.selected);
    const art = creationPortraits(
      this.options.heroes,
      this.options.companions,
      E.companionRoster,
    );
    this.recruits = this.selected.map((id, j) => {
      const c = E.companionRoster.find((c) => c.id === id)!;
      return E.makeClassUnit(
        `creation-companion-${j}`,
        (this.options.index + 1) as 1 | 2,
        (this.options.index + 1) as 1 | 2,
        c.classId,
        c.name,
        0,
        0,
        c.gender,
      );
    });
    this.recruitAssets = this.recruits.map(
      (_, j) => art[`p${this.options.index + 1}${j === 0 ? "b" : "c"}`]!,
    );
    this.enter("loading");
    await warmSprites(this.recruits, this.options.colors, ["idle", "move"]);
    if (!this.disposed) {
      this.recruitIndex = 0;
      this.enter("arrival");
    }
  }
  private interpolate(a: Point, b: Point, t: number): Point {
    const k = Math.min(1, Math.max(0, t));
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }
  private paint(
    u: Unit,
    p: Point,
    move: boolean,
    faceRight: boolean,
    now: number,
    rect: ReturnType<typeof fittedBackdrop>,
  ) {
    const x = rect.x + p.x * rect.w,
      y = rect.y + p.y * rect.h;
    const body = Math.max(44, Math.min(82, 96 * rect.scale));
    this.ctx.fillStyle = "#07170d55";
    this.ctx.beginPath();
    this.ctx.ellipse(x, y - 1, body * 0.22, body * 0.07, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.save();
    this.ctx.translate(x, y);
    if (faceRight) this.ctx.scale(-1, 1);
    const profile = unitSpriteProfile(u),
      animation = move && resolveClip(profile, "move") ? "move" : "idle";
    drawResourceFrame(
      this.ctx,
      profile,
      animation,
      Math.floor(now / (move ? 120 : 260)),
      -body,
      -body * 1.1,
      body * 2,
      body * 1.12,
      true,
      E.colorForOwner(this.options.colors, u.owner),
      "world",
      anatomicalPlacement(profile, animation, body),
    );
    this.ctx.restore();
  }
  private draw = (now: number) => {
    if (this.disposed) return;
    if (!this.root.isConnected) {
      this.dispose();
      return;
    }
    const box = this.root.getBoundingClientRect(),
      dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(box.width * dpr),
      h = Math.round(box.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, box.width, box.height);
    if (this.ready) {
      const rect = fittedBackdrop(
          this.image.naturalWidth,
          this.image.naturalHeight,
          box.width,
          box.height,
        ),
        elapsed = now - this.phaseStarted;
      let moving = false,
        facing = true;
      if (this.phase === "approach") {
        const t = elapsed / (1800 * this.motion);
        this.heroPosition = this.interpolate(this.start, this.stop, t);
        moving = t < 1;
        if (t >= 1) this.enter("hood");
      }
      if (this.phase === "relocate") {
        const t = elapsed / (1400 * this.motion);
        this.heroPosition = this.interpolate(this.stop, this.left, t);
        moving = t < 1;
        facing = !moving;
        if (t >= 1) this.enter("recruit");
      }
      this.paint(this.host, this.hostPosition, false, false, now, rect);
      this.paint(this.hero, this.heroPosition, moving, facing, now, rect);
      for (
        let j = 0;
        ["arrival", "words", "ending"].includes(this.phase) &&
        j < this.recruits.length;
        j++
      ) {
        if (j > this.recruitIndex) break;
        const target = {
          x: this.left.x + 0.16 + j * 0.12,
          y: this.left.y + j * 0.045,
        };
        const entering = this.phase === "arrival" && j === this.recruitIndex;
        const t = entering ? elapsed / (1400 * this.motion) : 1;
        const p = this.interpolate({ x: 0.87, y: target.y }, target, t);
        this.paint(this.recruits[j], p, entering && t < 1, false, now, rect);
        if (entering && t >= 1) this.enter("words");
      }
      this.canvas.dataset.heroX = String(this.heroPosition.x);
      this.canvas.dataset.heroFacing = facing ? "right" : "left";
      this.canvas.dataset.hostX = String(this.hostPosition.x);
    }
    this.raf = requestAnimationFrame(this.draw);
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.endTimer);
    window.removeEventListener("keydown", this.key);
    this.root.removeEventListener("click", this.click);
  }
}
