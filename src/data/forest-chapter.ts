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
  | "c1-cave";
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
        ...challenge,
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
      return [
        l(
          "narrator",
          "À l’abri de la patrouille, Maëlys conduit les survivants dans une grotte aménagée au cœur de la forêt. Cartes, notes et parchemins couvrent les tables.",
        ),
        l("north-chief", "C’est quoi, tout ce bazar ?"),
        l(
          "witch",
          "Six mois de recherches. Chaque marque rouge représente une tempête que j’ai observée, ou dont on m’a parlé.",
        ),
        l("knight-chief", "Et ces chiffres ?"),
        l(
          "witch",
          "Le nombre de personnes qui en sont sorties. Parfois une seule. Parfois des dizaines.",
        ),
        l(
          "north-chief",
          "Mais où sont passés nos compagnons ? On était bien plus nombreux avant cette tempête !",
        ),
        l("knight-chief", "Nous aussi. Plusieurs des nôtres ont disparu."),
        l("witch", "C’est justement ce que je ne comprends pas…"),
        l(
          "witch",
          "Mais il y a quelque chose de plus inquiétant. Les gens qui arrivent ici… finissent par oublier d’où ils viennent.",
        ),
        l("knight-chief", "Oublier ? Comment ça ?"),
        l(
          "witch",
          "Les noms, les visages, les lieux… Tout s’efface peu à peu. C’est pour ça que j’écris autant. Je relis mes notes chaque jour.",
        ),
        l("north-chief", "Et ça marche ?"),
        l("witch", "Ça ralentit les choses. Je crois."),
        l(
          "narrator",
          narrativeNames.knightKing
            ? `Le chef des Chevaliers remarque un nom écrit sur un parchemin : ${narrativeNames.knightKing}.`
            : "Le chef des Chevaliers remarque un nom écrit sur un parchemin.",
        ),
        l("knight-chief", "Attendez… Pourquoi avez-vous écrit ce nom ?"),
        l(
          "witch",
          "Je l’ignore. Ça fait partie des choses que j’ai oubliées. C’est peut-être la ville où j’habitais…",
        ),
        l("knight-chief", "Une ville ? Mais c’est le nom de notre roi !"),
        l(
          "witch",
          "Votre roi ? Alors… peut-être que nous venons du même endroit.",
        ),
        l(
          "witch",
          "Je suis arrivée ici il y a six mois, avec ma sœur. Valdren l’a capturée un mois plus tard.",
        ),
        l("knight-chief", "Vous savez où elle se trouve ?"),
        l(
          "witch",
          "Oui. Mais je ne peux pas affronter seule les forces du royaume. J’essaie de réunir assez de combattants pour aller la libérer.",
        ),
        l("north-chief", "Et nous, on ferait quoi ?"),
        l(
          "witch",
          "Je commerce avec un groupe d’Écorcheurs. Ils préparent une attaque contre un petit avant-poste de Valdren, mais ils manquent d’hommes.",
        ),
        l(
          "witch",
          "Avec vous, ils auraient peut-être assez de combattants. Allons les rencontrer. Nous pourrons nous entraider.",
        ),
        l(
          "knight-chief",
          "Alors allons leur parler. Nous vous devons au moins cela.",
        ),
        l("north-chief", "D’accord. Et on n’oubliera pas ceux qu’on cherche."),
        l(
          "narrator",
          "Les survivants prennent le temps de soigner leurs blessures. Leur prochaine étape : rencontrer les Écorcheurs. À suivre au chapitre 2.",
        ),
      ];
  }
}
