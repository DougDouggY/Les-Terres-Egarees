/** Scripted VISUAL trials only. Never computes or applies campaign damage. */
export type TrialKind = "two-attacks" | "parry";
export type TrialAction =
  | "combat_idle"
  | "combat_move"
  | "attack"
  | "counter"
  | "attack_again"
  | "block"
  | "combat_damage";
export type TrialActor = { x: number; action: TrialAction; frame: number };
export type TrialEvent = {
  id: string;
  at: number;
  target: 0 | 1;
  damage: number;
  label: string;
};
export type TrialGeometry = {
  left: number;
  right: number;
  leftAdvance: number;
  rightAdvance: number;
  counterAdvance: number;
};
export const defaultTrialGeometry: TrialGeometry = {
  left: 270,
  right: 690,
  leftAdvance: 230,
  rightAdvance: 230,
  counterAdvance: 0,
};
export const trialDuration = (kind: TrialKind) =>
  kind === "two-attacks" ? 4150 : 3330;
export function trialEvents(kind: TrialKind): TrialEvent[] {
  return kind === "two-attacks"
    ? [
        {
          id: "first",
          at: 725,
          target: 1,
          damage: 4,
          label: "Première attaque",
        },
        {
          id: "enemy-reply",
          at: 2175,
          target: 0,
          damage: 4,
          label: "Riposte adverse",
        },
        {
          id: "second",
          at: 3625,
          target: 1,
          damage: 4,
          label: "Seconde attaque : avantage d’agilité",
        },
      ]
    : [
        {
          id: "parry",
          at: 725,
          target: 0,
          damage: 0,
          label: "Parade : aucun dégât",
        },
        {
          id: "counter",
          at: 1140,
          target: 1,
          damage: 4,
          label: "Riposte immédiate",
        },
        {
          id: "own-turn",
          at: 2805,
          target: 1,
          damage: 4,
          label: "Attaque à votre tour",
        },
      ];
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => Math.sin((clamp(n) * Math.PI) / 2);
function attackFrame(t: number) {
  return t < 250
    ? 0
    : t < 480
      ? 1
      : t < 710
        ? 2
        : t < 820
          ? 3
          : t < 900
            ? 4
            : t < 960
              ? 5
              : t < 1010
                ? 6
                : 7;
}
function replyFrame(t: number) {
  return t < 70 ? 0 : t < 220 ? 1 : t < 330 ? 2 : t < 440 ? 3 : t < 520 ? 4 : 5;
}
function idle(x: number): TrialActor {
  return { x, action: "combat_idle", frame: 0 };
}
function normal(
  t: number,
  home: number,
  advance: number,
  direction: 1 | -1,
  keepClose = false,
): TrialActor {
  const travel =
    t < 725 ? ease(t / 725) : keepClose ? 1 : 1 - clamp((t - 975) / 275);
  return {
    x: home + direction * advance * travel,
    action:
      t < 250
        ? "combat_move"
        : t < 1010
          ? "attack"
          : t < 1250 && !keepClose
            ? "combat_move"
            : "combat_idle",
    frame: t < 250 || t >= 1010 ? Math.floor(t / 130) % 2 : attackFrame(t),
  };
}
export function trialPose(
  kind: TrialKind,
  elapsed: number,
  g: TrialGeometry = defaultTrialGeometry,
) {
  const t = Math.max(0, elapsed),
    events = trialEvents(kind),
    completed = events.filter((e) => e.at <= t),
    hp: [number, number] = [24, 24];
  for (const e of completed) hp[e.target] -= e.damage;
  let left = idle(g.left),
    right = idle(g.right),
    stage = "Prêt",
    phase = "ready";
  if (t >= trialDuration(kind)) {
    stage = "Essai terminé";
    phase = "done";
  } else if (kind === "two-attacks") {
    if (t < 1250) {
      left = normal(t, g.left, g.leftAdvance, 1);
      stage = "Première attaque, puis retour";
      phase = t < 975 ? "first-attack" : "first-return";
    } else if (t < 1450) {
      stage = "L’adversaire prend sa riposte";
      phase = "enemy-turn";
    } else if (t < 2700) {
      right = normal(t - 1450, g.right, g.rightAdvance, -1);
      stage = "Riposte adverse, puis retour";
      phase = t < 2425 ? "enemy-reply" : "enemy-return";
    } else if (t < 2900) {
      stage = "Avantage d’agilité : seconde attaque";
      phase = "agility-turn";
    } else {
      left = normal(t - 2900, g.left, g.leftAdvance, 1);
      stage = "Seconde attaque grâce à l’agilité";
      phase = t < 3875 ? "second-attack" : "return";
    }
    const last = completed.at(-1);
    if (last && t - last.at < 230) {
      if (last.target === 0)
        left = { ...left, action: "combat_damage", frame: 0 };
      else right = { ...right, action: "combat_damage", frame: 0 };
    }
  } else {
    const enemyContact = g.right - g.rightAdvance;
    if (t < 900) {
      right = normal(t, g.right, g.rightAdvance, -1, true);
      if (t >= 625)
        left = {
          ...left,
          action: "block",
          frame: t < 700 ? 0 : t < 810 ? 1 : 2,
        };
      stage = t < 625 ? "L’adversaire attaque" : "Vous parez au bouclier";
      phase = t < 625 ? "enemy-attack" : "parry";
    } else if (t < 1500) {
      const q = t - 900;
      right = idle(enemyContact);
      left = {
        x:
          g.left +
          g.counterAdvance *
            (q < 100 ? ease(q / 100) : 1 - clamp((q - 450) / 150)),
        action: q < 520 ? "counter" : "combat_idle",
        frame: q < 520 ? replyFrame(q) : 0,
      };
      if (q >= 240 && q < 470)
        right = { ...right, action: "combat_damage", frame: 0 };
      stage = "Vous ripostez immédiatement";
      phase = "counter";
    } else if (t < 1880) {
      const q = t - 1500;
      right = {
        x: enemyContact + g.rightAdvance * clamp(q / 380),
        action: "combat_move",
        frame: Math.floor(q / 130) % 2,
      };
      stage = "L’adversaire retourne à sa place";
      phase = "enemy-return";
    } else if (t < 2080) {
      stage = "À votre tour";
      phase = "turn-change";
    } else {
      const q = t - 2080;
      left = normal(q, g.left, g.leftAdvance, 1);
      if (q >= 725 && q < 955)
        right = { ...right, action: "combat_damage", frame: 0 };
      stage = "Vous avancez et attaquez à votre tour";
      phase = q < 975 ? "own-attack" : "return";
    }
  }
  const last = completed.at(-1),
    impact = last && t - last.at >= 0 && t - last.at < 140 ? last : undefined;
  return {
    left,
    right,
    hp,
    stage,
    phase,
    events: completed,
    impact,
    done: phase === "done",
    duration: trialDuration(kind),
  };
}
