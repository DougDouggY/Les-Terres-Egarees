# Architecture et règles

`src/engine.ts` réexporte les systèmes de `src/game/` : campagne, carte, unités, déplacement, pathfinding, visibilité, combat, IA, inventaire et sauvegarde. Cette API ne dépend ni du DOM, ni des images, ni d'une horloge. Son état de campagne est sérialisable. Un serveur autoritaire futur pourra exécuter les mêmes règles ; la synchronisation et le transport réseau ne sont pas implémentés.

`src/main.ts` orchestre les écrans, les commandes locales et les animations. Les dégâts sont calculés avant le combat, appliqués à chaque impact, et jamais recalculés par le rendu. Le verrou d'action interdit les changements de perspective et les commandes concurrentes pendant un déplacement ou un combat.

La carte de 60 × 40 cases est définie dans `src/game/map.ts`. Les coordonnées logiques utilisent des cases carrées de 32 pixels. `Cell` définit les coûts, la défense, l’opacité et l’identifiant de tuile. `src/terrain.ts` assemble l’atlas régional, les raccords de côte et les chemins. `src/landscape.ts` dessine les bois avec une marge d’herbe et des arbres de liaison sur les seuls bords partagés ; trois compositions de pics montagneux alternent sans fusion. Le cache du terrain est indépendant de la visibilité et de la sélection.

La caméra rapproche la vue ×1,65 ; le calcul du survol, les clics et le glisser utilisent la même transformation. Le glisser capte le pointeur et supprime toute commande de déplacement après le seuil de 5 pixels. Caméras bornées indépendantes par expédition. Les informations au survol n’exposent aucune unité masquée par la visibilité logique. La fiche sélectionnée est une fenêtre non modale à l’intérieur de la carte.

Le pathfinding pondéré tient compte des terrains et des occupations. Une activation comprend un déplacement au plus, puis une attaque, un soin ou une attente. Le déplacement est annulable jusqu'à la confirmation de l'action. Les ennemis utilisent les mêmes déplacements et règles d'attaque.

Chaque perspective conserve une caméra, des découvertes, une visibilité, une introduction et un journal. Avant la rencontre : deux ordres d'initiative. À la rencontre visuelle : interruption narrative, partage de vision, reconstruction unique de l'ordre commun avec toutes les unités vivantes. Les unités restent possédées par leur expédition.

L'expérience, les niveaux, les inventaires, les événements uniques, les deux champs de découverte et la progression du camp sont enregistrés dans localStorage (clé `lte-save`). Pas de sauvegarde pendant les animations, cinématiques ou déplacements provisoires. Les sauvegardes sont versionnées (version 1).

## Équilibrage

Dégâts physiques : max(1, Force − Défense − couvert). Précision : entre 25 et 98 %, précision − deux fois l'agilité adverse. Critique : max(2, agilité / 2 arrondie), dégâts ×3. Double frappe si l'écart d'agilité atteint 4. Contre-attaque seulement si le défenseur survit et respecte portée et ligne de vue. Générateur pseudo-aléatoire initialisé et sérialisé, progression de niveau fixe (+3 PV, +1 Force, +1 Défense).

Une horde finie de deux renforts apparaît au troisième round. Deux sentinelles supplémentaires, également finies, émergent à la rencontre afin que la défense commune ne puisse pas être sautée en nettoyant préalablement les deux fronts. La mort des deux chefs entraîne la défaite. La destruction de tous les ennemis après la rencontre déclenche le repli puis le camp.


## Migration de carte, révision 5

Les anciennes positions de carte (30 × 20) sont doublées dans les deux axes.
Les indices d’exploration deviennent quatre cellules correspondantes dans la
nouvelle largeur. La visibilité est recalculée et les caméras réinitialisées.
Toute unité sur un nouvel obstacle rejoint la cellule libre la plus proche.
PV, XP, inventaires, initiative et progression narrative sont conservés.
