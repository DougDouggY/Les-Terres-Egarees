/** Dialogue content only. Portrait keys can later point to animated portrait assets. */
export type Speaker =
  | "north-chief"
  | "north-companion"
  | "knight-chief"
  | "knight-companion"
  | "witch"
  | "unknown"
  | "narrator"
  | "captain"
  | "geraud";
export type ChapterSceneId =
  | import("./forest-chapter").ForestSceneId
  | "prologue"
  | "arrival-1"
  | "arrival-2"
  | "ruins-1"
  | "ruins-2"
  | "waiting-1"
  | "waiting-2"
  | "meeting"
  | "alliance";
export type DialogueLine = {
  speaker: Speaker;
  text: string;
  cue?: "ruins" | "group" | "rescue" | "witch" | "depart";
  milestone?: "alliance" | "witch-name";
};
export type PortraitAsset = { src: string; frames?: number; fps?: number };
export const chapterPortraits: Partial<Record<Speaker, PortraitAsset>> = {};
const line = (
  speaker: Speaker,
  text: string,
  extra: Partial<DialogueLine> = {},
): DialogueLine => ({ speaker, text, ...extra });
export const arrivalNorth = [
  line(
    "north-chief",
    "La tempête rouge... Le drakkar est brisé. Qui répond encore ?",
  ),
  line(
    "north-companion",
    "Ici, chef ! Nous sommes trois. Les autres ont disparu dans la tempête.",
  ),
  line(
    "north-chief",
    "Leur sort reste inconnu. Nous chercherons les survivants. Mais je ne reconnais ni cette côte ni cette forêt. Restons ensemble.",
  ),
];
export const arrivalKnight = [
  line(
    "knight-chief",
    "Le convoi... Nous devions l’intercepter sur cette route.",
  ),
  line(
    "knight-companion",
    "Il est détruit. Nous ne sommes que deux à répondre. Les autres ont disparu dans la tempête rouge.",
  ),
  line(
    "knight-chief",
    "Je connais cette région. Ce paysage n’est pas normal. Cherchons un abri et les survivants.",
  ),
];
export const ruinsNorth = [
  line(
    "north-companion",
    "Chef, regardez là-bas ! À travers la brume... On dirait des ruines.",
    { cue: "ruins" },
  ),
  line(
    "north-chief",
    "Des ruines ? On ferait mieux d’aller s’y abriter. On ne sait pas ce qui rôde dans cette forêt.",
    { cue: "group" },
  ),
];
export const ruinsKnight = [
  line(
    "knight-companion",
    "Regardez là-bas... Une construction, derrière le brouillard.",
    { cue: "ruins" },
  ),
  line(
    "knight-chief",
    "C’est impossible. Il n’y avait aucun bâtiment à cet endroit.",
  ),
  line("knight-companion", "Vous en êtes certain ?"),
  line(
    "knight-chief",
    "Nous devions intercepter un convoi dans cette région. Je connais les environs. Mais nous avons besoin d’un abri. Allons voir.",
    { cue: "group" },
  ),
];
export const meeting = [
  line("knight-chief", "Qui êtes-vous ? Que faites-vous ici ?"),
  line("north-chief", "J’allais vous poser la même question."),
  line("north-companion", "Attendez ! Derrière vous !", { cue: "rescue" }),
  line("knight-chief", "Vous venez de me sauver la vie..."),
  line("north-chief", "Remerciez-moi plus tard. Ils arrivent !"),
  line("knight-chief", "Aux armes !"),
];
/** One continuous scene: alliance, unknown voice, presentation, departure. */
export const alliance = [
  line(
    "knight-chief",
    "Vous vous êtes battus à nos côtés. Je vous dois des remerciements.",
  ),
  line(
    "north-chief",
    "Vous nous avez aidés aussi. On dirait qu’on a un ennemi commun.",
  ),
  line(
    "knight-chief",
    "Cette tempête rouge... Elle vous a amenés ici, vous aussi ?",
  ),
  line(
    "north-chief",
    "Oui. Et elle nous a pris une bonne partie de nos hommes.",
  ),
  line("knight-chief", "Nous avons subi la même chose."),
  line(
    "north-chief",
    "Alors on ferait mieux de trouver comment sortir d’ici.",
    { milestone: "alliance" },
  ),
  line("unknown", "Vous cherchez une sortie ?"),
  line("knight-chief", "Montrez-vous !"),
  line(
    "witch",
    "Rangez vos armes. Si j’avais voulu votre mort, ce serait déjà fait.",
    { cue: "witch" },
  ),
  line("north-chief", "Vous savez où nous sommes ?"),
  line(
    "witch",
    "Dans les Terres Égarées. Et à en juger par vos vêtements, vous venez d’arriver.",
  ),
  line("knight-chief", "La tempête rouge... Vous savez ce que c’était ?"),
  line(
    "witch",
    "Oui. Vous n’êtes ni les premiers qu’elle arrache à leur monde... ni les derniers.",
  ),
  line("north-chief", "Alors dites-nous comment rentrer."),
  line(
    "witch",
    "Si c’était aussi simple, croyez-vous que je serais encore ici ?",
  ),
  line("knight-chief", "Il doit bien y avoir un moyen."),
  line(
    "witch",
    "Il y en a peut-être un. Je cherche moi-même une réponse. J’ai rassemblé des informations sur ces tempêtes. Si vous voulez les voir, suivez-moi. Mais dépêchons-nous, cet endroit est dangereux.",
  ),
  line("knight-chief", "Au fait, comment devons-nous vous appeler ?"),
  line("witch", "Maëlys. Je m’appelle Maëlys.", { milestone: "witch-name" }),
  line("knight-chief", "D’accord. Allons-y."),
  line("north-chief", "On n’a pas vraiment le choix.", { cue: "depart" }),
];

export const waitingNorth = [
  line(
    "north-companion",
    "L’entrée est encombrée de débris. Et ces traces... Nous ne sommes pas seuls ici.",
  ),
  line(
    "north-chief",
    "Ne nous engouffrons pas à l’aveugle. Sécurisez le seuil et surveillez les arbres.",
  ),
];
export const waitingKnight = [
  line(
    "knight-companion",
    "La porte tient à peine, mais quelque chose remue derrière ces murs.",
  ),
  line(
    "knight-chief",
    "Gardons nos positions. Dégagez l’entrée et vérifiez les abords avant d’entrer.",
  ),
];
