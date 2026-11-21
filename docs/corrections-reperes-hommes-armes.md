# Alignement des Hommes d’armes et rapprochement des Lanciers

## Changements

Le nom de classe reste « Homme d’armes » pour les deux sexes. La création et la fiche indiquent « Femme » pour la variante féminine ; l’essai indique explicitement Homme/Femme. Les titres des planches ont été harmonisés. Les identifiants et le sexe des unités sont inchangés.

Les 38 poses debout des deux Hommes d’armes ont été alignées sur des repères de bassin relevés sur les planches originales : garde, pas, préparation, frappe, récupération et parade. Le repère ne passe plus d’un pied à l’autre. Les mêmes coordonnées sont enregistrées dans la géométrie de carte et dans les annotations de combat. Les dessins, leur cadence et leur ordre sont conservés ; les repères d’esquive, de blessure et de mort restent ceux précédemment utilisés.

L’espacement tient compte de la projection maximale de l’arme pendant toute l’attaque et du bouclier pendant toute la parade, plutôt que de la seule pose d’impact. Dans l’essai, les repères sont espacés d’environ 152 pixels pour les deux variantes, contre environ 128 et 113 avant cette correction. Le bassin reste au même emplacement pendant les changements de poses ; le mouvement dessiné du haut du corps reste visible.

Les Lanciers gagnent un petit pas visuel supplémentaire : environ 9,5 pixels de rapprochement total à la taille de l’essai. L’estoc et les pas précédemment retenus ne sont pas redessinés. Les autres classes conservent les réglages approuvés.

Aucune position tactique d’unité, portée, règle de dégâts, sauvegarde ou scène de scénario n’a été modifiée.

## Vérifications

- 214 tests automatiques : 65 visuels, 149 systèmes.
- 11 tests navigateur de l’essai réussis : les 22 variantes, tirs et magie, repos, parades, soins, vitesse, pause et rejeu. Le cas spécifique Homme d’armes vérifie le bouclier à l’impact, les dégâts nuls et la place nécessaire au coup complet pour les deux sexes.
- Test navigateur des introductions des deux factions et de l’affichage sur téléphone réussi.
- Deux captures manuelles de parade, homme et femme, contrôlées dans l’essai après correction.
- Nouveau test de régression : les anciens repères produisent plus de 40 pixels de variation du bassin ; les repères corrigés restent à la même abscisse projetée, à moins d’un pixel près.
- La classe conserve son nom pour les deux sexes et la mention Femme est disponible dans l’essai.

La validation visuelle de ces ajustements en partie reste celle du joueur.

## Fichiers principaux

- `scripts/align-man-at-arms.py` : alignement à appliquer après une régénération des mesures chevalières ; aucune réécriture des images sources.
- `src/assets/tactical/atlas-layout.json`, `combat-anchors.json` : coordonnées corrigées.
- `src/sprites/geometry.ts` : enveloppe du coup et du bouclier, petit rapprochement du Lancier.
- `src/ui/contact-roster.ts`, `creator.ts`, `character-sheet.ts` : classe commune et indication du sexe.
- `scripts/export-knight-refresh.mjs`, `knight-team-proof.mjs`, `public/validation/chevaliers/` : comparaisons et planches actualisées.
- `docs/references/man-at-arms-root-review.json` : les 38 repères contrôlés ; `docs/art-archive/man-at-arms-roots-before-alignment.json` : repères précédents conservés.
- `tests/contact-trial.test.ts`, `contact-preview.spec.ts` : régressions et contrôles d’affichage.
