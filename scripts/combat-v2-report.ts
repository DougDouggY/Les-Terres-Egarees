import { readdir, readFile, writeFile } from "node:fs/promises";
import {
  buildSpriteCatalog,
  profileKey,
  resolveClip,
  animationNames,
} from "../src/sprites/catalog";
import { buildCombatSkin } from "../src/sprites/combat-skin-core";
import { visualClasses } from "../src/sprites/visual-classes";
import { requiredAnimations } from "../src/sprites/requirements";
import anchors from "../src/assets/tactical/combat-anchors.json";
const path = "src/assets/tactical/",
  files = (await readdir(path)).sort();
const read = async (f: string) => JSON.parse(await readFile(path + f, "utf8"));
const originals = buildSpriteCatalog(
  await Promise.all(files.filter((f) => f.endsWith(".sprite.json")).map(read)),
).profiles;
const replacements = new Map(
  (await Promise.all(files.filter((f) => f.endsWith(".combat.json")).map(read)))
    .flatMap((d) => d.profiles)
    .map((p) => [profileKey(p), p]),
);
const profiles = originals.map((p) => {
  const skin = buildCombatSkin(p, replacements.get(profileKey(p)))!,
    c = visualClasses[p.classId];
  const animations = requiredAnimations(
    c,
    p,
    Object.keys(skin.profile.clips),
  ).map((name) => {
    const clip = resolveClip(skin.profile, name),
      issue = skin.issues.filter((i) => i.animation === name);
    const status = !clip
      ? "missing"
      : clip.status === "provisional" || clip.frames.length < 2 || issue.length
        ? "provisional"
        : skin.profile.clips[name] && "reuse" in skin.profile.clips[name]
          ? "reused"
          : "available";
    return {
      name,
      status,
      source: clip?.source,
      frames: clip?.frames.length ?? 0,
      cells:
        clip?.cells ??
        clip?.frames.map((column) => ({ row: clip.row, column })),
      impactFrame: clip?.impactFrame,
      notes: [clip?.note ?? "", ...issue.map((i) => i.reason)].filter(Boolean),
    };
  });
  return {
    skinId: skin.id,
    classId: p.classId,
    className: c.name,
    faction: c.faction,
    stage: c.stage,
    gender: p.gender,
    equipment: p.equipment,
    state: p.state,
    mounted: skin.mounted,
    anatomicalHeight: skin.mounted ? 272 : p.state === "bear" ? 118.4 : 136,
    createdAtlas: !!replacements.get(profileKey(p)),
    animations,
    issues: skin.issues,
    complete: false,
  };
});
const classes = Object.values(visualClasses).map((c) => ({
  id: c.id,
  name: c.name,
  faction: c.faction,
  stage: c.stage,
  skins: profiles.filter((p) => p.classId === c.id).map((p) => p.skinId),
  missingGenders:
    c.faction === "enemy"
      ? []
      : ["male", "female"].filter(
          (g) =>
            !profiles.some(
              (p) =>
                p.classId === c.id && (p.gender === g || p.gender === "any"),
            ),
        ),
}));
const report = {
  date: "2026-11-05",
  reference: "Kit-animations-combat-V2.zip fourni par l’utilisateur",
  profiles: profiles.length,
  classes,
  skins: profiles,
  technicalRenderingIsNotArtisticCompletion: true,
};
await writeFile(
  "docs/COMBAT-V2-INVENTORY.json",
  JSON.stringify(report, null, 2) + "\n",
);
const md = [
  "# Combat V2 — inventaire et bilan de la refonte",
  "",
  "Toutes les classes et promotions ont été parcourues ; 55 profils existants sont intégrés au nouveau lecteur. Cette intégration technique ne signifie pas que tous les dessins manquants ont été produits ou que toutes les animations sont artistiquement terminées. Les lacunes sont explicites ci-dessous et dans le JSON.",
  "",
  "## Référence réellement examinée",
  "",
  "Comparateur, battle-scene.js, adaptateur portable, treize scénarios, manifeste des ancrages et inventaire des poses ont été lus et exécutés. Les extraits de référence sont archivés dans `reference-combat-v2/`. Les costumes de l’ancien jeu ne remplacent aucun personnage du projet.",
  "",
  "Le lecteur adapte les phases à 58 % de contact, le maintien au contact 620/500 ms des deux armes, le remappage du second impact à 160 ms et la parade avec riposte autorisée sur 1 550 ms. Le dépassement spatial possible après le contact dans la formule de référence est borné à 1. Les événements tactiques sont fournis une fois ; aucune résolution supplémentaire dans le dessin.",
  "",
  "## Architecture et protections",
  "",
  "- Classe : règles, statistiques, capacités et équipements inchangés. Skin de combat : identité stable par classe/sexe/équipement/état ; les atlas V2 sont indépendants des sprites tactiques. Animation : poses, ancres, échelle fixe par source d’un skin, phases et événements.",
  "- Aucune substitution silencieuse par une classe précédente. Une pose absente garde le skin courant et est signalée dans les diagnostics, au lieu de charger un autre personnage.",
  "- Ancres des pieds et points d’armes séparés des rectangles transparents. Extraction des figures V2 par composantes alpha et centroïde des pieds ; masques de lecture des composantes pour exclure les fragments voisins sans modifier les images sources.",
  "- Cavaliers : hauteur de référence 272 contre 136 à pied ; cadrage agrandi. Ours : proportions et ressource conservées.",
  "- Carte, décors, dimensions, statistiques, classes, promotions, moteur de calcul, conditions de victoire et brouillard conservés. La sauvegarde accepte deux champs optionnels de présentation ; aucune nouvelle version obligatoire.",
  "",
  "## Ressources créées",
  "",
  "Les images `combat-v2-*.png` sont de nouveaux atlas de combat. Les propositions initiales contenant une arme erronée ont été corrigées avant intégration ; les fichiers de génération intermédiaires ne sont pas utilisés. Les anciens PNG et les sprites tactiques restent intacts.",
  "",
  "## Classes, promotions et variantes",
  "",
  "| Classe | Type | Skins intégrés | Variantes non dessinées |",
  "| --- | --- | --- | --- |",
  ...classes.map(
    (c) =>
      `| ${c.name} | ${c.faction} / ${c.stage} | ${c.skins.length} | ${c.missingGenders.join(", ") || "—"} |`,
  ),
  "",
  "## Animations par skin",
  "",
  "Les alias sont explicités. Une riposte peut réutiliser l’attaque du même skin et de la même arme ; une seconde main ne reçoit jamais une parade ou une attaque principale en remplacement.",
  "",
  "| Skin | Atlas neuf | Animations présentes | Manquantes | Provisoires / réutilisées |",
  "| --- | --- | --- | --- | --- |",
  ...profiles.map(
    (p) =>
      `| ${p.skinId} | ${p.createdAtlas ? "Oui" : "Non"} | ${
        p.animations
          .filter((a) => a.status === "available")
          .map((a) => a.name)
          .join(", ") || "—"
      } | ${
        p.animations
          .filter((a) => a.status === "missing")
          .map((a) => a.name)
          .join(", ") || "—"
      } | ${
        p.animations
          .filter((a) => ["reused", "provisional"].includes(a.status))
          .map((a) => `${a.name} (${a.status})`)
          .join(", ") || "—"
      } |`,
  ),
  "",
  "## Réserves graphiques à ne pas masquer",
  "",
  "- Les critiques dédiés, plusieurs esquives et des marches de combat spécifiques restent absents. La présence d’un mouvement spatial ne remplace pas un nouveau dessin de marche.",
  "- Porte-étendard porté/planté et pavois non fortifié : réactions et chutes ajoutées dans les nouveaux atlas. Certaines autres séquences courtes à deux poses restent signalées provisoires.",
  "- Les animations de soin, transformation, invocation, bannière et rechargement conservées doivent être inspectées dans le comparateur : certaines sont courtes ou provisoires. Aucun nouveau sort ou capacité n’est ajouté au moteur.",
  "- Les variantes de sexe absentes restent absentes ; les armures neutres sont signalées comme telles.",
  "- Les sources dont des figures se touchent restent signalées par l’audit. Les masques excluent les composantes étrangères isolées ; ils ne redessinent pas des membres soudés dans le raster.",
  "",
  "## Vérifications et accès",
  "",
  "Menu principal → Tests de combat → Comparer toutes les animations. Classe, arme, skin, scénario, capacités, lecture, pause, ×0,5 / ×0,2, miroir, curseur, ancres et export JSON. Galerie : choix séparé « Sprites tactiques » / « Skins de combat V2 ». Arène : déplacement animé sur un chemin valide avec le coût et les collisions du moteur.",
  "",
  "Les planches successives sont dans `artifacts/combat-v2/skins-*.png` et le relevé des poses effectivement rendues dans `artifacts/combat-v2/render-audit.json`. L’examen visuel a porté sur les 55 profils, pas uniquement le premier duel. Les tests de lecture et d’intégrité ne constituent pas une certification artistique de toutes les poses.",
  "",
  "## Interface",
  "",
  "Barre d’initiative au bord supérieur, bouton œil rétractable conservé dans la sauvegarde ; acteur toujours recentré à la réouverture. Cadres d’objectif et d’information cohérents, verts médiévaux translucides. Actions près du personnage sans son nom, disparition pendant la sélection d’une attaque et retour par clic droit. Prévision compacte avec valeurs comparables, critique et ×2 sous les dégâts, couleurs d’équipe, sans barre de vie, sans voile noir. Portées vertes de soin conformes au moteur ; priorité offensive et déplacement bleu retiré après confirmation.",
];
await writeFile("docs/COMBAT-V2-REPORT.md", md.join("\n") + "\n");
console.log(
  JSON.stringify({
    classes: classes.length,
    skins: profiles.length,
    newSkins: profiles.filter((p) => p.createdAtlas).length,
    missing: profiles.reduce(
      (n, p) => n + p.animations.filter((a) => a.status === "missing").length,
      0,
    ),
  }),
);
