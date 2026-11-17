export type ContactScenario = "agility" | "parry" | "double-parry" | "dodges";
export type ContactEvent = {
  side: 0 | 1;
  outcome: "hit" | "block" | "evade";
  damage: number;
  label: string;
};
export const contactScenarios: Record<
  ContactScenario,
  { label: string; events: ContactEvent[] }
> = {
  agility: {
    label: "1 · Attaque, réponse, seconde attaque",
    events: [
      { side: 0, outcome: "hit", damage: 4, label: "Vous attaquez" },
      { side: 1, outcome: "hit", damage: 4, label: "L’adversaire répond" },
      {
        side: 0,
        outcome: "hit",
        damage: 4,
        label: "Votre seconde attaque par agilité",
      },
    ],
  },
  parry: {
    label: "2 · Parade, riposte, attaque classique",
    events: [
      {
        side: 1,
        outcome: "block",
        damage: 0,
        label: "Attaque adverse · vous parez",
      },
      { side: 0, outcome: "hit", damage: 4, label: "Votre riposte" },
      { side: 0, outcome: "hit", damage: 4, label: "Votre attaque classique" },
    ],
  },
  "double-parry": {
    label: "3 · Deux parades et deux ripostes",
    events: [
      {
        side: 1,
        outcome: "block",
        damage: 0,
        label: "Attaque adverse · vous parez",
      },
      { side: 0, outcome: "hit", damage: 4, label: "Votre première riposte" },
      { side: 0, outcome: "hit", damage: 4, label: "Votre attaque classique" },
      {
        side: 1,
        outcome: "block",
        damage: 0,
        label: "Seconde attaque adverse par agilité · vous parez",
      },
      { side: 0, outcome: "hit", damage: 4, label: "Votre seconde riposte" },
    ],
  },
  dodges: {
    label: "4 · Deux esquives, puis coup mortel",
    events: [
      {
        side: 0,
        outcome: "evade",
        damage: 0,
        label: "Vous attaquez · l’adversaire esquive",
      },
      {
        side: 1,
        outcome: "evade",
        damage: 0,
        label: "L’adversaire attaque · vous esquivez",
      },
      {
        side: 0,
        outcome: "hit",
        damage: 24,
        label: "Votre seconde attaque · adversaire vaincu",
      },
    ],
  },
};
export const contactApproach = 850,
  contactBeat = 1150,
  contactEnding = 900;
export const contactDuration = (id: ContactScenario) =>
  contactApproach +
  contactScenarios[id].events.length * contactBeat +
  contactEnding;
export function contactSample(id: ContactScenario, elapsed: number) {
  const events = contactScenarios[id].events;
  const time = Math.max(0, elapsed - contactApproach);
  const index = Math.min(events.length - 1, Math.floor(time / contactBeat));
  const progress = Math.min(1, (time - index * contactBeat) / contactBeat);
  const hp: [number, number] = [24, 24];
  const applied: number[] = [];
  events.forEach((e, i) => {
    if (elapsed >= contactApproach + i * contactBeat + 480) {
      hp[1 - e.side] = Math.max(0, hp[1 - e.side] - e.damage);
      applied.push(i);
    }
  });
  return {
    hp,
    applied,
    index,
    progress,
    event: events[index],
    approach: Math.min(1, Math.max(0, elapsed / contactApproach)),
    ending: elapsed >= contactApproach + events.length * contactBeat,
    done: elapsed >= contactDuration(id),
  };
}
