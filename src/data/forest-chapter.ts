import type { DialogueLine } from "./prologue";
/** Intentionally unset until the world's royal name is agreed. No invented canon. */
export const narrativeNames = { knightKing: "" };
export type ForestSceneId =
  | "c1-title"
  | "c1-approach"
  | "c1-captain"
  | "c1-deploy"
  | "c1-warning"
  | "c1-choice"
  | "c1-travelers"
  | "c1-storm"
  | "c1-recruit"
  | "c1-cave"
  | "c1-ambush"
  | "c1-after-storm"
  | "c1-after-travelers";
const l = (speaker: DialogueLine["speaker"], text: string): DialogueLine => ({
  speaker,
  text,
});
const challenge = [
  l("north-chief", "Des quoi ? C’est de nous que vous parlez ?"),
  l(
    "captain",
    "Oui, c’est vous, misérables chiens d’Écorcheurs ! Déposez vos armes ou mourez !",
  ),
];
export function forestLines(id: ForestSceneId): DialogueLine[] {
  switch (id) {
    case "c1-title":
      return [l("narrator", "Chapitre 1 — Pour ne pas oublier")];
    case "c1-warning":
      return [
        l("narrator", "Sur le chemin de la grotte de Maëlys…"),
        l(
          "witch",
          "Attention… Des soldats de Valdren. Ne leur parlez surtout pas des tempêtes rouges. Ils pourraient vous arrêter.",
        ),
        l(
          "captain",
          "Halte ! Qui êtes-vous, et que faites-vous sur ces terres ?",
        ),
      ];
    case "c1-approach":
      return [l("narrator", "")];
    case "c1-captain":
      return [
        l(
          "captain",
          "Halte ! Qui êtes-vous, et que faites-vous sur ces terres ?",
        ),
      ];
    case "c1-deploy":
      return [l("narrator", "")];
    case "c1-choice":
      return [l("narrator", "Que répondront les deux expéditions ?")];
    case "c1-travelers":
      return [
        l(
          "knight-chief",
          "Nous sommes des voyageurs. Nous cherchons simplement un endroit où nous reposer.",
        ),
        l(
          "captain",
          "Des voyageurs, dites-vous ? Alors expliquez-moi ce que font ces Écorcheurs en votre compagnie.",
        ),
        l(
          "captain",
          "Et depuis quand de simples vagabonds voyagent-ils avec des chiens d’Écorcheurs ?",
        ),
        l(
          "witch",
          "Vous faites erreur. Nous ne sommes que de simples vagabonds, tous autant que nous sommes. Je comprends que leurs tenues puissent vous induire en erreur, mais je vous assure que nous n’avons rien à voir avec les Écorcheurs.",
        ),
        l("captain", "Tu nous prends pour des imbéciles ?!"),
        l(
          "witch",
          "Écoutez, nous ne cherchons aucun ennui. Si vous nous laissez simplement poursuivre notre…",
        ),
      ];
    case "c1-ambush":
      return [l("narrator", "")];
    case "c1-after-storm":
      return [
        l(
          "witch",
          "Je vous avais pourtant déconseillé de leur parler des tempêtes rouges !",
        ),
        l(
          "knight-chief",
          "Comment étions-nous censés savoir qu’ils réagiraient de cette manière ?",
        ),
        l(
          "witch",
          "Le Royaume pourchasse et emprisonne ceux qui prétendent avoir vu ces tempêtes. Rien que le fait d’en parler suffit à vous attirer des ennuis.",
        ),
        l(
          "witch",
          "Je vous en dirai davantage une fois à l’abri. Suivez-moi, ma grotte n’est plus très loin.",
        ),
      ];
    case "c1-after-travelers":
      return [
        l(
          "north-chief",
          "Quelqu’un peut m’expliquer pourquoi ces hommes nous ont traités d’Écorcheurs ?",
        ),
        l(
          "witch",
          "Je vous expliquerai tout, mais nous ne pouvons pas rester ici. D’autres soldats pourraient arriver.",
        ),
        l("witch", "Suivez-moi, ma grotte n’est plus très loin."),
      ];
    case "c1-storm":
      return [
        l(
          "knight-chief",
          "Nous sommes arrivés ici à travers une tempête rouge. Nous ne cherchons pas d’ennuis.",
        ),
        l("captain", "Une tempête rouge ? Encore ces histoires insensées !"),
        l(
          "knight-chief",
          "Je vous assure que c’est la vérité. Nous cherchons simplement à comprendre où nous sommes.",
        ),
        l(
          "captain",
          "Assez ! Vous répandez les mensonges des hérétiques, et vous voyagez avec des Écorcheurs !",
        ),
        ...challenge,
      ];
    case "c1-recruit":
      return [
        l(
          "geraud",
          "Attendez… Vous avez vraiment traversé une tempête rouge ?",
        ),
        l(
          "knight-chief",
          "Oui. Mais visiblement, votre capitaine n’a pas l’air de nous croire.",
        ),
        l("geraud", "Baissez la voix ! Vous voulez finir au cachot ?"),
        l("knight-chief", "Pourquoi ? C’est pourtant la vérité !"),
        l("geraud", "Je sais…"),
        l("knight-chief", "Comment ça, vous savez ?"),
        l(
          "geraud",
          "Parce que… moi aussi. Je me souviens d’une lumière rouge. Du vent… Des cris. Et puis plus rien.",
        ),
        l("knight-chief", "Alors pourquoi vous battez-vous pour eux ?"),
        l(
          "geraud",
          "Parce qu’on n’a pas le choix ici. Soit on se bat pour eux, soit on se bat contre eux. Et tout seul, je n’aurais rien pu faire.",
        ),
        l(
          "knight-chief",
          "Mais maintenant, vous n’êtes plus seul. Battez-vous avec nous.",
        ),
        l(
          "geraud",
          "Vous avez sans doute raison… Puisse la Couronne me pardonner.",
        ),
      ];
    case "c1-cave":
      return [l("narrator", "Maëlys conduit le groupe vers son refuge.")];
  }
}
