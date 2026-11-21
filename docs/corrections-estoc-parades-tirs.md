# Ajustements de l’estoc, des parades et des esquives face aux tirs

## Résultat

- Lanciers homme/femme : quatre pas rapides redessinés en prenant les pas du Pillard validé comme référence. La position du corps est ancrée sur l’axe du buste plutôt que sur le pied d’appui alterné. L’ancien mouvement déplaçait cet axe d’environ 0,36 hauteur de corps entre les poses ; le nouveau contrôle impose une variation inférieure à 0,015.
- Estoc limité aux trois premières poses d’avancée ; récupération avec ces mêmes dessins en sens inverse puis garde. La grande extension et les retours à lance amincie ne sont plus utilisés. L’essai tient la troisième pose au moment de l’impact, comme le moteur de campagne.
- Hommes d’armes : espace supplémentaire de 0,08 hauteur de corps par combattant masculin et 0,025 par combattante féminine. Le bouclier reste levé à l’impact ; la parade n’est plus susceptible d’être présentée comme une esquive en cas de blocage.
- Chasseurs et Arbalétriers homme/femme : le retrait commence pendant le vol, avec son maximum à l’arrivée du projectile. La flèche vise la position initiale et ne suit plus le retrait de la cible. Les décisions d’esquive, dégâts et probabilités sont inchangées.
- Épéistes : distance visuelle réduite de 0,04 hauteur de corps, soit environ cinq pixels dans l’essai.

Les autres planches validées et les mécanismes de jeu sont conservés. Les anciens PNG et les associations antérieures restent disponibles ; le correctif conserve la planche précédente dans les ressources, sans utiliser les poses refusées.

## Vérifications réellement effectuées

211 tests automatiques réussis (62 visuels, 149 systèmes). Les 10 tests navigateur de l’essai ont réussi, puis un onzième vérifie spécifiquement les Hommes d’armes homme/femme : bouclier visible au moment du blocage, dégâts nuls et espacement distinct. Le nouveau test des tirs vérifie les quatre variantes homme/femme d’arc et d’arbalète : cible encore immobile après le départ de la flèche, puis retrait près de l’impact. Les contrôles des 22 variantes, sources de sprites, repos, soins, effets et commandes de l’essai restent réussis.

Les tests de géométrie contrôlent l’axe du buste pendant les quatre pas, l’exclusion des poses d’estoc refusées, la durée du retrait et les différences de distance demandées. La validation visuelle finale de ces ajustements reste à faire par le joueur.

## Fichiers principaux

- `src/ui/combat-reactions.ts`, `combat-v2.ts`, `contact-preview.ts` : réactions et synchronisation visuelle.
- `src/sprites/geometry.ts` : espacement visuel.
- `src/assets/tactical/combat-v4-refinements-lance-steps-v3.png`, `zzzzzzzzzzzzzz-lance-v2.{sprite,combat}.json`, `atlas-layout.json`, `combat-anchors.json` : pas, estoc et repères.
- `scripts/review-lance-timing.py` : mesure des nouvelles poses et application du correctif après `register-lance-v2.py`. Les PNG ne sont jamais réécrits par ce script.
- `scripts/export-knight-refresh.mjs`, `public/validation/chevaliers/` : comparaisons et planches actualisées ; cellules élargies pour ne pas couper la pointe de la lance dans la fiche.
- `tests/contact-trial.test.ts`, `contact-preview.spec.ts`, `visual-library.test.ts`.
- `docs/art-archive/lance-before-shorter-thrust.json`, `docs/references/lance-steps-v3-audit.json` : état précédent et mesure du nouveau dessin.

Pour le libellé historique, « homme d’armes » est le terme usuel de la catégorie. « Femme d’armes » reste ici une féminisation moderne pour l’interface ; aucune attestation médiévale de ce titre n’a été vérifiée dans cette tâche.
