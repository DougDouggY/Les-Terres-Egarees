# Revue visuelle V4

Les 15 planches `artifacts/combat-v2/skins-*.png` couvrent les 89 profils (garde, préparation, contact, retour, défense, blessure, esquive et chute lorsqu’elles existent). Elles ont été examinées manuellement ; les six profils corrigés après cette revue ont une seconde planche dans `artifacts/combat-v4/final-corrections/`, puis une capture finale de cinq profils dans `artifacts/combat-v4/final-state/`. Le JSON de contrôle agrège les 89 entrées avec ces corrections finales. Les atlas nouveaux ont également été ouverts directement. Les absences de parade chez les archers/soigneurs ne sont pas des ressources à inventer.

| Constat de la revue | Traitement |
| --- | --- |
| Pillarde à la hache : épée pendant la préparation | Nouvelle planche `combat-v4-raider-female.png`, même hache pendant toute la séquence. |
| Jeune Viking féminine : même défaut, puis proportions de course différentes de la nouvelle frappe | Planches `combat-v4-young-female.png` et `combat-v4-motion-young-female.png` assorties. |
| Rôdeur masculin à l’épée : coiffe ajoutée à la blessure | Réaction dédiée à tête découverte dans `combat-v4-reactions.png`. |
| Traqueur masculin à la hache : garde sans vraie réaction | Réaction dédiée avec sa hache et son arc dans le dos. |
| Chevalier de la garde : différences d’ornementation dans l’ancienne blessure | Nouvelle réaction avec son casque fermé, son épée et son bouclier au lion. La parade déjà validée reste conservée. |
| Lancier monté : pointe trop haute, puis galop écarté après changement de source offensive | Pointe abaissée ; trois poses de galop originales rétablies et protégées par test. |
| Pavois masculin : première proposition avec barbe variable | Proposition rejetée ; séquence finale à barbe brune constante et un seul pavois. Référence debout conservée lors de l’accroupissement. |
| Nuage décalé par rapport au début de l’éclair diagonal | Position recalée sur l’extrémité réelle des images 2/3, miroir compris. |
| Retour de l’ours commun : anciennes images humaines masculines | Garde animale, puis vrai profil humain de l’unité ; aucune image masculine imposée à une Hamrammr féminine. Transition intermédiaire signalée provisoire. |

Les planches de locomotion/aptitudes sont produites dans `abilities-*.png`. Les courses du Berserker et du Drengr, les montures, les mouvements féminins et les bandages ont été comparés sur plusieurs poses. Les repères des 279 cellules de locomotion sont conservés dans le rapport des racines ; les variations des pieds ne déplacent plus le torse artificiellement.

## Réserves conservées

Les nouvelles planches portent le statut provisoire. Certains jeux de poses féminines à bouclier ont une définition de pixels plus basse que leurs courses ou bandages : les vêtements restent identifiables, mais l’homogénéité de finition doit encore être retouchée. Les contours et nuances de fourrure de certains atlas anciens présentent également des irrégularités signalées par l’audit raster. Les anciennes parades satisfaisantes et les attaques validées de l’ours/Brise-fer ne sont pas redessinées pour masquer ces écarts.

L’inventaire distingue 77 emplacements sans dessin critique dédié (le critique emploie alors la vraie frappe et ses dégâts calculés), 14 esquives sans pose dédiée, 2 interceptions féminines et 1 transition masculine de bannière manquantes. Ces nombres désignent des **combinaisons de profil/action**, pas des classes entièrement absentes. Le retour humain de l’ours est une transition provisoire explicitement décrite.

Les sept déclinaisons visuelles Sans-Repos sans classe mécanique propre restent inspectables graphiquement. Le comparateur les identifie comme prévisualisations ; il ne leur invente pas de statistiques ou capacités tactiques.
