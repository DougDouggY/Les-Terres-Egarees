import { colorForOwner, teamPalette } from "../game/team-colors";
import { CombatSceneV2 } from "./combat-v2";
import { combatHud } from "./combat-hud";
import { maelysAmbush } from "../game/forest-chapter";
import { weaponName } from "../game/classes";
import { maskDialoguePortraits } from "./portrait-mask";
import { dialogueCast, dialoguePages } from "./dialogue-presentation";
import { ensurePortraits } from "../game/portraits";
import { dialoguePortraitMarkup as portraitMarkup } from "./portraits";
import {
  PatrolStaging,
  PATROL_APPROACH_MS,
  PATROL_DEPLOY_MS,
  patrolDuration,
} from "../game/patrol-staging";
import { controlsOwner, sessionView } from "../game/cooperation";
import type { PatrolChoice } from "../game/forest-chapter";
import type { Campaign, Unit } from "../game/types";
import {
  chapterLines,
  storyUnit,
  chapterOwnerForFaction,
  ruinsCenter,
  temporaryRuinsCells,
} from "../game/prologue";
import { type DialogueLine } from "../data/prologue";
import { village, map, distance } from "../game/active-map";
import { path } from "../game/pathfinding";
import { makeClassUnit } from "../game/units";
import {
  drawResourceFrame,
  unitSpriteProfile,
  warmSprites,
} from "../sprites/resources";
import { resolveClip } from "../sprites/catalog";
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
  private ambush?: {
    scene: CombatSceneV2;
    guard: Unit;
    witch: Unit;
    ready: boolean;
    start?: number;
    sent: boolean;
    route: { x: number; y: number }[];
  };
  private staging?: PatrolStaging;
  private autoplaySent = false;
  private lines: DialogueLine[];
  private started = performance.now();
  private shown = false;
  private textPages: string[] = [];
  private textPage = 0;
  private textStarted = performance.now();
  private ready = false;
  private cueStarted: number | undefined;
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
    if (
      document.querySelector(".save-manager") ||
      (e.target as Element)?.closest?.(".dialogue-portrait-identity")
    )
      return;
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
    if (
      s.forestChapter?.stagingVersion &&
      [
        "c1-warning",
        "c1-approach",
        "c1-captain",
        "c1-travelers",
        "c1-storm",
        "c1-deploy",
        "c1-ambush",
      ].includes(p.id)
    )
      this.staging = new PatrolStaging(s);
    this.witch.owner = chapterOwnerForFaction(s, "knight");
    this.witch.front = this.witch.owner;
    if (p.id === "c1-ambush") {
      const a = maelysAmbush(s);
      const route = map
        .filter(
          (c) =>
            c.walk &&
            distance(c, a.witch) === 1 &&
            !s.units.some(
              (u) =>
                u.hp > 0 && u.id !== a.guard.id && u.x === c.x && u.y === c.y,
            ),
        )
        .map((c) => path(s, a.guard, c.x, c.y))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .sort((a, b) => a.cost - b.cost)[0];
      this.ambush = {
        route: route?.steps.map((k) => ({ x: map[k].x, y: map[k].y })) ?? [
          { x: a.guard.x, y: a.guard.y },
        ],
        scene: new CombatSceneV2([a.guard, a.witch], a.strikes, s.teamColors),
        guard: a.guard,
        witch: a.witch,
        ready: false,
        sent: false,
      };
      this.ambush.scene.groundedStage = true;
      void this.ambush.scene.prepare().then(() => {
        if (this.ambush) this.ambush.ready = true;
      });
    }
    this.lines = chapterLines(s, p.id);
    this.camera = this.group();
    this.from = { ...this.camera };
    this.target = { ...this.camera };
    this.refresh();
    window.addEventListener("keydown", this.key, true);
    void warmSprites(
      [...s.units, ...(s.chapter2?.visitors ?? []), this.witch, this.monster],
      s.teamColors,
      s.forestChapter ? ["idle", "move"] : ["idle", "move", "attack"],
    ).then(() => {
      this.ready = true;
      // Text starts immediately; the patrol has its own readiness-gated clock.
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
  private meetingCenter() {
    const chiefs = [
      storyUnit(this.s, "north-chief"),
      storyUnit(this.s, "knight-chief"),
    ].filter((u): u is Unit => !!u && u.hp > 0);
    return chiefs.length
      ? {
          x: chiefs.reduce((a, u) => a + u.x + 0.5, 0) / chiefs.length,
          y: chiefs.reduce((a, u) => a + u.y + 0.5, 0) / chiefs.length,
        }
      : this.group();
  }
  private staged() {
    return ["meeting", "alliance"].includes(this.s.chapter1!.pending!.id);
  }
  refresh() {
    const p = this.s.chapter1!.pending!;
    this.lines = chapterLines(this.s, p.id);
    if (p.id === "c1-ambush") {
      this.renderAmbush();
      return;
    }
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
      ? this.meetingCenter()
      : lastCue === "ruins"
        ? ruinsCenter
        : this.group();
    this.cueStarted = undefined;
    this.started = performance.now();
    this.patrolElapsed = 0;
    this.patrolLast = undefined;
    this.shown = false;
    this.textStarted = this.started;
    this.textPages = dialoguePages(l.text, window.innerWidth < 520 ? 64 : 110);
    this.textPage = 0;
    ensurePortraits(this.s);
    const previousLeft = new Set(
      Array.from(
        this.root.querySelectorAll<HTMLElement>(
          ".portrait-left[data-portrait-unit]",
        ),
      ).map((n) => n.dataset.portraitUnit),
    );
    const cast = dialogueCast(this.s, this.lines, p.page);
    const active = cast.find((p) => p.active);
    const right = active?.side === "right";
    this.root.innerHTML = `<section class="chapter-dialogue fe-dialogue ${l.speaker === "unknown" ? "offscreen-voice" : ""} ${l.speaker === "narrator" ? "narration-only" : right ? "portrait-right" : ""}" role="dialog" aria-modal="true" aria-label="Dialogue narratif" data-story-scene="${p.id}" data-story-line="${p.page}" data-current-speaker="${esc(active?.key ?? l.speaker)}"><div class="chapter-portraits">${cast.map((p) => `<div class="chapter-portrait portrait-${p.side} portrait-${p.depth} ${previousLeft.has(p.key) && p.side === "right" && this.s.chapter1?.pending?.id === "alliance" ? "portrait-crossing" : ""} ${p.active ? "speaking" : "listening"}" data-portrait-unit="${esc(p.key)}" ${p.key === "chapter-ambush" ? 'style="opacity:0;visibility:hidden"' : ""}>${portraitMarkup(p.asset, p.name, p.side === "left", p.teamColor)}</div>`).join("")}</div><div class="chapter-speech"><p class="chapter-text" aria-live="off"></p><footer><small class="dialogue-page-count" aria-hidden="true"></small><button data-story-next aria-label="Afficher toute la réplique">Suite <span aria-hidden="true">▾</span></button></footer></div></section>`;
    this.root
      .querySelector(".chapter-dialogue")!
      .addEventListener("click", (e) => {
        if (!(e.target as Element).closest("button")) this.next();
      });
    maskDialoguePortraits(this.root);
    this.root.classList.toggle(
      "cave-scene",
      ["c1-cave", "c2-cave", "c2-visitors", "c2-depart"].includes(p.id),
    );
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
    this.root.innerHTML = `<section class="patrol-choice" role="dialog" aria-modal="true" aria-label="Choix commun face à Valdren"><h2>Que répondez-vous ?</h2><p class="patrol-hint">Mettez-vous d’accord.</p><div class="patrol-voters">${owners.map((owner) => `<section aria-label="Choix du joueur ${owner}"><h3>Joueur ${owner} · ${this.s.factions[owner - 1] === "north" ? "Vikings" : "Chevaliers"}</h3>${(["travelers", "storm"] as const).map((choice) => `<button data-patrol-owner="${owner}" data-patrol-choice="${choice}" aria-pressed="${votes[owner] === choice}" ${controlsOwner(owner) ? "" : "disabled"}>${choice === "travelers" ? "Nous sommes de simples vagabonds." : "Nous sommes arrivés par une tempête rouge."}</button>`).join("")}</section>`).join("")}</div><p class="patrol-status ${disagree ? "disagree" : ""}" role="status">${disagree ? "Vous n’êtes pas d’accord. Chacun peut modifier son choix." : agreed ? (confirmed ? "En attente de la confirmation de l’autre joueur…" : "Accord trouvé. Cliquez sur Valider.") : Object.keys(votes).length ? "En attente du choix de l’autre joueur…" : "Choisissez votre réponse."}</p><button class="primary patrol-confirm" data-patrol-confirm ${!agreed || confirmed ? "disabled" : ""}>Valider</button></section>`;
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
    if (["c1-choice", "c1-ambush"].includes(this.s.chapter1!.pending!.id))
      return;
    const l = this.lines[this.s.chapter1!.pending!.page];
    if (this.reader && this.s.chapter1!.pending!.readBy?.includes(this.reader))
      return;
    const scripted = ["c1-approach", "c1-deploy"].includes(
      this.s.chapter1!.pending!.id,
    );
    if (
      !this.ready ||
      (scripted
        ? this.patrolElapsed
        : ["rescue", "witch", "depart"].includes(l.cue ?? "")
          ? this.cueStarted === undefined
            ? 0
            : performance.now() - this.cueStarted
          : performance.now() - this.started) < this.lock(l)
    )
      return;
    if (!this.shown) {
      this.shown = true;
      return;
    }
    if (this.textPage < this.textPages.length - 1) {
      this.textPage++;
      this.shown = false;
      this.textStarted = performance.now();
      return;
    }
    this.advance();
  }
  private lock(l: DialogueLine) {
    const p = this.s.chapter1?.pending;
    if (p?.id === "c2-depart") return 2300;
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
    if (pending.id === "c1-ambush") {
      this.tickAmbush(time);
      return;
    }
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
      : automatic
        ? 0
        : Math.max(0, time - this.started);
    if (["rescue", "witch", "depart"].includes(l.cue ?? "")) {
      if (this.ready) {
        this.cueStarted ??= time;
        elapsed = Math.max(0, time - this.cueStarted);
      } else elapsed = 0;
    }
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
    if (this.staged()) this.target = this.meetingCenter();
    const t = ease(elapsed / 950);
    this.camera = {
      x: this.from.x + (this.target.x - this.from.x) * t,
      y: this.from.y + (this.target.y - this.from.y) * t,
    };
    this.root.dataset.ready = String(this.ready);
    const text = this.root.querySelector(".chapter-text")!;
    const currentText = this.textPages[this.textPage] ?? l.text;
    const n = this.shown
      ? currentText.length
      : Math.max(0, Math.floor((time - this.textStarted) / 24));
    text.textContent = currentText.slice(0, n);
    if (n >= currentText.length) this.shown = true;
    const box = this.root.querySelector<HTMLElement>(".chapter-dialogue")!;
    box.dataset.textPage = String(this.textPage);
    const count = this.root.querySelector(".dialogue-page-count");
    if (count)
      count.textContent =
        this.textPages.length > 1
          ? `${this.textPage + 1} / ${this.textPages.length}`
          : "";
    const button =
      this.root.querySelector<HTMLButtonElement>("[data-story-next]")!;
    const waiting = !!this.reader && !!pending.readBy?.includes(this.reader);
    button.disabled = waiting || !this.ready || elapsed < this.lock(l);
    if (waiting) button.textContent = "En attente de l’autre joueur…";
    button.setAttribute(
      "aria-label",
      this.shown ? "Réplique suivante" : "Afficher toute la réplique",
    );
    const frame: ChapterMapFrame = {
      owner: pending.owner,
      center: this.camera,
      reveal: [],
      hideUnits:
        !this.ready ||
        this.staged() ||
        ["c1-cave", "c2-cave", "c2-visitors", "c2-depart"].includes(pending.id),
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
      const victim = storyUnit(this.s, "knight-chief");
      const nx = (victim?.x ?? village.entry.x) - 2.7,
        ky = victim?.y ?? village.entry.y + 2;
      const nc = storyUnit(this.s, "north-chief"),
        kc = storyUnit(this.s, "knight-chief");
      const rescue = l.cue === "rescue";
      const travel = rescue
        ? ease((elapsed - 300) / 450) * (1 - ease((elapsed - 1350) / 650))
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
        let x = unit.x,
          y = unit.y;
        if (unit.id === nc?.id && victim) {
          x += (victim.x - unit.x) * travel;
          y += (victim.y + 1 - unit.y) * travel;
        }

        const animation =
          unit.id === nc?.id && rescue && elapsed > 850 && elapsed < 1250
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
              ? Math.floor((elapsed - 850) / 90)
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
          frame: Math.floor(time / 600) % 2,
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
      const threat = this.root.querySelector<HTMLElement>(
        '[data-portrait-unit="chapter-ambush"]',
      );
      if (threat) {
        threat.style.opacity = String(
          rescue && elapsed < 1450
            ? elapsed < 250
              ? ease(elapsed / 250)
              : elapsed > 1100
                ? 1 - ease((elapsed - 1100) / 350)
                : 1
            : 0,
        );
        threat.style.visibility =
          rescue && elapsed < 1450 ? "visible" : "hidden";
      }
      const strength =
        rescue && elapsed >= 1050 && elapsed < 1300
          ? 1 - (elapsed - 1050) / 250
          : 0;
      this.root.parentElement?.classList.toggle(
        "rescue-impact",
        strength > 0 &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      this.root.parentElement?.style.setProperty(
        "--rescue-flash",
        String(strength * 0.65),
      );
      const witchVisible =
        pending.id === "alliance" &&
        this.lines.slice(0, pending.page + 1).some((l) => l.cue === "witch");
      if (witchVisible) {
        const walk = l.cue === "witch" ? ease(elapsed / 1600) : 1;
        frame.actors.push({
          unit: this.witch,
          x: this.meetingCenter().x - 8 + walk * 5 + depart * distance,
          y: this.meetingCenter().y + depart * distance * 0.75,
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
  private renderAmbush() {
    const a = this.ambush!;
    this.root.classList.remove("cave-scene");
    this.root.innerHTML = `<section class="story-ambush-duel combat-screen" hidden data-scripted-combat="maelys"><div class="duel-stage game-duel" style="--battle-art:url('${import.meta.env.BASE_URL}assets/battle-2.png')"><div class="combat-hud">${combatHud([a.guard, a.witch].map((u) => ({ id: u.id, name: u.name, weapon: weaponName(u), hp: u.hp, maxHp: u.maxHp, hit: null, damage: null, crit: null, color: teamPalette[colorForOwner(this.s.teamColors, u.owner)].rgb })) as unknown as Parameters<typeof combatHud>[0])}</div><canvas id="combat" width="960" height="600" aria-label="Le garde attaque Maëlys"></canvas><div class="scripted-result" aria-live="polite"></div></div></section>`;
  }
  private tickAmbush(time: number) {
    const a = this.ambush!;
    if (a.ready && this.ready) a.start ??= time;
    const elapsed = a.start === undefined ? 0 : time - a.start;
    const actors =
      this.staging?.actors("approach", Infinity) ??
      this.s.units
        .filter((u) => u.hp > 0)
        .map((unit) => ({
          unit,
          x: unit.x,
          y: unit.y,
          animation: "idle",
          frame: 0,
        }));
    const actor = actors.find((t) => t.unit.id === a.guard.id);
    if (actor) {
      const t = ease(elapsed / 800),
        progress = t * (a.route.length - 1),
        at = Math.floor(progress),
        from = a.route[at],
        to = a.route[Math.min(a.route.length - 1, at + 1)];
      actor.x = from.x + (to.x - from.x) * (progress - at);
      actor.y = from.y + (to.y - from.y) * (progress - at);
      actor.animation = t < 1 && a.route.length > 1 ? "move" : "idle";
      actor.frame = Math.floor(elapsed / 120);
    }
    this.draw(time, {
      owner: this.s.chapter1!.pending!.owner,
      center: { x: a.witch.x + 0.5, y: a.witch.y + 0.5 },
      reveal: [],
      hideUnits: true,
      actors,
      glow: false,
    });
    this.root.dataset.ready = String(a.ready && this.ready);
    const box = this.root.querySelector<HTMLElement>(".story-ambush-duel")!;
    box.hidden = elapsed < 850;
    if (box.hidden) return;
    const canvas = box.querySelector("canvas")!;
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(
      960,
      Math.round((600 * bounds.width) / Math.max(1, bounds.height)),
    );
    if (canvas.width !== width) canvas.width = width;
    a.scene.presentationWidth = width;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    a.scene.draw(
      ctx,
      elapsed - 850,
      (i) => {
        const hit = a.scene.strikes[i];
        const unit = hit.defender === a.guard.id ? a.guard : a.witch;
        const value = box.querySelector<HTMLElement>(
          `#value-${CSS.escape(unit.id)}`,
        );
        const bar = box.querySelector<HTMLElement>(
          `#hp-${CSS.escape(unit.id)}`,
        );
        if (value) value.textContent = `${hit.hpAfter} / ${unit.maxHp} PV`;
        if (bar) bar.style.width = `${(100 * hit.hpAfter) / unit.maxHp}%`;

        box.querySelector(".scripted-result")!.textContent = hit.critical
          ? "CRITIQUE"
          : hit.hit
            ? ""
            : "ESQUIVE";
      },
      () => {
        if (a.sent) return;
        a.sent = true;
        this.advance();
      },
    );
  }
  dispose() {
    window.removeEventListener("keydown", this.key, true);
    this.root.parentElement?.classList.remove("rescue-impact");
    this.root.parentElement?.style.removeProperty("--rescue-flash");
    this.root.replaceChildren();
  }
}
