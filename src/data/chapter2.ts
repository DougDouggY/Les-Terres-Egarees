import type { DialogueLine } from "./prologue";
export type ChapterTwoSceneId =
  "c2-title" | "c2-cave" | "c2-visitors" | "c2-depart";
const l = (speaker: DialogueLine["speaker"], text: string): DialogueLine => ({
  speaker,
  text,
});
export function chapterTwoLines(id: ChapterTwoSceneId): DialogueLine[] {
  switch (id) {
    case "c2-title":
      return [l("narrator", "Chapitre II — Un ennemi commun")];
    case "c2-cave":
      return [
        l(
          "narrator",
          "Le groupe rejoint la grotte qui sert de refuge à Maëlys.",
        ),
        l(
          "north-chief",
          "Bon, maintenant qu’on est à l’abri, tu vas pouvoir nous expliquer ce qui se passe dans ce foutu monde ?",
        ),
        l("witch", "Il y a beaucoup de choses que vous devez savoir."),
        l(
          "witch",
          "Commençons par les tempêtes rouges. Le Royaume refuse d’admettre leur existence. Ceux qui affirment en avoir été témoins sont considérés comme des menteurs, des fous ou des ennemis du Royaume.",
        ),
        l("witch", "Certains sont emprisonnés et ne reviennent jamais."),
        l("knight-chief", "Mais pourquoi chercher à cacher leur existence ?"),
        l("witch", "J’aimerais autant que vous le savoir."),
        l("north-chief", "Et ces fameux Écorcheurs ?"),
        l(
          "witch",
          "C’est une faction qui lutte contre le Royaume. Certains cherchent simplement à retrouver leur liberté. D’autres profitent de cette guerre pour piller et tuer.",
        ),
        l(
          "witch",
          "Ils ne sont pas tous mauvais, mais il faut savoir à qui accorder sa confiance.",
        ),
        l(
          "witch",
          "Beaucoup portent des tenues semblables aux vôtres. Des fourrures, des boucliers ronds, des haches… Pour les soldats du Royaume, la confusion est vite faite.",
        ),
        l("knight-chief", "Et toi, comment connais-tu toutes ces choses ?"),
        l(
          "witch",
          "Parce que je suis arrivée ici de la même manière que vous. Il y a environ six mois.",
        ),
        l("north-chief", "Une tempête rouge ?"),
        l("witch", "Oui. Mais je n’étais pas seule. Ma sœur était avec moi."),
        l(
          "witch",
          "Ma sœur est aux mains du Royaume. Depuis, je cherche à la retrouver et à la libérer.",
        ),
        l(
          "witch",
          "C’est ainsi que j’ai rencontré certains Écorcheurs. Je leur apporte parfois mon aide, dans l’espoir de retrouver sa trace.",
        ),
      ];
    case "c2-visitors":
      return [
        l("narrator", "Plusieurs Écorcheurs arrivent à l’entrée de la grotte."),
        l("flayer", "Maëlys ! Tu es là ? On aurait besoin de ton aide."),
        l("witch", "Qu’est-ce qui se passe ?"),
        l(
          "flayer",
          "Une patrouille du Royaume vient de se faire attaquer dans les environs. On ne sait pas encore qui est responsable, mais c’est une occasion qu’on ne peut pas laisser passer.",
        ),
        l(
          "flayer",
          "On compte frapper l’un de leurs camps avant qu’ils aient le temps de réagir. Plusieurs de nos hommes y sont retenus prisonniers.",
        ),
        l("flayer", "Une sorcière comme toi ne serait pas de trop."),
        l("north-chief", "Une patrouille du Royaume, tu dis ?"),
        l(
          "witch",
          "Je crois que vous avez les responsables juste devant vous.",
        ),
        l("flayer", "Attends… C’était vous ?"),
        l(
          "knight-chief",
          "Disons qu’ils ne nous ont pas vraiment laissé le choix.",
        ),
        l(
          "flayer",
          "Eh bien ! Si vous vous battez contre le Royaume, on devrait pouvoir s’entendre.",
        ),
        l("north-chief", "Ce sont des amis à toi, Maëlys ?"),
        l(
          "witch",
          "Je les connais depuis quelque temps. Vous pouvez leur faire confiance. Du moins, à ceux-là.",
        ),
        l(
          "flayer",
          "Alors, qu’est-ce que vous en dites ? Vous nous donnez un coup de main ?",
        ),
        l(
          "witch",
          "Chaque occasion d’affaiblir le Royaume peut me rapprocher de ma sœur.",
        ),
        l("knight-chief", "Nous avons visiblement un ennemi commun."),
        l("north-chief", "Très bien. On vous accompagne."),
        l("flayer", "Parfait ! Préparez vos affaires, on part bientôt."),
      ];
    case "c2-depart":
      return [
        {
          ...l(
            "narrator",
            "Les héros et Maëlys quittent la grotte avec leurs nouveaux alliés. Ensemble, ils prennent la direction du camp du Royaume.",
          ),
          cue: "depart",
        },
      ];
  }
}
