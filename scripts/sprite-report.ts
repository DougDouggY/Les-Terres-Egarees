import { readFile, readdir, writeFile } from "node:fs/promises";
import {
  buildSpriteCatalog,
  animationStatus,
  statusNames,
  resolveClip,
} from "../src/sprites/catalog";
import { visualClasses } from "../src/sprites/visual-classes";
import { requiredAnimations } from "../src/sprites/requirements";
const files = (await readdir("src/assets/tactical"))
  .filter((f) => f.endsWith(".sprite.json"))
  .sort();
const registry = buildSpriteCatalog(
  await Promise.all(
    files.map(async (f) =>
      JSON.parse(await readFile("src/assets/tactical/" + f, "utf8")),
    ),
  ),
);
if (registry.errors.length) throw Error(registry.errors.join("\n"));
const totals = { functional: 0, reused: 0, provisional: 0, missing: 0 };
const report = Object.values(visualClasses).map((c) => {
  const profiles = registry.profiles.filter((p) => p.classId === c.id);
  const counts = { functional: 0, reused: 0, provisional: 0, missing: 0 };
  const details = profiles.map((p) => ({
    note: p.note ?? "",
    gender: p.gender,
    equipment: p.equipment,
    state: p.state,
    animations: requiredAnimations(c, p, Object.keys(p.clips)).map((id) => {
      const status = animationStatus(p, id);
      counts[status]++;
      totals[status]++;
      return { id, status, note: resolveClip(p, id)?.note ?? "" };
    }),
  }));
  return {
    id: c.id,
    name: c.name,
    faction: c.faction,
    profiles: details,
    counts,
    variants: {
      male: profiles.some((p) => p.gender === "male" || p.gender === "any"),
      female: profiles.some((p) => p.gender === "female" || p.gender === "any"),
    },
  };
});
await writeFile(
  "docs/SPRITES-PRODUCTION-REPORT.json",
  JSON.stringify({ totals, classes: report }, null, 2) + "\n",
);
const lines = [
  "# Bilan de production visuelle",
  "",
  "Mise à jour : tests indépendants de la campagne ; ressources existantes préservées. Les nouveaux Sans-Repos sont des définitions visuelles sans statistiques ni déploiement.",
  "",
  "Une référence de sprite existe pour " +
    report.filter((c) => c.profiles.length).length +
    " entrées du catalogue. Völva et Hamrammr disposent désormais de références masculines ; la forme d’ours dispose de sa propre silhouette. Les variantes non dessinées restent signalées.",
  "",
  "Les planches complémentaires apportent des gestes de plusieurs poses, des esquives et des chutes. Des parades, rechargements et une transformation dans les deux sens sont enregistrés. Le rapport distingue les ressources présentes, réutilisées, provisoires et encore manquantes ; la production visuelle n’est pas terminée.",
  "",
  "## Statuts réels",
  "",
  "- Fonctionnelle : au moins deux poses distinctes, réellement lues ; séquences courtes, sans promesse d’animation définitive fluide.",
  "- Réutilisée : alias explicite d’une autre animation, jamais présentée comme une séquence dédiée.",
  "- Provisoire : pose unique, ressource historique, recyclage ou cycle identifié comme imparfait.",
  "- Manquante : aucune séquence adaptée enregistrée.",
  "",
  "Les comptes ci-dessous portent sur les animations attendues de chaque profil (sexe, équipement, état), pas sur des personnages ou des combats. La riposte peut réutiliser explicitement l’attaque.",
  "",
  "| Classe | Profils | Fonctionnelles | Réutilisées | Provisoires | Manquantes | Variantes de sexe non produites |",
  "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ...report.map(
    (c) =>
      `| ${c.name} | ${c.profiles.length} | ${c.counts.functional} | ${c.counts.reused} | ${c.counts.provisional} | ${c.counts.missing} | ${c.faction === "enemy" ? "Référence non sexuée" : [!c.variants.male ? "Homme" : "", !c.variants.female ? "Femme" : ""].filter(Boolean).join(", ") || "Aucune (référence dédiée ou neutre)"} |`,
  ),
  "",
  "## Points restant à retravailler",
  "",
  "- Brise-fer et Exécuteur : marche lourde provisoire.",
  "- Cavaliers : transition de charge spécifique à compléter.",
  "- Des parades dédiées complètent les boucliers ; certaines interceptions restent provisoires.",
  "- Écuyer : pose finale agenouillée ; proposition de chute au sol écartée pour défaut de transparence.",
  "- Jeune Viking : tenue avec petit bouclier d’entraînement à valider visuellement ; aucun équipement de partie modifié.",
  "- Porte-étendard avant plantation et pavois normal : dégâts/mort encore absents ; la planche proposée a été écartée pour défaut de transparence.",
  "- Rechargements dédiés présents pour les quatre profils ordinaires d’arbalétriers. Plusieurs esquives et les dessins spécifiques de critiques restent absents, indiqués dans la galerie.",
  "- Les deux premiers échantillons conservent leurs poses de combat statiques, marquées provisoires.",
  "- Les variantes de sexe non produites restent vides ; une armure neutre réutilisée est explicitement notée non sexuée.",
  "",
  "- L’audit signale les pointes/pieds au contact des bords : les clips concernés restent provisoires. Les quatre poses de défense de la dernière ligne de la nouvelle planche nordique sont exclues des séquences intégrées.",
  "- Cinq propositions (magie, chasseurs, recrues, équipements alternatifs et états de bannière/pavois) ont été écartées après contrôle alpha ; les ressources existantes correspondantes sont conservées.",
  "",
  "## Vérification et consultation",
  "",
  "Galerie → Bilan des sprites et animations (JSON) exporte le catalogue courant. Les commentaires « À corriger » restent locaux au navigateur. Le fichier JSON voisin donne chaque animation, son statut et la note associée.",
  "",
  "Couleurs : ennemis rose vif par défaut ; choix joueurs sans rose et distincts. La galerie peut tester toutes les couleurs librement, indépendamment des préférences de partie.",
  "",
  "Recoloration HSV : plage de teinte et saturation paramétrable, contours de faible saturation limités au voisinage des matériaux d’équipe. La galerie affiche original/recoloré côte à côte, synchronisés sur la même pose ; les réglages d’aperçu sont restaurés à sa fermeture.",
  "",
  "Contrôles utilisés : `npm run test:visual`, `npm run test:visual-ui`, compilation TypeScript/Vite. Simulations indépendantes via `npm run test:systems` ; aucun lancement du premier combat.",
];
await writeFile("docs/SPRITES-PRODUCTION-REPORT.md", lines.join("\n") + "\n");
console.log(
  JSON.stringify({
    classes: report.length,
    profiles: registry.profiles.length,
    totals,
    missingClasses: report.filter((c) => !c.profiles.length).map((c) => c.id),
  }),
);
